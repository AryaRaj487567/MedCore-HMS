import { Router } from 'express';
import { MedicalRecordModel, PatientModel, DoctorModel, AppointmentModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest, enforceTenant } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { UserRole, AppointmentStatus } from '@medcore/types';
import mongoose from 'mongoose';

const router = Router();

// POST /medical-records — Doctor creates encounter medical record
router.post('/', authenticate, requireRoles(UserRole.DOCTOR), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      patientId,
      appointmentId,
      vitals,
      chiefComplaint,
      presentingSymptoms,
      diagnosis,
      treatmentPlan,
      allergiesRecorded,
      vaccinations,
      initialNote,
      fileAttachments,
    } = req.body;

    if (!patientId || !chiefComplaint || !diagnosis || !treatmentPlan) {
      return sendError(
        res,
        'VALIDATION_ERROR',
        'patientId, chiefComplaint, diagnosis, and treatmentPlan are required',
        400
      );
    }

    const doctor = await DoctorModel.findOne({ userId: req.user!.userId });
    if (!doctor) {
      return sendError(res, 'DOCTOR_NOT_FOUND', 'Doctor profile not found for user', 404);
    }

    const patient = await PatientModel.findById(patientId);
    if (!patient) {
      return sendError(res, 'PATIENT_NOT_FOUND', 'Patient record not found', 404);
    }

    // Auto-calculate BMI if height and weight are provided
    const calculatedVitals = { ...vitals };
    if (vitals?.heightCm && vitals?.weightKg && vitals.heightCm > 0) {
      const heightInM = vitals.heightCm / 100;
      calculatedVitals.bmi = parseFloat((vitals.weightKg / (heightInM * heightInM)).toFixed(1));
    }

    const notesHistory = [];
    if (initialNote) {
      notesHistory.push({
        id: new mongoose.Types.ObjectId().toString(),
        authorId: req.user!.userId,
        authorName: `${req.user!.email}`,
        authorRole: req.user!.role,
        text: initialNote,
        createdAt: new Date().toISOString(),
      });
    }

    const record = await MedicalRecordModel.create({
      hospitalId: doctor.hospitalId,
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: doctor._id,
      appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : undefined,
      vitals: calculatedVitals,
      chiefComplaint,
      presentingSymptoms: presentingSymptoms || [],
      diagnosis: {
        icd10Code: diagnosis.icd10Code || '',
        description: diagnosis.description || '',
        type: diagnosis.type || 'CONFIRMED',
      },
      treatmentPlan,
      allergiesRecorded: allergiesRecorded || [],
      vaccinations: vaccinations || [],
      notesHistory,
      fileAttachments: fileAttachments || [],
    });

    // If an appointment was linked, mark it COMPLETED
    if (appointmentId) {
      await AppointmentModel.findByIdAndUpdate(appointmentId, {
        status: AppointmentStatus.COMPLETED,
      });
    }

    // Update patient allergies if new ones were recorded
    if (allergiesRecorded && allergiesRecorded.length > 0) {
      await PatientModel.findByIdAndUpdate(patientId, {
        $addToSet: { allergies: { $each: allergiesRecorded } },
      });
    }

    return sendSuccess(res, record, 'Medical Record created successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /medical-records/:patientId — Fetch records for patient
router.get('/:patientId', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const patient = await PatientModel.findById(req.params.patientId);
    if (!patient || patient.deletedAt) {
      return sendError(res, 'NOT_FOUND', 'Patient record not found', 404);
    }

    if (!enforceTenant(req, patient.hospitalId.toString())) {
      return sendError(res, 'FORBIDDEN', 'Access denied to other hospital tenant data', 403);
    }

    // Patient can only view their own records
    if (req.user!.role === UserRole.PATIENT && patient.userId.toString() !== req.user!.userId) {
      return sendError(res, 'FORBIDDEN', 'Access denied: You can only view your own records', 403);
    }

    const records = await MedicalRecordModel.find({ patientId: req.params.patientId })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'firstName lastName email specialization' },
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = records.map((r: any) => ({
      ...r,
      id: r._id,
      doctor: r.doctorId ? { ...r.doctorId, id: r.doctorId._id, user: r.doctorId.userId } : undefined,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /medical-records/:id/notes — Append-only note addition
router.post('/:id/notes', authenticate, requireRoles(UserRole.DOCTOR, UserRole.NURSE), async (req: AuthenticatedRequest, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      return sendError(res, 'VALIDATION_ERROR', 'Note text is required', 400);
    }

    const newNote = {
      id: new mongoose.Types.ObjectId().toString(),
      authorId: req.user!.userId,
      authorName: req.user!.email,
      authorRole: req.user!.role,
      text,
      createdAt: new Date().toISOString(),
    };

    const record = await MedicalRecordModel.findByIdAndUpdate(
      req.params.id,
      { $push: { notesHistory: newNote } },
      { new: true }
    );

    if (!record) return sendError(res, 'NOT_FOUND', 'Medical Record not found', 404);
    return sendSuccess(res, record, 'Clinical note appended successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
