import mongoose, { Schema, Document } from 'mongoose';
import { WeeklyTimeSlot } from '@medcore/types';

export interface IDoctorDocument extends Document {
  userId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  departmentId: mongoose.Types.ObjectId;
  specialization: string;
  licenseNumber: string;
  consultationFee: number;
  bio?: string;
  signatureImage?: string;
  weeklySchedule: WeeklyTimeSlot[];
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const WeeklySlotSchema = new Schema<WeeklyTimeSlot>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true }, // e.g. "09:00"
    endTime: { type: String, required: true },   // e.g. "13:00"
    slotDurationMinutes: { type: Number, default: 30 },
  },
  { _id: false }
);

const DoctorSchema = new Schema<IDoctorDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    specialization: { type: String, required: true, trim: true },
    licenseNumber: { type: String, required: true, trim: true },
    consultationFee: { type: Number, required: true, default: 500 },
    bio: { type: String },
    signatureImage: { type: String }, // Digital signature base64 or SVG data
    weeklySchedule: { type: [WeeklySlotSchema], default: [] },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

DoctorSchema.index({ hospitalId: 1, specialization: 1 });
DoctorSchema.index({ hospitalId: 1, departmentId: 1 });

export const DoctorModel = mongoose.model<IDoctorDocument>('Doctor', DoctorSchema);
