import mongoose, { Schema, Document } from 'mongoose';
import { MedicineForm, MedicineBatch } from '@medcore/types';

export interface IMedicineDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  name: string;
  genericName: string;
  category: string;
  form: MedicineForm;
  manufacturer: string;
  reorderLevel: number;
  totalStock: number;
  batches: MedicineBatch[];
  createdAt: Date;
  updatedAt: Date;
}

const MedicineBatchSchema = new Schema<MedicineBatch>(
  {
    id: { type: String, required: true },
    batchNumber: { type: String, required: true },
    manufacturingDate: { type: String, required: true },
    expiryDate: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitCost: { type: Number, required: true },
    mrp: { type: Number, required: true },
    isQuarantined: { type: Boolean, default: false },
  },
  { _id: false }
);

const MedicineSchema = new Schema<IMedicineDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    name: { type: String, required: true, trim: true },
    genericName: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    form: {
      type: String,
      enum: Object.values(MedicineForm),
      default: MedicineForm.TABLET,
    },
    manufacturer: { type: String, required: true },
    reorderLevel: { type: Number, default: 20 },
    totalStock: { type: Number, default: 0 },
    batches: { type: [MedicineBatchSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Recalculate totalStock before saving
MedicineSchema.pre('save', function (next) {
  const today = new Date().toISOString().split('T')[0];
  let sum = 0;
  for (const batch of this.batches) {
    // Flag expired batches automatically as quarantined
    if (batch.expiryDate < today) {
      batch.isQuarantined = true;
    }
    if (!batch.isQuarantined) {
      sum += batch.quantity;
    }
  }
  this.totalStock = sum;
  next();
});

MedicineSchema.index({ hospitalId: 1, name: 1 });
MedicineSchema.index({ hospitalId: 1, genericName: 1 });

export const MedicineModel = mongoose.model<IMedicineDocument>('Medicine', MedicineSchema);
