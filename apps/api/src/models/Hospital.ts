import mongoose, { Schema, Document } from 'mongoose';
import { HospitalStatus } from '@medcore/types';

export interface IHospitalDocument extends Document {
  name: string;
  code: string;
  slug: string;
  email: string;
  phone: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  status: HospitalStatus;
  subscriptionPlan: string;
  createdAt: Date;
  updatedAt: Date;
}

const HospitalSchema = new Schema<IHospitalDocument>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, required: true },
    address: {
      street: String,
      city: String,
      state: String,
      postalCode: String,
      country: { type: String, default: 'India' },
    },
    status: {
      type: String,
      enum: Object.values(HospitalStatus),
      default: HospitalStatus.VERIFIED,
    },
    subscriptionPlan: { type: String, default: 'ENTERPRISE' },
  },
  {
    timestamps: true,
  }
);

export const HospitalModel = mongoose.model<IHospitalDocument>('Hospital', HospitalSchema);
