import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { UserRole } from '@medcore/types';

const JWT_SECRET = process.env.JWT_SECRET || 'medcore_default_jwt_secret_key_at_least_256_bits_length_123456789';
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'medcore_default_refresh_secret_random_key_987654321';
const BCRYPT_SALT_ROUNDS = 12; // Strictly cost factor 12 per PRD

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  hospitalId?: string;
  tokenType?: 'access' | 'refresh';
}

export async function hashPassword(plainText: string): Promise<string> {
  return bcrypt.hash(plainText, BCRYPT_SALT_ROUNDS);
}

export async function comparePassword(plainText: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plainText, hashed);
}

export function generateAccessToken(payload: Omit<JwtPayload, 'tokenType'>): string {
  return jwt.sign({ ...payload, tokenType: 'access' }, JWT_SECRET, {
    expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
  });
}

export function generateRefreshToken(payload: Omit<JwtPayload, 'tokenType'>): string {
  return jwt.sign({ ...payload, tokenType: 'refresh' }, REFRESH_SECRET, {
    expiresIn: (process.env.REFRESH_TOKEN_EXPIRES_IN || '7d') as any,
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}

export function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Log sanitiser strictly strips passwords, secrets, tokens and OTPs from logging
 */
export function sanitizeLog(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeLog);

  const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'otp', 'secret', 'authorization'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '***REDACTED***';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeLog(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
