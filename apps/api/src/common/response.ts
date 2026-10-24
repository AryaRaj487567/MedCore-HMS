import { Response } from 'express';
import { ApiResponse, ApiErrorResponse, PaginatedResponse, PaginationMeta } from '@medcore/types';

export function sendSuccess<T>(res: Response, data: T, message = 'OK', statusCode = 200): Response {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    message,
  };
  return res.status(statusCode).json(payload);
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'OK',
  statusCode = 200
): Response {
  const payload: PaginatedResponse<T> = {
    success: true,
    data,
    meta,
    message,
  };
  return res.status(statusCode).json(payload);
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): Response {
  const payload: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return res.status(statusCode).json(payload);
}
