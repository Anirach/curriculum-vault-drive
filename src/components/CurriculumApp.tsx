import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './dashboard/Dashboard';
import { LandingPage } from './LandingPage';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { AuthActionsProvider } from '@/contexts/AuthActionsContext';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/user';
import { useLocation, useNavigate } from 'react-router-dom';

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

  const refreshAccessToken = async (refreshToken: string) => {
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
        throw new Error('Failed to refresh token');
      }

      const data = await response.json();
      localStorage.setItem('accessToken', data.access_token);
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      // ถ้า refresh token ไม่สำเร็จ ให้ลบ token ทั้งหมด
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  };

  const validateAndRefreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    const accessToken = localStorage.getItem('accessToken');

    if (!refreshToken) {
      console.log('No refresh token found');
      return null;
    }

    try {
      // ถ้าไม่มี access token หรือ token หมดอายุ ให้ refresh
      if (!accessToken) {
        console.log('No access token, attempting to refresh...');
        return await refreshAccessToken(refreshToken);
      }

      // ตรวจสอบว่า token ยังใช้งานได้หรือไม่
      const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        return accessToken;
      }

      // ถ้า token หมดอายุ ให้ refresh
      console.log('Access token expired, refreshing...');
      return await refreshAccessToken(refreshToken);
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsInitializing(true);
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
            throw new Error('Failed to exchange code for tokens');
          }

          const tokenData = await tokenResponse.json();
          localStorage.setItem('accessToken', tokenData.access_token);
          if (tokenData.refresh_token) {
            localStorage.setItem('refreshToken', tokenData.refresh_token);
          }

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
          // กำหนด role ตาม email เท่านั้น ไม่สนใจโดเมน
          const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];
          const role: UserRole = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';

          setUser({
            email: userData.email,
            name: userData.name,
            picture: userData.picture,
            role
          });

          // เก็บข้อมูลการ login
          localStorage.setItem('userEmail', userData.email);
          localStorage.setItem('userName', userData.name);
          localStorage.setItem('userPicture', userData.picture);
          localStorage.setItem('userRole', role);

          // ถ้าเป็นการ login ปกติ ให้ไปที่ Dashboard
          if (authType === 'login') {
            navigate('/dashboard');
          }
        } else {
          // ถ้าไม่มี code ให้ตรวจสอบ token ที่มีอยู่
          const validToken = await validateAndRefreshToken();
          if (validToken) {
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                Authorization: `Bearer ${validToken}`,
              },
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();
              const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];
              const role: UserRole = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';

              setUser({
                email: userData.email,
                name: userData.name,
                picture: userData.picture,
                role
              });
            }
          }
        }
      } catch (error) {
        console.error('Error during Google authentication:', error);
        toast({
          title: "เกิดข้อผิดพลาด",
          description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
          variant: "destructive",
        });
        // ลบข้อมูลการ login ที่ไม่ถูกต้อง
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('userPicture');
      } finally {
        setIsLoading(false);
        // รีเซ็ต isInitializing ทันทีหลังจากโหลดเสร็จ
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [location.state, setUser, navigate, toast, setIsLoading, validateAndRefreshToken]);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const handleGoogleLogin = async () => {
    try {
      // ตรวจสอบว่ามี refresh token อยู่หรือไม่
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          // ลองใช้ refresh token ก่อน
          const newAccessToken = await refreshAccessToken(refreshToken);
          if (newAccessToken) {
            // ถ้าสำเร็จ ให้ดึงข้อมูลผู้ใช้
            const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: {
                Authorization: `Bearer ${newAccessToken}`,
              },
            });

            if (userResponse.ok) {
              const userData = await userResponse.json();
              const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];
              const role: UserRole = adminEmails.includes(userData.email.toLowerCase()) ? 'Admin' : 'Viewer';

              setUser({
                email: userData.email,
                name: userData.name,
                picture: userData.picture,
                role
              });

              // เก็บข้อมูลการ login
              localStorage.setItem('userEmail', userData.email);
              localStorage.setItem('userName', userData.name);
              localStorage.setItem('userPicture', userData.picture);
              localStorage.setItem('userRole', role);

              navigate('/dashboard');
              return;
            }
          }
        } catch (error) {
          console.log('Refresh token failed, proceeding with normal login');
        }
      }

      // ถ้าไม่มี refresh token หรือ refresh ไม่สำเร็จ ให้ทำ OAuth ตามปกติ
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
  };

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
  if (isAuthenticated && user) {
    return <DashboardContent />;
  }

  // ถ้ายังไม่ได้ authenticate หรือไม่มี user ให้แสดง Landing Page
  return <LandingPageContent />;
};

export const CurriculumApp = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
