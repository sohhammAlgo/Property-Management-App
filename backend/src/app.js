require('express-async-errors');
require('dotenv').config();
const express = require('express');
app.set('trust proxy', 1);
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

app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Society Management API Running 🚀'
    });
});

// ── Security Middleware ──
app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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

// ── Error Handling ──
app.use(notFound);
app.use(errorHandler);

module.exports = app;