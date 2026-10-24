import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { Server as SocketIOServer } from 'socket.io';

import { connectDB } from './config/db';
import { UserModel } from './models';
import { seedDatabase } from './seeds/seed';
import { initSocketIO } from './modules/notifications/notification.service';
import { swaggerDocument } from './swagger';
import { sendError } from './common/response';

// Import Routers
import authRouter from './modules/auth/auth.router';
import hospitalRouter from './modules/hospitals/hospital.router';
import doctorRouter from './modules/doctors/doctor.router';
import patientRouter from './modules/patients/patient.router';
import appointmentRouter from './modules/appointments/appointment.router';
import emrRouter from './modules/emr/emr.router';
import prescriptionRouter from './modules/prescriptions/prescription.router';
import labRouter from './modules/lab/lab.router';
import pharmacyRouter from './modules/pharmacy/pharmacy.router';
import billingRouter from './modules/billing/billing.router';
import notificationRouter from './modules/notifications/notification.router';
import analyticsRouter from './modules/analytics/analytics.router';

dotenv.config();

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});
initSocketIO(io);

// Security & Parsing Middlewares
app.use(helmet({ contentSecurityPolicy: false })); // Permissive CSP for swagger and local preview
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(morgan('dev'));

// Swagger UI Documentation at /api/docs
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'MedCore HMS API',
    timestamp: new Date().toISOString(),
  });
});

// Mount Feature API Routers under /api/v1
const API_PREFIX = '/api/v1';
app.use(`${API_PREFIX}/auth`, authRouter);
app.use(`${API_PREFIX}/hospitals`, hospitalRouter);
app.use(`${API_PREFIX}/doctors`, doctorRouter);
app.use(`${API_PREFIX}/patients`, patientRouter);
app.use(`${API_PREFIX}/appointments`, appointmentRouter);
app.use(`${API_PREFIX}/medical-records`, emrRouter);
app.use(`${API_PREFIX}/prescriptions`, prescriptionRouter);
app.use(`${API_PREFIX}/lab`, labRouter);
app.use(`${API_PREFIX}/pharmacy`, pharmacyRouter);
app.use(`${API_PREFIX}/medicines`, pharmacyRouter);
app.use(`${API_PREFIX}/invoices`, billingRouter);
app.use(`${API_PREFIX}/payments`, billingRouter);
app.use(`${API_PREFIX}/notifications`, notificationRouter);
app.use(`${API_PREFIX}/analytics`, analyticsRouter);
app.use(`${API_PREFIX}`, analyticsRouter); // Mounts /api/v1/search

// 404 Not Found Handler
app.use((req, res) => {
  sendError(res, 'ENDPOINT_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`, 404);
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  sendError(res, err.code || 'INTERNAL_SERVER_ERROR', err.message || 'An unexpected error occurred', 500);
});

const PORT = process.env.PORT || 3001;

async function bootstrap() {
  try {
    await connectDB();

    // Auto-seed if database is empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('[Bootstrap] Database is empty. Seeding realistic clinical data...');
      await seedDatabase();
    }

    server.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`====================================================`);
      console.log(`🏥 MedCore HMS API Server is live at http://localhost:${PORT}`);
      console.log(`📖 Swagger API Docs: http://localhost:${PORT}/api/docs`);
      console.log(`🩺 Health Check:     http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });
  } catch (err) {
    console.error('[Bootstrap] Server startup failed:', err);
    process.exit(1);
  }
}

bootstrap();
