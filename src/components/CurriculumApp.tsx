
import React, { useState, useEffect } from 'react';
import { LoginForm } from './auth/LoginForm';
import { Dashboard } from './dashboard/Dashboard';
import { LandingPage } from './LandingPage';
import { UserProvider, useUser } from '@/contexts/UserContext';

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { user, isLoading } = useUser();

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Dashboard onAdminLogin={() => { /* จะส่ง handleGoogleLogin จาก Dashboard ขึ้นมาที่นี่ */ }} />
      </div>
    );
  }

  return <LandingPage onLoginClick={handleLoginClick} />;
};

export const CurriculumApp = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
