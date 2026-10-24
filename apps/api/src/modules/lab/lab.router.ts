import { Router } from 'express';
import { LabOrderModel, LabTestModel, DoctorModel, PatientModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest, enforceTenant } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { UserRole, LabOrderStatus, NotificationType } from '@medcore/types';
import { sendNotification } from '../notifications/notification.service';
import mongoose from 'mongoose';

const router = Router();

// GET /lab-tests — Catalog of tests
router.get('/tests', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const filter: any = {};
    if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.hospitalId) {
      filter.hospitalId = req.user!.hospitalId;
    }
    const tests = await LabTestModel.find(filter).lean();
    return sendSuccess(res, tests);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /lab-orders — Doctor creates lab order
router.post('/orders', authenticate, requireRoles(UserRole.DOCTOR), async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId, medicalRecordId, appointmentId, testIds } = req.body;
    if (!patientId || !Array.isArray(testIds) || testIds.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'patientId and at least one testId are required', 400);
    }

    const doctor = await DoctorModel.findOne({ userId: req.user!.userId });
    if (!doctor) return sendError(res, 'DOCTOR_NOT_FOUND', 'Doctor profile not found', 404);

    const tests = await LabTestModel.find({ _id: { $in: testIds } });
    if (tests.length === 0) {
      return sendError(res, 'NOT_FOUND', 'None of the requested lab tests were found', 404);
    }

    const orderItems = tests.map((t) => ({
      testId: t._id,
      testName: t.name,
      price: t.price,
      status: 'PENDING' as const,
      referenceRangeText: t.referenceRanges.length > 0 ? `${t.referenceRanges[0].minVal} - ${t.referenceRanges[0].maxVal} ${t.referenceRanges[0].unit}` : '',
    }));

    const count = await LabOrderModel.countDocuments({ hospitalId: doctor.hospitalId });
    const year = new Date().getFullYear();
    const orderNumber = `LAB-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const order = await LabOrderModel.create({
      hospitalId: doctor.hospitalId,
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: doctor._id,
      medicalRecordId: medicalRecordId ? new mongoose.Types.ObjectId(medicalRecordId) : undefined,
      appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : undefined,
      orderNumber,
      tests: orderItems,
      status: LabOrderStatus.ORDERED,
    });

    return sendSuccess(res, order, 'Lab order created successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /lab-orders — List orders
router.get('/orders', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, patientId } = req.query;
    const filter: any = {};

    if (req.user!.role !== UserRole.SUPER_ADMIN && req.user!.hospitalId) {
      filter.hospitalId = req.user!.hospitalId;
    }

    if (req.user!.role === UserRole.PATIENT) {
      const patient = await PatientModel.findOne({ userId: req.user!.userId });
      if (!patient) return sendSuccess(res, []);
      filter.patientId = patient._id;
      // Patients can only see approved reports
      filter.status = LabOrderStatus.APPROVED;
    }

    if (status) filter.status = status;
    if (patientId) filter.patientId = patientId;

    const orders = await LabOrderModel.find(filter)
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = orders.map((o: any) => ({
      ...o,
      id: o._id,
      patient: o.patientId,
      doctor: o.doctorId,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /lab-orders/:id/sample — Sample collected
router.patch('/orders/:id/sample', authenticate, requireRoles(UserRole.LAB_TECHNICIAN, UserRole.NURSE, UserRole.RECEPTIONIST), async (req: AuthenticatedRequest, res) => {
  try {
    const order = await LabOrderModel.findById(req.params.id);
    if (!order) return sendError(res, 'NOT_FOUND', 'Lab order not found', 404);

    order.status = LabOrderStatus.SAMPLE_COLLECTED;
    for (const test of order.tests) {
      if (test.status === 'PENDING') test.status = 'COLLECTED';
    }
    await order.save();

    return sendSuccess(res, order, 'Sample collected status recorded');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /lab-orders/:id/result — Lab tech enters results & auto flags reference range violations
router.patch('/orders/:id/result', authenticate, requireRoles(UserRole.LAB_TECHNICIAN), async (req: AuthenticatedRequest, res) => {
  try {
    const { testResults } = req.body; // Array of { testId, resultValue, resultString, resultNotes, unit }
    if (!Array.isArray(testResults)) {
      return sendError(res, 'VALIDATION_ERROR', 'testResults array is required', 400);
    }

    const order = await LabOrderModel.findById(req.params.id);
    if (!order) return sendError(res, 'NOT_FOUND', 'Lab order not found', 404);

    for (const result of testResults) {
      const targetTest = order.tests.find((t) => t.testId.toString() === result.testId.toString());
      if (targetTest) {
        targetTest.resultValue = result.resultValue;
        targetTest.resultString = result.resultString || result.resultValue?.toString();
        targetTest.unit = result.unit || targetTest.unit;
        targetTest.resultNotes = result.resultNotes;
        targetTest.technicianId = new mongoose.Types.ObjectId(req.user!.userId);
        targetTest.performedAt = new Date().toISOString();
        targetTest.status = 'RESULT_ENTERED';

        // Check reference range to flag out-of-range values in red!
        const testDefinition = await LabTestModel.findById(targetTest.testId);
        if (testDefinition && testDefinition.referenceRanges.length > 0 && typeof result.resultValue === 'number') {
          const range = testDefinition.referenceRanges[0];
          targetTest.isOutOfRange = result.resultValue < range.minVal || result.resultValue > range.maxVal;
        }
      }
    }

    order.status = LabOrderStatus.COMPLETED;
    await order.save();

    return sendSuccess(res, order, 'Results entered and verified against reference ranges');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /lab-orders/:id/approve — Senior lab manager reviews and approves
router.patch('/orders/:id/approve', authenticate, requireRoles(UserRole.LAB_TECHNICIAN, UserRole.HOSPITAL_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const order = await LabOrderModel.findById(req.params.id).populate('doctorId').populate('patientId');
    if (!order) return sendError(res, 'NOT_FOUND', 'Lab order not found', 404);

    order.status = LabOrderStatus.APPROVED;
    order.approvedById = new mongoose.Types.ObjectId(req.user!.userId);
    order.approvedAt = new Date();

    for (const test of order.tests) {
      test.status = 'APPROVED';
    }

    await order.save();

    // Trigger notification to Patient and Doctor
    const patientDoc = order.patientId as any;
    if (patientDoc?.userId) {
      await sendNotification({
        hospitalId: order.hospitalId,
        recipientUserId: patientDoc.userId,
        title: 'Lab Report Approved',
        message: `Your lab results for order ${order.orderNumber} have been reviewed and approved.`,
        type: NotificationType.LAB_REPORT_APPROVED,
        metadata: { orderId: order._id },
      });
    }

    return sendSuccess(res, order, 'Lab order approved successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
