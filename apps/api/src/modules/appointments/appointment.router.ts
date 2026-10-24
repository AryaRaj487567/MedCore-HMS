import { Router } from 'express';
import { AppointmentModel, DoctorModel, PatientModel, DepartmentModel, UserModel } from '../../models';
import { authenticate, AuthenticatedRequest, enforceTenant } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { AppointmentStatus, NotificationType, UserRole } from '@medcore/types';
import { sendNotification } from '../notifications/notification.service';
import mongoose from 'mongoose';

const router = Router();

// GET /appointments — List appointments with filters
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { date, doctorId, patientId, status } = req.query;
    const filter: any = { deletedAt: null };

    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      filter.hospitalId = req.user!.hospitalId;
    }

    // Role-based restrictions
    if (req.user!.role === UserRole.PATIENT) {
      const patient = await PatientModel.findOne({ userId: req.user!.userId });
      if (!patient) return sendSuccess(res, []);
      filter.patientId = patient._id;
    } else if (req.user!.role === UserRole.DOCTOR) {
      const doctor = await DoctorModel.findOne({ userId: req.user!.userId });
      if (doctor) filter.doctorId = doctor._id;
    }

    if (date) filter.appointmentDate = date;
    if (doctorId) filter.doctorId = doctorId;
    if (patientId) filter.patientId = patientId;
    if (status) filter.status = status;

    const appointments = await AppointmentModel.find(filter)
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'firstName lastName email phone' },
      })
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'firstName lastName email phone avatarUrl' },
      })
      .populate('departmentId', 'name code')
      .sort({ appointmentDate: 1, timeSlot: 1 })
      .lean();

    const formatted = appointments.map((a: any) => ({
      ...a,
      id: a._id,
      patient: a.patientId ? { ...a.patientId, id: a.patientId._id, user: a.patientId.userId } : undefined,
      doctor: a.doctorId ? { ...a.doctorId, id: a.doctorId._id, user: a.doctorId.userId } : undefined,
      department: a.departmentId ? { ...a.departmentId, id: a.departmentId._id } : undefined,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// POST /appointments — Book appointment with concurrency and conflict protection
router.post('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      patientId: inputPatientId,
      doctorId,
      departmentId,
      appointmentDate,
      timeSlot,
      reason,
      isEmergency = false,
    } = req.body;

    if (!doctorId || !appointmentDate || !timeSlot) {
      return sendError(res, 'VALIDATION_ERROR', 'doctorId, appointmentDate, and timeSlot are required', 400);
    }

    // Resolve patientId: if caller is PATIENT, use their own record
    let patientId = inputPatientId;
    if (req.user!.role === UserRole.PATIENT) {
      const myPatient = await PatientModel.findOne({ userId: req.user!.userId });
      if (!myPatient) return sendError(res, 'PATIENT_NOT_FOUND', 'Patient record does not exist for this user', 404);
      patientId = myPatient._id;
    }

    if (!patientId) {
      return sendError(res, 'VALIDATION_ERROR', 'patientId is required', 400);
    }

    const doctor = await DoctorModel.findById(doctorId).populate('userId');
    if (!doctor) return sendError(res, 'NOT_FOUND', 'Doctor not found', 404);

    const hospitalId = doctor.hospitalId;

    // Rule 1: A patient cannot have two appointments at the same time across ANY doctor!
    if (!isEmergency) {
      const patientConflict = await AppointmentModel.findOne({
        patientId,
        appointmentDate,
        timeSlot,
        status: { $nin: [AppointmentStatus.CANCELLED] },
        deletedAt: null,
      });

      if (patientConflict) {
        return sendError(
          res,
          'PATIENT_DOUBLE_BOOKING',
          'You already have another active appointment at this exact date and time.',
          409
        );
      }
    }

    // Rule 2: Concurrency & Slot Availability Check
    // If not emergency, ensure slot is open
    if (!isEmergency) {
      const existingSlot = await AppointmentModel.findOne({
        hospitalId,
        doctorId,
        appointmentDate,
        timeSlot,
        status: { $nin: [AppointmentStatus.CANCELLED] },
        deletedAt: null,
      });

      if (existingSlot) {
        return sendError(
          res,
          'SLOT_UNAVAILABLE',
          'This slot was just booked by another patient.',
          409
        );
      }
    }

    // Create Appointment (MongoDB unique index on (hospitalId, doctorId, appointmentDate, timeSlot) guarantees atomic concurrency)
    try {
      const appointment = await AppointmentModel.create({
        hospitalId,
        patientId: new mongoose.Types.ObjectId(patientId),
        doctorId: new mongoose.Types.ObjectId(doctorId),
        departmentId: departmentId ? new mongoose.Types.ObjectId(departmentId) : doctor.departmentId,
        appointmentDate,
        timeSlot,
        status: AppointmentStatus.CONFIRMED,
        isEmergency: Boolean(isEmergency),
        reason,
      });

      // Dispatch real-time notifications
      const doctorUser = doctor.userId as any;
      if (doctorUser?._id) {
        await sendNotification({
          hospitalId,
          recipientUserId: doctorUser._id,
          title: isEmergency ? '🚨 EMERGENCY Appointment Booked' : 'New Appointment Confirmed',
          message: `${isEmergency ? 'URGENT: Emergency visit' : 'Appointment'} scheduled for ${appointmentDate} at ${timeSlot}`,
          type: isEmergency ? NotificationType.EMERGENCY_APPOINTMENT : NotificationType.APPOINTMENT_CONFIRMED,
          metadata: { appointmentId: appointment._id },
        });
      }

      const patientDoc = await PatientModel.findById(patientId);
      if (patientDoc?.userId) {
        await sendNotification({
          hospitalId,
          recipientUserId: patientDoc.userId,
          title: 'Appointment Confirmed',
          message: `Your appointment with Dr. ${doctorUser?.lastName || ''} is scheduled for ${appointmentDate} at ${timeSlot}`,
          type: NotificationType.APPOINTMENT_CONFIRMED,
          metadata: { appointmentId: appointment._id },
        });
      }

      return sendSuccess(res, appointment, 'Appointment booked successfully', 201);
    } catch (err: any) {
      if (err.code === 11000) {
        return sendError(
          res,
          'SLOT_UNAVAILABLE',
          'This slot was just booked by another patient.',
          409
        );
      }
      throw err;
    }
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /appointments/:id/status — Transition appointment lifecycle
router.patch('/:id/status', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, notes } = req.body;
    if (!status || !Object.values(AppointmentStatus).includes(status)) {
      return sendError(res, 'VALIDATION_ERROR', `Valid status is required: ${Object.values(AppointmentStatus).join(', ')}`, 400);
    }

    const appointment = await AppointmentModel.findById(req.params.id);
    if (!appointment || appointment.deletedAt) {
      return sendError(res, 'NOT_FOUND', 'Appointment not found', 404);
    }

    if (!enforceTenant(req, appointment.hospitalId.toString())) {
      return sendError(res, 'FORBIDDEN', 'Access denied to other hospital tenant data', 403);
    }

    appointment.status = status;
    if (notes) appointment.notes = notes;
    await appointment.save();

    return sendSuccess(res, appointment, `Appointment status updated to ${status}`);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
