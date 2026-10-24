import mongoose, { Schema, Document } from 'mongoose';
import { Vitals, ClinicalNote, VaccinationRecord } from '@medcore/types';

export interface IMedicalRecordDocument extends Document {
  hospitalId: mongoose.Types.ObjectId;
  patientId: mongoose.Types.ObjectId;
  doctorId: mongoose.Types.ObjectId;
  appointmentId?: mongoose.Types.ObjectId;
  vitals: Vitals;
  chiefComplaint: string;
  presentingSymptoms: string[];
  diagnosis: {
    icd10Code?: string;
    description: string;
    type: 'DIFFERENTIAL' | 'CONFIRMED';
  };
  treatmentPlan: string;
  allergiesRecorded: string[];
  vaccinations: VaccinationRecord[];
  notesHistory: ClinicalNote[];
  fileAttachments: Array<{
    name: string;
    url: string;
    sizeBytes: number;
    mimeType: string;
    uploadedAt: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const VitalsSchema = new Schema<Vitals>(
  {
    bloodPressureSystolic: Number,
    bloodPressureDiastolic: Number,
    pulseRate: Number,
    temperature: Number,
    spO2: Number,
    heightCm: Number,
    weightKg: Number,
    bmi: Number,
  },
  { _id: false }
);

const ClinicalNoteSchema = new Schema<ClinicalNote>(
  {
    id: { type: String, required: true },
    authorId: { type: String, required: true },
    authorName: { type: String, required: true },
    authorRole: { type: String, required: true },
    text: { type: String, required: true },
    createdAt: { type: String, required: true },
  },
  { _id: false }
);

const VaccinationSchema = new Schema<VaccinationRecord>(
  {
    vaccineName: { type: String, required: true },
    dateAdministered: { type: String, required: true },
    batchNumber: String,
    nextDueDate: String,
  },
  { _id: false }
);

const MedicalRecordSchema = new Schema<IMedicalRecordDocument>(
  {
    hospitalId: { type: Schema.Types.ObjectId, ref: 'Hospital', required: true, index: true },
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctorId: { type: Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },
    appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment', index: true },
    vitals: { type: VitalsSchema, default: {} },
    chiefComplaint: { type: String, required: true, trim: true },
    presentingSymptoms: { type: [String], default: [] },
    diagnosis: {
      icd10Code: { type: String, trim: true },
      description: { type: String, required: true, trim: true },
      type: { type: String, enum: ['DIFFERENTIAL', 'CONFIRMED'], default: 'CONFIRMED' },
    },
    treatmentPlan: { type: String, required: true },
    allergiesRecorded: { type: [String], default: [] },
    vaccinations: { type: [VaccinationSchema], default: [] },
    notesHistory: { type: [ClinicalNoteSchema], default: [] },
    fileAttachments: [
      {
        name: String,
        url: String,
        sizeBytes: Number,
        mimeType: String,
        uploadedAt: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Pre-save hook to calculate BMI automatically if height and weight are provided
MedicalRecordSchema.pre('save', function (next) {
  if (this.vitals && this.vitals.heightCm && this.vitals.weightKg && this.vitals.heightCm > 0) {
    const heightInMeters = this.vitals.heightCm / 100;
    const calculatedBmi = this.vitals.weightKg / (heightInMeters * heightInMeters);
    this.vitals.bmi = parseFloat(calculatedBmi.toFixed(1));
  }
  next();
});

MedicalRecordSchema.index({ hospitalId: 1, patientId: 1, createdAt: -1 });

export const MedicalRecordModel = mongoose.model<IMedicalRecordDocument>('MedicalRecord', MedicalRecordSchema);
