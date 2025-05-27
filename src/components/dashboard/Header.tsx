import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, LogOut, User, Users } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { UserManagement } from '../admin/UserManagement';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { userService } from '@/services/userService';
import { UserRole } from '@/types/user';

export const Header = ({ 
  onConfigDrive, 
  onConnectDrive,
  accessToken
}: { 
  onConfigDrive?: () => void;
  onConnectDrive?: () => Promise<void>;
  accessToken?: string | null;
}) => {
  const { user, setUser } = useUser();
  const [showUserManagement, setShowUserManagement] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // ลบข้อมูลจาก localStorage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userRole');
      localStorage.removeItem('clientId');
      localStorage.removeItem('clientSecret');
      localStorage.removeItem('driveUrl');
      localStorage.removeItem('currentUser');

      // ล้างข้อมูลจาก IndexedDB
      await userService.logout();
      
      // รีเซ็ต user context
      setUser(null);

      // แสดง toast
      toast({
        title: "ออกจากระบบสำเร็จ",
        description: "ขอบคุณที่ใช้งานระบบ",
      });

      // redirect ไปที่หน้าแรก (ซึ่งจะแสดงหน้า login)
      window.location.href = '/';
    } catch (error) {
      console.error('Error during logout:', error);
      toast({
        title: "เกิดข้อผิดพลาด",
        description: "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง",
        variant: "destructive",
      });
    }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'Admin':
        return 'bg-red-500 hover:bg-red-600';
      case 'Viewer':
        return 'bg-green-500 hover:bg-green-600';
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  return (
    <>
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-semibold text-gray-900">Curriculum Vault Drive</span>
            </div>
          </div>
          {user && (
            <>
              <div className="flex items-center space-x-4">
                {user.role === 'Admin' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => setShowUserManagement(true)}>
                      <Users className="w-4 h-4 mr-2" />
                      จัดการผู้ใช้
                    </Button>
                    {onConfigDrive && (
                      <Button variant="outline" size="sm" onClick={onConfigDrive}>
                        ตั้งค่า Drive
                      </Button>
                    )}
                  </>
                )}
                {!accessToken && onConnectDrive && (
                  <Button variant="outline" size="sm" onClick={onConnectDrive}>
                    เชื่อมต่อ Google Drive
                  </Button>
                )}
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
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  ออกจากระบบ
                </Button>
              </div>
            </>
          )}
        </div>
      </header>
      {showUserManagement && (
        <Dialog open={showUserManagement} onOpenChange={setShowUserManagement}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Users className="w-4 h-4 mr-2" />
              User Management
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" aria-describedby="user-management-description">
            <DialogHeader>
              <DialogTitle>User Management</DialogTitle>
              <DialogDescription id="user-management-description">
                จัดการผู้ใช้งานระบบ เพิ่ม แก้ไข หรือลบผู้ใช้งาน
              </DialogDescription>
            </DialogHeader>
            <UserManagement />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
