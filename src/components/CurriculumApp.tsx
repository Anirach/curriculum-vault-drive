
import React, { useState } from 'react';
import { LoginForm } from './auth/LoginForm';
import { Dashboard } from './dashboard/Dashboard';
import { UserProvider } from '@/contexts/UserContext';

export const CurriculumApp = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return (
    <UserProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {!isAuthenticated ? (
          <LoginForm onLogin={() => setIsAuthenticated(true)} />
        ) : (
          <Dashboard />
        )}
      </div>
    </UserProvider>
  );
};
