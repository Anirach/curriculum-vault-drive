import React, { useState, useEffect } from 'react';
import { LoginForm } from './auth/LoginForm';
import { Dashboard } from './dashboard/Dashboard';
import { UserProvider, useUser } from '@/contexts/UserContext';

const AppContent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (user) {
      setIsAuthenticated(true);
    }
  }, [user]);

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

  return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {!isAuthenticated ? (
          <LoginForm onLogin={() => setIsAuthenticated(true)} />
        ) : (
          <Dashboard />
        )}
      </div>
  );
};

export const CurriculumApp = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};
