import { User, UserRole } from '@/types/user';
// import { userQueries, settingsQueries } from './database'; // ลบ import นี้
// import { getDatabase } from './database'; // ลบ import นี้

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Google OAuth settings
const DEFAULT_GOOGLE_OAUTH_SETTINGS = {
  clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
  clientSecret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '',
  driveUrl: import.meta.env.VITE_GOOGLE_DRIVE_URL || ''
};

export const userService = {
  // User management (ปรับให้จัดการด้วย localStorage หรือ logic ภายใน)
  async getCurrentUser(): Promise<User | null> {
    try {
      // ดึง user จาก localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        // อาจจะตรวจสอบความถูกต้องของ user object ที่นี่ถ้าจำเป็น
        return user as User;
      }
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    // ล้าง user จาก localStorage
    localStorage.removeItem('currentUser');
    // ลบเฉพาะ access token และข้อมูลผู้ใช้
    localStorage.removeItem('accessToken');
    // ไม่ลบ refresh token เพื่อให้สามารถ login ใหม่ได้โดยไม่ต้อง authenticate
    // localStorage.removeItem('refreshToken'); // ลบบรรทัดนี้ออก
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userRole');
    localStorage.removeItem('clientId');
    localStorage.removeItem('clientSecret');
    localStorage.removeItem('driveUrl');
  },

  // Google Drive settings
  async getGoogleDriveSettings() {
    // ดึงการตั้งค่าจาก localStorage หรือใช้ค่าเริ่มต้น
    const clientId = localStorage.getItem('clientId') || DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId;
    const clientSecret = localStorage.getItem('clientSecret') || DEFAULT_GOOGLE_OAUTH_SETTINGS.clientSecret;
    const driveUrl = localStorage.getItem('driveUrl') || DEFAULT_GOOGLE_OAUTH_SETTINGS.driveUrl;

    return {
      clientId,
      clientSecret,
      driveUrl
    };
  },

  async setGoogleDriveSettings(settings: {
    clientId: string;
    clientSecret: string;
    driveUrl: string;
  }) {
    // บันทึกการตั้งค่าลง localStorage
    localStorage.setItem('clientId', settings.clientId);
    localStorage.setItem('clientSecret', settings.clientSecret);
    localStorage.setItem('driveUrl', settings.driveUrl);
  },
}; 