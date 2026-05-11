const Razorpay = require('razorpay');
const crypto = require('crypto');
const { query } = require('../config/database');
const { createNotification } = require('../services/notificationService');
const { sendEmail, emailTemplates } = require('../utils/email');
const { AppError } = require('../utils/appError');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order
// Create Razorpay order and pending payment record
const createOrder = async (req, res) => {
    const { amount, paymentType, month, year, bookingId, currency = 'INR' } = req.body;
    const { id: userId, tenant_id: tenantId } = req.user;

    if (!tenantId) throw new AppError('You must be part of a society', 400);

    const amountInPaise = Math.round(parseFloat(amount) * 100);

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency,
        receipt: `rcpt_${Date.now()}`,
        notes: { userId, tenantId, paymentType, month, year },
    });

    // Create pending payment record
    const result = await query(
        `INSERT INTO payments 
      (user_id, tenant_id, payment_type, amount, currency, status, gateway, gateway_order_id, month, year)
     VALUES ($1,$2,$3,$4,$5,'pending','razorpay',$6,$7,$8) RETURNING *`,
        [userId, tenantId, paymentType, amount, currency, razorpayOrder.id, month || null, year || null]
    );

    sendSuccess(res, {
        payment: result.rows[0],
        order: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: process.env.RAZORPAY_KEY_ID,
        },
    }, 'Order created');
};

// POST /api/payments/verify
// Verify Razorpay payment and update record
const verifyPayment = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        paymentDbId,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body)
        .digest('hex');

    if (expectedSignature !== razorpay_signature) {
        throw new AppError('Payment verification failed - invalid signature', 400);
    }

    // Update payment record
    const result = await query(
        `UPDATE payments SET
      status = 'completed',
      gateway_payment_id = $1,
      gateway_signature = $2
     WHERE id = $3 AND user_id = $4
     RETURNING *`,
        [razorpay_payment_id, razorpay_signature, paymentDbId, req.user.id]
    );

    if (result.rows.length === 0) throw new AppError('Payment record not found', 404);
    const payment = result.rows[0];

    // Send notification
    await createNotification({
        userId: req.user.id,
        tenantId: payment.tenant_id,
        title: 'Payment Successful ✅',
        message: `Payment of ₹${payment.amount} for ${payment.payment_type} confirmed`,
        type: 'payment_success',
        referenceId: payment.id,
        referenceType: 'payment',
    });

    sendEmail({ to: req.user.email, ...emailTemplates.paymentConfirmation(req.user, payment) }).catch(console.error);

    sendSuccess(res, { payment }, 'Payment verified successfully');
};

// POST /api/payments/webhook
// Handle Razorpay webhooks for payment updates
const handleWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
        .update(body)
        .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(400).json({ success: false, message: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
        const orderId = payload.payment.entity.order_id;
        const paymentId = payload.payment.entity.id;

        await query(
            `UPDATE payments SET status = 'completed', gateway_payment_id = $1
       WHERE gateway_order_id = $2 AND status = 'pending'`,
            [paymentId, orderId]
        );
    } else if (event === 'payment.failed') {
        const orderId = payload.payment.entity.order_id;
        await query(
            `UPDATE payments SET status = 'failed' WHERE gateway_order_id = $1`,
            [orderId]
        );
    }

    res.json({ received: true });
};

// GET /api/payments
// Get payments for the user (residents see their own, admins see all with filters)
const getPayments = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status, paymentType, month, year } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (req.user.role === 'resident') {
        paramCount++;
        whereClause += ` AND p.user_id = $${paramCount}`;
        params.push(req.user.id);
    } else {
        paramCount++;
        whereClause += ` AND p.tenant_id = $${paramCount}`;
        params.push(req.user.tenant_id);
    }

    if (status) {
        paramCount++;
        whereClause += ` AND p.status = $${paramCount}`;
        params.push(status);
    }

    if (paymentType) {
        paramCount++;
        whereClause += ` AND p.payment_type = $${paramCount}`;
        params.push(paymentType);
    }

    if (month) {
        paramCount++;
        whereClause += ` AND p.month = $${paramCount}`;
        params.push(parseInt(month));
    }

    if (year) {
        paramCount++;
        whereClause += ` AND p.year = $${paramCount}`;
        params.push(parseInt(year));
    }

    const countResult = await query(`SELECT COUNT(*) FROM payments p ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT p.*, u.name as user_name, u.flat_number
     FROM payments p
     LEFT JOIN users u ON p.user_id = u.id
     ${whereClause}
     ORDER BY p.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

// GET /api/payments/stats
// Get payment statistics for a tenant
const getPaymentStats = async (req, res) => {
    const tenantId = req.user.tenant_id;

    const [overview, monthly, byType] = await Promise.all([
        query(
            `SELECT
        COUNT(*) as total_transactions,
        SUM(amount) FILTER (WHERE status = 'completed') as total_revenue,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
        SUM(amount) FILTER (WHERE status = 'pending') as pending_amount
       FROM payments WHERE tenant_id = $1`,
            [tenantId]
        ),
        query(
            `SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(amount) FILTER (WHERE status = 'completed') as revenue,
        COUNT(*) as transactions
       FROM payments WHERE tenant_id = $1
         AND created_at >= NOW() - INTERVAL '12 months'
       GROUP BY month ORDER BY month`,
            [tenantId]
        ),
        query(
            `SELECT payment_type, SUM(amount) as total, COUNT(*) as count
       FROM payments WHERE tenant_id = $1 AND status = 'completed'
       GROUP BY payment_type`,
            [tenantId]
        ),
    ]);

    sendSuccess(res, {
        stats: {
            overview: overview.rows[0],
            monthly: monthly.rows,
            byType: byType.rows,
        },
    });
};

// GET /api/payments/defaulters?month=&year=
// Get list of residents who haven't paid maintenance for the given month/year
const getDefaulters = async (req, res) => {
    const tenantId = req.user.tenant_id;
    const month = parseInt(req.query.month) || new Date().getMonth() + 1;
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const result = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.flat_number, u.block
     FROM users u
     WHERE u.tenant_id = $1 AND u.role = 'resident' AND u.is_active = true
       AND u.id NOT IN (
         SELECT DISTINCT user_id FROM payments
         WHERE tenant_id = $1 AND payment_type = 'maintenance'
           AND month = $2 AND year = $3 AND status = 'completed'
       )
     ORDER BY u.block, u.flat_number`,
        [tenantId, month, year]
    );

    sendSuccess(res, { defaulters: result.rows, month, year });
};

module.exports = {
    createOrder,
    verifyPayment,
    handleWebhook,
    getPayments,
    getPaymentStats,
    getDefaulters,
};