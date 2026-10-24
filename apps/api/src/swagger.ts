export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'MedCore HMS — API Documentation',
    version: '1.0.0',
    description: 'RESTful API for MedCore Hospital Management SaaS Platform',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1 Base',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
  security: [
    {
      bearerAuth: [],
    },
  ],
  paths: {
    '/auth/login': {
      post: {
        summary: 'User Login',
        description: 'Issues 15m access token and 7d refresh token with device tracking',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          200: { description: 'Authenticated successfully' },
        },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Current User Profile',
        responses: { 200: { description: 'User profile with role and permissions' } },
      },
    },
    '/appointments': {
      get: {
        summary: 'List Appointments',
        parameters: [
          { name: 'date', in: 'query', schema: { type: 'string' } },
          { name: 'doctorId', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Appointments list' } },
      },
      post: {
        summary: 'Book Appointment with Concurrency Lock',
        responses: { 201: { description: 'Appointment confirmed' }, 409: { description: 'Slot unavailable' } },
      },
    },
    '/medical-records': {
      post: {
        summary: 'Create Encounter Medical Record (EMR)',
        responses: { 201: { description: 'EMR record created' } },
      },
    },
    '/prescriptions': {
      post: {
        summary: 'Issue Prescription',
        responses: { 201: { description: 'Prescription created' } },
      },
    },
    '/lab/orders': {
      get: { summary: 'List Lab Orders' },
      post: { summary: 'Create Lab Order' },
    },
    '/pharmacy/dispense': {
      post: { summary: 'Dispense Medicines via FIFO' },
    },
    '/invoices': {
      get: { summary: 'List Invoices' },
      post: { summary: 'Generate Hospital Invoice' },
    },
    '/analytics/dashboard': {
      get: { summary: 'Get Role Dashboard KPIs and 7-day Trend Charts' },
    },
  },
};
