export type UserRole = 'admin' | 'user';
export type GroupAdminStatus = 'active' | 'archived';
export type AdminPostDisplayStatus = 'visible' | 'hidden' | 'flagged';
export type PostVisibility = 'public' | 'friends' | 'private';
export type CommunityCategory =
  | 'general'
  | 'technology'
  | 'sports'
  | 'music'
  | 'education'
  | 'gaming'
  | 'lifestyle';
export type CommunityType = 'public' | 'private';
export type CommunityJoinPolicy = 'open' | 'approval';

export interface AdminListQuery {
  query?: string;
  role?: UserRole;
  status?: string;
  limit?: number;
  cursor?: string;
}

export interface AdminListResult<T> {
  items: T[];
  nextCursor: string | null;
}

export interface AdminUserListItem {
  userId: string;
  email: string;
  displayName: string;
  avatar: string | null;
  role: UserRole;
  status: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  isDeleted?: boolean;
}

export interface AdminGroupListItem {
  groupId: string;
  name: string;
  description?: string;
  avatar?: string;
  ownerId: string;
  ownerDisplayName?: string;
  memberCount: number;
  status: GroupAdminStatus;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
}

export interface AdminPostListItem {
  postId: string;
  title: string;
  content: string;
  authorId: string;
  authorDisplayName?: string;
  visibility: PostVisibility;
  status: AdminPostDisplayStatus;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAdminUserBody {
  email: string;
  password: string;
  displayName: string;
  role?: UserRole;
}

export interface UpdateAdminUserBody {
  displayName?: string;
  email?: string;
  avatar?: string | null;
}

export interface CreateAdminGroupBody {
  name: string;
  slug?: string;
  description?: string;
  ownerId: string;
  memberIds?: string[];
  category?: CommunityCategory;
  type?: CommunityType;
  joinPolicy?: CommunityJoinPolicy;
}

export interface UpdateAdminGroupBody {
  name?: string;
  description?: string;
  avatar?: string;
  status?: GroupAdminStatus;
}

export interface CreateAdminPostBody {
  content: string;
  visibility?: PostVisibility;
  status?: AdminPostDisplayStatus;
}

export interface UpdateAdminPostBody {
  content?: string;
  visibility?: PostVisibility;
  status?: AdminPostDisplayStatus;
}
