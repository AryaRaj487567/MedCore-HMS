import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@medcore/types';
import { verifyAccessToken, JwtPayload } from '../config/jwt';
import { sendError } from './response';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendError(res, 'UNAUTHORIZED', 'Missing or malformed Authorization header', 401);
    return;
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    sendError(res, 'INVALID_TOKEN', 'Token has expired or is invalid', 401);
  }
}

/**
 * Role-Based Access Control (RBAC) Guard
 * Validates whether the user's role is in the permitted roles
 */
export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (req.user.role === UserRole.SUPER_ADMIN) {
      // Super Admin has global platform permissions
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'FORBIDDEN',
        `Role ${req.user.role} is not permitted to perform this action`,
        403
      );
      return;
    }

    next();
  };
}

/**
 * Tenant Isolation Guard
 * Ensures users (except Super Admin) can only access resources matching their own hospitalId
 */
export function enforceTenant(req: AuthenticatedRequest, targetHospitalId?: string): boolean {
  if (!req.user) return false;
  if (req.user.role === UserRole.SUPER_ADMIN) return true;
  if (!targetHospitalId) return true;
  return req.user.hospitalId?.toString() === targetHospitalId.toString();
}
