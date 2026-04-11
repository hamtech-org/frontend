import React, { useState, useEffect, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Home,
  Compass,
  Video,
  MessageSquare,
  BarChart3,
  Sparkles,
  Settings,
  LogOut,
  Search,
  Bell,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  User,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import logoUrl from '@/assets/images/logo_vuong.png';
import { CallProvider } from '@/contexts/CallContext';
import IncomingCallModal from '@/components/call/IncomingCallModal';

// Lazy-loaded pages
const LoginPage = React.lazy(() => import('@/pages/user/LoginPage'));
const OnboardingPage = React.lazy(() => import('@/pages/user/OnboardingPage'));
const HomePage = React.lazy(() => import('@/pages/user/HomePage'));
const ChatPage = React.lazy(() => import('@/pages/user/ChatPage'));
const ContactsPage = React.lazy(() => import('@/pages/user/ContactsPage'));
const StudioPage = React.lazy(() => import('@/pages/user/StudioPage'));
const CallPage = React.lazy(() => import('@/pages/user/CallPage'));
const AIStudioPage = React.lazy(() => import('@/pages/user/AIStudioPage'));
const ProfilePage = React.lazy(() => import('@/pages/user/ProfilePage'));
const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminAnalytics = React.lazy(() => import('@/pages/admin/AdminAnalytics'));

const navItems = [
  { path: '/', icon: Home, label: 'Bảng tin' },
  { path: '/community', icon: Compass, label: 'Cộng đồng' },
  { path: '/studio', icon: Video, label: 'Live Studio' },
  { path: '/chat', icon: MessageSquare, label: 'Tin nhắn' },
  { path: '/analytics', icon: BarChart3, label: 'Thống kê' },
  { path: '/ai-studio', icon: Sparkles, label: 'AI Studio' },
  { path: '/profile', icon: User, label: 'Hồ sơ' },
  { path: '/admin', icon: Settings, label: 'Quản trị' },
];

const GUEST_ROUTES = ['/login', '/onboarding'];

const App: React.FC = () => (
  <CallProvider>
    <IncomingCallModal />
    <AppContent />
  </CallProvider>
);

const AppContent: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const isGuestRoute = GUEST_ROUTES.includes(location.pathname);
  const isCallRoute = location.pathname === '/call';
  const isChatRoute = location.pathname.startsWith('/chat');

  if (isGuestRoute) {
    return (
      <div className={cn('min-h-screen transition-colors duration-500', isDarkMode ? 'theme-midnight dark' : 'theme-ethereal')}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Routes>
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  if (isCallRoute) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/call" element={<CallPage />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className={cn('min-h-screen flex transition-colors duration-500', isDarkMode ? 'theme-midnight dark' : 'theme-ethereal')}>
      {/* Sidebar */}
      {!isChatRoute && (
        <motion.aside
          initial={false}
          animate={{ width: isSidebarOpen ? 280 : 80 }}
          className={cn(
            'h-screen sticky top-0 border-r transition-all duration-500 z-50 flex flex-col',
            isDarkMode ? 'bg-midnight-bg border-midnight-border' : 'bg-ethereal-bg border-ethereal-border',
          )}
        >
          <div className="p-6 flex items-center gap-3">
            <img src={logoUrl} alt="User Avatar" className="w-10 h-10 shrink-0" />
            {isSidebarOpen && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display font-bold text-xl tracking-tight whitespace-nowrap">
                HamTech
              </motion.span>
            )}
          </div>

          <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={cn(
                    'w-full flex items-center p-3 rounded-xl transition-all group relative',
                    isSidebarOpen ? 'gap-4' : 'justify-center',
                    isActive
                      ? isDarkMode ? 'bg-white/10 text-blue-500' : 'bg-black/5 text-blue-600'
                      : isDarkMode ? 'text-midnight-muted hover:text-blue-400' : 'text-ethereal-muted hover:text-blue-600',
                  )}
                >
                  <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-blue-600')} />
                  {isSidebarOpen && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-medium whitespace-nowrap">
                      {item.label}
                    </motion.span>
                  )}
                  {isActive && <motion.div layoutId="active-nav" className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full" />}
                </button>
              );
            })}
          </nav>

          <div className="p-4 border-t border-inherit space-y-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={cn('w-full flex items-center p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all', isSidebarOpen ? 'gap-4' : 'justify-center')}>
              {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
              {isSidebarOpen && <span className="whitespace-nowrap">{isDarkMode ? 'Sáng' : 'Tối'}</span>}
            </button>
            <button onClick={() => navigate('/login')} className={cn('w-full flex items-center p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all', isSidebarOpen ? 'gap-4' : 'justify-center')}>
              <LogOut className="w-5 h-5 shrink-0" />
              {isSidebarOpen && <span className="whitespace-nowrap">Đăng xuất</span>}
            </button>
          </div>
        </motion.aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {!isChatRoute && (
          <header
            className={cn(
              'h-20 px-8 flex items-center justify-between border-b sticky top-0 z-40 backdrop-blur-md',
              isDarkMode ? 'bg-midnight-bg/80 border-midnight-border' : 'bg-ethereal-bg/80 border-ethereal-border',
            )}
          >
            <div className="flex items-center gap-4 flex-1 max-w-xl">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeft className="w-5 h-5" />}
              </button>
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm người dùng, nội dung, cộng đồng..."
                  className="w-full pl-12 pr-4 py-2.5 rounded-full bg-black/5 dark:bg-white/5 border-none focus:ring-2 ring-blue-600/20 transition-all outline-none"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <button className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-all">
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full border-2 border-inherit" />
              </button>
              <div className="flex items-center gap-3 pl-6 border-l border-inherit">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold">Người dùng</p>
                  <p className="text-xs text-muted-foreground">Thành viên</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-[#f4c25f] flex items-center justify-center text-white font-bold">
                  Z
                </div>
              </div>
            </div>
          </header>
        )}

        <div className={cn("flex-1 relative", isChatRoute ? "overflow-hidden" : "overflow-y-auto")}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={isChatRoute ? "absolute inset-0" : "h-full"}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/community" element={<ContactsPage />} />
                  <Route path="/studio" element={<StudioPage />} />
                  <Route path="/chat" element={<ChatPage />} />
                  <Route path="/analytics" element={<AdminAnalytics />} />
                  <Route path="/ai-studio" element={<AIStudioPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="w-12 h-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
  </div>
);

export default App;
