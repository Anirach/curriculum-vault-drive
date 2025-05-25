export type UserRole = 'Admin' | 'Staff' | 'Viewer';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invitation {
  id: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'accepted' | 'expired';
  token: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  role: UserRole;
  permissions: {
    view: boolean;
    upload: boolean;
    delete: boolean;
  };
}

export const ROLE_PERMISSIONS: Record<UserRole, UserPermission> = {
  Admin: {
    role: 'Admin',
    permissions: {
      view: true,
      upload: true,
      delete: true,
    },
  },
  Staff: {
    role: 'Staff',
    permissions: {
      view: true,
      upload: true,
      delete: false,
    },
  },
  Viewer: {
    role: 'Viewer',
    permissions: {
      view: true,
      upload: false,
      delete: false,
    },
  },
}; 