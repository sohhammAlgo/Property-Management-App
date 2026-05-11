const { query } = require('../config/database');
const { chatWithAssistant, generateInsights, checkAIHealth } = require('../services/aiService');
const { AppError } = require('../utils/appError');
const { sendSuccess } = require('../utils/response');

// POST /api/ai/chat
// Chat with AI assistant, providing conversation history and relevant context
const chat = async (req, res) => {
    const { message, conversationHistory = [] } = req.body;

    if (!message) throw new AppError('Message is required', 400);

    const { id: userId, tenant_id: tenantId, name, role } = req.user;

    // Fetch relevant context
    let context = { userName: name, userRole: role };

    if (tenantId) {
        const tenantResult = await query('SELECT name FROM tenants WHERE id = $1', [tenantId]);
        if (tenantResult.rows.length > 0) {
            context.societyName = tenantResult.rows[0].name;
        }

        // Get recent open complaints for context
        const complaintsResult = await query(
            `SELECT COUNT(*) as count FROM complaints WHERE tenant_id = $1 AND status != 'resolved'`,
            [tenantId]
        );
        context.openComplaints = parseInt(complaintsResult.rows[0].count);

        // Pending payments
        if (role === 'resident') {
            const paymentResult = await query(
                `SELECT COUNT(*) as count FROM payments
         WHERE user_id = $1 AND status = 'pending'`,
                [userId]
            );
            context.pendingPayments = parseInt(paymentResult.rows[0].count);
        }
    }

    const response = await chatWithAssistant(message, conversationHistory, context);
    sendSuccess(res, { response });
};

// GET /api/ai/dashboard-insights
// Get AI-generated insights for the dashboard based on recent data
const getDashboardInsights = async (req, res) => {
    const tenantId = req.user.tenant_id;

    // Gather data for AI analysis
    const [complaints, payments, bookings] = await Promise.all([
        query(
            `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved,
        COUNT(*) FILTER (WHERE priority = 'high') as high_priority,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days'
          AND created_at < NOW() - INTERVAL '30 days') as last_month
       FROM complaints WHERE tenant_id = $1`,
            [tenantId]
        ),
        query(
            `SELECT
        SUM(amount) FILTER (WHERE status = 'completed') as total_revenue,
        SUM(amount) FILTER (WHERE status = 'completed'
          AND created_at >= NOW() - INTERVAL '30 days') as this_month_revenue,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_payments
       FROM payments WHERE tenant_id = $1`,
            [tenantId]
        ),
        query(
            `SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as this_month
       FROM bookings WHERE tenant_id = $1`,
            [tenantId]
        ),
    ]);

    const data = {
        complaints: complaints.rows[0],
        payments: payments.rows[0],
        bookings: bookings.rows[0],
    };

    const insights = await generateInsights(data);
    sendSuccess(res, { insights, data });
};

// GET /api/ai/health
// Check health/status of AI service integration
const getAIHealth = async (req, res) => {
    const health = await checkAIHealth();
    sendSuccess(res, { health });
};

module.exports = { chat, getDashboardInsights, getAIHealth };