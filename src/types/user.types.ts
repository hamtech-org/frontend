export type UserStatus = 'online' | 'offline' | 'away';
export type UserRole = 'user' | 'admin';

export interface IUser {
  userId: string;
  email: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  phone: string | null;
  status: UserStatus;
  lastSeen: string | null;
  role: UserRole;
  isVerified: boolean;
  createdAt: string;
  name?: string; // Fallback property for compatibility
}

export interface IUserPublic {
  userId: string;
  displayName: string;
  avatar: string | null;
  bio: string | null;
  status: UserStatus;
}
