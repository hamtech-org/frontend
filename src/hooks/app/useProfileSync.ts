import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useAuth } from '@/hooks/useAuth';
import { useGetProfileQuery } from '@/store/api/userApi';
import { setUser } from '@/store/slices/authSlice';

export const useProfileSync = (): void => {
  const dispatch = useDispatch();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { data: profileData } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated || !!currentUser,
  });

  useEffect(() => {
    if (profileData?.data) {
      dispatch(setUser(profileData.data));
    }
  }, [dispatch, profileData]);
};
