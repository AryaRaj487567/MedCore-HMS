import { ApiResponse, ApiErrorResponse, PaginatedResponse } from '@medcore/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export async function fetchApi<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data: T; message?: string; meta?: any }> {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('medcore_access_token');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string>),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();

  if (!response.ok || json.success === false) {
    const errorMsg = json.error?.message || `HTTP ${response.status}: An unexpected error occurred`;
    const err = new Error(errorMsg) as any;
    err.code = json.error?.code || 'API_ERROR';
    err.details = json.error?.details;
    throw err;
  }

  return {
    data: json.data,
    message: json.message,
    meta: json.meta,
  };
}
