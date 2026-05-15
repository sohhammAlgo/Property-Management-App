const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { AppError } = require('../utils/appError');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

/**
 * GET /api/admin/dashboard
 * Platform-level global analytics
 */
const getPlatformDashboard = async (req, res) => {
    const cacheKey = 'platform:dashboard';
    let data = await cache.get(cacheKey);

    if (!data) {
        const [tenants, users, complaints, payments, subscriptions] = await Promise.all([
            query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE subscription_status = 'active') as active,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
        FROM tenants
      `),
            query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE role = 'resident') as residents,
          COUNT(*) FILTER (WHERE role = 'society_admin') as admins,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
        FROM users
      `),
            query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open,
          COUNT(*) FILTER (WHERE status = 'resolved') as resolved
        FROM complaints
      `),
            query(`
        SELECT
          SUM(amount) FILTER (WHERE status = 'completed') as total_revenue,
          SUM(amount) FILTER (WHERE status = 'completed'
            AND created_at >= NOW() - INTERVAL '30 days') as monthly_revenue,
          COUNT(*) FILTER (WHERE status = 'completed') as successful_transactions
        FROM payments
      `),
            query(`
        SELECT
          plan,
          COUNT(*) as count,
          SUM(price) as revenue
        FROM subscriptions
        WHERE status = 'active'
        GROUP BY plan
      `),
        ]);

        data = {
            tenants: tenants.rows[0],
            users: users.rows[0],
            complaints: complaints.rows[0],
            payments: payments.rows[0],
            subscriptionsByPlan: subscriptions.rows,
        };

        await cache.set(cacheKey, data, 300); // 5 min cache
    }

    sendSuccess(res, { dashboard: data });
};

/**
 * GET /api/admin/tenants/growth
 * Tenant growth over time
 */
const getTenantGrowth = async (req, res) => {
    const result = await query(`
    SELECT
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as new_tenants,
      SUM(COUNT(*)) OVER (ORDER BY TO_CHAR(created_at, 'YYYY-MM')) as cumulative
    FROM tenants
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month
    ORDER BY month
  `);

    sendSuccess(res, { growth: result.rows });
};

/**
 * GET /api/admin/revenue
 * Platform revenue analytics
 */
const getRevenueAnalytics = async (req, res) => {
    const [monthly, byTenant, byType] = await Promise.all([
        query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        SUM(amount) FILTER (WHERE status = 'completed') as revenue,
        COUNT(*) FILTER (WHERE status = 'completed') as transactions
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month
    `),
        query(`
      SELECT
        t.name as tenant_name,
        SUM(p.amount) FILTER (WHERE p.status = 'completed') as revenue,
        COUNT(p.id) FILTER (WHERE p.status = 'completed') as transactions
      FROM payments p
      LEFT JOIN tenants t ON p.tenant_id = t.id
      WHERE p.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY t.id, t.name
      ORDER BY revenue DESC
      LIMIT 10
    `),
        query(`
      SELECT
        payment_type,
        SUM(amount) FILTER (WHERE status = 'completed') as revenue,
        COUNT(*) FILTER (WHERE status = 'completed') as count
      FROM payments
      GROUP BY payment_type
    `),
    ]);

    sendSuccess(res, {
        revenue: {
            monthly: monthly.rows,
            byTenant: byTenant.rows,
            byType: byType.rows,
        },
    });
};

/**
 * GET /api/admin/users
 * List all users (platform-wide)
 */
const getAllUsers = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { search, role, tenantId, isActive } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
        paramCount++;
        whereClause += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }

    if (role) {
        paramCount++;
        whereClause += ` AND u.role = $${paramCount}`;
        params.push(role);
    }

    if (tenantId) {
        paramCount++;
        whereClause += ` AND u.tenant_id = $${paramCount}`;
        params.push(tenantId);
    }

    if (isActive !== undefined) {
        paramCount++;
        whereClause += ` AND u.is_active = $${paramCount}`;
        params.push(isActive === 'true');
    }

    const countResult = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active,
            u.flat_number, u.block, u.created_at, u.last_login,
            t.name as tenant_name
     FROM users u
     LEFT JOIN tenants t ON u.tenant_id = t.id
     ${whereClause}
     ORDER BY u.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

/**
 * PATCH /api/admin/users/:id/status
 * Activate/deactivate a user
 */
const toggleUserStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (isActive === undefined) throw new AppError('isActive field is required', 400);

    // Prevent disabling platform admins
    const userResult = await query('SELECT role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) throw new AppError('User not found', 404);
    if (userResult.rows[0].role === 'platform_admin') {
        throw new AppError('Cannot deactivate a platform admin', 403);
    }

    const result = await query(
        'UPDATE users SET is_active = $1 WHERE id = $2 RETURNING id, name, email, is_active',
        [isActive, id]
    );

    await cache.del(`user:${id}`);

    sendSuccess(res, { user: result.rows[0] }, `User ${isActive ? 'activated' : 'deactivated'}`);
};

/**
 * PATCH /api/admin/users/:id/role
 * Change user role
 */
const changeUserRole = async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;

    const validRoles = ['resident', 'society_admin'];
    if (!validRoles.includes(role)) {
        throw new AppError(`Role must be one of: ${validRoles.join(', ')}`, 400);
    }

    const result = await query(
        'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, name, email, role',
        [role, id]
    );

    if (result.rows.length === 0) throw new AppError('User not found', 404);

    await cache.del(`user:${id}`);
    sendSuccess(res, { user: result.rows[0] }, 'User role updated');
};

/**
 * DELETE /api/admin/tenants/:id
 * Hard delete a tenant (platform admin only - use with caution)
 */
const deleteTenant = async (req, res) => {
    const { id } = req.params;
    const { confirm } = req.query;

    if (confirm !== 'true') {
        throw new AppError(
            'Add ?confirm=true to confirm deletion. This will delete ALL society data.',
            400
        );
    }

    const result = await query('DELETE FROM tenants WHERE id = $1 RETURNING id, name', [id]);
    if (result.rows.length === 0) throw new AppError('Society not found', 404);

    await cache.delPattern(`tenant:${id}*`);
    sendSuccess(res, {}, `Society "${result.rows[0].name}" permanently deleted`);
};

module.exports = {
    getPlatformDashboard,
    getTenantGrowth,
    getRevenueAnalytics,
    getAllUsers,
    toggleUserStatus,
    changeUserRole,
    deleteTenant,
};