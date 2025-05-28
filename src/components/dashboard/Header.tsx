import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GraduationCap, LogOut, User } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useToast } from '@/hooks/use-toast';
import { userService } from '@/services/userService';

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
                {user.role === 'Admin' && onConfigDrive && (
                  <Button variant="outline" size="sm" onClick={onConfigDrive}>
                    ตั้งค่า Drive
                  </Button>
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
    </>
  );
};
