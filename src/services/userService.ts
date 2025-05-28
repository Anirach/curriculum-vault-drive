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

console.log('🔧 Environment variables loaded:', {
  hasClientId: !!DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId,
  hasClientSecret: !!DEFAULT_GOOGLE_OAUTH_SETTINGS.clientSecret,
  hasDriveUrl: !!DEFAULT_GOOGLE_OAUTH_SETTINGS.driveUrl,
  driveUrl: DEFAULT_GOOGLE_OAUTH_SETTINGS.driveUrl,
  clientIdValue: DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId,
  clientSecretValue: DEFAULT_GOOGLE_OAUTH_SETTINGS.clientSecret
});

console.log('🔍 Raw import.meta.env values:', {
  VITE_GOOGLE_CLIENT_ID: import.meta.env.VITE_GOOGLE_CLIENT_ID,
  VITE_GOOGLE_CLIENT_SECRET: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
  VITE_GOOGLE_DRIVE_URL: import.meta.env.VITE_GOOGLE_DRIVE_URL
});

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
    // อาจจะต้องล้างข้อมูล Google token ด้วย ถ้าไม่ได้ทำใน Header
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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

    console.log('getGoogleDriveSettings debug:', {
      clientId: clientId ? `${clientId.substring(0, 10)}...` : 'empty',
      clientSecret: clientSecret ? `${clientSecret.substring(0, 10)}...` : 'empty',
      driveUrl: driveUrl || 'empty',
      envClientId: DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId ? `${DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId.substring(0, 10)}...` : 'empty',
      envDriveUrl: DEFAULT_GOOGLE_OAUTH_SETTINGS.driveUrl || 'empty'
    });

    // Always return settings object, even if OAuth credentials are missing
    // This allows the system to load the default drive URL from environment variables
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