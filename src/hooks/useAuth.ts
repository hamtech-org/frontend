import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';
import { setCredentials, logout as logoutAction } from '@/store/slices/authSlice';
import type { IUser } from '@/types/user.types';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { user, accessToken, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const login = (userData: IUser, token: string): void => {
    dispatch(setCredentials({ user: userData, accessToken: token }));
  };

  const logout = (): void => {
    dispatch(logoutAction());
  };

  return { user, accessToken, isAuthenticated, login, logout };
};
