import React, { Suspense, useState } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  Compass,
  Home,
  MessageSquare,
  Settings,
  Sparkles,
  User,
  Video,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { CallProvider } from '@/contexts/CallContext';
import { useTheme } from '@/contexts/ThemeContext';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import { useLogoutFlow } from '@/hooks/app/useLogoutFlow';
import { useProfileSync } from '@/hooks/app/useProfileSync';
import { appRouteElements } from '@/routes/AppRoutes';
import { guestRouteElements } from '@/routes/GuestRoutes';

const CallPage = React.lazy(() => import('@/pages/user/CallPage'));

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

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();
  const { user: currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { handleLogout } = useLogoutFlow();
  const isDarkMode = theme === 'dark';

  useProfileSync();

  const isGuestRoute = GUEST_ROUTES.includes(location.pathname);
  const isCallRoute = location.pathname === '/call';
  const isChatRoute = location.pathname.startsWith('/chat');
  const routeTransitionKey = isChatRoute ? 'chat' : location.pathname;

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
                {guestRouteElements}
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
        <CallProvider>
          <Routes>
            <Route path="/call" element={<CallPage />} />
          </Routes>
        </CallProvider>
      </Suspense>
    );
  }

  return (
    <div className={cn('min-h-screen flex transition-colors duration-500', isDarkMode ? 'theme-midnight dark' : 'theme-ethereal')}>
      {!isChatRoute && (
        <AppSidebar
          navItems={navItems}
          isDarkMode={isDarkMode}
          isOpen={isSidebarOpen}
          pathname={location.pathname}
          onNavigate={navigate}
          onToggleTheme={toggleTheme}
          onLogout={handleLogout}
        />
      )}

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {!isChatRoute && (
          <AppHeader
            isDarkMode={isDarkMode}
            isSidebarOpen={isSidebarOpen}
            currentUser={currentUser}
            onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
            onOpenProfile={() => navigate('/profile')}
          />
        )}

        <div className={cn('flex-1 relative', isChatRoute ? 'overflow-hidden' : 'overflow-y-auto')}>
          <AnimatePresence mode="wait">
            <motion.div
              key={routeTransitionKey}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={isChatRoute ? "absolute inset-0" : "h-full"}
            >
              <Suspense fallback={<PageLoader />}>
                <CallProvider>
                  <IncomingCallModal />
                  <Routes>
                    {appRouteElements}
                  </Routes>
                </CallProvider>
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
