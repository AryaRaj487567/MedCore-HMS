import mongoose, { Schema, Document } from 'mongoose';
import { AppointmentStatus } from '@medcore/types';

export interface IAppointmentDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string;        // "09:30"
  status: AppointmentStatus;
  isEmergency: boolean;
  reason?: string;
  notes?: string;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema = new Schema<IAppointmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    appointmentDate: { type: String, required: true, index: true }, // Format: YYYY-MM-DD
    timeSlot: { type: String, required: true },                    // Format: HH:MM
    status: {
      type: String,
      enum: Object.values(AppointmentStatus),
      default: AppointmentStatus.CONFIRMED,
      index: true,
    },
    isEmergency: { type: Boolean, default: false },
    isCancelled: { type: Boolean, default: false },
    reason: { type: String, trim: true },
    notes: { type: String, trim: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

// Pre-save hook to keep isCancelled in sync with status
AppointmentSchema.pre('save', function (next) {
  this.isCancelled = this.status === AppointmentStatus.CANCELLED;
  next();
});

// High-performance query indexes
AppointmentSchema.index({ hospitalId: 1, appointmentDate: 1 });
AppointmentSchema.index({ doctorId: 1, appointmentDate: 1 });
AppointmentSchema.index({ patientId: 1, appointmentDate: 1 });

// Concurrency protection: Enforce unique active booking per doctor, date and slot
AppointmentSchema.index(
  { hospitalId: 1, doctorId: 1, appointmentDate: 1, timeSlot: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isCancelled: false,
      isEmergency: false,
    },
  }
);

export const AppointmentModel = mongoose.model<IAppointmentDocument>('Appointment', AppointmentSchema);
