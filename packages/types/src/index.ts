// ==============================================================================
// MedCore HMS — Shared TypeScript Types & Enums
// ==============================================================================

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  HOSPITAL_ADMIN = 'HOSPITAL_ADMIN',
  DOCTOR = 'DOCTOR',
  NURSE = 'NURSE',
  RECEPTIONIST = 'RECEPTIONIST',
  LAB_TECHNICIAN = 'LAB_TECHNICIAN',
  PHARMACIST = 'PHARMACIST',
  ACCOUNTANT = 'ACCOUNTANT',
  PATIENT = 'PATIENT',
}

export enum HospitalStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  SUSPENDED = 'SUSPENDED',
}

export enum AppointmentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum LabOrderStatus {
  ORDERED = 'ORDERED',
  SAMPLE_COLLECTED = 'SAMPLE_COLLECTED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  STRIPE = 'STRIPE',
  RAZORPAY = 'RAZORPAY',
}

export enum PrescriptionFrequency {
  OD = 'OD',     // Once daily
  BD = 'BD',     // Twice daily
  TDS = 'TDS',   // Thrice daily
  QID = 'QID',   // Four times daily
  SOS = 'SOS',   // As needed
}

export enum MedicineForm {
  TABLET = 'TABLET',
  CAPSULE = 'CAPSULE',
  SYRUP = 'SYRUP',
  INJECTION = 'INJECTION',
  TOPICAL = 'TOPICAL',
}

export enum NotificationType {
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_REMINDER = 'APPOINTMENT_REMINDER',
  LAB_REPORT_APPROVED = 'LAB_REPORT_APPROVED',
  PRESCRIPTION_READY = 'PRESCRIPTION_READY',
  INVOICE_GENERATED = 'INVOICE_GENERATED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  EMERGENCY_APPOINTMENT = 'EMERGENCY_APPOINTMENT',
  SYSTEM = 'SYSTEM',
}

// ------------------------------------------------------------------------------
// Standard API Envelope Responses
// ------------------------------------------------------------------------------

export interface ApiResponse<T = any> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: any;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiErrorDetail;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  meta: PaginationMeta;
  message: string;
}

// ------------------------------------------------------------------------------
// Core Entity Interfaces
// ------------------------------------------------------------------------------

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface Hospital {
  id: string;
  name: string;
  code: string;
  slug: string;
  email: string;
  phone: string;
  address: Address;
  status: HospitalStatus;
  subscriptionPlan: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  role: UserRole;
  hospitalId?: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTimeSlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00"
  endTime: string;   // "13:00"
  slotDurationMinutes: number; // 30
}

export interface Doctor {
  id: string;
  userId: string;
  hospitalId: string;
  departmentId: string;
  specialization: string;
  licenseNumber: string;
  consultationFee: number;
  bio?: string;
  signatureImage?: string; // SVG or base64 data URL
  weeklySchedule: WeeklyTimeSlot[];
  user?: User;
  department?: Department;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Patient {
  id: string;
  userId: string;
  hospitalId: string;
  mrn: string; // Medical Record Number e.g. "MRN-2026-0001"
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
  address: Address;
  user?: User;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Department {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  description?: string;
  headDoctorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  departmentId: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string;        // "09:30"
  status: AppointmentStatus;
  isEmergency: boolean;
  reason?: string;
  notes?: string;
  version: number;
  patient?: Patient;
  doctor?: Doctor;
  department?: Department;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Vitals {
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulseRate?: number;       // bpm
  temperature?: number;     // Fahrenheit or Celsius
  spO2?: number;            // percentage
  heightCm?: number;
  weightKg?: number;
  bmi?: number;             // auto-calculated: weight / (height/100)^2
}

export interface ClinicalNote {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

export interface VaccinationRecord {
  vaccineName: string;
  dateAdministered: string;
  batchNumber?: string;
  nextDueDate?: string;
}

export interface MedicalRecord {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  appointmentId: string;
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
  notesHistory: ClinicalNote[]; // Append-only
  fileAttachments: Array<{
    name: string;
    url: string;
    sizeBytes: number;
    mimeType: string;
    uploadedAt: string;
  }>;
  doctor?: Doctor;
  patient?: Patient;
  appointment?: Appointment;
  createdAt: string;
  updatedAt: string;
}

export interface PrescriptionItem {
  medicineId?: string;
  medicineName: string;
  form: MedicineForm;
  dosage: string;      // "500 mg"
  frequency: PrescriptionFrequency;
  durationDays: number;
  instructions?: string;
}

export interface Prescription {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  medicalRecordId: string;
  appointmentId: string;
  prescriptionNumber: string;
  items: PrescriptionItem[];
  specialInstructions?: string;
  doctorSignature?: string;
  isDispensed: boolean;
  dispensedAt?: string;
  doctor?: Doctor;
  patient?: Patient;
  createdAt: string;
  updatedAt: string;
}

export interface LabReferenceRange {
  gender: 'MALE' | 'FEMALE' | 'ALL';
  minVal: number;
  maxVal: number;
  unit: string;
}

export interface LabTest {
  id: string;
  hospitalId: string;
  name: string;
  code: string;
  departmentId?: string;
  price: number;
  sampleType: string; // e.g. "Blood", "Urine"
  referenceRanges: LabReferenceRange[];
  createdAt: string;
  updatedAt: string;
}

export interface LabOrderItem {
  testId: string;
  testName: string;
  price: number;
  status: 'PENDING' | 'COLLECTED' | 'RESULT_ENTERED' | 'APPROVED';
  resultValue?: number;
  resultString?: string;
  unit?: string;
  isOutOfRange?: boolean;
  resultNotes?: string;
  referenceRangeText?: string;
  technicianId?: string;
  performedAt?: string;
}

export interface LabOrder {
  id: string;
  hospitalId: string;
  patientId: string;
  doctorId: string;
  medicalRecordId?: string;
  appointmentId?: string;
  orderNumber: string;
  tests: LabOrderItem[];
  status: LabOrderStatus;
  approvedById?: string;
  approvedAt?: string;
  patient?: Patient;
  doctor?: Doctor;
  createdAt: string;
  updatedAt: string;
}

export interface MedicineBatch {
  id: string;
  batchNumber: string;
  manufacturingDate: string;
  expiryDate: string;
  quantity: number;
  unitCost: number;
  mrp: number;
  isQuarantined: boolean;
}

export interface Medicine {
  id: string;
  hospitalId: string;
  name: string;
  genericName: string;
  category: string;
  form: MedicineForm;
  manufacturer: string;
  reorderLevel: number;
  totalStock: number;
  batches: MedicineBatch[];
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  category: 'CONSULTATION' | 'LAB' | 'PHARMACY' | 'ROOM' | 'OTHER';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  referenceId?: string;
}

export interface InvoicePayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  paidAt: string;
  notes?: string;
}

export interface Invoice {
  id: string;
  hospitalId: string;
  patientId: string;
  appointmentId?: string;
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
  patient?: Patient;
  createdAt: string;
  updatedAt: string;
}

export interface AppNotification {
  id: string;
  hospitalId?: string;
  recipientUserId: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  hospitalId?: string;
  userId: string;
  userEmail: string;
  userRole: UserRole;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'VIEW';
  resource: string;
  resourceId?: string;
  ipAddress?: string;
  changes?: Record<string, any>;
  createdAt: string;
}
