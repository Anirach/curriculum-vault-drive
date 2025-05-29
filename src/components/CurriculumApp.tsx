import React, { useState, useEffect, useCallback } from 'react';
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

  const refreshAccessToken = useCallback(async (refreshToken: string) => {
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
      encryptedStorage.setTokens(data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // ถ้า refresh token ไม่สำเร็จ ให้ลบ token ทั้งหมด
      encryptedStorage.clearUserData();
      throw error;
    }
  }, []);

  const validateAndRefreshToken = useCallback(async () => {
    const { refreshToken, accessToken } = encryptedStorage.getTokens();

    if (!refreshToken) {
      return null;
    }

    try {
      // ถ้าไม่มี access token ให้ refresh ทันที
      if (!accessToken) {
        try {
          const newAccessToken = await refreshAccessToken(refreshToken);
          return newAccessToken;
        } catch (error) {
          console.error('Failed to refresh access token:', error);
          // ถ้า refresh ไม่สำเร็จ ให้ลบ token ทั้งหมด
          encryptedStorage.clearUserData();
          return null;
        }
      }

      // ตรวจสอบว่า token ยังใช้งานได้หรือไม่
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (response.ok) {
          return accessToken;
        }
      } catch (error) {
        console.error('Access token validation failed:', error);
      }

      // ถ้า token หมดอายุหรือไม่สามารถใช้งานได้ ให้ refresh
      try {
        const newAccessToken = await refreshAccessToken(refreshToken);
        return newAccessToken;
      } catch (error) {
        console.error('Failed to refresh access token:', error);
        // ถ้า refresh ไม่สำเร็จ ให้ลบ token ทั้งหมด
        encryptedStorage.clearUserData();
        return null;
      }
    } catch (error) {
      console.error('Error in validateAndRefreshToken:', error);
      // ถ้าเกิดข้อผิดพลาด ให้ลบ token ทั้งหมด
      encryptedStorage.clearUserData();
      return null;
    }
  }, [refreshAccessToken]);

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

      const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];
      const role: UserRole = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';

      // Determine the display name - use actual name from Google API
      const displayName = userData.name && userData.name.trim() ? userData.name.trim() : 'Anirach Mingkhwan';

      const userInfo = {
        email: userData.email,
        name: displayName,
        picture: userData.picture,
        role
      };

      setUser(userInfo);

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
        
        // Migrate existing localStorage data to encrypted storage
        EncryptedStorage.migrateExistingData(SENSITIVE_KEYS);
        
        // Clear old cached user data to ensure new name logic takes effect
        const userData = encryptedStorage.getUserData();
        
        // Clear any old cached names that are not the full name
        if (userData.name && (userData.name === 'Anirach.M' || userData.name === 'anirach.m' || userData.name.includes('A.M') || userData.name.includes('anirach.m'))) {
          encryptedStorage.clearUserData();
        }
        
        const code = location.state?.code;
        const authType = location.state?.type;

        if (code) {
          // จัดการ authorization code
          const settings = await userService.getGoogleDriveSettings();
          if (!settings?.clientId || !settings?.clientSecret) {
            throw new Error('Google OAuth settings not configured');
          }

          const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
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

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange error:', errorData);
            throw new Error('Failed to exchange code for tokens');
          }

          const tokenData = await tokenResponse.json();
          
          // เก็บ tokens
          encryptedStorage.setTokens(tokenData.access_token, tokenData.refresh_token);

          // ดึงข้อมูลผู้ใช้
          const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
            headers: {
              Authorization: `Bearer ${tokenData.access_token}`,
            },
          });

          if (!userResponse.ok) {
            throw new Error('Failed to fetch user info');
          }
          
          const userData = await userResponse.json();

          const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];
          const role: UserRole = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';

          // Determine the display name - use actual name from Google API
          const displayName = userData.name && userData.name.trim() ? userData.name.trim() : 'Anirach Mingkhwan';

          const userInfo = {
            email: userData.email,
            name: displayName,
            picture: userData.picture,
            role
          };

          setUser(userInfo);

          // เก็บข้อมูลการ login
          encryptedStorage.setUserData(userData.email, userInfo.name, userData.picture || '', role);

          // ถ้าเป็นการ login ปกติ ให้ไปที่ Dashboard
          if (authType === 'login') {
            navigate('/dashboard');
          }
        } else {
          // ถ้าไม่มี code ให้ตรวจสอบ token ที่มีอยู่
          const isValid = await checkAndSetUserFromToken();
          if (isValid) {
            // ถ้า token ใช้งานได้ ให้ไปที่ Dashboard ถ้าอยู่ที่หน้า dashboard
            if (location.pathname === '/dashboard') {
              navigate('/dashboard');
            }
          }
        }
      } catch (error) {
        console.error('Error during initialization:', error);
        // ลบข้อมูลการ login ที่ไม่ถูกต้อง
        encryptedStorage.clearUserData();
      } finally {
        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [location.state, location.pathname, setUser, navigate, toast, setIsLoading, checkAndSetUserFromToken]);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      // ตรวจสอบ token ที่มีอยู่ก่อน
      const isValid = await checkAndSetUserFromToken();
      if (isValid) {
        // ถ้า token ใช้งานได้ ให้ไปที่ Dashboard
        navigate('/dashboard');
        return;
      }

      // ถ้า token ไม่สามารถใช้งานได้ ให้ทำ OAuth ตามปกติ
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        toast({
          title: "กรุณาตั้งค่า Google OAuth",
          description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
          variant: "destructive",
        });
        return;
      }

      localStorage.setItem('returnPath', window.location.pathname);
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${settings.clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${encodeURIComponent(JSON.stringify({ type: 'login' }))}`;

      window.location.href = authUrl;
    } catch (error) {
      console.error('Error during Google login:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [checkAndSetUserFromToken, navigate, toast]);

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
