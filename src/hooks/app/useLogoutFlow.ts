import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { socketService } from '@/services/socket';

export const useLogoutFlow = (): { handleLogout: () => void } => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = useCallback(() => {
    socketService.emit('friend:statusChanged', 'offline');
    logout();
    navigate('/login');
  }, [logout, navigate]);

  return { handleLogout };
};
