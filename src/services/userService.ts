import { User, Invitation, UserRole } from '@/types/user';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Mock user data for development
const MOCK_USERS: User[] = [
  {
    id: '1',
    email: 'anirach.m@fitm.kmutnb.ac.th',
    name: 'Anirach Mingkhwan',
    role: 'Admin',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    email: 'staff@example.com',
    name: 'Staff User',
    role: 'Staff',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    email: 'viewer@example.com',
    name: 'Viewer User',
    role: 'Viewer',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const userService = {
  // User management
  async login(email: string): Promise<User | null> {
    try {
      // In a real app, this would be an API call
      const user = MOCK_USERS.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!user) return null;
      
      // Store user in localStorage for persistence
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('Error during login:', error);
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      // Check localStorage first
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        return user;
      }

      // In a real app, this would be an API call
      return null;
    } catch (error) {
      console.error('Error fetching current user:', error);
      return null;
    }
  },

  async logout(): Promise<void> {
    localStorage.removeItem('currentUser');
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!response.ok) return null;
      return response.json();
    } catch (error) {
      console.error('Error updating user role:', error);
      return null;
    }
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