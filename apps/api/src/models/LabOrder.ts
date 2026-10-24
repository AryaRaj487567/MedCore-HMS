import mongoose, { Schema, Document } from 'mongoose';
import { LabOrderStatus, LabOrderItem } from '@medcore/types';

export interface ILabOrderDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  medicalRecordId?: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  orderNumber: string;
  tests: LabOrderItem[];
  status: LabOrderStatus;
  approvedById?: mongoose.Types.ObjectId;
  approvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const LabOrderItemSchema = new Schema<LabOrderItem>(
  {
    testId: { type: Schema.Types.ObjectId, ref: 'LabTest', required: true },
    testName: { type: String, required: true },
    price: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'COLLECTED', 'RESULT_ENTERED', 'APPROVED'],
      default: 'PENDING',
    },
    resultValue: Number,
    resultString: String,
    unit: String,
    isOutOfRange: { type: Boolean, default: false },
    resultNotes: String,
    referenceRangeText: String,
    technicianId: { type: Schema.Types.ObjectId, ref: 'User' },
    performedAt: String,
  },
  { _id: false }
);

const LabOrderSchema = new Schema<ILabOrderDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    medicalRecordId: { type: Schema.Types.ObjectId, ref: 'MedicalRecord' },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    orderNumber: { type: String, required: true, index: true },
    tests: { type: [LabOrderItemSchema], required: true },
    status: {
      type: String,
      enum: Object.values(LabOrderStatus),
      default: LabOrderStatus.ORDERED,
      index: true,
    },
    approvedById: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  }
);

LabOrderSchema.index({ hospitalId: 1, orderNumber: 1 }, { unique: true });
LabOrderSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const LabOrderModel = mongoose.model<ILabOrderDocument>('LabOrder', LabOrderSchema);
