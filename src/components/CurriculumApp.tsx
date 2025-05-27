
import React, { useState, useEffect } from 'react';
import { LoginForm } from './auth/LoginForm';
import { Dashboard } from './dashboard/Dashboard';
import { LandingPage } from './LandingPage';
import { UserProvider, useUser } from '@/contexts/UserContext';
import { AuthActionsProvider } from '@/contexts/AuthActionsContext';
import { userService } from '@/services/userService';
import { useToast } from '@/hooks/use-toast';

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { user, isLoading, setUser } = useUser();
  const { toast } = useToast();

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
      const scope = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email';
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
