import React from 'react';
import { LogOut, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/utils/cn';
import logoUrl from '@/assets/images/logo_vuong.png';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AppSidebarProps {
  navItems: NavItem[];
  isDarkMode: boolean;
  isOpen: boolean;
  pathname: string;
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const AppSidebar: React.FC<AppSidebarProps> = ({
  navItems,
  isDarkMode,
  isOpen,
  pathname,
  onNavigate,
  onToggleTheme,
  onLogout,
}) => (
  <motion.aside
    initial={false}
    animate={{ width: isOpen ? 280 : 80 }}
    className={cn(
      'h-screen sticky top-0 border-r transition-all duration-500 z-50 flex flex-col',
      isDarkMode ? 'bg-midnight-bg border-midnight-border' : 'bg-ethereal-bg border-ethereal-border',
    )}
  >
    <div className="p-6 flex items-center gap-3">
      <img src={logoUrl} alt="User Avatar" className="w-10 h-10 shrink-0" />
      {isOpen && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-display font-bold text-xl tracking-tight whitespace-nowrap">
          HamTech
        </motion.span>
      )}
    </div>

    <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
      {navItems.map((item) => {
        const isActive = pathname === item.path || (item.path !== '/' && pathname.startsWith(item.path));

        return (
          <button
            key={item.path}
            onClick={() => onNavigate(item.path)}
            className={cn(
              'w-full flex items-center p-3 rounded-xl transition-all group relative',
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
      <button
        onClick={onToggleTheme}
        className={cn(
          'w-full flex items-center p-3 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-all',
          isOpen ? 'gap-4' : 'justify-center',
        )}
      >
        {isDarkMode ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
        {isOpen && <span className="whitespace-nowrap">{isDarkMode ? 'Sáng' : 'Tối'}</span>}
      </button>
      <button
        onClick={onLogout}
        className={cn(
          'w-full flex items-center p-3 rounded-xl hover:bg-red-500/10 text-red-500 transition-all',
          isOpen ? 'gap-4' : 'justify-center',
        )}
      >
        <LogOut className="w-5 h-5 shrink-0" />
        {isOpen && <span className="whitespace-nowrap">Đăng xuất</span>}
      </button>
    </div>
  </motion.aside>
);

export default AppSidebar;
