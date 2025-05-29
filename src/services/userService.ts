import { User, UserRole } from '@/types/user';
// import { userQueries, settingsQueries } from './database'; // ลบ import นี้
// import { getDatabase } from './database'; // ลบ import นี้
import { encryptedStorage } from './encryptedStorage';

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

  async logout(soft = true): Promise<void> {
    // ล้าง user จาก localStorage
    localStorage.removeItem('currentUser');
    // ใช้ encrypted storage ล้างข้อมูล sensitive
    encryptedStorage.clearUserData(soft ? { keepRefreshToken: true } : undefined);
  },

  // Google Drive settings
  async getGoogleDriveSettings() {
    console.log('🔍 Debug: Getting Google Drive settings from encrypted storage...');
    const storedSettings = encryptedStorage.getOAuthSettings();
    console.log('🔍 Debug: Stored OAuth settings:', {
      hasStoredSettings: !!storedSettings,
      hasClientId: !!storedSettings?.clientId,
      hasClientSecret: !!storedSettings?.clientSecret,
      hasDriveUrl: !!storedSettings?.driveUrl
    });

    const settings = {
      clientId: storedSettings.clientId || DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId,
      clientSecret: storedSettings.clientSecret || DEFAULT_GOOGLE_OAUTH_SETTINGS.clientSecret,
      driveUrl: storedSettings.driveUrl || DEFAULT_GOOGLE_OAUTH_SETTINGS.driveUrl
    };

    console.log('🔍 Debug: Final OAuth settings:', {
      hasSettings: !!settings,
      hasClientId: !!settings.clientId,
      hasClientSecret: !!settings.clientSecret,
      hasDriveUrl: !!settings.driveUrl,
      clientIdLength: settings.clientId?.length,
      clientSecretLength: settings.clientSecret?.length
    });

    return settings;
  },

  async setGoogleDriveSettings(settings: {
    clientId: string;
    clientSecret: string;
    driveUrl: string;
  }) {
    // บันทึกการตั้งค่าลง encrypted storage
    encryptedStorage.setOAuthSettings(settings.clientId, settings.clientSecret, settings.driveUrl);
  },
};