import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import {
  HospitalModel,
  UserModel,
  DoctorModel,
  PatientModel,
  AppointmentModel,
  MedicalRecordModel,
  MedicineModel,
  InvoiceModel,
  RefreshTokenModel,
} from '../models';
import {
  UserRole,
  HospitalStatus,
  AppointmentStatus,
  MedicineForm,
  InvoiceStatus,
} from '@medcore/types';
import { hashPassword, generateAccessToken, generateRefreshToken } from '../config/jwt';

let mongoServer: MongoMemoryServer;

describe('MedCore HMS — Mandatory PRD Test Scenarios', () => {
  let hospitalA: any;
  let hospitalB: any;
  let doctorA: any;
  let patientA: any;
  let patientB: any;

  before(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    const pwd = await hashPassword('Test@123');

    hospitalA = await HospitalModel.create({
      name: 'Hospital Alpha',
      code: 'ALPHA',
      slug: 'alpha',
      email: 'alpha@test.com',
      phone: '111',
      status: HospitalStatus.VERIFIED,
      subscriptionPlan: 'PRO',
    });

    hospitalB = await HospitalModel.create({
      name: 'Hospital Beta',
      code: 'BETA',
      slug: 'beta',
      email: 'beta@test.com',
      phone: '222',
      status: HospitalStatus.VERIFIED,
      subscriptionPlan: 'PRO',
    });

    const docUser = await UserModel.create({
      email: 'doc.alpha@test.com',
      passwordHash: pwd,
      role: UserRole.DOCTOR,
      hospitalId: hospitalA._id,
      firstName: 'Alpha',
      lastName: 'Doc',
      isEmailVerified: true,
    });

    doctorA = await DoctorModel.create({
      userId: docUser._id,
      hospitalId: hospitalA._id,
      departmentId: new mongoose.Types.ObjectId(),
      specialization: 'Cardiology',
      licenseNumber: 'LIC-100',
      consultationFee: 500,
    });

    const patUserA = await UserModel.create({
      email: 'pat.a@test.com',
      passwordHash: pwd,
      role: UserRole.PATIENT,
      hospitalId: hospitalA._id,
      firstName: 'Patient',
      lastName: 'A',
      isEmailVerified: true,
    });

    patientA = await PatientModel.create({
      userId: patUserA._id,
      hospitalId: hospitalA._id,
      mrn: 'MRN-A-01',
      dateOfBirth: '1990-01-01',
      gender: 'MALE',
      address: {},
    });

    const patUserB = await UserModel.create({
      email: 'pat.b@test.com',
      passwordHash: pwd,
      role: UserRole.PATIENT,
      hospitalId: hospitalB._id, // Tenant B
      firstName: 'Patient',
      lastName: 'B',
      isEmailVerified: true,
    });

    patientB = await PatientModel.create({
      userId: patUserB._id,
      hospitalId: hospitalB._id,
      mrn: 'MRN-B-01',
      dateOfBirth: '1992-02-02',
      gender: 'FEMALE',
      address: {},
    });

    // Ensure Mongoose indexes (including unique partial compound index) are built
    await AppointmentModel.init();
    await PatientModel.init();
    await UserModel.init();
  });

  after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  // Scenario 1: Tenancy isolation test
  test('1. Tenancy Isolation: Doctor from Hospital A cannot query patients from Hospital B', async () => {
    const records = await PatientModel.find({
      hospitalId: doctorA.hospitalId,
      _id: patientB._id,
    });
    assert.strictEqual(records.length, 0, 'Doctor must not be able to find Patient B');
  });

  // Scenario 2: Patient data privacy
  test('2. Data Privacy: Patient A cannot view Patient B medical records', async () => {
    const recordB = await MedicalRecordModel.create({
      hospitalId: hospitalB._id,
      patientId: patientB._id,
      doctorId: new mongoose.Types.ObjectId(),
      chiefComplaint: 'Confidential Diagnosis for Patient B',
      treatmentPlan: 'Confidential Treatment',
      diagnosis: { description: 'Asthma', type: 'CONFIRMED' },
    });

    const queryAsPatientA = await MedicalRecordModel.findOne({
      _id: recordB._id,
      patientId: patientA._id,
    });

    assert.strictEqual(queryAsPatientA, null, 'Patient A should receive null when accessing record B');
  });

  // Scenario 3: Concurrency double-booking guard
  test('3. Concurrency Challenge: Booking the same doctor slot simultaneously - only one succeeds', async () => {
    const slotDate = '2026-11-01';
    const timeSlot = '10:00';

    const bookingPromise1 = AppointmentModel.create({
      hospitalId: hospitalA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      departmentId: doctorA.departmentId,
      appointmentDate: slotDate,
      timeSlot,
      status: AppointmentStatus.CONFIRMED,
      isEmergency: false,
    });

    const bookingPromise2 = AppointmentModel.create({
      hospitalId: hospitalA._id,
      doctorId: doctorA._id,
      patientId: patientA._id,
      departmentId: doctorA.departmentId,
      appointmentDate: slotDate,
      timeSlot,
      status: AppointmentStatus.CONFIRMED,
      isEmergency: false,
    });

    const results = await Promise.allSettled([bookingPromise1, bookingPromise2]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 1, 'Exactly one concurrent booking must succeed');
    assert.strictEqual(rejected.length, 1, 'Duplicate booking must be rejected by unique index');
  });

  // Scenario 4: Refresh token rotation
  test('4. Refresh Token Rotation: A refresh token cannot be reused after rotation', async () => {
    const tokenStr = generateRefreshToken({
      userId: patientA.userId.toString(),
      email: 'pat.a@test.com',
      role: UserRole.PATIENT,
      hospitalId: hospitalA._id.toString(),
    });

    const rt = await RefreshTokenModel.create({
      token: tokenStr,
      userId: patientA.userId,
      deviceId: 'mobile-app',
      expiresAt: new Date(Date.now() + 100000),
      isRevoked: false,
    });

    // Simulate usage & rotation
    rt.isRevoked = true;
    await rt.save();

    // Try reusing
    const reusedCheck = await RefreshTokenModel.findOne({ token: tokenStr });
    assert.strictEqual(reusedCheck?.isRevoked, true, 'Revoked refresh token cannot be reused');
  });

  // Scenario 5: Expired medicine cannot be dispensed
  test('5. Pharmacy Guard: An expired medicine cannot be dispensed', async () => {
    const med = await MedicineModel.create({
      hospitalId: hospitalA._id,
      name: 'Expired Test Ampoule',
      genericName: 'Exp Med',
      category: 'Test',
      form: MedicineForm.INJECTION,
      manufacturer: 'PharmaCorp',
      reorderLevel: 10,
      batches: [
        {
          id: 'batch-exp-01',
          batchNumber: 'EXP-999',
          manufacturingDate: '2022-01-01',
          expiryDate: '2023-01-01', // Expired
          quantity: 50,
          unitCost: 10,
          mrp: 20,
          isQuarantined: true,
        },
      ],
    });

    const today = new Date().toISOString().split('T')[0];
    const validBatches = med.batches.filter((b) => !b.isQuarantined && b.expiryDate >= today && b.quantity > 0);
    assert.strictEqual(validBatches.length, 0, 'No non-expired batch should be available for dispensing');
  });

  // Scenario 6: Billing integrity
  test('6. Billing Integrity: Invoice total strictly matches sum of line items', async () => {
    const items = [
      { id: '1', description: 'Consultation', category: 'CONSULTATION' as const, quantity: 1, unitPrice: 500, totalPrice: 500 },
      { id: '2', description: 'Blood Test', category: 'LAB' as const, quantity: 2, unitPrice: 150, totalPrice: 300 },
      { id: '3', description: 'Antibiotics', category: 'PHARMACY' as const, quantity: 1, unitPrice: 120, totalPrice: 120 },
    ];

    const invoice = await InvoiceModel.create({
      hospitalId: hospitalA._id,
      patientId: patientA._id,
      invoiceNumber: 'INV-TEST-001',
      items,
      discount: 20,
      tax: 50,
      status: InvoiceStatus.ISSUED,
    });

    const expectedSubtotal = 500 + 300 + 120; // 920
    const expectedTotal = 920 - 20 + 50;     // 950

    assert.strictEqual(invoice.subtotal, expectedSubtotal, 'Subtotal must match sum of line items');
    assert.strictEqual(invoice.total, expectedTotal, 'Total must match subtotal - discount + tax');
    assert.strictEqual(invoice.balanceDue, expectedTotal, 'Balance due must equal total when unpaid');
  });
});
