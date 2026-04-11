import { createApi } from '@reduxjs/toolkit/query/react';
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
  IVerifyLoginOtpRequest,
} from '@/types/auth.types';
import type { ApiSuccessResponse } from '@/types/api.types';
import { baseQueryWithReauth } from './baseQuery';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    login: builder.mutation<ApiSuccessResponse<{ message: string }>, ILoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
    }),
    verifyLoginOtp: builder.mutation<ApiSuccessResponse<ILoginResponse>, IVerifyLoginOtpRequest>({
      query: (body) => ({ url: '/auth/verify-login-otp', method: 'POST', body }),
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
  useVerifyLoginOtpMutation,
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
