
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, FileText, Shield, Users, ArrowRight } from 'lucide-react';
import { useAuthActions } from '@/contexts/AuthActionsContext';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage = ({ onLoginClick }: LandingPageProps) => {
  const { handleGoogleLogin } = useAuthActions();

  const handleLoginClick = async () => {
    try {
      await handleGoogleLogin();
    } catch (error) {
      console.error('Google login failed:', error);
      // Fallback to regular login form if Google login fails
      onLoginClick();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Curriculum Vault Drive
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            ระบบจัดการเอกสารหลักสูตรที่เชื่อมต่อกับ Google Drive 
            เพื่อการเข้าถึงและจัดการไฟล์ที่มีประสิทธิภาพ
          </p>
          <Button 
            onClick={handleLoginClick}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            เข้าสู่ระบบด้วย Google
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-xl mb-2">จัดการเอกสาร</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                เข้าถึงและจัดการเอกสารหลักสูตรได้อย่างง่ายดาย 
                ผ่านการเชื่อมต่อกับ Google Drive
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <CardTitle className="text-xl mb-2">ความปลอดภัย</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                ระบบควบคุมสิทธิ์การเข้าถึงที่ปลอดภัย 
                พร้อมการยืนยันตัวตนผ่าน Google OAuth
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <CardTitle className="text-xl mb-2">การจัดการผู้ใช้</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600">
                ระบบจัดการผู้ใช้แบบหลายระดับ 
                สำหรับผู้ดูแลระบบและผู้ใช้ทั่วไป
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* How it Works Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            วิธีการใช้งาน
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-3">เข้าสู่ระบบ</h3>
              <p className="text-gray-600">
                เข้าสู่ระบบด้วย Google Account 
                ที่ได้รับสิทธิ์การเข้าถึง
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-3">เลือกเอกสาร</h3>
              <p className="text-gray-600">
                เรียกดูและเลือกเอกสารหลักสูตร
                ที่ต้องการจากโฟลเดอร์ที่กำหนด
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-3">ดูเอกสาร</h3>
              <p className="text-gray-600">
                อ่านเอกสาร PDF ได้ทันที
                ผ่านหน้าเว็บโดยไม่ต้องดาวน์โหลด
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2024 Curriculum Vault Drive. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
