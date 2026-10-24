import { connectDB, disconnectDB } from '../config/db';
import {
  HospitalModel,
  UserModel,
  DepartmentModel,
  DoctorModel,
  PatientModel,
  AppointmentModel,
  MedicalRecordModel,
  PrescriptionModel,
  LabTestModel,
  LabOrderModel,
  MedicineModel,
  InvoiceModel,
  NotificationModel,
  AuditLogModel,
} from '../models';
import {
  UserRole,
  HospitalStatus,
  AppointmentStatus,
  LabOrderStatus,
  InvoiceStatus,
  PaymentMethod,
  MedicineForm,
  PrescriptionFrequency,
  NotificationType,
} from '@medcore/types';
import { hashPassword } from '../config/jwt';
import mongoose from 'mongoose';

export async function seedDatabase() {
  console.log('[Seeder] Starting MedCore HMS database seed...');

  // 1. Clear existing collections
  await Promise.all([
    HospitalModel.deleteMany({}),
    UserModel.deleteMany({}),
    DepartmentModel.deleteMany({}),
    DoctorModel.deleteMany({}),
    PatientModel.deleteMany({}),
    AppointmentModel.deleteMany({}),
    MedicalRecordModel.deleteMany({}),
    PrescriptionModel.deleteMany({}),
    LabTestModel.deleteMany({}),
    LabOrderModel.deleteMany({}),
    MedicineModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
  ]);

  // 2. Create Hospitals (2 hospitals per PRD)
  const defaultPasswordHash = await hashPassword('Admin@123');
  const superPasswordHash = await hashPassword('SuperAdmin@123');
  const doctorPasswordHash = await hashPassword('Doctor@123');
  const patientPasswordHash = await hashPassword('Patient@123');

  const hospitalA = await HospitalModel.create({
    name: 'City General Hospital',
    code: 'CGH',
    slug: 'city-general',
    email: 'info@citygeneral.com',
    phone: '+91 22 2456 7890',
    address: {
      street: '124 Healthcare Boulevard',
      city: 'Mumbai',
      state: 'Maharashtra',
      postalCode: '400001',
      country: 'India',
    },
    status: HospitalStatus.VERIFIED,
    subscriptionPlan: 'ENTERPRISE',
  });

  const hospitalB = await HospitalModel.create({
    name: 'Metro Care Specialty Hospital',
    code: 'MCSH',
    slug: 'metro-care',
    email: 'contact@metrocare.com',
    phone: '+91 80 2345 6789',
    address: {
      street: '88 Ring Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      country: 'India',
    },
    status: HospitalStatus.VERIFIED,
    subscriptionPlan: 'PRO',
  });

  console.log('[Seeder] Hospitals created: City General & Metro Care');

  // 3. Departments for Hospital A
  const deptsData = [
    { name: 'Cardiology', code: 'CARD', description: 'Comprehensive heart care and catheterization' },
    { name: 'Orthopedics', code: 'ORTHO', description: 'Bone, joint and sports trauma care' },
    { name: 'Pediatrics', code: 'PED', description: 'Infant, child and adolescent health' },
    { name: 'General Medicine', code: 'GENMED', description: 'Internal and preventative medicine' },
    { name: 'Neurology', code: 'NEURO', description: 'Brain and nervous system disorders' },
    { name: 'Dermatology', code: 'DERM', description: 'Skin, hair and nail treatments' },
  ];

  const createdDepts: any[] = [];
  for (const d of deptsData) {
    const dept = await DepartmentModel.create({
      hospitalId: hospitalA._id,
      ...d,
    });
    createdDepts.push(dept);
  }

  // 4. Create Users for all 9 Roles with realistic credentials
  const superAdmin = await UserModel.create({
    email: 'superadmin@medcore.com',
    passwordHash: superPasswordHash,
    role: UserRole.SUPER_ADMIN,
    firstName: 'Victor',
    lastName: 'Stone',
    phone: '+91 99000 00001',
    isEmailVerified: true,
  });

  const hospitalAdmin = await UserModel.create({
    email: 'admin@citygeneral.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.HOSPITAL_ADMIN,
    hospitalId: hospitalA._id,
    firstName: 'Ananya',
    lastName: 'Deshmukh',
    phone: '+91 99000 00002',
    isEmailVerified: true,
  });

  const nurse = await UserModel.create({
    email: 'nurse.sarah@citygeneral.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.NURSE,
    hospitalId: hospitalA._id,
    firstName: 'Sarah',
    lastName: 'Jenkins',
    phone: '+91 99000 00003',
    isEmailVerified: true,
  });

  const receptionist = await UserModel.create({
    email: 'receptionist@citygeneral.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.RECEPTIONIST,
    hospitalId: hospitalA._id,
    firstName: 'Priya',
    lastName: 'Nair',
    phone: '+91 99000 00004',
    isEmailVerified: true,
  });

  const labTech = await UserModel.create({
    email: 'labtech@citygeneral.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.LAB_TECHNICIAN,
    hospitalId: hospitalA._id,
    firstName: 'Rohan',
    lastName: 'Verma',
    phone: '+91 99000 00005',
    isEmailVerified: true,
  });

  const pharmacist = await UserModel.create({
    email: 'pharmacist@citygeneral.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.PHARMACIST,
    hospitalId: hospitalA._id,
    firstName: 'Meera',
    lastName: 'Patel',
    phone: '+91 99000 00006',
    isEmailVerified: true,
  });

  const accountant = await UserModel.create({
    email: 'accountant@citygeneral.com',
    passwordHash: defaultPasswordHash,
    role: UserRole.ACCOUNTANT,
    hospitalId: hospitalA._id,
    firstName: 'Suresh',
    lastName: 'Iyer',
    phone: '+91 99000 00007',
    isEmailVerified: true,
  });

  // 5. Create 8 Doctors across specialisations (PRD requirement: >= 8 doctors)
  const doctorsMeta = [
    { first: 'Rajesh', last: 'Sharma', spec: 'Cardiology', dept: createdDepts[0]._id, fee: 800, lic: 'MCI-2011-8721' },
    { first: 'Sunita', last: 'Kulkarni', spec: 'Orthopedics', dept: createdDepts[1]._id, fee: 700, lic: 'MCI-2014-9912' },
    { first: 'Amit', last: 'Verma', spec: 'Pediatrics', dept: createdDepts[2]._id, fee: 600, lic: 'MCI-2016-1234' },
    { first: 'Deepa', last: 'Menon', spec: 'General Medicine', dept: createdDepts[3]._id, fee: 500, lic: 'MCI-2010-4421' },
    { first: 'Vikram', last: 'Singhania', spec: 'Neurology', dept: createdDepts[4]._id, fee: 1000, lic: 'MCI-2009-3112' },
    { first: 'Pooja', last: 'Hegde', spec: 'Dermatology', dept: createdDepts[5]._id, fee: 650, lic: 'MCI-2018-7711' },
    { first: 'Arun', last: 'Kapoor', spec: 'Cardiology', dept: createdDepts[0]._id, fee: 850, lic: 'MCI-2012-6543' },
    { first: 'Kavita', last: 'Bose', spec: 'General Medicine', dept: createdDepts[3]._id, fee: 550, lic: 'MCI-2015-8822' },
  ];

  const defaultWeeklySchedule = [
    { dayOfWeek: 1, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 1, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 },
    { dayOfWeek: 2, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 2, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 },
    { dayOfWeek: 3, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 3, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 },
    { dayOfWeek: 4, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 4, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 },
    { dayOfWeek: 5, startTime: '09:00', endTime: '13:00', slotDurationMinutes: 30 },
    { dayOfWeek: 5, startTime: '14:00', endTime: '17:00', slotDurationMinutes: 30 },
  ];

  const createdDoctors: any[] = [];
  for (const dm of doctorsMeta) {
    const email = `dr.${dm.last.toLowerCase()}${dm.first.toLowerCase() === 'rajesh' ? '' : '.' + dm.first.toLowerCase()}@citygeneral.com`;
    const docUser = await UserModel.create({
      email,
      passwordHash: doctorPasswordHash,
      role: UserRole.DOCTOR,
      hospitalId: hospitalA._id,
      firstName: dm.first,
      lastName: dm.last,
      phone: `+91 98200 ${Math.floor(10000 + Math.random() * 90000)}`,
      avatarUrl: `https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=150&auto=format&fit=crop&q=80`,
      isEmailVerified: true,
    });

    const doc = await DoctorModel.create({
      userId: docUser._id,
      hospitalId: hospitalA._id,
      departmentId: dm.dept,
      specialization: dm.spec,
      licenseNumber: dm.lic,
      consultationFee: dm.fee,
      bio: `Senior Consultant in ${dm.spec} with over 12 years of clinical excellence.`,
      signatureImage: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="40"><path d="M10 25 Q 40 5, 80 20 T 150 15" stroke="%230284c7" stroke-width="2.5" fill="none"/></svg>',
      weeklySchedule: defaultWeeklySchedule,
    });

    createdDoctors.push({ ...doc.toObject(), user: docUser });
  }

  console.log(`[Seeder] Created 8 doctors across departments`);

  // 6. Create 30 Patients (PRD requirement: >= 30 patients)
  const patientFirstNames = ['John', 'Aarav', 'Diya', 'Rohan', 'Sneha', 'Kabir', 'Ananya', 'Aditya', 'Ishita', 'Sameer', 'Tanvi', 'Manish', 'Neha', 'Gaurav', 'Simran', 'Rahul', 'Kiran', 'Nikhil', 'Pooja', 'Varun', 'Shweta', 'Arjun', 'Radhika', 'Karthik', 'Sanjana', 'Abhishek', 'Riya', 'Mohit', 'Alok', 'Deepika'];
  const patientLastNames = ['Doe', 'Patel', 'Shah', 'Mehta', 'Kaur', 'Singh', 'Rao', 'Nambiar', 'Gupta', 'Bhat', 'Jain', 'Reddy', 'Chopra', 'Malhotra', 'Saxena', 'Dutta', 'Pillai', 'Menon', 'Joshi', 'Trivedi', 'Agarwal', 'Chatterjee', 'Dubey', 'Gokhale', 'Mishra', 'Pandey', 'Shukla', 'Yadav', 'Tiwari', 'Desai'];
  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  const createdPatients: any[] = [];
  for (let i = 0; i < 30; i++) {
    const fName = patientFirstNames[i];
    const lName = patientLastNames[i];
    const email = i === 0 ? 'patient.john@example.com' : `patient.${fName.toLowerCase()}.${lName.toLowerCase()}@example.com`;

    const patUser = await UserModel.create({
      email,
      passwordHash: patientPasswordHash,
      role: UserRole.PATIENT,
      hospitalId: hospitalA._id,
      firstName: fName,
      lastName: lName,
      phone: `+91 97000 ${Math.floor(10000 + Math.random() * 90000)}`,
      isEmailVerified: true,
    });

    const mrn = `MRN-2026-${(i + 1).toString().padStart(4, '0')}`;
    const pat = await PatientModel.create({
      userId: patUser._id,
      hospitalId: hospitalA._id,
      mrn,
      dateOfBirth: `198${Math.floor(Math.random() * 9)}-0${(i % 9) + 1}-15`,
      gender: i % 2 === 0 ? 'MALE' : 'FEMALE',
      bloodGroup: bloodGroups[i % bloodGroups.length],
      emergencyContactName: `Guardian of ${fName}`,
      emergencyContactPhone: '+91 98000 12345',
      allergies: i % 3 === 0 ? ['Penicillin'] : i % 5 === 0 ? ['Sulfa drugs'] : [],
      familyHistoryFlags: {
        diabetes: i % 2 === 0,
        hypertension: i % 3 === 0,
        cancer: i % 7 === 0,
        cardiac: i % 4 === 0,
      },
      address: {
        street: `${10 + i} Marine Drive`,
        city: 'Mumbai',
        state: 'Maharashtra',
        postalCode: '400020',
        country: 'India',
      },
    });

    createdPatients.push({ ...pat.toObject(), user: patUser });
  }

  console.log(`[Seeder] Created 30 realistic patients`);

  // 7. Create Lab Tests Catalog
  const labTestsData = [
    {
      name: 'Complete Blood Count (CBC)',
      code: 'CBC',
      price: 450,
      sampleType: 'Blood',
      referenceRanges: [
        { gender: 'MALE' as const, minVal: 13.0, maxVal: 17.5, unit: 'g/dL' },
        { gender: 'FEMALE' as const, minVal: 12.0, maxVal: 15.5, unit: 'g/dL' },
      ],
    },
    {
      name: 'Fasting Blood Sugar (FBS)',
      code: 'FBS',
      price: 200,
      sampleType: 'Blood',
      referenceRanges: [{ gender: 'ALL' as const, minVal: 70, maxVal: 100, unit: 'mg/dL' }],
    },
    {
      name: 'HbA1c Glycated Hemoglobin',
      code: 'HBA1C',
      price: 650,
      sampleType: 'Blood',
      referenceRanges: [{ gender: 'ALL' as const, minVal: 4.0, maxVal: 5.6, unit: '%' }],
    },
    {
      name: 'Lipid Profile',
      code: 'LIPID',
      price: 800,
      sampleType: 'Blood',
      referenceRanges: [{ gender: 'ALL' as const, minVal: 125, maxVal: 200, unit: 'mg/dL' }],
    },
    {
      name: 'Serum Creatinine',
      code: 'CREAT',
      price: 300,
      sampleType: 'Blood',
      referenceRanges: [{ gender: 'ALL' as const, minVal: 0.7, maxVal: 1.3, unit: 'mg/dL' }],
    },
  ];

  const createdLabTests: any[] = [];
  for (const lt of labTestsData) {
    const test = await LabTestModel.create({
      hospitalId: hospitalA._id,
      ...lt,
    });
    createdLabTests.push(test);
  }

  // 8. Create Medicines Catalog with Batches (including an active batch & an expired batch to test FIFO and Quarantine)
  const today = new Date().toISOString().split('T')[0];
  const medicinesData = [
    {
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin Trihydrate',
      category: 'Antibiotics',
      form: MedicineForm.CAPSULE,
      manufacturer: 'Cipla Ltd',
      reorderLevel: 25,
      batches: [
        {
          id: 'batch-amox-01',
          batchNumber: 'CIP-AMX-2025-01',
          manufacturingDate: '2025-01-10',
          expiryDate: '2027-01-10',
          quantity: 120,
          unitCost: 6.5,
          mrp: 12.0,
          isQuarantined: false,
        },
      ],
    },
    {
      name: 'Paracetamol 650mg (Dolo)',
      genericName: 'Acetaminophen',
      category: 'Analgesics / Antipyretic',
      form: MedicineForm.TABLET,
      manufacturer: 'Micro Labs',
      reorderLevel: 50,
      batches: [
        {
          id: 'batch-dolo-old',
          batchNumber: 'ML-DOL-2024-EX',
          manufacturingDate: '2023-01-10',
          expiryDate: '2024-01-10', // Expired!
          quantity: 30,
          unitCost: 1.2,
          mrp: 3.5,
          isQuarantined: true,
        },
        {
          id: 'batch-dolo-active-1',
          batchNumber: 'ML-DOL-2025-01',
          manufacturingDate: '2025-02-01',
          expiryDate: '2027-05-01',
          quantity: 200,
          unitCost: 1.5,
          mrp: 4.0,
          isQuarantined: false,
        },
        {
          id: 'batch-dolo-active-2',
          batchNumber: 'ML-DOL-2025-02',
          manufacturingDate: '2025-03-01',
          expiryDate: '2027-08-01',
          quantity: 300,
          unitCost: 1.5,
          mrp: 4.0,
          isQuarantined: false,
        },
      ],
    },
    {
      name: 'Metformin 500mg',
      genericName: 'Metformin Hydrochloride',
      category: 'Antidiabetic',
      form: MedicineForm.TABLET,
      manufacturer: 'Sun Pharma',
      reorderLevel: 40,
      batches: [
        {
          id: 'batch-met-01',
          batchNumber: 'SP-MET-2025',
          manufacturingDate: '2025-02-15',
          expiryDate: '2027-02-15',
          quantity: 15, // Intentionally below reorder level to test low-stock trigger!
          unitCost: 2.0,
          mrp: 5.0,
          isQuarantined: false,
        },
      ],
    },
    {
      name: 'Azithromycin 500mg',
      genericName: 'Azithromycin',
      category: 'Antibiotics',
      form: MedicineForm.TABLET,
      manufacturer: 'Lupin',
      reorderLevel: 20,
      batches: [
        {
          id: 'batch-az-01',
          batchNumber: 'LUP-AZ-99',
          manufacturingDate: '2025-01-20',
          expiryDate: '2027-06-20',
          quantity: 80,
          unitCost: 18.0,
          mrp: 35.0,
          isQuarantined: false,
        },
      ],
    },
    {
      name: 'Pantoprazole 40mg (Pan-D)',
      genericName: 'Pantoprazole + Domperidone',
      category: 'Gastroenterology',
      form: MedicineForm.CAPSULE,
      manufacturer: 'Alkem Laboratories',
      reorderLevel: 30,
      batches: [
        {
          id: 'batch-pan-01',
          batchNumber: 'ALK-PAN-01',
          manufacturingDate: '2025-01-05',
          expiryDate: '2027-04-05',
          quantity: 150,
          unitCost: 8.0,
          mrp: 16.5,
          isQuarantined: false,
        },
      ],
    },
  ];

  const createdMedicines: any[] = [];
  for (const m of medicinesData) {
    const med = await MedicineModel.create({
      hospitalId: hospitalA._id,
      ...m,
    });
    createdMedicines.push(med);
  }

  // 9. Create 2 Weeks of Appointments History (Past 10 days + Today + Next 3 days)
  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30'];

  for (let dayOffset = -7; dayOffset <= 2; dayOffset++) {
    const d = new Date();
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().split('T')[0];

    // Pick 3-5 appointments per day
    const apptsPerDay = 4;
    for (let j = 0; j < apptsPerDay; j++) {
      const patient = createdPatients[(Math.abs(dayOffset) * 4 + j) % createdPatients.length];
      const doctor = createdDoctors[j % createdDoctors.length];
      const slot = timeSlots[j % timeSlots.length];

      let status = AppointmentStatus.CONFIRMED;
      if (dayOffset < 0) {
        status = AppointmentStatus.COMPLETED;
      } else if (dayOffset === 0 && j === 0) {
        status = AppointmentStatus.IN_PROGRESS;
      }

      const appointment = await AppointmentModel.create({
        hospitalId: hospitalA._id,
        patientId: patient._id,
        doctorId: doctor._id,
        departmentId: doctor.departmentId,
        appointmentDate: dateStr,
        timeSlot: slot,
        status,
        isEmergency: dayOffset === 0 && j === 2, // One emergency case today!
        reason: dayOffset % 2 === 0 ? 'Follow-up consultation for hypertension' : 'Persistent dry cough and fever',
      });

      // If past completed appointment, generate Medical Record, Prescription, and Invoice!
      if (status === AppointmentStatus.COMPLETED && j < 2) {
        const heightCm = 172;
        const weightKg = 68;
        const bmi = parseFloat((weightKg / (1.72 * 1.72)).toFixed(1));

        const medRecord = await MedicalRecordModel.create({
          hospitalId: hospitalA._id,
          patientId: patient._id,
          doctorId: doctor._id,
          appointmentId: appointment._id,
          vitals: {
            bloodPressureSystolic: 128,
            bloodPressureDiastolic: 84,
            pulseRate: 76,
            temperature: 98.6,
            spO2: 99,
            heightCm,
            weightKg,
            bmi,
          },
          chiefComplaint: 'Chest tightness after exertion and intermittent headaches',
          presentingSymptoms: ['Mild dyspnea', 'Occipital headache', 'Fatigue'],
          diagnosis: {
            icd10Code: 'I10',
            description: 'Essential (primary) hypertension',
            type: 'CONFIRMED',
          },
          treatmentPlan: 'Lifestyle modifications, low sodium diet, and prescribe anti-hypertensive medication. Follow up in 14 days.',
          allergiesRecorded: patient.allergies,
          notesHistory: [
            {
              id: new mongoose.Types.ObjectId().toString(),
              authorId: doctor.userId._id.toString(),
              authorName: `Dr. ${doctor.user.lastName}`,
              authorRole: UserRole.DOCTOR,
              text: 'Patient advised to monitor home BP twice daily morning and evening.',
              createdAt: d.toISOString(),
            },
          ],
        });

        // Prescription
        await PrescriptionModel.create({
          hospitalId: hospitalA._id,
          patientId: patient._id,
          doctorId: doctor._id,
          medicalRecordId: medRecord._id,
          appointmentId: appointment._id,
          prescriptionNumber: `RX-2026-${(100 + dayOffset * 2 + j).toString()}`,
          items: [
            {
              medicineName: 'Amlodipine 5mg',
              form: MedicineForm.TABLET,
              dosage: '5 mg',
              frequency: PrescriptionFrequency.OD,
              durationDays: 14,
              instructions: 'Take once daily in the morning with water',
            },
            {
              medicineName: 'Paracetamol 650mg (Dolo)',
              form: MedicineForm.TABLET,
              dosage: '650 mg',
              frequency: PrescriptionFrequency.SOS,
              durationDays: 5,
              instructions: 'Take only if fever or severe headache occurs',
            },
          ],
          specialInstructions: 'Reduce salt intake and avoid strenuous exercises.',
          doctorSignature: doctor.signatureImage,
          isDispensed: true,
          dispensedAt: d,
        });

        // Lab Order
        await LabOrderModel.create({
          hospitalId: hospitalA._id,
          patientId: patient._id,
          doctorId: doctor._id,
          medicalRecordId: medRecord._id,
          appointmentId: appointment._id,
          orderNumber: `LAB-2026-${(200 + dayOffset * 2 + j).toString()}`,
          status: LabOrderStatus.APPROVED,
          approvedById: hospitalAdmin._id,
          approvedAt: d,
          tests: [
            {
              testId: createdLabTests[0]._id,
              testName: createdLabTests[0].name,
              price: createdLabTests[0].price,
              status: 'APPROVED',
              resultValue: 14.8,
              unit: 'g/dL',
              isOutOfRange: false,
              referenceRangeText: '13.0 - 17.5 g/dL',
              performedAt: d.toISOString(),
            },
            {
              testId: createdLabTests[1]._id,
              testName: createdLabTests[1].name,
              price: createdLabTests[1].price,
              status: 'APPROVED',
              resultValue: 118, // Above 100 -> Flagged out of range!
              unit: 'mg/dL',
              isOutOfRange: true,
              resultNotes: 'Mild elevation noted; repeat after 2 weeks fasting.',
              referenceRangeText: '70 - 100 mg/dL',
              performedAt: d.toISOString(),
            },
          ],
        });

        // Invoice
        const invoiceItems = [
          {
            id: new mongoose.Types.ObjectId().toString(),
            description: `Doctor Consultation — Dr. ${doctor.user.lastName}`,
            category: 'CONSULTATION' as const,
            quantity: 1,
            unitPrice: doctor.consultationFee,
            totalPrice: doctor.consultationFee,
          },
          {
            id: new mongoose.Types.ObjectId().toString(),
            description: 'Laboratory: Complete Blood Count & Fasting Blood Sugar',
            category: 'LAB' as const,
            quantity: 1,
            unitPrice: 650,
            totalPrice: 650,
          },
          {
            id: new mongoose.Types.ObjectId().toString(),
            description: 'Pharmacy: Dispensed Medications',
            category: 'PHARMACY' as const,
            quantity: 1,
            unitPrice: 180,
            totalPrice: 180,
          },
        ];

        const subtotal = doctor.consultationFee + 650 + 180;
        const total = subtotal;

        await InvoiceModel.create({
          hospitalId: hospitalA._id,
          patientId: patient._id,
          appointmentId: appointment._id,
          invoiceNumber: `INV-2026-${(500 + dayOffset * 2 + j).toString()}`,
          items: invoiceItems,
          subtotal,
          tax: 0,
          discount: 0,
          total,
          amountPaid: total,
          balanceDue: 0,
          status: InvoiceStatus.PAID,
          payments: [
            {
              id: new mongoose.Types.ObjectId().toString(),
              amount: total,
              method: PaymentMethod.CASH,
              transactionId: `REC-${Date.now()}-${j}`,
              paidAt: d.toISOString(),
              notes: 'Settled in full at counter',
            },
          ],
        });
      }
    }
  }

  // 10. Initial Notifications & Audit Logs
  await NotificationModel.create({
    hospitalId: hospitalA._id,
    recipientUserId: superAdmin._id,
    title: 'Platform System Ready',
    message: 'MedCore HMS initialization completed across City General and Metro Care tenants.',
    type: NotificationType.SYSTEM,
  });

  await AuditLogModel.create({
    hospitalId: hospitalA._id,
    userId: superAdmin._id,
    userEmail: superAdmin.email,
    userRole: UserRole.SUPER_ADMIN,
    action: 'CREATE',
    resource: 'Hospital',
    resourceId: hospitalA._id.toString(),
    ipAddress: '127.0.0.1',
  });

  console.log('[Seeder] Seed completed successfully!');
}

// Allow direct CLI execution
if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedDatabase();
      await disconnectDB();
      process.exit(0);
    } catch (err) {
      console.error('[Seeder] Failed:', err);
      process.exit(1);
    }
  })();
}
