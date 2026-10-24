import { Router } from 'express';
import { UserModel, RefreshTokenModel, DoctorModel, PatientModel, AuditLogModel } from '../../models';
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generate6DigitOtp,
} from '../../config/jwt';
import { sendSuccess, sendError } from '../../common/response';
import { authenticate, AuthenticatedRequest } from '../../common/auth.middleware';
import { UserRole } from '@medcore/types';
import mongoose from 'mongoose';

const router = Router();

// In-memory OTP storage for simulation
const otpStore = new Map<string, { otp: string; expiresAt: number }>();

// POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, hospitalId, phone } = req.body;

    if (!email || !password || !firstName || !lastName || !role) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required fields: email, password, firstName, lastName, role', 400);
    }

    const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return sendError(res, 'USER_EXISTS', 'A user with this email already exists', 409);
    }

    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      role: role as UserRole,
      hospitalId: hospitalId ? new mongoose.Types.ObjectId(hospitalId) : undefined,
      phone,
      isEmailVerified: true,
      isActive: true,
    });

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId?.toString(),
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId?.toString(),
    });

    await RefreshTokenModel.create({
      token: refreshToken,
      userId: user._id,
      deviceId: req.headers['user-agent'] || 'default',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return sendSuccess(
      res,
      {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hospitalId: user.hospitalId,
        },
        accessToken,
        refreshToken,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, deviceId = 'default' } = req.body;
    if (!email || !password) {
      return sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    if (!user.isActive) {
      return sendError(res, 'ACCOUNT_DEACTIVATED', 'Account has been suspended', 403);
    }

    const accessToken = generateAccessToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId?.toString(),
    });

    const refreshToken = generateRefreshToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      hospitalId: user.hospitalId?.toString(),
    });

    // Invalidate prior token on this device (Token Rotation)
    await RefreshTokenModel.updateMany({ userId: user._id, deviceId }, { isRevoked: true });

    // Store active refresh token
    await RefreshTokenModel.create({
      token: refreshToken,
      userId: user._id,
      deviceId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Audit log
    await AuditLogModel.create({
      hospitalId: user.hospitalId,
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: 'LOGIN',
      resource: 'User',
      resourceId: user._id.toString(),
      ipAddress: req.ip,
    }).catch(() => {});

    // Lookup linked role entity
    let doctorProfile: any = null;
    let patientProfile: any = null;
    if (user.role === UserRole.DOCTOR) {
      doctorProfile = await DoctorModel.findOne({ userId: user._id }).lean();
    } else if (user.role === UserRole.PATIENT) {
      patientProfile = await PatientModel.findOne({ userId: user._id }).lean();
    }

    return sendSuccess(res, {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        hospitalId: user.hospitalId,
        doctorId: doctorProfile?._id,
        patientId: patientProfile?._id,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /auth/refresh — Refresh token rotation
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken, deviceId = 'default' } = req.body;
    if (!refreshToken) {
      return sendError(res, 'VALIDATION_ERROR', 'Refresh token is required', 400);
    }

    const existing = await RefreshTokenModel.findOne({ token: refreshToken });
    if (!existing || existing.isRevoked || existing.expiresAt < new Date()) {
      return sendError(res, 'INVALID_REFRESH_TOKEN', 'Refresh token is expired, revoked, or invalid', 401);
    }

    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      return sendError(res, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token signature', 401);
    }

    // Revoke used token (Token Rotation pattern)
    existing.isRevoked = true;
    await existing.save();

    // Issue new tokens
    const newAccessToken = generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      hospitalId: payload.hospitalId,
    });

    const newRefreshToken = generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      hospitalId: payload.hospitalId,
    });

    await RefreshTokenModel.create({
      token: newRefreshToken,
      userId: new mongoose.Types.ObjectId(payload.userId),
      deviceId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return sendSuccess(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    }, 'Tokens rotated successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /auth/logout
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { refreshToken, allDevices } = req.body;
    if (allDevices) {
      await RefreshTokenModel.updateMany({ userId: req.user!.userId }, { isRevoked: true });
    } else if (refreshToken) {
      await RefreshTokenModel.updateOne({ token: refreshToken }, { isRevoked: true });
    }

    return sendSuccess(res, { success: true }, 'Logged out successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return sendError(res, 'VALIDATION_ERROR', 'Email is required', 400);

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Return success to avoid email enumeration
      return sendSuccess(res, { message: 'If the email exists, an OTP has been sent' });
    }

    const otp = generate6DigitOtp();
    otpStore.set(email.toLowerCase(), {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    });

    console.log(`[Auth Simulator] Password reset OTP for ${email}: ${otp}`);
    return sendSuccess(res, { message: 'OTP sent to your email address' });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return sendError(res, 'VALIDATION_ERROR', 'Email, OTP, and new password are required', 400);
    }

    const record = otpStore.get(email.toLowerCase());
    if (!record || record.otp !== otp || record.expiresAt < Date.now()) {
      return sendError(res, 'INVALID_OTP', 'Invalid or expired OTP', 400);
    }

    otpStore.delete(email.toLowerCase());

    const passwordHash = await hashPassword(newPassword);
    await UserModel.updateOne({ email: email.toLowerCase() }, { passwordHash });

    return sendSuccess(res, { success: true }, 'Password has been reset successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await UserModel.findById(req.user!.userId).select('-passwordHash').lean();
    if (!user) {
      return sendError(res, 'USER_NOT_FOUND', 'User does not exist', 404);
    }

    let doctorProfile: any = null;
    let patientProfile: any = null;

    if (user.role === UserRole.DOCTOR) {
      doctorProfile = await DoctorModel.findOne({ userId: user._id }).populate('departmentId').lean();
    } else if (user.role === UserRole.PATIENT) {
      patientProfile = await PatientModel.findOne({ userId: user._id }).lean();
    }

    return sendSuccess(res, {
      ...user,
      id: user._id,
      doctor: doctorProfile,
      patient: patientProfile,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
