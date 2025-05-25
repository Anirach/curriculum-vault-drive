
import React, { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'Admin' | 'Staff' | 'Viewer';

interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hasPermission: (action: 'upload' | 'delete' | 'view') => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const hasPermission = (action: 'upload' | 'delete' | 'view'): boolean => {
    if (!user) return false;
    
    switch (action) {
      case 'view':
        return ['Admin', 'Staff', 'Viewer'].includes(user.role);
      case 'upload':
        return ['Admin', 'Staff'].includes(user.role);
      case 'delete':
        return user.role === 'Admin';
      default:
        return false;
    }
  };

  return (
    <UserContext.Provider value={{ user, setUser, hasPermission }}>
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
