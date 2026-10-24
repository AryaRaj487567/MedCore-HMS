import { Router } from 'express';
import { HospitalModel, DepartmentModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { UserRole, HospitalStatus } from '@medcore/types';

const router = Router();

// GET /hospitals — List all hospitals
router.get('/', async (req, res) => {
  try {
    const hospitals = await HospitalModel.find({ status: { $ne: HospitalStatus.SUSPENDED } }).lean();
    return sendSuccess(res, hospitals);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /hospitals/:id — Get hospital detail
router.get('/:id', async (req, res) => {
  try {
    const hospital = await HospitalModel.findById(req.params.id).lean();
    if (!hospital) return sendError(res, 'NOT_FOUND', 'Hospital not found', 404);
    return sendSuccess(res, hospital);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /hospitals — Super Admin onboard hospital
router.post('/', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, code, slug, email, phone, address, subscriptionPlan } = req.body;
    if (!name || !code || !email || !phone) {
      return sendError(res, 'VALIDATION_ERROR', 'Name, code, email and phone are required', 400);
    }

    const hospital = await HospitalModel.create({
      name,
      code: code.toUpperCase(),
      slug: slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      email,
      phone,
      address: address || {},
      status: HospitalStatus.VERIFIED,
      subscriptionPlan: subscriptionPlan || 'ENTERPRISE',
    });

    return sendSuccess(res, hospital, 'Hospital onboarded successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /hospitals/:id/verify — Super Admin verify hospital
router.patch('/:id/verify', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const hospital = await HospitalModel.findByIdAndUpdate(
      req.params.id,
      { status: HospitalStatus.VERIFIED },
      { new: true }
    );
    if (!hospital) return sendError(res, 'NOT_FOUND', 'Hospital not found', 404);
    return sendSuccess(res, hospital, 'Hospital status updated to VERIFIED');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /hospitals/:id/departments — List departments
router.get('/:id/departments', async (req, res) => {
  try {
    const departments = await DepartmentModel.find({ hospitalId: req.params.id }).populate('headDoctorId').lean();
    return sendSuccess(res, departments);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /hospitals/:id/departments — Create department
router.post('/:id/departments', authenticate, requireRoles(UserRole.HOSPITAL_ADMIN, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const { name, code, description, headDoctorId } = req.body;
    if (!name || !code) {
      return sendError(res, 'VALIDATION_ERROR', 'Name and code are required', 400);
    }

    const department = await DepartmentModel.create({
      hospitalId: req.params.id,
      name,
      code: code.toUpperCase(),
      description,
      headDoctorId,
    });

    return sendSuccess(res, department, 'Department created successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
