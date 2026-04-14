import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type { ApiErrorResponse, ApiSuccessResponse } from '@/types/api.types';

// Prefer explicit backend base URL from env.
// Fallback to relative path (works only if dev proxy is configured).
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '/api/v1';

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: AxiosError) => void;
}> = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token || '');
    }
  });

  failedQueue = [];
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401: Token expired, attempt refresh
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request if already refreshing
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // Call refresh-token endpoint
        const response = await axios.post<ApiSuccessResponse<{ accessToken: string }>>(
          `${API_BASE_URL}/auth/refresh-token`,
          { refreshToken },
          { timeout: 15000 },
        );

        const newAccessToken = response.data?.data?.accessToken;
        if (newAccessToken) {
          localStorage.setItem('accessToken', newAccessToken);
          apiClient.defaults.headers.common.Authorization = `Bearer ${newAccessToken}`;
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return apiClient(originalRequest);
        }
      } catch (err) {
        const refreshError = err as AxiosError;
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
