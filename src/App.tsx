import IncomingCallModal from '@/components/call/IncomingCallModal';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import GlobalSearchBox from '@/components/search/GlobalSearchBox';
import { CallProvider } from '@/contexts/CallContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAppShellState } from '@/hooks/app/useAppShellState';
import { useLogoutFlow } from '@/hooks/app/useLogoutFlow';
import { useProfileSync } from '@/hooks/app/useProfileSync';
import { useAuth } from '@/hooks/useAuth';
import { appRouteElements } from '@/routes/AppRoutes';
import { guestRouteElements } from '@/routes/GuestRoutes';
import { cn } from '@/utils/cn';
import { AnimatePresence, motion } from 'motion/react';
import React, { Suspense } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';

const CallPage = React.lazy(() => import('@/pages/user/CallPage'));

const GUEST_ROUTES = ['/login', '/onboarding'];

const App: React.FC = () => {
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
  const shouldRenderAppShell = !isGuestRoute && !isCallRoute && !isChatRoute;
  const {
    isMobileViewport,
    isMobileSidebarOpen,
    isMobileSearchOpen,
    isDesktopSidebarExpanded,
    setIsMobileSidebarOpen,
    handleToggleSidebar,
    handleNavigate,
    toggleMobileSearch,
  } = useAppShellState(location.pathname);

  if (isGuestRoute) {
    return (
      <div
        className={cn(
          'min-h-screen transition-colors duration-500',
          isDarkMode ? 'theme-midnight dark' : 'theme-ethereal',
        )}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense fallback={<PageLoader />}>
              <Routes>{guestRouteElements}</Routes>
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
    <div
      className={cn(
        'h-screen flex overflow-hidden transition-colors duration-500',
        isDarkMode ? 'theme-midnight dark' : 'theme-ethereal',
      )}
    >
      {shouldRenderAppShell && (
        <>
          <div className="hidden md:block">
            <AppSidebar
              isDarkMode={isDarkMode}
              isOpen={isDesktopSidebarExpanded}
              pathname={location.pathname}
              onNavigate={handleNavigate}
              onToggleTheme={toggleTheme}
              onLogout={handleLogout}
            />
          </div>

          <AnimatePresence>
            {isMobileSidebarOpen && (
              <>
                <motion.button
                  type="button"
                  aria-label="Đóng menu điều hướng"
                  className="fixed inset-0 z-40 bg-black/40 md:hidden"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsMobileSidebarOpen(false)}
                />
                <AppSidebar
                  variant="mobile"
                  isDarkMode={isDarkMode}
                  isOpen
                  pathname={location.pathname}
                  onNavigate={handleNavigate}
                  onToggleTheme={toggleTheme}
                  onLogout={handleLogout}
                />
              </>
            )}
          </AnimatePresence>
        </>
      )}

      <main className="flex-1 min-h-0 flex flex-col overflow-x-hidden">
        <AnimatePresence>
          {isMobileSearchOpen && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 inset-x-0 z-50 p-3 sm:hidden"
            >
              <div
                className={cn(
                  'rounded-2xl border p-2 shadow-lg',
                  isDarkMode ? 'bg-midnight-bg border-midnight-border' : 'bg-white border-gray-200',
                )}
              >
                <GlobalSearchBox
                  isDarkMode={isDarkMode}
                  currentUserId={currentUser?.userId}
                  autoFocusInput
                  disableOutsideBackdrop
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isChatRoute && (
          <AppHeader
            isDarkMode={isDarkMode}
            isSidebarOpen={isDesktopSidebarExpanded}
            isMobile={isMobileViewport}
            isMobileSidebarOpen={isMobileSidebarOpen}
            currentUser={currentUser}
            onToggleSidebar={handleToggleSidebar}
            onNavigateHome={() => handleNavigate('/')}
            onOpenProfile={() => handleNavigate('/profile')}
            onOpenSearch={toggleMobileSearch}
          />
        )}

        <div
          className={cn(
            'flex-1 min-h-0 relative',
            isChatRoute ? 'overflow-hidden' : 'overflow-y-auto',
          )}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={routeTransitionKey}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className={isChatRoute ? 'absolute inset-0' : 'h-full'}
            >
              <Suspense fallback={<PageLoader />}>
                <CallProvider>
                  <IncomingCallModal />
                  <Routes>{appRouteElements}</Routes>
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
