import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IUser } from '@/types/user.types';
import { authApi } from '../api/authApi';
import { ILoginResponse } from '@/types/auth.types';
import { ApiSuccessResponse } from '@/types/api.types';

interface AuthState {
  user: IUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: !!localStorage.getItem('accessToken'),
  isLoading: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    },
    setUser: (state, action: PayloadAction<IUser>) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addMatcher(
        authApi.endpoints.faceLogin.matchFulfilled,
        (state, { payload }: PayloadAction<ApiSuccessResponse<ILoginResponse>>) => {
          const { accessToken, refreshToken } = payload.data;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
      )
      .addMatcher(
        authApi.endpoints.verifyLoginOtp.matchFulfilled,
        (state, { payload }: PayloadAction<ApiSuccessResponse<ILoginResponse>>) => {
          const { accessToken, refreshToken } = payload.data;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
      )
      .addMatcher(
        authApi.endpoints.verifyEmail.matchFulfilled,
        (state, { payload }: PayloadAction<ApiSuccessResponse<ILoginResponse>>) => {
          const { accessToken, refreshToken } = payload.data;
          state.accessToken = accessToken;
          state.refreshToken = refreshToken;
          state.isAuthenticated = true;
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
      )
      .addMatcher(
        authApi.endpoints.login.matchFulfilled,
        (state, { payload }: PayloadAction<ApiSuccessResponse<ILoginResponse>>) => {
          const { accessToken, refreshToken } = payload.data;
          if (accessToken && refreshToken) {
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
          }
        }
      )
      .addMatcher(
        authApi.endpoints.register.matchFulfilled,
        (state, { payload }: PayloadAction<ApiSuccessResponse<ILoginResponse>>) => {
          const { accessToken, refreshToken } = payload.data;
          if (accessToken && refreshToken) {
            state.accessToken = accessToken;
            state.refreshToken = refreshToken;
            state.isAuthenticated = true;
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
          }
        }
      );
  },
});

export const { logout, setUser } = authSlice.actions;
export default authSlice.reducer;
