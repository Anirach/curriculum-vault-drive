import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole, ROLE_PERMISSIONS } from '@/types/user';
import { userService } from '@/services/userService';

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hasPermission: (action: 'upload' | 'delete' | 'view') => boolean;
  isLoading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setError('Failed to load user data');
        console.error('Error loading user:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const hasPermission = (action: 'upload' | 'delete' | 'view'): boolean => {
    if (!user) return false;
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions.permissions[action];
  };

  return (
    <UserContext.Provider value={{ user, setUser, hasPermission, isLoading, error }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
