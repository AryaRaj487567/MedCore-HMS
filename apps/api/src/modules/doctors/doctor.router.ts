import { Router } from 'express';
import { DoctorModel, UserModel, AppointmentModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { UserRole, AppointmentStatus } from '@medcore/types';

const router = Router();

// GET /doctors — Search doctors by hospitalId & specialization
router.get('/', async (req, res) => {
  try {
    const { hospitalId, specialisation } = req.query;
    const filter: any = { deletedAt: null };
    if (hospitalId) filter.hospitalId = hospitalId;
    if (specialisation) filter.specialization = new RegExp(specialisation as string, 'i');

    const doctors = await DoctorModel.find(filter)
      .populate('userId', 'firstName lastName email phone avatarUrl')
      .populate('departmentId', 'name code')
      .lean();

    const formatted = doctors.map((d: any) => ({
      ...d,
      id: d._id,
      user: d.userId,
      department: d.departmentId,
    }));

    return sendSuccess(res, formatted);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /doctors/:id — Get doctor detail
router.get('/:id', async (req, res) => {
  try {
    const doctor = await DoctorModel.findById(req.params.id)
      .populate('userId', 'firstName lastName email phone avatarUrl')
      .populate('departmentId', 'name code')
      .lean();

    if (!doctor) return sendError(res, 'NOT_FOUND', 'Doctor not found', 404);
    return sendSuccess(res, {
      ...doctor,
      id: doctor._id,
      user: doctor.userId,
      department: doctor.departmentId,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// PATCH /doctors/:id/schedule — Update weekly schedule
router.patch('/:id/schedule', authenticate, requireRoles(UserRole.DOCTOR, UserRole.HOSPITAL_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const { weeklySchedule } = req.body;
    if (!Array.isArray(weeklySchedule)) {
      return sendError(res, 'VALIDATION_ERROR', 'weeklySchedule must be an array of time slots', 400);
    }

    const doctor = await DoctorModel.findByIdAndUpdate(
      req.params.id,
      { weeklySchedule },
      { new: true }
    );
    if (!doctor) return sendError(res, 'NOT_FOUND', 'Doctor not found', 404);

    return sendSuccess(res, doctor, 'Doctor schedule updated successfully');
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /doctors/:id/slots?date=YYYY-MM-DD — Slot generation engine with conflict filtering
router.get('/:id/slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date || typeof date !== 'string') {
      return sendError(res, 'VALIDATION_ERROR', 'date parameter is required (YYYY-MM-DD)', 400);
    }

    const doctor = await DoctorModel.findById(req.params.id);
    if (!doctor) return sendError(res, 'NOT_FOUND', 'Doctor not found', 404);

    const targetDate = new Date(`${date}T00:00:00Z`);
    const dayOfWeek = targetDate.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.

    // Find schedule slots for this day of week
    const daySchedules = doctor.weeklySchedule.filter((s) => s.dayOfWeek === dayOfWeek);

    // Generate discrete time intervals (e.g. 30 mins)
    const allSlots: string[] = [];
    for (const schedule of daySchedules) {
      const [startH, startM] = schedule.startTime.split(':').map(Number);
      const [endH, endM] = schedule.endTime.split(':').map(Number);

      let currentTotalMinutes = startH * 60 + startM;
      const endTotalMinutes = endH * 60 + endM;
      const duration = schedule.slotDurationMinutes || 30;

      while (currentTotalMinutes + duration <= endTotalMinutes) {
        const slotH = Math.floor(currentTotalMinutes / 60).toString().padStart(2, '0');
        const slotM = (currentTotalMinutes % 60).toString().padStart(2, '0');
        allSlots.push(`${slotH}:${slotM}`);
        currentTotalMinutes += duration;
      }
    }

    // Default slots fallback if doctor has no custom schedule set yet (9:00 to 17:00, 30m slots)
    const effectiveSlots = allSlots.length > 0 ? allSlots : [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    // Query already booked appointments for this doctor on this date
    const bookedAppointments = await AppointmentModel.find({
      doctorId: doctor._id,
      appointmentDate: date,
      status: { $nin: [AppointmentStatus.CANCELLED] },
      deletedAt: null,
    }).select('timeSlot').lean();

    const bookedSlotsSet = new Set(bookedAppointments.map((a) => a.timeSlot));

    const slotAvailability = effectiveSlots.map((slot) => ({
      slot,
      isAvailable: !bookedSlotsSet.has(slot),
    }));

    return sendSuccess(res, {
      doctorId: doctor._id,
      date,
      dayOfWeek,
      slots: slotAvailability,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
