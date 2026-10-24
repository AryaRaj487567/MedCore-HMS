import mongoose, { Schema, Document } from 'mongoose';
import { LabReferenceRange } from '@medcore/types';

export interface ILabTestDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  departmentId?: mongoose.Types.ObjectId;
  price: number;
  sampleType: string;
  referenceRanges: LabReferenceRange[];
  createdAt: Date;
  updatedAt: Date;
}

const ReferenceRangeSchema = new Schema<LabReferenceRange>(
  {
    gender: { type: String, enum: ['MALE', 'FEMALE', 'ALL'], default: 'ALL' },
    minVal: { type: Number, required: true },
    maxVal: { type: Number, required: true },
    unit: { type: String, required: true },
  },
  { _id: false }
);

const LabTestSchema = new Schema<ILabTestDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department' },
    price: { type: Number, required: true, default: 0 },
    sampleType: { type: String, required: true, default: 'Blood' },
    referenceRanges: { type: [ReferenceRangeSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

LabTestSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const LabTestModel = mongoose.model<ILabTestDocument>('LabTest', LabTestSchema);
