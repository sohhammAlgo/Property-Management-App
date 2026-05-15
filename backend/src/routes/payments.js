const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const {
    createOrder, verifyPayment, handleWebhook,
    getPayments, getPaymentStats, getDefaulters,
} = require('../controllers/paymentController');
const { validate, createOrderSchema, verifyPaymentSchema } = require('../validators/schemas');

// Webhook - raw body, no auth
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

router.use(authenticate);

router.post('/create-order', paymentLimiter, validate(createOrderSchema), createOrder);
router.post('/verify', validate(verifyPaymentSchema), verifyPayment);
router.get('/', getPayments);
router.get('/stats', authorize('society_admin', 'platform_admin'), getPaymentStats);
router.get('/defaulters', authorize('society_admin', 'platform_admin'), getDefaulters);

module.exports = router;