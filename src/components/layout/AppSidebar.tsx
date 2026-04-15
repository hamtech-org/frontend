import logoUrl from '@/assets/images/logo_vuong.png';
import { navItems } from '@/constants/navlink';
import { cn } from '@/utils/cn';
import { LogOut, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import React from 'react';

interface AppSidebarProps {
  isDarkMode: boolean;
  isOpen: boolean;
  variant?: 'desktop' | 'mobile';
  pathname: string;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  isDarkMode,
  isOpen,
  variant = 'desktop',
  pathname,
  onNavigate,
  onToggleTheme,
  onLogout,
}) => {
  const isDesktopVariant = variant === 'desktop';
  const isMobileVariant = variant === 'mobile';
  const sidebarWidthClassName = isOpen ? 'w-[280px]' : 'w-20';
  const desktopWidthTransition = {
    type: 'spring',
    stiffness: 340,
    damping: 32,
    mass: 0.85,
  } as const;
  const mobileSlideTransition = {
    type: 'spring',
    stiffness: 380,
    damping: 34,
    mass: 0.75,
  } as const;

  return (
    <motion.aside
      initial={isDesktopVariant ? false : { x: -280 }}
      animate={isDesktopVariant ? { width: isOpen ? 280 : 80 } : { x: 0 }}
      exit={isDesktopVariant ? undefined : { x: -280 }}
      transition={isDesktopVariant ? desktopWidthTransition : mobileSlideTransition}
      className={cn(
        'border-r z-50 flex flex-col will-change-transform',
        isDarkMode
          ? 'bg-midnight-bg border-midnight-border'
          : 'bg-ethereal-bg border-ethereal-border',
        isDesktopVariant
          ? 'h-screen sticky top-0'
          : 'fixed inset-y-0 left-0 h-dvh w-[280px] shadow-2xl md:hidden',
        isDesktopVariant && sidebarWidthClassName,
      )}
    >
      <div className={cn(isDesktopVariant ? 'p-6' : 'px-3 py-3.5')}>
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
          aria-label="Về trang chủ"
        >
          <img src={logoUrl} alt="HamTech Logo" className="w-10 h-10 min-w-10 min-h-10 shrink-0" />
          {isOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display font-bold text-xl tracking-tight whitespace-nowrap"
            >
              HamTech
            </motion.span>
          )}
        </button>
      </div>

      <nav
        className={cn(
          'flex-1 flex flex-col gap-2 overflow-y-auto overflow-x-hidden custom-scrollbar',
          isDesktopVariant ? 'px-4 mt-4' : 'px-3 mt-2',
        )}
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={cn(
                'w-full flex items-center rounded-xl transition-all group relative',
                isMobileVariant ? 'p-2.5' : 'p-3',
                isOpen ? 'gap-4' : 'justify-center',
                isActive
                  ? isDarkMode
                    ? 'bg-white/10 text-blue-500'
                    : 'bg-black/5 text-blue-600'
                  : isDarkMode
                    ? 'text-midnight-muted hover:text-blue-400'
                    : 'text-ethereal-muted hover:text-blue-600',
              )}
            >
              <item.icon className={cn('w-5 h-5 shrink-0', isActive && 'text-blue-600')} />
              {isOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="font-medium whitespace-nowrap"
                >
                  {item.label}
                </motion.span>
              )}
              {isActive && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 w-1 h-6 bg-blue-600 rounded-r-full"
                />
              )}
            </button>
          );
        })}
      </nav>

      <div
        className={cn(
          'border-t border-inherit flex flex-col gap-2',
          isDesktopVariant ? 'p-4' : 'px-3 py-3',
        )}
      >
        <button
          onClick={onToggleTheme}
          className={cn(
            'w-full flex items-center rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all',
            isMobileVariant ? 'p-2.5' : 'p-3',
            isOpen ? 'gap-4' : 'justify-center',
          )}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 shrink-0" />
          ) : (
            <Moon className="w-5 h-5 shrink-0" />
          )}
          {isOpen && <span className="whitespace-nowrap">{isDarkMode ? 'Sáng' : 'Tối'}</span>}
        </button>
        <button
          onClick={onLogout}
          className={cn(
            'w-full flex items-center rounded-xl hover:bg-red-500/10 text-red-500 transition-all',
            isMobileVariant ? 'p-2.5' : 'p-3',
            isOpen ? 'gap-4' : 'justify-center',
          )}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {isOpen && <span className="whitespace-nowrap">Đăng xuất</span>}
        </button>
      </div>
    </motion.aside>
  );
};

export default AppSidebar;
