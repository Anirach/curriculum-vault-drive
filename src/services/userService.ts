import { User, Invitation, UserRole } from '@/types/user';
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
  async login(email: string): Promise<User | null> {
    try {
      // กลับไปใช้ logic การตรวจสอบ admin email เดิม
      const adminEmails = ['anirach.m@fitm.kmutnb.ac.th']; // กำหนด admin email ตรงนี้
      const userRole: UserRole = adminEmails.includes(email.toLowerCase()) ? 'Admin' : 'Viewer';

      // สร้าง user object (อาจจะต้องปรับตามโครงสร้าง User ที่ต้องการ)
      const user: User = {
        id: email, // ใช้ email เป็น ID ชั่วคราว
        email: email,
        name: email.split('@')[0], // ชื่อเริ่มต้นจาก email
        role: userRole,
        createdAt: new Date(),
        updatedAt: new Date()
        // เพิ่ม properties อื่นๆ ถ้าจำเป็นตาม User type
      };
      
      // บันทึก user ใน localStorage
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Error during login:', error);
      return null;
    }
  },

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

  // ฟังก์ชัน updateUserRole อาจจะไม่มีการใช้งานถ้าไม่มีระบบจัดการผู้ใช้แบบเต็มรูปแบบ
  async updateUserRole(userId: string, role: UserRole): Promise<User | null> {
    console.warn('updateUserRole is not implemented without a database');
    return null; // หรือจะ throw error ก็ได้
  },

  // Google Drive settings
  async getGoogleDriveSettings() {
    // ดึงการตั้งค่าจาก localStorage หรือใช้ค่าเริ่มต้น
    const clientId = localStorage.getItem('clientId') || DEFAULT_GOOGLE_OAUTH_SETTINGS.clientId;
    const clientSecret = localStorage.getItem('clientSecret') || DEFAULT_GOOGLE_OAUTH_SETTINGS.clientSecret;
    const driveUrl = localStorage.getItem('driveUrl') || DEFAULT_GOOGLE_OAUTH_SETTINGS.driveUrl;

    // ถ้าไม่มีค่าใดๆ เลย แสดงว่ายังไม่ได้ตั้งค่า
    if (!clientId || !clientSecret) {
      console.warn('Google OAuth settings not found');
      return null;
    }

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

  // Invitation management
  async createInvitation(email: string, role: UserRole): Promise<Invitation | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('Error creating invitation:', error);
      return null;
    }
  },

  async getInvitation(token: string): Promise<Invitation | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations/${token}`);
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('Error fetching invitation:', error);
      return null;
    }
  },

  async acceptInvitation(token: string, name: string): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return null;
    }
  },

  async listInvitations(): Promise<Invitation[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations`);
      if (!response.ok) return [];
      return response.json();
    } catch (error) {
      console.error('Error listing invitations:', error);
      return [];
    }
  },

  async revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/invitations/${invitationId}`, {
        method: 'DELETE',
      });
      return response.ok;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return false;
    }
  },
}; 