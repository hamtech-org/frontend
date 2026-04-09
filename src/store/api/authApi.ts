import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  ILoginRequest,
  IRegisterRequest,
  ILoginResponse,
  IFaceLoginRequest,
  IEnableFaceLoginRequest,
  IChangePasswordRequest,
  IForgotPasswordRequest,
  IResetPasswordRequest,
  IVerifyEmailRequest,
} from '@/types/auth.types';
import type { ApiSuccessResponse } from '@/types/api.types';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
  endpoints: (builder) => ({
    login: builder.mutation<ApiSuccessResponse<ILoginResponse>, ILoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    register: builder.mutation<ApiSuccessResponse<{ message: string }>, IRegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
    }),
    verifyEmail: builder.mutation<ApiSuccessResponse<ILoginResponse>, IVerifyEmailRequest>({
      query: (body) => ({ url: '/auth/verify-email', method: 'POST', body }),
    }),
    logout: builder.mutation<ApiSuccessResponse<null>, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
    }),
    faceLogin: builder.mutation<ApiSuccessResponse<ILoginResponse>, IFaceLoginRequest>({
      query: (body) => ({ url: '/auth/face-login', method: 'POST', body }),
    }),
    enableFaceLogin: builder.mutation<ApiSuccessResponse<null>, IEnableFaceLoginRequest>({
      query: (body) => ({ url: '/auth/face-login/enable', method: 'POST', body }),
    }),
    disableFaceLogin: builder.mutation<ApiSuccessResponse<null>, void>({
      query: () => ({ url: '/auth/face-login/disable', method: 'DELETE' }),
    }),
    refreshToken: builder.mutation<ApiSuccessResponse<ILoginResponse>, { refreshToken: string }>({
      query: (body) => ({ url: '/auth/refresh-token', method: 'POST', body }),
    }),
    logoutAll: builder.mutation<ApiSuccessResponse<null>, void>({
      query: () => ({ url: '/auth/logout-all', method: 'POST' }),
    }),
    forgotPassword: builder.mutation<ApiSuccessResponse<null>, IForgotPasswordRequest>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<ApiSuccessResponse<null>, IResetPasswordRequest>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    changePassword: builder.mutation<ApiSuccessResponse<null>, IChangePasswordRequest>({
      query: (body) => ({ url: '/auth/change-password', method: 'PUT', body }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useVerifyEmailMutation,
  useLogoutMutation,
  useFaceLoginMutation,
  useEnableFaceLoginMutation,
  useDisableFaceLoginMutation,
  useRefreshTokenMutation,
  useLogoutAllMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
} = authApi;
