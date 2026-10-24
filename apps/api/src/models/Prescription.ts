import mongoose, { Schema, Document } from 'mongoose';
import { MedicineForm, PrescriptionFrequency, PrescriptionItem } from '@medcore/types';

export interface IPrescriptionDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicalRecordId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  prescriptionNumber: string;
  items: PrescriptionItem[];
  specialInstructions?: string;
  doctorSignature?: string;
  isDispensed: boolean;
  dispensedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PrescriptionItemSchema = new Schema<PrescriptionItem>(
  {
    medicineId: { type: Schema.Types.ObjectId, ref: 'Medicine' },
    medicineName: { type: String, required: true },
    form: {
      type: String,
      enum: Object.values(MedicineForm),
      default: MedicineForm.TABLET,
    },
    dosage: { type: String, required: true },
    frequency: {
      type: String,
      enum: Object.values(PrescriptionFrequency),
      default: PrescriptionFrequency.BD,
    },
    durationDays: { type: Number, required: true, min: 1 },
    instructions: { type: String },
  },
  { _id: false }
);

const PrescriptionSchema = new Schema<IPrescriptionDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    medicalRecordId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    prescriptionNumber: { type: String, required: true, index: true },
    items: { type: [PrescriptionItemSchema], required: true },
    specialInstructions: { type: String },
    doctorSignature: { type: String },
    isDispensed: { type: Boolean, default: false },
    dispensedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

PrescriptionSchema.index({ hospitalId: 1, prescriptionNumber: 1 }, { unique: true });
PrescriptionSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const PrescriptionModel = mongoose.model<IPrescriptionDocument>('Prescription', PrescriptionSchema);
