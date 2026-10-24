import { Router } from 'express';
import { PrescriptionModel, DoctorModel, PatientModel, HospitalModel } from '../../models';
import { authenticate, requireRoles, AuthenticatedRequest, enforceTenant } from '../../common/auth.middleware';
import { sendSuccess, sendError } from '../../common/response';
import { UserRole, NotificationType } from '@medcore/types';
import { sendNotification } from '../notifications/notification.service';
import mongoose from 'mongoose';

const router = Router();

// POST /prescriptions — Doctor creates prescription
router.post('/', authenticate, requireRoles(UserRole.DOCTOR), async (req: AuthenticatedRequest, res) => {
  try {
    const { patientId, medicalRecordId, appointmentId, items, specialInstructions, doctorSignature } = req.body;

    if (!patientId || !medicalRecordId || !Array.isArray(items) || items.length === 0) {
      return sendError(res, 'VALIDATION_ERROR', 'patientId, medicalRecordId, and at least 1 medicine item are required', 400);
    }

    const doctor = await DoctorModel.findOne({ userId: req.user!.userId }).populate('userId');
    if (!doctor) return sendError(res, 'DOCTOR_NOT_FOUND', 'Doctor profile not found', 404);

    const count = await PrescriptionModel.countDocuments({ hospitalId: doctor.hospitalId });
    const year = new Date().getFullYear();
    const prescriptionNumber = `RX-${year}-${(count + 1).toString().padStart(4, '0')}`;

    const prescription = await PrescriptionModel.create({
      hospitalId: doctor.hospitalId,
      patientId: new mongoose.Types.ObjectId(patientId),
      doctorId: doctor._id,
      medicalRecordId: new mongoose.Types.ObjectId(medicalRecordId),
      appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : undefined,
      prescriptionNumber,
      items,
      specialInstructions,
      doctorSignature: doctorSignature || doctor.signatureImage,
      isDispensed: false,
    });

    // Notify patient
    const patient = await PatientModel.findById(patientId);
    if (patient?.userId) {
      await sendNotification({
        hospitalId: doctor.hospitalId,
        recipientUserId: patient.userId,
        title: 'Prescription Issued',
        message: `Dr. ${(doctor.userId as any)?.lastName || ''} has issued prescription ${prescriptionNumber}. Ready for pharmacy pickup.`,
        type: NotificationType.PRESCRIPTION_READY,
        metadata: { prescriptionId: prescription._id },
      });
    }

    return sendSuccess(res, prescription, 'Prescription issued successfully', 201);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /prescriptions/:id — Get prescription details
router.get('/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const prescription = await PrescriptionModel.findById(req.params.id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'firstName lastName email specialization' },
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'firstName lastName email phone' },
      })
      .lean();

    if (!prescription) return sendError(res, 'NOT_FOUND', 'Prescription not found', 404);

    if (!enforceTenant(req, prescription.hospitalId.toString())) {
      return sendError(res, 'FORBIDDEN', 'Access denied to other hospital tenant data', 403);
    }

    return sendSuccess(res, {
      ...prescription,
      id: prescription._id,
      doctor: prescription.doctorId,
      patient: prescription.patientId,
    });
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

// GET /prescriptions/:id/pdf — Render professional printable HTML with letterhead and signature
router.get('/:id/pdf', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const prescription = await PrescriptionModel.findById(req.params.id)
      .populate({
        path: 'doctorId',
        populate: { path: 'userId', select: 'firstName lastName email' },
      })
      .populate({
        path: 'patientId',
        populate: { path: 'userId', select: 'firstName lastName email phone' },
      })
      .lean();

    if (!prescription) return sendError(res, 'NOT_FOUND', 'Prescription not found', 404);

    const hospital = await HospitalModel.findById(prescription.hospitalId).lean();
    const docUser = (prescription.doctorId as any)?.userId;
    const patUser = (prescription.patientId as any)?.userId;
    const pat = prescription.patientId as any;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Prescription ${prescription.prescriptionNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 40px; color: #1e293b; }
    .header { border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
    .hospital-title { font-size: 24px; font-weight: bold; color: #0284c7; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; background: #f8fafc; padding: 16px; border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    th { background: #e0f2fe; color: #0369a1; text-align: left; padding: 10px 12px; font-size: 13px; text-transform: uppercase; }
    td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; align-items: flex-end; }
    .rx-symbol { font-size: 32px; font-weight: bold; color: #0284c7; font-family: serif; }
    .signature-box { text-align: center; border-top: 1px dashed #94a3b8; padding-top: 8px; width: 220px; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="hospital-title">${hospital?.name || 'MedCore Hospital'}</div>
      <div style="font-size: 13px; color: #64748b;">${hospital?.address?.street || ''}, ${hospital?.address?.city || ''} | Tel: ${hospital?.phone || ''}</div>
    </div>
    <div style="text-align: right;">
      <div style="font-weight: bold; font-size: 16px;">PRESCRIPTION</div>
      <div style="color: #64748b; font-size: 13px;">No: ${prescription.prescriptionNumber}</div>
      <div style="color: #64748b; font-size: 13px;">Date: ${new Date(prescription.createdAt).toLocaleDateString()}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div>
      <strong>Patient:</strong> ${patUser?.firstName || ''} ${patUser?.lastName || ''}<br>
      <strong>MRN:</strong> ${pat?.mrn || 'N/A'} | <strong>Age/Gender:</strong> ${pat?.gender || 'N/A'}<br>
      <strong>Allergies:</strong> ${(pat?.allergies && pat.allergies.length > 0) ? pat.allergies.join(', ') : 'None Reported'}
    </div>
    <div>
      <strong>Consulting Doctor:</strong> Dr. ${docUser?.firstName || ''} ${docUser?.lastName || ''}<br>
      <strong>Specialization:</strong> ${(prescription.doctorId as any)?.specialization || 'General Medicine'}<br>
      <strong>License No:</strong> ${(prescription.doctorId as any)?.licenseNumber || 'REG-MH-2024'}
    </div>
  </div>

  <div class="rx-symbol">℞</div>

  <table>
    <thead>
      <tr>
        <th>Medicine & Form</th>
        <th>Dosage</th>
        <th>Frequency</th>
        <th>Duration</th>
        <th>Instructions</th>
      </tr>
    </thead>
    <tbody>
      ${prescription.items.map((item: any) => `
        <tr>
          <td><strong>${item.medicineName}</strong> <span style="font-size: 12px; color: #64748b;">(${item.form})</span></td>
          <td>${item.dosage}</td>
          <td><span style="background: #e0f2fe; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0284c7;">${item.frequency}</span></td>
          <td>${item.durationDays} Days</td>
          <td>${item.instructions || 'As directed'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  ${prescription.specialInstructions ? `
    <div style="margin-top: 24px; padding: 12px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
      <strong>Doctor's Notes & Advice:</strong> ${prescription.specialInstructions}
    </div>
  ` : ''}

  <div class="footer">
    <div style="font-size: 12px; color: #94a3b8;">
      Generated securely via MedCore HMS • Digitally Signed Clinical Document
    </div>
    <div class="signature-box">
      ${prescription.doctorSignature ? `<img src="${prescription.doctorSignature}" style="max-height: 48px; max-width: 180px; margin-bottom: 4px;" alt="Signature" /><br>` : ''}
      <div style="font-weight: bold; font-size: 14px;">Dr. ${docUser?.firstName || ''} ${docUser?.lastName || ''}</div>
      <div style="font-size: 12px; color: #64748b;">Signature / Registered Medical Practitioner</div>
    </div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.send(html);
  } catch (error) {
    return sendError(res, 'INTERNAL_ERROR', (error as Error).message, 500);
  }
});

export default router;
