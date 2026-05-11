import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';
import { ChevronLeft } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';

export default function AdminLayout() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const isHub = location.pathname === '/admin' || location.pathname === '/admin/';

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return (
    <div
      className={cn('editorial-void w-full min-w-0 max-w-7xl mx-auto space-y-8 px-4 pb-16 pt-4')}
    >
      {!isHub && (
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          Quản trị
        </Link>
      )}
      <div className="w-full min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
