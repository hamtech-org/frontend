import IncomingCallModal from '@/components/call/IncomingCallModal';
import AppHeader from '@/components/layout/AppHeader';
import AppSidebar from '@/components/layout/AppSidebar';
import { ShellMain, ShellRoot } from '@/components/layout/ShellPrimitives';
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
  const isReelsRoute = location.pathname.startsWith('/reels');
  const isImmersiveRoute = isChatRoute || isReelsRoute;
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
        <AnimatePresence initial={false} mode="sync">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 1, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 1, y: -12 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="min-h-screen bg-background"
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
    <ShellRoot
      className={cn(
        'transition-colors duration-500',
        isDarkMode ? 'theme-midnight dark' : 'theme-ethereal',
      )}
    >
      {shouldRenderAppShell && (
        <div className="hidden md:block shrink-0">
          <AppSidebar
            isDarkMode={isDarkMode}
            isOpen={isDesktopSidebarExpanded}
            pathname={location.pathname}
            onNavigate={handleNavigate}
            onToggleTheme={toggleTheme}
            onLogout={handleLogout}
          />
        </div>
      )}

      {shouldRenderAppShell && (
        <AnimatePresence initial={false}>
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
      )}

      <ShellMain>
        <AnimatePresence initial={false}>
          {isMobileSearchOpen && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed top-0 inset-x-0 z-50 p-3 sm:hidden"
            >
              <div
                className={cn(
                  'rounded-2xl border p-2 shadow-lg',
                  isDarkMode ? 'bg-midnight-bg border-midnight-border' : 'bg-card border-border',
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

        {!isImmersiveRoute && (
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
            isImmersiveRoute ? 'overflow-hidden' : 'overflow-y-auto',
            isReelsRoute ? 'bg-black' : isChatRoute ? 'bg-background' : 'bg-muted/55',
          )}
        >
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={routeTransitionKey}
              initial={{ opacity: 1, x: 0 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full will-change-transform"
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
      </ShellMain>
    </ShellRoot>
  );
};

const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center h-full min-h-[50vh]">
    <div className="w-12 h-12 rounded-full border-4 border-blue-600/20 border-t-blue-600 animate-spin" />
  </div>
);

export default App;
