import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Dashboard } from './dashboard/Dashboard';
import { LandingPage } from './LandingPage';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { AuthActionsProvider } from '@/contexts/AuthActionsContext';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/user';
import { useLocation, useNavigate } from 'react-router-dom';
import { encryptedStorage, SENSITIVE_KEYS, EncryptedStorage } from '@/services/encryptedStorage';

// เพิ่ม interface สำหรับ User
interface User {
  email: string;
  name: string;
  picture?: string;
  role?: UserRole;
}

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user, isLoading, setUser, setIsLoading } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [isInitializing, setIsInitializing] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  // Enhanced token refresh with automatic scheduling
  const refreshAccessToken = useCallback(async (refreshToken: string) => {
    if (isRefreshingRef.current) {
      console.log('Token refresh already in progress, skipping...');
      return null;
    }

    isRefreshingRef.current = true;
    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings?.clientId || !settings?.clientSecret) {
        throw new Error('Google OAuth settings not configured');
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: settings.clientId,
          client_secret: settings.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Token refresh error:', errorData);
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      // Store both access token and refresh token (refresh token might be rotated)
      encryptedStorage.setTokens(data.access_token, data.refresh_token || refreshToken);
      
      console.log('Token refreshed successfully');
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // ถ้า refresh token ไม่สำเร็จ ให้ลบ token ทั้งหมด
      encryptedStorage.clearUserData();
      throw error;
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  // Enhanced token validation with automatic refresh scheduling
  const validateAndRefreshToken = useCallback(async () => {
    const { refreshToken, accessToken } = encryptedStorage.getTokens();

    if (!refreshToken) {
      console.log('No refresh token available');
      return null;
    }

    try {
      // ถ้าไม่มี access token ให้ refresh ทันที
      if (!accessToken) {
        console.log('No access token, refreshing immediately');
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          return newAccessToken;
        } catch (error) {
          console.error('Failed to refresh access token:', error);
          encryptedStorage.clearUserData();
          return null;
        }
      }

      // ตรวจสอบว่า token ยังใช้งานได้หรือไม่โดยการเรียก API
      try {
        console.log('Validating existing access token');
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          console.log('Access token is still valid');
          return accessToken;
        } else if (response.status === 401) {
          console.log('Access token expired, refreshing...');
          // Token หมดอายุ ให้ refresh
          const newAccessToken = await refreshAccessToken(refreshToken);
          return newAccessToken;
        } else {
          throw new Error(`Token validation failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error('Access token validation failed:', error);
        // ถ้า token หมดอายุหรือไม่สามารถใช้งานได้ ให้ refresh
        try {
          console.log('Attempting to refresh token after validation failure');
          const newAccessToken = await refreshAccessToken(refreshToken);
          return newAccessToken;
        } catch (refreshError) {
          console.error('Failed to refresh access token:', refreshError);
          encryptedStorage.clearUserData();
          return null;
        }
      }
    } catch (error) {
      console.error('Error in validateAndRefreshToken:', error);
      encryptedStorage.clearUserData();
      return null;
    }
  }, [refreshAccessToken]);

  // Setup automatic token refresh interval
  const setupTokenRefreshInterval = useCallback(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up automatic token refresh every 50 minutes (tokens expire in 1 hour)
    intervalRef.current = setInterval(async () => {
      const { refreshToken } = encryptedStorage.getTokens();
      if (refreshToken && !isRefreshingRef.current) {
        console.log('Running automatic token refresh...');
        try {
          await refreshAccessToken(refreshToken);
          console.log('Automatic token refresh completed successfully');
        } catch (error) {
          console.error('Automatic token refresh failed:', error);
          // If automatic refresh fails, user will need to re-authenticate
          // Don't clear data immediately, let the user continue using the app
          // until they try to make an API call that fails
        }
      }
    }, 50 * 60 * 1000); // 50 minutes

    console.log('Token refresh interval set up');
  }, [refreshAccessToken]);

  // Clear token refresh interval
  const clearTokenRefreshInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Token refresh interval cleared');
    }
  }, []);

  const checkAndSetUserFromToken = useCallback(async () => {
    try {
      const validToken = await validateAndRefreshToken();
      if (!validToken) {
        return false;
      }

      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        console.error('Failed to fetch user info:', errorText);
        return false;
      }

      const userData = await userResponse.json();

      const adminEmails = ['anirach.m@fitm.kmutnb.ac.th', 'chutharat.m@op.kmutnb.ac.th'];
      const role: UserRole = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';

      // Determine the display name - use actual name from Google API
      const displayName = userData.name && userData.name.trim() ? userData.name.trim() : 'Anirach Mingkhwan';

      const userInfo = {
        id: userData.id || 'oauth-user',
        email: userData.email,
        name: displayName,
        picture: userData.picture,
        role: role as UserRole,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      setUser(userInfo);
      
      // Also store in localStorage for Dashboard component compatibility
      localStorage.setItem('currentUser', JSON.stringify(userInfo));

      // เก็บข้อมูลการ login
      encryptedStorage.setUserData(userData.email, userInfo.name, userData.picture || '', role);

      return true;
    } catch (error) {
      console.error('Error in checkAndSetUserFromToken:', error);
      return false;
    }
  }, [setUser, validateAndRefreshToken]);

  // ตรวจสอบ token เมื่อ component โหลด
  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsInitializing(true);
        console.log('🚀 DEBUG: Initializing app...');
        
        // Debug environment and configuration
        console.log('🔧 DEBUG: Environment check:', {
          mode: import.meta.env.MODE,
          isDev: import.meta.env.DEV,
          isProd: import.meta.env.PROD,
          baseUrl: import.meta.env.BASE_URL,
          hasViteGoogleClientId: !!import.meta.env.VITE_GOOGLE_CLIENT_ID,
          hasViteGoogleClientSecret: !!import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
          hasViteGoogleDriveUrl: !!import.meta.env.VITE_GOOGLE_DRIVE_URL,
          viteClientIdLength: import.meta.env.VITE_GOOGLE_CLIENT_ID?.length || 0,
          viteClientSecretLength: import.meta.env.VITE_GOOGLE_CLIENT_SECRET?.length || 0,
          currentOrigin: window.location.origin,
          currentPathname: location.pathname
        });

        // Configuration validation
        const hasRequiredEnvVars = !!(import.meta.env.VITE_GOOGLE_CLIENT_ID && import.meta.env.VITE_GOOGLE_CLIENT_SECRET);
        if (!hasRequiredEnvVars) {
          console.error('❌ DEBUG: Missing required environment variables!');
          console.error('❌ DEBUG: Please check your .env file contains:');
          console.error('❌ DEBUG: - VITE_GOOGLE_CLIENT_ID');
          console.error('❌ DEBUG: - VITE_GOOGLE_CLIENT_SECRET');
          console.error('❌ DEBUG: - VITE_GOOGLE_DRIVE_URL (optional)');
        } else {
          console.log('✅ DEBUG: Environment variables are configured');
        }

        // Migrate existing localStorage data to encrypted storage
        EncryptedStorage.migrateExistingData(SENSITIVE_KEYS);

        // Try to restore user from encrypted storage/localStorage first
        let userData = encryptedStorage.getUserData();
        if (!userData) {
          // fallback to localStorage for backward compatibility
          const localUser = localStorage.getItem('currentUser');
          if (localUser) {
            try {
              userData = JSON.parse(localUser);
            } catch (e) {
              // Ignore JSON parse errors
            }
          }
        }
        // If we have user data and tokens, set user state immediately
        const { refreshToken, accessToken } = encryptedStorage.getTokens();
        if (userData && refreshToken) {
          setUser({ ...userData, role: userData.role as UserRole });
          setIsAuthenticated(true);
        }

        // Clear old cached user data to ensure new name logic takes effect
        if (userData && userData.name && (userData.name === 'Anirach.M' || userData.name === 'anirach.m' || userData.name.includes('A.M') || userData.name.includes('anirach.m'))) {
          console.log('Clearing old cached user data');
          encryptedStorage.clearUserData();
        }

        const code = location.state?.code;
        const authType = location.state?.type;

        if (code) {
          // OAuth callback flow
          console.log('🔐 DEBUG: Processing OAuth callback');
          console.log('🔐 DEBUG: Authorization code:', code.substring(0, 20) + '...');
          console.log('🔐 DEBUG: Auth type:', authType);
          console.log('🔐 DEBUG: Location state:', location.state);
          
          try {
            console.log('🔐 DEBUG: Fetching Google OAuth settings for token exchange');
            const settings = await userService.getGoogleDriveSettings();
            console.log('🔐 DEBUG: Settings for token exchange:', {
              hasSettings: !!settings,
              hasClientId: !!settings?.clientId,
              hasClientSecret: !!settings?.clientSecret
            });

            const redirectUri = `${window.location.origin}/auth/callback`;
            console.log('🔐 DEBUG: Token exchange redirect URI:', redirectUri);

            const tokenRequestParams = {
              code,
              client_id: settings.clientId,
              client_secret: settings.clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            };
            console.log('🔐 DEBUG: Token exchange request params:', {
              hasCode: !!tokenRequestParams.code,
              hasClientId: !!tokenRequestParams.client_id,
              hasClientSecret: !!tokenRequestParams.client_secret,
              redirectUri: tokenRequestParams.redirect_uri,
              grantType: tokenRequestParams.grant_type
            });

            console.log('🔐 DEBUG: Making token exchange request to Google');
            const response = await fetch('https://oauth2.googleapis.com/token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams(tokenRequestParams),
            });

            console.log('🔐 DEBUG: Token exchange response:', {
              status: response.status,
              statusText: response.statusText,
              ok: response.ok
            });

            const data = await response.json();
            console.log('🔐 DEBUG: Token exchange response data:', {
              hasAccessToken: !!data.access_token,
              hasRefreshToken: !!data.refresh_token,
              hasError: !!data.error,
              error: data.error,
              errorDescription: data.error_description,
              tokenType: data.token_type,
              expiresIn: data.expires_in
            });

            if (data.error) {
              console.error('❌ DEBUG: OAuth token exchange error:', data.error);
              console.error('❌ DEBUG: Error description:', data.error_description);
              throw new Error(`OAuth error: ${data.error} - ${data.error_description}`);
            }

            // Store tokens
            console.log('🔐 DEBUG: Storing tokens in encrypted storage');
            encryptedStorage.setTokens(data.access_token, data.refresh_token);

            // Get user info
            console.log('🔐 DEBUG: Fetching user info with access token');
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${data.access_token}` }
            });

            console.log('🔐 DEBUG: User info response:', {
              status: userResponse.status,
              statusText: userResponse.statusText,
              ok: userResponse.ok
            });

            const userData = await userResponse.json();
            console.log('🔐 DEBUG: User data from Google:', {
              hasId: !!userData.id,
              hasEmail: !!userData.email,
              hasName: !!userData.name,
              hasPicture: !!userData.picture,
              email: userData.email,
              name: userData.name
            });

            const adminEmails = ['anirach.m@fitm.kmutnb.ac.th', 'chutharat.m@op.kmutnb.ac.th'];
            const role = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';
            console.log('🔐 DEBUG: User role assigned:', role);

            const userInfo = {
              id: userData.id || 'oauth-user',
              email: userData.email,
              name: userData.name || 'User',
              picture: userData.picture,
              role: role as UserRole,
              createdAt: new Date(),
              updatedAt: new Date()
            };

            console.log('🔐 DEBUG: Setting user in context');
            setUser(userInfo);

            // เก็บข้อมูลการ login
            console.log('🔐 DEBUG: Storing user data in encrypted storage');
            encryptedStorage.setUserData(userData.email, userInfo.name, userData.picture || '', role);

            console.log('✅ DEBUG: User authenticated successfully via OAuth flow');

            // Setup automatic token refresh for authenticated user
            setupTokenRefreshInterval();

            // ถ้าเป็นการ login ปกติ ให้ไปที่ Dashboard
            if (authType === 'login') {
              console.log('🔐 DEBUG: Navigating to dashboard after successful OAuth');
              navigate('/dashboard');
            }
          } catch (error) {
            console.error('❌ DEBUG: OAuth flow error:', error);
            console.error('❌ DEBUG: Error stack:', error.stack);
            toast({
              title: "เกิดข้อผิดพลาด",
              description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
              variant: "destructive",
            });
            navigate('/');
          }
        } else {
          console.log('No authorization code, checking existing tokens...');
          // ถ้าไม่มี code ให้ตรวจสอบ token ที่มีอยู่
          const isValid = await checkAndSetUserFromToken();
          if (isValid) {
            console.log('Existing tokens are valid, user authenticated');
            // Setup automatic token refresh for authenticated user
            setupTokenRefreshInterval();
            // ถ้า token ใช้งานได้ ให้ไปที่ Dashboard ถ้าอยู่ที่หน้า dashboard
            if (location.pathname === '/dashboard') {
              navigate('/dashboard');
            }
          } else {
            // Only clear user if no valid tokens or refresh fails
            setUser(null);
            setIsAuthenticated(false);
            clearTokenRefreshInterval();
            // ถ้าอยู่ที่หน้า dashboard แต่ไม่มี token ให้กลับไปหน้า landing
            if (location.pathname === '/dashboard') {
              navigate('/');
            }
          }
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        encryptedStorage.clearUserData();
        clearTokenRefreshInterval();
        // ไปที่หน้า landing หากเกิดข้อผิดพลาด
        if (location.pathname === '/dashboard') {
          navigate('/');
        }
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
        console.log('App initialization completed');
      }
    };

    initializeApp();
  }, [location.state, location.pathname, setUser, navigate, toast, setIsLoading, checkAndSetUserFromToken, setupTokenRefreshInterval, clearTokenRefreshInterval]);

  // Monitor user authentication state and manage token refresh interval
  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      // Ensure token refresh is running when user is authenticated
      if (!intervalRef.current) {
        setupTokenRefreshInterval();
      }
    } else {
      setIsAuthenticated(false);
      // Clear token refresh when user is not authenticated
      clearTokenRefreshInterval();
    }
  }, [user, setupTokenRefreshInterval, clearTokenRefreshInterval]);

  // Enhanced Google login with better token management
  const handleGoogleLogin = useCallback(async () => {
    console.log('🚀 DEBUG: Starting Google login process');
    
    try {
      // If we have a refresh token, try silent login first
      const { refreshToken } = encryptedStorage.getTokens();
      console.log('🔍 DEBUG: Checking existing refresh token:', !!refreshToken);
      
      if (refreshToken) {
        console.log('🔄 DEBUG: Attempting silent login with existing refresh token');
        const isValid = await checkAndSetUserFromToken();
        console.log('✅ DEBUG: Silent login result:', isValid);
        if (isValid) {
          console.log('🎯 DEBUG: Silent login successful, navigating to dashboard');
          navigate('/dashboard');
          return;
        }
        console.log('❌ DEBUG: Silent login failed, proceeding with OAuth flow');
      }

      // Get OAuth settings
      console.log('⚙️ DEBUG: Fetching Google OAuth settings from userService');
      const settings = await userService.getGoogleDriveSettings();
      console.log('📋 DEBUG: OAuth settings received:', {
        hasSettings: !!settings,
        hasClientId: !!settings?.clientId,
        hasClientSecret: !!settings?.clientSecret,
        clientIdPrefix: settings?.clientId?.substring(0, 20) + '...',
        clientSecretPrefix: settings?.clientSecret?.substring(0, 10) + '...'
      });

      if (!settings || !settings.clientId || !settings.clientSecret) {
        console.error('❌ DEBUG: Missing OAuth configuration');
        console.error('❌ DEBUG: Settings object:', settings);
        toast({
          title: "กรุณาตั้งค่า Google OAuth",
          description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
          variant: "destructive",
        });
        return;
      }

      // Store return path and prepare OAuth
      console.log('💾 DEBUG: Storing return path:', window.location.pathname);
      localStorage.setItem('returnPath', window.location.pathname);
      const redirectUri = `${window.location.origin}/auth/callback`;
      console.log('🔗 DEBUG: Using redirect URI:', redirectUri);
      
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const state = JSON.stringify({ type: 'login' });
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(state)}`;
      
      console.log('🌐 DEBUG: OAuth URL parameters:', {
        clientId: settings.clientId.substring(0, 20) + '...',
        redirectUri: redirectUri,
        scope: scope,
        state: state
      });
      console.log('🌐 DEBUG: Full OAuth URL (first 200 chars):', authUrl.substring(0, 200) + '...');
      
      console.log('🚀 DEBUG: Redirecting to Google OAuth...');
      window.location.href = authUrl;
    } catch (error) {
      console.error('💥 DEBUG: Error during Google login:', error);
      console.error('💥 DEBUG: Error stack:', error.stack);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [checkAndSetUserFromToken, navigate, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTokenRefreshInterval();
    };
  }, [clearTokenRefreshInterval]);

  // แยก Loading Screen เป็น component แยก
  const LoadingScreen = () => (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 transition-opacity duration-300">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">
          {isInitializing ? 'กำลังเริ่มต้นระบบ...' : 'กำลังโหลด...'}
        </p>
      </div>
    </div>
  );

  // แยก Landing Page Content เป็น component แยก
  const LandingPageContent = () => {
    const handleLoginClick = async () => {
      try {
        await handleGoogleLogin();
      } catch (error) {
        console.error('Error during login:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
      }
    };

    return (
      <div className="transition-opacity duration-300">
        <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
          <LandingPage onLoginClick={handleLoginClick} />
        </AuthActionsProvider>
      </div>
    );
  };

  // แยก Dashboard Content เป็น component แยก
  const DashboardContent = () => (
    <div className="transition-opacity duration-300">
      <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Dashboard />
        </div>
      </AuthActionsProvider>
    </div>
  );

  // จัดการการ render ตามสถานะต่างๆ
  if (isLoading) {
    return <LoadingScreen />;
  }

  // ถ้า authenticate แล้วและมี user ให้แสดง Dashboard
  if (isAuthenticated && user && location.pathname === '/dashboard') {
    return <DashboardContent />;
  }

  // ถ้ายังไม่ได้ authenticate หรือไม่มี user หรือไม่ได้อยู่ที่ path /dashboard ให้แสดง Landing Page
  return <LandingPageContent />;
};

export const CurriculumApp = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
