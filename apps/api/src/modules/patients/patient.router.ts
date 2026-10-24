import { Router } from 'express';
import { PatientModel, UserModel, AuditLogModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest, enforceTenant } from '../../common/auth.middleware';
import { sendSuccess, sendPaginated, sendError } from '../../common/response';
import { UserRole } from '@medcore/types';
import { hashPassword } from '../../config/jwt';
import mongoose from 'mongoose';

const router = Router();

// GET /patients — Hospital-scoped paginated list with search
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const search = req.query.search as string;

    const filter: any = { deletedAt: null };
    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      filter.hospitalId = req.user!.hospitalId;
    } else if (req.query.hospitalId) {
      filter.hospitalId = req.query.hospitalId;
    }

    if (search) {
      filter.$or = [
        { mrn: new RegExp(search, 'i') },
        { bloodGroup: new RegExp(search, 'i') },
      ];
    }

    const total = await PatientModel.countDocuments(filter);
    const patients = await PatientModel.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = patients.map((p: any) => ({
      ...p,
      id: p._id,
      user: p.userId,
    }));

    return sendPaginated(res, formatted, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /patients/:id — Patient details (Access control: Doctor/Nurse/Admin or the patient themselves)
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const patient = await PatientModel.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone avatarUrl')
      .lean();

    if (!patient || patient.deletedAt) {
      return sendError(res, 'NOT_FOUND', 'Patient record not found', 404);
    }

    // Tenancy isolation check
    if (!enforceTenant(req, patient.hospitalId.toString())) {
      return sendError(res, 'FORBIDDEN', 'Access denied to other hospital tenant data', 403);
    }

    // If patient role, they can only view their own record
    if (req.user!.role === UserRole.PATIENT && patient.userId._id.toString() !== req.user!.userId) {
      return sendError(res, 'FORBIDDEN', 'Patients cannot view other patients records', 403);
    }

    return sendSuccess(res, {
      ...patient,
      id: patient._id,
      user: patient.userId,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /patients — Register new patient
router.post('/', authenticate, requireRoles(UserRole.RECEPTIONIST, UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      allergies,
      familyHistoryFlags,
      emergencyContactName,
      emergencyContactPhone,
      address,
    } = req.body;

    if (!firstName || !lastName || !email || !dateOfBirth || !gender) {
      return sendError(res, 'VALIDATION_ERROR', 'Missing required patient fields', 400);
    }

    const hospitalId = req.user!.hospitalId || req.body.hospitalId;
    if (!hospitalId) {
      return sendError(res, 'VALIDATION_ERROR', 'hospitalId is required', 400);
    }

    // Check if user already exists or create new patient user account
    let user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      const defaultPassword = 'Patient@123';
      const passwordHash = await hashPassword(defaultPassword);
      user = await UserModel.create({
        email: email.toLowerCase(),
        passwordHash,
        firstName,
        lastName,
        phone,
        role: UserRole.PATIENT,
        hospitalId: new mongoose.Types.ObjectId(hospitalId),
        isEmailVerified: true,
      });
    }

    // Generate unique MRN
    const count = await PatientModel.countDocuments({ hospitalId });
    const year = new Date().getFullYear();
    const mrn = `MRN-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const patient = await PatientModel.create({
      userId: user._id,
      hospitalId: new mongoose.Types.ObjectId(hospitalId),
      mrn,
      dateOfBirth,
      gender,
      bloodGroup,
      allergies: allergies || [],
      familyHistoryFlags: familyHistoryFlags || {},
      emergencyContactName,
      emergencyContactPhone,
      address: address || {},
    });

    await AuditLogModel.create({
      hospitalId: new mongoose.Types.ObjectId(hospitalId),
      userId: req.user!.userId,
      userEmail: req.user!.email,
      userRole: req.user!.role,
      action: 'CREATE',
      resource: 'Patient',
      resourceId: patient._id.toString(),
      ipAddress: req.ip,
    }).catch(() => {});

    return sendSuccess(res, { ...patient.toObject(), id: patient._id, user }, 'Patient registered successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /patients/:id — Update patient details
router.patch('/:id', authenticate, requireRoles(UserRole.RECEPTIONIST, UserRole.HOSPITAL_ADMIN, UserRole.DOCTOR, UserRole.NURSE), async (req: AuthenticatedRequest, res) => {
  try {
    const patient = await PatientModel.findById(req.params.id);
    if (!patient || patient.deletedAt) {
      return sendError(res, 'NOT_FOUND', 'Patient record not found', 404);
    }

    if (!enforceTenant(req, patient.hospitalId.toString())) {
      return sendError(res, 'FORBIDDEN', 'Access denied to other hospital tenant data', 403);
    }

    const { allergies, familyHistoryFlags, bloodGroup, emergencyContactName, emergencyContactPhone, address } = req.body;
    if (allergies) patient.allergies = allergies;
    if (familyHistoryFlags) patient.familyHistoryFlags = familyHistoryFlags;
    if (bloodGroup) patient.bloodGroup = bloodGroup;
    if (emergencyContactName) patient.emergencyContactName = emergencyContactName;
    if (emergencyContactPhone) patient.emergencyContactPhone = emergencyContactPhone;
    if (address) patient.address = address;

    await patient.save();
    return sendSuccess(res, patient, 'Patient updated successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// DELETE /patients/:id — Soft delete
router.delete('/:id', authenticate, requireRoles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const patient = await PatientModel.findById(req.params.id);
    if (!patient) return sendError(res, 'NOT_FOUND', 'Patient not found', 404);

    if (!enforceTenant(req, patient.hospitalId.toString())) {
      return sendError(res, 'FORBIDDEN', 'Access denied to other hospital tenant data', 403);
    }

    patient.deletedAt = new Date();
    await patient.save();

    return sendSuccess(res, { success: true }, 'Patient soft-deleted successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
