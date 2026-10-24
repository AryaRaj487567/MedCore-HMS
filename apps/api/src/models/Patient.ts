import mongoose, { Schema, Document } from 'mongoose';

export interface IPatientDocument extends Document {
  userId: mongoose.Types.ObjectId;
  hospitalId: mongoose.Types.ObjectId;
  mrn: string; // Medical Record Number
  dateOfBirth: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  allergies: string[];
  familyHistoryFlags: {
    diabetes: boolean;
    hypertension: boolean;
    cancer: boolean;
    cardiac: boolean;
  };
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PatientSchema = new Schema<IPatientDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    mrn: { type: String, required: true, trim: true },
    dateOfBirth: { type: String, required: true },
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'], required: true },
    bloodGroup: { type: String },
    emergencyContactName: { type: String },
    emergencyContactPhone: { type: String },
    allergies: { type: [String], default: [] },
    familyHistoryFlags: {
      diabetes: { type: Boolean, default: false },
      hypertension: { type: Boolean, default: false },
      cancer: { type: Boolean, default: false },
      cardiac: { type: Boolean, default: false },
    },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

PatientSchema.index({ hospitalId: 1, mrn: 1 }, { unique: true });

export const PatientModel = mongoose.model<IPatientDocument>('Patient', PatientSchema);
