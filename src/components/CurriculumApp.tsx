import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './auth/LoginForm';
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
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { user, isLoading, setUser, setIsLoading } = useUser();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const refreshAccessToken = async (refreshToken: string, clientId: string, clientSecret: string) => {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
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
    const clientId = localStorage.getItem('clientId');
    const clientSecret = localStorage.getItem('clientSecret');

    if (!refreshToken || !clientId || !clientSecret) {
      console.log('No refresh token or client credentials found');
      return null;
    }

    try {
      // ถ้าไม่มี access token หรือ token หมดอายุ ให้ refresh
      if (!accessToken) {
        console.log('No access token, attempting to refresh...');
        return await refreshAccessToken(refreshToken, clientId, clientSecret);
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
      return await refreshAccessToken(refreshToken, clientId, clientSecret);
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
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
      }
    };

    initializeApp();
  }, [location.state, setUser, navigate, toast]);

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
      setShowLoginForm(false);
    } else {
      setIsAuthenticated(false);
    }
  }, [user]);

  const handleLoginClick = () => {
    setShowLoginForm(true);
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setShowLoginForm(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        toast({
          title: "กรุณาตั้งค่า Google OAuth",
          description: "กรุณาติดต่อผู้ดูแลระบบเพื่อตั้งค่า Google OAuth",
          variant: "destructive",
        });
        return;
      }

      // บันทึก path ปัจจุบันก่อน redirect
      localStorage.setItem('returnPath', window.location.pathname);

      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (showLoginForm) {
    return <LoginForm onLogin={handleLoginSuccess} />;
  }

  if (isAuthenticated && user) {
    return (
      <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <Dashboard />
        </div>
      </AuthActionsProvider>
    );
  }

  return (
    <AuthActionsProvider handleGoogleLogin={handleGoogleLogin}>
      <LandingPage onLoginClick={handleLoginClick} />
    </AuthActionsProvider>
  );
};

export const CurriculumApp = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
