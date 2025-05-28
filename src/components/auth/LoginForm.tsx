import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { toast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: () => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useUser();
  const invitationToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (invitationToken) {
        // Invitation system has been removed
        toast({
          title: "Invitation System Unavailable",
          description: "The invitation system is no longer supported. Please contact the administrator.",
          variant: "destructive",
        });
      } else {
        // Email login is no longer supported
        toast({
          title: "Login Method Not Supported",
          description: "Please use Google OAuth login instead.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            {invitationToken ? 'Complete Registration' : 'Curriculum Management'}
          </CardTitle>
          <CardDescription>
            {invitationToken
              ? 'Set up your account to access the platform'
              : 'เข้าสู่ระบบเพื่อจัดการหลักสูตร'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {invitationToken && (
              <div className="text-center space-y-4">
                <p className="text-red-600 font-medium">
                  เชิญระบบไม่ได้รับการสนับสนุนอีกต่อไป
                </p>
                <p className="text-sm text-gray-500">
                  กรุณาติดต่อผู้ดูแลระบบเพื่อขอการเข้าถึง
                </p>
              </div>
            )}
            {!invitationToken && (
              <div className="text-center space-y-4">
                <p className="text-gray-600">
                  กรุณาใช้ Google OAuth สำหรับการเข้าสู่ระบบ
                </p>
                <p className="text-sm text-gray-500">
                  การเข้าสู่ระบบด้วยอีเมลไม่ได้รับการสนับสนุนอีกต่อไป
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
