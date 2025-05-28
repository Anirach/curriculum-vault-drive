
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, FileText, Shield, Users, ArrowRight, Eye, Lock } from 'lucide-react';
import { useAuthActions } from '@/contexts/AuthActionsContext';
import { useNavigate } from 'react-router-dom';

interface LandingPageProps {
  onLoginClick: () => void;
}

export const LandingPage = ({ onLoginClick }: LandingPageProps) => {
  const { handleGoogleLogin } = useAuthActions();
  const navigate = useNavigate();

  const handleLoginClick = async () => {
    try {
      await handleGoogleLogin();
    } catch (error) {
      console.error('Google login failed:', error);
      // Fallback to regular login form if Google login fails
      onLoginClick();
    }
  };

  const handlePublicAccess = () => {
    navigate('/public');
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
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={handlePublicAccess}
              variant="outline"
              className="bg-white hover:bg-gray-50 text-blue-600 border-blue-200 px-8 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Eye className="w-5 h-5 mr-2" />
              เข้าถึงแบบสาธารณะ
            </Button>
            <Button 
              onClick={handleLoginClick}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Lock className="w-5 h-5 mr-2" />
              เข้าสู่ระบบด้วย Google
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
          
          <p className="text-sm text-gray-500 mt-4 max-w-2xl mx-auto">
            🔓 <strong>เข้าถึงแบบสาธารณะ:</strong> ดูไฟล์จากโฟลเดอร์สาธารณะโดยไม่ต้องเข้าสู่ระบบ<br/>
            🔒 <strong>เข้าสู่ระบบ:</strong> เข้าถึงระบบจัดการเอกสารแบบเต็มรูปแบบ
          </p>
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Eye className="w-6 h-6 text-blue-600" />
              </div>
              <CardTitle className="text-lg mb-2">เข้าถึงสาธารณะ</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
                ดูไฟล์ PDF และเอกสารจากโฟลเดอร์สาธารณะโดยไม่ต้องเข้าสู่ระบบ
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-200">
            <CardHeader>
              <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-lg mb-2">จัดการเอกสาร</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
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
              <CardTitle className="text-lg mb-2">ความปลอดภัย</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
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
              <CardTitle className="text-lg mb-2">การจัดการผู้ใช้</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-gray-600 text-sm">
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
          
          {/* Public Access Workflow */}
          <div className="mb-12">
            <h3 className="text-2xl font-semibold text-center text-blue-600 mb-8">
              🔓 การเข้าถึงแบบสาธารณะ
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  1
                </div>
                <h4 className="text-xl font-semibold mb-3">คลิกเข้าถึงสาธารณะ</h4>
                <p className="text-gray-600">
                  เข้าถึงโฟลเดอร์สาธารณะ
                  โดยไม่ต้องมีบัญชีผู้ใช้
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  2
                </div>
                <h4 className="text-xl font-semibold mb-3">เรียกดูไฟล์</h4>
                <p className="text-gray-600">
                  ดูรายการไฟล์และโฟลเดอร์
                  ที่เปิดให้เข้าถึงสาธารณะ
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  3
                </div>
                <h4 className="text-xl font-semibold mb-3">ดูและดาวน์โหลด</h4>
                <p className="text-gray-600">
                  อ่านเอกสาร PDF และ
                  ดาวน์โหลดไฟล์ที่ต้องการ
                </p>
              </div>
            </div>
          </div>

          <hr className="border-gray-200 my-12" />

          {/* Authenticated Access Workflow */}
          <div>
            <h3 className="text-2xl font-semibold text-center text-green-600 mb-8">
              🔒 การเข้าถึงด้วยการรับรอง
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  1
                </div>
                <h4 className="text-xl font-semibold mb-3">เข้าสู่ระบบ</h4>
                <p className="text-gray-600">
                  เข้าสู่ระบบด้วย Google Account 
                  ที่ได้รับสิทธิ์การเข้าถึง
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  2
                </div>
                <h4 className="text-xl font-semibold mb-3">จัดการเอกสาร</h4>
                <p className="text-gray-600">
                  เข้าถึงเอกสารส่วนตัว อัปโหลด
                  และจัดการไฟล์ในระบบ
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  3
                </div>
                <h4 className="text-xl font-semibold mb-3">สิทธิ์เต็มรูปแบบ</h4>
                <p className="text-gray-600">
                  แก้ไข ลบ แชร์ไฟล์ และ
                  จัดการระบบตามสิทธิ์ที่ได้รับ
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-gray-500">
          <p>&copy; 2025 Curriculum Vault Drive. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
