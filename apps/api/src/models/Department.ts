import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  name: string;
  code: string;
  description?: string;
  headDoctorId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DepartmentSchema = new Schema<IDepartmentDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String },
    headDoctorId: { type: Schema.Types.ObjectId, ref: 'Doctor' },
  },
  {
    timestamps: true,
  }
);

DepartmentSchema.index({ hospitalId: 1, code: 1 }, { unique: true });

export const DepartmentModel = mongoose.model<IDepartmentDocument>('Department', DepartmentSchema);
