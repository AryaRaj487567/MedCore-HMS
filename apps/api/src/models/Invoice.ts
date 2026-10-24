import mongoose, { Schema, Document } from 'mongoose';
import { InvoiceStatus, PaymentMethod, InvoiceItem, InvoicePayment } from '@medcore/types';

export interface IInvoiceDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  invoiceNumber: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  payments: InvoicePayment[];
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceItemSchema = new Schema<InvoiceItem>(
  {
    id: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['CONSULTATION', 'LAB', 'PHARMACY', 'ROOM', 'OTHER'],
      default: 'OTHER',
    },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 },
    referenceId: String,
  },
  { _id: false }
);

const InvoicePaymentSchema = new Schema<InvoicePayment>(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    transactionId: String,
    paidAt: { type: String, required: true },
    notes: String,
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoiceDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
    invoiceNumber: { type: String, required: true, index: true },
    items: { type: [InvoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: InvoiceStatus.DRAFT,
      index: true,
    },
    payments: { type: [InvoicePaymentSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Enforce billing integrity
InvoiceSchema.pre('save', function (next) {
  let itemSum = 0;
  for (const item of this.items) {
    item.totalPrice = item.quantity * item.unitPrice;
    itemSum += item.totalPrice;
  }
  this.subtotal = itemSum;
  this.total = Math.max(0, this.subtotal - this.discount + this.tax);
  
  let paidSum = 0;
  for (const payment of this.payments) {
    paidSum += payment.amount;
  }
  this.amountPaid = paidSum;
  this.balanceDue = Math.max(0, this.total - this.amountPaid);

  if (this.amountPaid >= this.total && this.total > 0) {
    this.status = InvoiceStatus.PAID;
  }
  next();
});

InvoiceSchema.index({ hospitalId: 1, invoiceNumber: 1 }, { unique: true });
InvoiceSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const InvoiceModel = mongoose.model<IInvoiceDocument>('Invoice', InvoiceSchema);
