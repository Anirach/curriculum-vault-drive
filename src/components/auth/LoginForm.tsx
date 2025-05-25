import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Lock } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { userService } from '@/services/userService';
import { toast } from '@/hooks/use-toast';

interface LoginFormProps {
  onLogin: () => void;
}

export const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setUser } = useUser();
  const invitationToken = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;

  useEffect(() => {
    const validateInvitation = async () => {
      if (invitationToken) {
        try {
          const invitation = await userService.getInvitation(invitationToken);
          if (invitation && invitation.status === 'pending') {
            setEmail(invitation.email);
            toast({
              title: "Valid Invitation",
              description: "Please complete your registration.",
            });
          } else {
            toast({
              title: "Invalid Invitation",
              description: "This invitation is no longer valid.",
              variant: "destructive",
            });
          }
        } catch (error) {
          toast({
            title: "Error",
            description: "Failed to validate invitation.",
            variant: "destructive",
          });
        }
      }
    };

    validateInvitation();
  }, [invitationToken]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (invitationToken) {
        // Handle invitation acceptance
        const user = await userService.acceptInvitation(invitationToken, name);
        if (user) {
          setUser(user);
          toast({
            title: "Registration Successful",
            description: "Welcome to the platform!",
          });
          onLogin();
        } else {
          toast({
            title: "Registration Failed",
            description: "Please try again later.",
            variant: "destructive",
          });
        }
      } else {
        // Handle regular login
        const user = await userService.login(email);
        if (user) {
          setUser(user);
          toast({
            title: "Login Successful",
            description: `Welcome back, ${user.name}!`,
          });
          onLogin();
        } else {
          toast({
            title: "Login Failed",
            description: "Invalid email address.",
            variant: "destructive",
          });
        }
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
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อ-นามสกุล</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="กรอกชื่อ-นามสกุล"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                placeholder="กรอกอีเมล"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={!!invitationToken}
              />
            </div>
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Lock className="w-4 h-4 mr-2 animate-spin" />
                  {invitationToken ? 'กำลังลงทะเบียน...' : 'กำลังเข้าสู่ระบบ...'}
                </>
              ) : (
                invitationToken ? 'ลงทะเบียน' : 'เข้าสู่ระบบ'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
