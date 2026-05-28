import type { ApiErrorResponse } from '@/types/api.types';
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Message from RTK Query / fetchBaseQuery errors or thrown unwrap() rejects.
 * Backend shape: { success: false, error: { code, message } }.
 */
export function getApiErrorMessage(error: unknown, fallback = 'Đã có lỗi xảy ra'): string {
  if (error == null || typeof error !== 'object') {
    return fallback;
  }

  const data = (error as FetchBaseQueryError).data;
  if (data && typeof data === 'object') {
    const body = data as Partial<ApiErrorResponse> & { message?: string };
    if (body.success === false && typeof body.error?.message === 'string') {
      return body.error.message;
    }
    if (typeof body.message === 'string') {
      return body.message;
    }
  }

  const serialized = (error as SerializedError).message;
  if (typeof serialized === 'string' && serialized.length > 0) {
    return serialized;
  }

  return fallback;
}
