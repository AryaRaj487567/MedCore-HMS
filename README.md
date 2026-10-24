# MedCore HMS — Hospital Management Platform
**Version 1.0 | Full-Stack Multi-Tenant SaaS Hospital Management System**

MedCore HMS is a production-grade, HIPAA-aware Hospital Management Platform engineered to digitise end-to-end clinical and administrative workflows across hospital branches.

---

## Architecture Overview

```
[ Browser / PWA ] 
       ↕ (HTTPS / REST + Socket.IO WebSockets)
[ Next.js 15 App Router Frontend (Port 3000) ]
       ↕ (API Gateway / REST)
[ Node.js & Express API Server (Port 3001) ]
       ↕ (Mongoose ODM with Multi-Tenant hospitalId Scoping)
[ MongoDB Database (Embedded / Local / Atlas) ]   [ Redis Caching ]
       ↕
[ Real-Time Notification Bus & PDF Letterhead Generator ]
```

### Multi-Tenancy Strategy
- All hospital collections carry a compound indexed `hospitalId`.
- Access control middleware verifies tenant isolation on every request. Non-SuperAdmins can never access or modify records of another hospital tenant even if an ID is guessed.
- Super Admins operate globally across all hospital tenants.

### Concurrency Protection
- Appointment booking engine handles high-concurrency race conditions gracefully.
- Backed by a MongoDB partial unique index on `(hospitalId, doctorId, appointmentDate, timeSlot)` where `isCancelled: false` and `isEmergency: false`, and version keys (`__v`).
- Duplicate simultaneous bookings fail safely with a `409 Conflict` (`SLOT_UNAVAILABLE`).
- Emergency bookings bypass standard slot availability and immediately alert the consulting physician.

---

## 9 Roles & Demo Credentials

| Role | Demo Email | Password | Primary Responsibilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `superadmin@medcore.com` | `SuperAdmin@123` | Platform oversight, hospital onboarding & verification |
| **Hospital Admin**| `admin@citygeneral.com` | `Admin@123` | KPIs, departments, doctors, bed occupancy, audit logs |
| **Doctor** | `dr.sharma@citygeneral.com`| `Doctor@123` | Encounters, EMR, auto BMI, prescriptions, lab orders |
| **Nurse** | `nurse.sarah@citygeneral.com`| `Admin@123` | Vitals recording, triage notes, ward updates |
| **Receptionist** | `receptionist@citygeneral.com`| `Admin@123` | Patient registration (auto MRN), appointment scheduling |
| **Lab Technician**| `labtech@citygeneral.com` | `Admin@123` | Specimen collection, result entry, reference range checks |
| **Pharmacist** | `pharmacist@citygeneral.com`| `Admin@123` | FIFO medicine dispensing, batch expiry quarantine |
| **Accountant** | `accountant@citygeneral.com`| `Admin@123` | Aggregated billing, payment receipts, Stripe webhooks |
| **Patient** | `patient.john@example.com` | `Patient@123` | Self-service portal: records, lab reports, PDF prescriptions |

---

## Quick Start & Setup

### 1. Zero-Config Local Setup (No Docker required)
The backend includes an automatic **in-memory MongoDB fallback** (`mongodb-memory-server`). If no local MongoDB service is running, it spins up an embedded instance automatically!

```bash
# Clone and enter the workspace
cd C:\Users\91778\.gemini\antigravity\scratch\medcore-hms

# Install all dependencies across monorepo
pnpm install

# Build shared types
pnpm --filter @medcore/types build

# Seed database with realistic clinical data (2 hospitals, 8 doctors, 30 patients, 2 weeks history)
pnpm seed

# Run Backend API (Port 3001)
pnpm dev:api

# Run Frontend Web App (Port 3000)
pnpm dev:web
```

### 2. Using Docker Compose
```bash
docker-compose up -d
```

---

## API & Documentation

- **Frontend Application**: `http://localhost:3000`
- **Backend API**: `http://localhost:3001/api/v1`
- **Swagger OpenAPI Docs**: `http://localhost:3001/api/docs`
- **API Health Check**: `http://localhost:3001/api/health`
- **Sample Printable Prescription PDF**: `http://localhost:3001/api/v1/prescriptions/:id/pdf`

---

## Automated Test Suite

MedCore HMS includes unit and integration tests covering the mandatory PRD test scenarios:
```bash
pnpm test
```
- ✅ **Tenancy Isolation**: Doctor from Hospital A cannot query patients from Hospital B.
- ✅ **Data Privacy**: Patient A cannot view Patient B's medical records.
- ✅ **Concurrency Challenge**: Simultaneous bookings on the same doctor time slot only permit one winner.
- ✅ **Refresh Token Rotation**: Old refresh token cannot be reused after rotation.
- ✅ **Pharmacy Safety Guard**: Expired medicines cannot be dispensed.
- ✅ **Billing Integrity**: Invoice total strictly matches the sum of line items.
