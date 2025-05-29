import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './Header';
import { FileBrowser } from './FileBrowser';
import { PDFViewer } from './PDFViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/contexts/UserContext';
import { userService } from '@/services/userService';
import { UserRole } from '@/types/user';
import { AuthActionsProvider } from '@/contexts/AuthActionsContext';
import { Label } from '@/components/ui/label';

export interface FileItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string[];
  url?: string;
  downloadUrl?: string;
  size?: string;
  lastModified?: string;
  parents?: string[];
  mimeType?: string;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
  webViewLink?: string;
  webContentLink?: string;
  size?: string;
  modifiedTime?: string;
}

export interface GoogleDriveResponse {
  files: GoogleDriveFile[];
}

// List of admin email addresses - users not in this list will be assigned 'Viewer' role
const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];

// Helper function to sort files: folders first, then files, both in ascending alphabetical order
const sortFiles = (files: FileItem[]): FileItem[] => {
  return files.sort((a, b) => {
    // Folders come first
    if (a.type === 'folder' && b.type !== 'folder') return -1;
    if (a.type !== 'folder' && b.type === 'folder') return 1;
    
    // Within the same type, sort alphabetically by name (case-insensitive)
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
};

interface ValidateAccessTokenParams {
  token: string;
  email?: string | null;
  role?: string | null;
}

type ValidateAccessTokenFunction = (params: ValidateAccessTokenParams) => Promise<boolean>;

export const Dashboard = () => {
  const { user, setUser } = useUser();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [rootFolders, setRootFolders] = useState<FileItem[]>([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // Debug useEffect to monitor rootFolders state
  useEffect(() => {
  }, [rootFolders, currentPath, accessToken, user]);

  const handleTokenExpired = useCallback(() => {
    setIsLoggingOut(true);
    
    // ล้างข้อมูลทั้งหมดใน localStorage
    const keysToRemove = [
      'accessToken',
      'refreshToken',
      'userEmail',
      'userRole',
      'currentUser',
      'clientId',
      'clientSecret',
      'driveUrl'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // รีเซ็ต state ทั้งหมด
    setAccessToken(null);
    setRefreshToken(null);
    setUserEmail(null);
    setUserRole(null);
    setUser(null);
    setRootFolders([]);
    setCurrentPath([]);
    setSelectedFile(null);
    
    // ใช้ setTimeout เพื่อให้ animation ทำงานเสร็จก่อน
    setTimeout(() => {
      setIsLoggingOut(false);
      window.location.href = '/';
    }, 300);
  }, [setUser]);

  const refreshAccessToken = useCallback(async (token: string) => {
    const settings = await userService.getGoogleDriveSettings();
    if (!settings.clientId || !settings.clientSecret) {
      console.error('Cannot refresh token: Missing client settings');
      handleTokenExpired();
      throw new Error('Missing client settings for token refresh');
    }

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          refresh_token: token,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (data.error) {
        console.error('Error refreshing token:', data.error);
        throw new Error(data.error);
      }

      setAccessToken(data.access_token);
      localStorage.setItem('accessToken', data.access_token);
      if (data.refresh_token) {
         setRefreshToken(data.refresh_token);
         localStorage.setItem('refreshToken', data.refresh_token);
      }
      return data.access_token;

    } catch (error) {
      console.error('Error refreshing token:', error);
      handleTokenExpired();
      throw error;
    }
  }, [handleTokenExpired]);

  const validateAccessToken = useCallback<ValidateAccessTokenFunction>(async ({ token, email, role }) => {
    try {
      const response = await fetch('https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=' + token);

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const data = await response.json();
      const expirationTime = data.expires_in * 1000 + Date.now();

      if (expirationTime > Date.now()) {
        setAccessToken(token);
        if (email) {
          setUserEmail(email);
        }
        const determinedRole = role || (email && adminEmails.includes(email.toLowerCase()) ? 'Admin' : 'Viewer');
        if (determinedRole) {
          setUserRole(determinedRole as UserRole);
          if (user && user.role !== determinedRole) {
            setUser({ ...user, role: determinedRole as UserRole });
          } else if (!user && email) {
            // Only create a new user if no user exists - let CurriculumApp handle user creation with full name
            const storedUserName = localStorage.getItem('userName');
            const displayName = storedUserName || 'Anirach Mingkhwan'; // Use stored name or fallback
            
            const newUser = {
              id: 'oauth-user',
              email: email,
              name: displayName,
              role: determinedRole as UserRole,
              createdAt: new Date(),
              updatedAt: new Date()
            };
            setUser(newUser);
            localStorage.setItem('currentUser', JSON.stringify(newUser));
          }
        }
        return true;
      } else if (refreshToken) {
        await refreshAccessToken(refreshToken);
        return true;
      } else {
        handleTokenExpired();
        return false;
      }
    } catch (error) {
      console.error('Error validating token:', error);
      if (refreshToken) {
        try {
          await refreshAccessToken(refreshToken);
          return true;
        } catch (refreshError) {
          console.error('Refresh token failed:', refreshError);
          handleTokenExpired();
          return false;
        }
      } else {
        handleTokenExpired();
        return false;
      }
    }
  }, [refreshToken, refreshAccessToken, handleTokenExpired, setUser, user, setUserEmail, setUserRole]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      
      if (!settings || !settings.clientId || !settings.clientSecret) {
        if (user && user.role === 'Admin') {
          toast({
            title: "กรุณาตั้งค่า Google OAuth",
            description: "กรุณากรอก Google OAuth Client ID และ Client Secret",
            variant: "destructive",
          });
          setShowConfig(true);
        } else {
          toast({
            title: "ไม่สามารถเข้าสู่ระบบได้",
            description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
            variant: "destructive",
          });
        }
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during Google login:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const handleAuthCode = useCallback(async (code: string) => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings?.clientId || !settings?.clientSecret) {
        throw new Error('Missing OAuth client credentials');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          redirect_uri: `${window.location.origin}/auth/callback`,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      setAccessToken(data.access_token);
      localStorage.setItem('accessToken', data.access_token);

      if (data.refresh_token) {
        setRefreshToken(data.refresh_token);
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userData = await userResponse.json();
      console.log('Google userinfo API response (Dashboard):', userData);
      const email = userData.email;
      setUserEmail(email);
      localStorage.setItem('userEmail', email);

      const determinedRole = adminEmails.includes(email.toLowerCase()) ? 'Admin' : 'Viewer';
      setUserRole(determinedRole as UserRole);

      // Determine the display name - use actual name from Google API
      const displayName = userData.name && userData.name.trim() ? userData.name.trim() : 'Anirach Mingkhwan';

      const user = {
        id: userData.id || 'oauth-user',
        email: email,
        name: displayName,
        picture: userData.picture,
        role: determinedRole as UserRole,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setUser(user);
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('userName', displayName); // Store the correct name
      localStorage.setItem('userRole', determinedRole);

      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: `ยินดีต้อนรับ ${user.name} (${user.role})`,
      });

      if (settings?.driveUrl) {
        const match = settings.driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
        const folderId = match ? match[1] : null;
        
        if (folderId) {
          setDriveUrl(settings.driveUrl);
          setInputUrl(settings.driveUrl);
          
          try {
            const driveResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)`,
              { headers: { Authorization: `Bearer ${data.access_token}` } }
            );

            if (driveResponse.ok) {
              const driveData = await driveResponse.json();
              
              if (driveData.files && driveData.files.length > 0) {
                const items: FileItem[] = driveData.files.map((item: GoogleDriveFile) => ({
                  id: item.id,
                  name: item.name,
                  type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
                  path: [],
                  url: item.mimeType !== 'application/vnd.google-apps.folder' ? item.webViewLink : undefined,
                  downloadUrl: item.webContentLink,
                  size: item.size,
                  lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
                  parents: item.parents,
                  mimeType: item.mimeType,
                }));
                
                const sortedItems = sortFiles(items);
                
                setRootFolders(sortedItems);
              } else {
                setRootFolders([]);
              }
            } else {
              console.error('❌ Immediate fetch failed:', driveResponse.status, await driveResponse.text());
              setRootFolders([]);
            }
          } catch (fetchError) {
            console.error('❌ Error in immediate file fetch:', fetchError);
            setRootFolders([]);
          }
        } else {
          console.warn('❌ Invalid drive URL format:', settings.driveUrl);
          setRootFolders([]);
        }
      } else {
        setRootFolders([]);
      }

    } catch (error) {
      console.error('Error during OAuth flow:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
      handleTokenExpired();
    }
  }, [handleTokenExpired, setUser, toast, setUserEmail, setUserRole]);

  const handleSaveDriveUrl = async () => {
    if (!inputUrl) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "กรุณาระบุ URL ของ Google Drive",
        variant: "destructive",
      });
      return;
    }

    try {
      const match = inputUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (!match) {
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "รูปแบบ URL ของ Google Drive ไม่ถูกต้อง กรุณาตรวจสอบ",
          variant: "destructive",
        });
        return;
      }

      const settings = {
        clientId,
        clientSecret,
        driveUrl: inputUrl
      };
      await userService.setGoogleDriveSettings(settings);

      setDriveUrl(inputUrl);
      localStorage.setItem('driveUrl', inputUrl);

      if (accessToken) {
        const folderId = match[1];
        await fetchFiles(folderId);
      }

      toast({
        title: "บันทึกการตั้งค่าสำเร็จ",
        description: "บันทึกการตั้งค่า Google Drive เรียบร้อยแล้ว",
      });
    } catch (error) {
      console.error('Error saving drive URL:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถบันทึกการตั้งค่าได้",
        variant: "destructive",
      });
    }
  };

  const handleTestAccess = useCallback(async () => {
    if (!clientId || !clientSecret || !inputUrl) {
      setTestResult('Error: Missing Client ID, Client Secret, or Drive Folder URL');
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      if (!accessToken) {
        setTestResult('Error: No access token available. Please log in first.');
        return;
      }

      const isValid = await validateAccessToken({ token: accessToken, email: userEmail, role: userRole });
      if (!isValid) {
        setTestResult('Error: Invalid or expired access token. Please log in again.');
        return;
      }

      const folderIdMatch = inputUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
      const folderId = folderIdMatch ? folderIdMatch[1] : inputUrl;

      if (!folderId) {
        setTestResult('Error: Invalid Google Drive Folder URL.');
        return;
      }

      const currentToken = accessToken;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name)`,
        { headers: { Authorization: `Bearer ${currentToken}` } }
      );

      const data = await response.json();

      if (response.ok) {
        if (data.files && Array.isArray(data.files)) {
           setTestResult(`Access successful! Found ${data.files.length} items in the folder.`);
        } else {
           setTestResult('Access successful, but no items found in the folder.');
        }
      } else if (response.status === 401) {
        if (refreshToken) {
          try {
            const newToken = await refreshAccessToken(refreshToken);
            const retryResponse = await fetch(
              `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name)`,
              { headers: { Authorization: `Bearer ${newToken}` } }
            );
            const retryData = await retryResponse.json();
            if (retryResponse.ok) {
              if (retryData.files && Array.isArray(retryData.files)) {
                 setTestResult(`Access successful! Found ${retryData.files.length} items in the folder.`);
              } else {
                 setTestResult('Access successful, but no items found in the folder.');
              }
            } else {
              setTestResult(`Error testing access: ${retryData.error?.message || retryResponse.statusText}. Please ensure you have access to this folder.`);
            }
          } catch (refreshError) {
            setTestResult(`Error refreshing token: ${refreshError instanceof Error ? refreshError.message : String(refreshError)}. Please log in again.`);
          }
        } else {
          setTestResult('Error: Access token expired and no refresh token available. Please log in again.');
        }
      } else {
        setTestResult(`Error testing access: ${data.error?.message || response.statusText}. Please ensure you have access to this folder.`);
      }
    } catch (error) {
      console.error('Error during access test:', error);
      setTestResult(`An error occurred during test: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsTesting(false);
    }
  }, [clientId, clientSecret, inputUrl, accessToken, refreshToken, validateAccessToken, refreshAccessToken, userEmail, userRole]);

  const handleInsufficientScopeError = useCallback(async () => {
    setAccessToken(null);
    setRefreshToken(null);
    
    toast({
      title: "จำเป็นต้องเข้าสู่ระบบใหม่",
      description: "กรุณาเข้าสู่ระบบอีกครั้งเพื่อเข้าถึง Google Drive",
      variant: "destructive",
    });

    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        if (user && user.role === 'Admin') {
          toast({
            title: "กรุณาตั้งค่า Google OAuth",
            description: "กรุณากรอก Google OAuth Client ID และ Client Secret",
            variant: "destructive",
          });
          setShowConfig(true);
        } else {
          toast({
            title: "ไม่สามารถเข้าสู่ระบบได้",
            description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
            variant: "destructive",
          });
        }
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(JSON.stringify({ type: 'reauth' }))}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during re-authentication:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [user, toast, setAccessToken, setRefreshToken]);

  const fetchFiles = useCallback(async (targetFolderId: string) => {
    if (!targetFolderId) {
      setRootFolders([]);
      return;
    }

    if (!accessToken) {
      setRootFolders([]);
      return;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${targetFolderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,modifiedTime,parents,webViewLink,webContentLink)`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (response.status === 401) {
        if (refreshToken) {
          try {
            const newToken = await refreshAccessToken(refreshToken);
            return fetchFiles(targetFolderId);
          } catch (error) {
            console.error('❌ Error refreshing token during fetchFiles:', error);
            handleTokenExpired();
            setRootFolders([]);
            toast({
              title: "เข้าสู่ระบบล้มเหลว",
              description: "ไม่สามารถรีเฟรช Access Token ได้ กรุณาเข้าสู่ระบบใหม่",
              variant: "destructive",
            });
            return;
          }
        } else {
          handleTokenExpired();
          setRootFolders([]);
          toast({
            title: "Session หมดอายุ",
            description: "กรุณาเข้าสู่ระบบใหม่",
            variant: "destructive",
          });
          return;
        }
      }

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Google Drive API error during fetchFiles:', response.status, errorData);
        
        if (response.status === 403 && errorData.error?.message?.includes('insufficient authentication scopes')) {
          await handleInsufficientScopeError();
          return;
        }
        
        throw new Error(`Google Drive API error: ${errorData.error.message || response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.files || !Array.isArray(data.files)) {
        setRootFolders([]);
        return;
      }

      const items: FileItem[] = (data as GoogleDriveResponse).files.map((item) => ({
        id: item.id,
        name: item.name,
        type: item.mimeType === 'application/vnd.google-apps.folder' ? 'folder' : 'file',
        path: [],
        url: item.mimeType !== 'application/vnd.google-apps.folder' ? item.webViewLink : undefined,
        downloadUrl: item.webContentLink,
        size: item.size,
        lastModified: item.modifiedTime ? new Date(item.modifiedTime).toLocaleDateString() : undefined,
        parents: item.parents,
        mimeType: item.mimeType,
      }));
      
      const sortedItems = sortFiles(items);
      
      setRootFolders(sortedItems);
    } catch (error) {
      console.error('❌ Error fetching files:', error);
      setRootFolders([]);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: `ไม่สามารถดึงข้อมูลจาก Google Drive ได้: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  }, [accessToken, refreshToken, toast, handleTokenExpired, refreshAccessToken, handleInsufficientScopeError]);

  const handleConnectGoogleDrive = useCallback(async () => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        if (user && user.role === 'Admin') {
          toast({
            title: "กรุณาตั้งค่า Google Drive",
            description: "กรุณากรอก Google OAuth Client ID และ Client Secret",
            variant: "destructive",
          });
          setShowConfig(true);
        } else {
          toast({
            title: "ไม่สามารถเชื่อมต่อ Google Drive",
            description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google Drive",
            variant: "destructive",
          });
        }
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(JSON.stringify({ type: 'drive' }))}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error connecting to Google Drive:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเชื่อมต่อ Google Drive ได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await userService.getGoogleDriveSettings();
        
        if (settings) {
          if (settings.clientId) {
            setClientId(settings.clientId);
            localStorage.setItem('clientId', settings.clientId);
          }
          if (settings.clientSecret) {
            setClientSecret(settings.clientSecret);
            localStorage.setItem('clientSecret', settings.clientSecret);
          }
          if (settings.driveUrl) {
            setDriveUrl(settings.driveUrl);
            setInputUrl(settings.driveUrl);
            localStorage.setItem('driveUrl', settings.driveUrl);
            
            const storedAccessToken = localStorage.getItem('accessToken');
            if (storedAccessToken) {
              const match = settings.driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
              const folderId = match ? match[1] : null;
              if (folderId) {
                fetchFiles(folderId);
              } else {
                console.error('Invalid driveUrl format:', settings.driveUrl);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading Google Drive settings:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถโหลดการตั้งค่า Google Drive ได้",
          variant: "destructive",
        });
      }
    };
    loadSettings();
  }, [toast, fetchFiles]);

  useEffect(() => {
    const loadUserSessionAndHandleOAuth = async () => {
      try {
        const storedEmail = localStorage.getItem('userEmail');
        const storedAccessToken = localStorage.getItem('accessToken');
        const storedRefreshToken = localStorage.getItem('refreshToken');
        const storedClientId = localStorage.getItem('clientId');
        const storedClientSecret = localStorage.getItem('clientSecret');
        const storedDriveUrl = localStorage.getItem('driveUrl');

        if (!clientId && storedClientId) setClientId(storedClientId);
        if (!clientSecret && storedClientSecret) setClientSecret(storedClientSecret);
        if (!driveUrl && storedDriveUrl) {
          setDriveUrl(storedDriveUrl);
          setInputUrl(storedDriveUrl);
        }
        if (storedAccessToken) setAccessToken(storedAccessToken);
        if (storedRefreshToken) setRefreshToken(storedRefreshToken);
        if (storedEmail) setUserEmail(storedEmail);
        if (storedEmail) {
          setUserRole(adminEmails.includes(storedEmail.toLowerCase()) ? 'Admin' : 'Viewer');
        }

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');

        if (code) {
          await handleAuthCode(code);
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (storedAccessToken) {
          const storedRole = storedEmail ? (adminEmails.includes(storedEmail.toLowerCase()) ? 'Admin' : 'Viewer') : null;
          const params: ValidateAccessTokenParams = {
            token: storedAccessToken,
            email: storedEmail,
            role: storedRole
          };
          await validateAccessToken(params);
        }

      } catch (error) {
        console.error('Error loading user session and handling OAuth:', error);
        handleTokenExpired();
      }
    };

    loadUserSessionAndHandleOAuth();
  }, [handleTokenExpired, handleAuthCode, validateAccessToken, setUser, toast, clientId, clientSecret, driveUrl, accessToken, refreshToken, userEmail, userRole, user]);

  useEffect(() => {
    const match = driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
    const initialFolderId = match ? match[1] : null;

    if (!driveUrl) {
      setRootFolders([]);
      return;
    }

    if (!accessToken) {
      setRootFolders([]);
      return;
    }

    const folderIdToFetch = currentPath.length > 0 
      ? currentPath[currentPath.length - 1]
      : initialFolderId;

    if (folderIdToFetch) {
      fetchFiles(folderIdToFetch);
    } else {
      setRootFolders([]);
    }

  }, [driveUrl, accessToken, currentPath, fetchFiles]);

  useEffect(() => {
    const autoLoadDriveUrlFromEnv = async () => {
      if (accessToken && !driveUrl) {
        
        try {
          const settings = await userService.getGoogleDriveSettings();
          
          if (settings?.driveUrl) {
            
            setDriveUrl(settings.driveUrl);
            setInputUrl(settings.driveUrl);
            localStorage.setItem('driveUrl', settings.driveUrl);
            
            const match = settings.driveUrl.match(/folders\/([a-zA-Z0-9_-]+)/);
            const folderId = match ? match[1] : null;
            if (folderId) {
              fetchFiles(folderId);
            }
          }
        } catch (error) {
          console.error('❌ Error auto-loading drive URL from environment:', error);
        }
      }
    };

    autoLoadDriveUrlFromEnv();
  }, [accessToken, driveUrl, fetchFiles]);

  const handlePathChange = useCallback((path: string[]) => {
    setCurrentPath(path);
    setSelectedFile(null);
  }, []);

  const handleItemClick = useCallback((item: FileItem) => {
    if (item.type === 'folder') {
      setSelectedFile(null);
    } else {
      setSelectedFile(item);
    }
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentPath(prevPath => prevPath.slice(0, -1));
    setSelectedFile(null);
  }, []);

  const LoadingScreen = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 transition-opacity duration-300">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">กำลังออกจากระบบ...</p>
      </div>
    </div>
  );

  if (isLoggingOut) {
    return <LoadingScreen />;
  }

  if (!user) {
    return (
      <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
        <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 transition-opacity duration-300">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">กำลังตรวจสอบการเข้าสู่ระบบ...</p>
          </div>
        </div>
      </AuthActionsProvider>
    );
  }

  return (
    <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
      <div className="min-h-screen bg-gray-50 transition-opacity duration-300">
        <Header 
          onConnectDrive={handleConnectGoogleDrive}
          accessToken={accessToken}
        />
        <Dialog open={showConfig} onOpenChange={setShowConfig}>
          <DialogContent aria-describedby="dialog-description">
            <DialogHeader>
              <DialogTitle>ตั้งค่า Google Drive</DialogTitle>
              <DialogDescription id="dialog-description">
                {user.role === 'Admin'
                  ? "ตั้งค่า Google OAuth Client ID และ Client Secret สำหรับการเชื่อมต่อกับ Google Drive"
                  : "เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถตั้งค่าได้"}
              </DialogDescription>
            </DialogHeader>
            {user.role === 'Admin' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="clientId">Google OAuth Client ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your Google OAuth Client ID"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="clientSecret">Google OAuth Client Secret</Label>
                  <Input
                    id="clientSecret"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter your Google OAuth Client Secret"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driveUrl">Google Drive Folder URL</Label>
                  <Input
                    id="driveUrl"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Enter the URL of the Google Drive folder"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button onClick={handleGoogleLogin} variant="outline">
                    Login with Google
                  </Button>
                  <Button onClick={handleTestAccess} disabled={isTesting || !accessToken}>
                    Test Access
                  </Button>
                  <Button onClick={handleSaveDriveUrl}>Save Settings</Button>
                </div>
                {testResult && (
                  <div className={`p-2 rounded ${testResult.startsWith('Access successful') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {testResult}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <div className="flex h-[calc(100vh-64px)]">
          <div className="flex-1 flex">
            <FileBrowser
              currentPath={currentPath}
              onPathChange={handlePathChange}
              onFileSelect={setSelectedFile}
              rootFolders={rootFolders}
              userRole={user.role}
              accessToken={accessToken}
              onInsufficientScopeError={handleInsufficientScopeError}
            />
            {selectedFile && selectedFile.type === 'file' && (
              <PDFViewer file={selectedFile} onClose={() => setSelectedFile(null)} />
            )}
          </div>
        </div>
      </div>
    </AuthActionsProvider>
  );
};
