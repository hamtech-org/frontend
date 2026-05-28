import { Clapperboard, Compass, Home, MessageSquare, Settings, User, Video } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navItems: NavItem[] = [
  { path: '/', icon: Home, label: 'Bảng tin' },
  { path: '/reels', icon: Clapperboard, label: 'Reels' },
  { path: '/communities', icon: Compass, label: 'Cộng đồng' },
  { path: '/live', icon: Video, label: 'Live Studio' },
  { path: '/chat', icon: MessageSquare, label: 'Tin nhắn' },
  { path: '/profile', icon: User, label: 'Hồ sơ' },
  { path: '/admin', icon: Settings, label: 'Quản trị' },
];
