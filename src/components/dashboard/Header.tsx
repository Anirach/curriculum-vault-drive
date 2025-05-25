
import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';

export const Header = () => {
  const { user } = useUser();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-500 hover:bg-red-600';
      case 'Staff':
        return 'bg-yellow-500 hover:bg-yellow-600';
      case 'Viewer':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Curriculum Management System
            </h1>
            <p className="text-sm text-gray-500">
              Faculty → Department → Year → Curriculum
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                {user.role}
              </Badge>
              <div className="flex items-center space-x-2">
                <Avatar>
                  <AvatarFallback>
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
