require('express-async-errors');
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler, notFound } = require('./middleware/errorHandler');
const { standardLimiter } = require('./middleware/rateLimiter');

// Routes
const authRoutes = require('./routes/auth');
const tenantRoutes = require('./routes/tenants');
const complaintRoutes = require('./routes/complaints');
const bookingRoutes = require('./routes/bookings');
const paymentRoutes = require('./routes/payments');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');
const { announcementRouter, notificationRouter } = require('./routes/misc');

const app = express();

// ── Trust Railway reverse proxy (fixes ERR_ERL_UNEXPECTED_X_FORWARDED_FOR) ──
app.set('trust proxy', 1);

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Society Management API Running 🚀'
    });
});

// ── Security Middleware ──
app.use(helmet());
const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5173https://property-management-app-git-main-sohams-projects-e1275eb0.vercel.app',
    'https://property-management-2beb7p1x6-sohams-projects-e1275eb0.vercel.app',
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        // allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Logging ──
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// ── Body Parsing ──
// Note: /api/payments/webhook needs raw body — registered BEFORE json middleware
app.use('/api/payments/webhook', express.raw({ type: '*/*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Rate Limiting ──
app.use('/api', standardLimiter);

// ── Health Check ──
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Society Management API is running',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
    });
});

// ── API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRouter);
app.use('/api/notifications', notificationRouter);

// ── Silence favicon 404 log noise ──
app.get('/favicon.ico', (req, res) => res.status(204).end());

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

module.exports = app;