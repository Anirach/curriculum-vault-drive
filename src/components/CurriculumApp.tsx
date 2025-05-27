import React, { useState, useEffect, useCallback } from 'react';
import { LoginForm } from './auth/LoginForm';
import { Dashboard } from './dashboard/Dashboard';
import { LandingPage } from './LandingPage';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { AuthActionsProvider } from '@/contexts/AuthActionsContext';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/user';

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { user, isLoading, setUser } = useUser();
  const { toast } = useToast();

  const handleAuthCode = useCallback(async (code: string) => {
    try {
      const settings = await userService.getGoogleDriveSettings();
      if (!settings || !settings.clientId || !settings.clientSecret) {
        throw new Error('Missing Google OAuth settings');
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
          redirect_uri: window.location.origin,
          grant_type: 'authorization_code',
        }),
      });

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // ดึงข้อมูลผู้ใช้จาก Google
      const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` }
      });

      if (!userResponse.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userData = await userResponse.json();
      const email = userData.email;
      const adminEmails = ['anirach.m@fitm.kmutnb.ac.th'];
      const role: UserRole = adminEmails.includes(email.toLowerCase()) ? 'Admin' : 'Viewer';

      // สร้าง user object
      const newUser = {
        id: userData.id || 'oauth-user',
        email: email,
        name: userData.name || email.split('@')[0],
        picture: userData.picture,
        role,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // บันทึกข้อมูลลง localStorage
      localStorage.setItem('currentUser', JSON.stringify(newUser));
      localStorage.setItem('userRole', role);
      localStorage.setItem('userEmail', email);
      localStorage.setItem('authToken', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('authRefreshToken', data.refresh_token);
      }

      // อัพเดท user context
      setUser(newUser);
      setIsAuthenticated(true);
      setShowLoginForm(false);

      toast({
        title: "เข้าสู่ระบบสำเร็จ",
        description: `ยินดีต้อนรับ ${newUser.name} (${newUser.role})`,
      });

      // ลบ code จาก URL
      window.history.replaceState({}, document.title, window.location.pathname);

    } catch (error) {
      console.error('Error during Google authentication:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  }, [setUser, toast]);

  useEffect(() => {
    // ตรวจสอบ authorization code จาก URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      handleAuthCode(code);
    }
  }, [handleAuthCode]);

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

      const redirectUri = window.location.origin;
      const scope = 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
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
