const { query } = require('../config/database');
const { uploadToCloudinary } = require('../config/cloudinary');
const { cache } = require('../config/redis');
const { AppError } = require('../utils/appError');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

// AI Service client
// POST /api/tenants
const createTenant = async (req, res) => {
    const { name, address, city, state, pincode, subscriptionPlan, maxResidents } = req.body;

    const result = await query(
        `INSERT INTO tenants (name, address, city, state, pincode, subscription_plan, max_residents)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [name, address, city, state, pincode, subscriptionPlan || 'basic', maxResidents || 100]
    );

    sendSuccess(res, { tenant: result.rows[0] }, 'Society created successfully', 201);
};

// GET /api/tenants
// Platform admins can see all societies, tenant admins can only see their own society
const getAllTenants = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { search, subscriptionStatus } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (search) {
        paramCount++;
        whereClause += ` AND (name ILIKE $${paramCount} OR city ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }

    if (subscriptionStatus) {
        paramCount++;
        whereClause += ` AND subscription_status = $${paramCount}`;
        params.push(subscriptionStatus);
    }

    const countResult = await query(`SELECT COUNT(*) FROM tenants ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT t.*, 
      (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as resident_count
     FROM tenants t ${whereClause}
     ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

// GET /api/tenants/:id
// Platform admins can view any society, tenant admins can only view their own society
const getTenantById = async (req, res) => {
    const { id } = req.params;

    // RBAC: non-platform-admins can only view their own tenant
    if (req.user.role !== 'platform_admin' && req.user.tenant_id !== id) {
        throw new AppError('Access denied', 403);
    }

    const cacheKey = `tenant:${id}`;
    let tenant = await cache.get(cacheKey);

    if (!tenant) {
        const result = await query(
            `SELECT t.*,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as resident_count,
        (SELECT COUNT(*) FROM complaints c WHERE c.tenant_id = t.id AND c.status != 'resolved') as open_complaints,
        (SELECT COUNT(*) FROM amenities a WHERE a.tenant_id = t.id) as amenities_count
       FROM tenants t WHERE t.id = $1`,
            [id]
        );

        if (result.rows.length === 0) throw new AppError('Society not found', 404);
        tenant = result.rows[0];
        await cache.set(cacheKey, tenant, 300);
    }

    sendSuccess(res, { tenant });
};

// PATCH /api/tenants/:id
// Update society details (only tenant admins or platform admins)
const updateTenant = async (req, res) => {
    const { id } = req.params;
    const { name, address, city, state, pincode, maxResidents, settings } = req.body;

    const result = await query(
        `UPDATE tenants SET
      name = COALESCE($1, name),
      address = COALESCE($2, address),
      city = COALESCE($3, city),
      state = COALESCE($4, state),
      pincode = COALESCE($5, pincode),
      max_residents = COALESCE($6, max_residents),
      settings = COALESCE($7, settings)
     WHERE id = $8 RETURNING *`,
        [name, address, city, state, pincode, maxResidents, settings ? JSON.stringify(settings) : null, id]
    );

    if (result.rows.length === 0) throw new AppError('Society not found', 404);

    await cache.del(`tenant:${id}`);

    sendSuccess(res, { tenant: result.rows[0] }, 'Society updated successfully');
};

// POST /api/tenants/:id/logo
// Upload or update society logo (only tenant admins or platform admins)
const uploadLogo = async (req, res) => {
    const { id } = req.params;
    if (!req.file) throw new AppError('No image provided', 400);

    const uploaded = await uploadToCloudinary(req.file.buffer, {
        folder: `society-management/tenants/${id}`,
        transformation: [{ width: 400, height: 400, crop: 'fill' }],
    });

    await query('UPDATE tenants SET logo_url = $1 WHERE id = $2', [uploaded.secure_url, id]);
    await cache.del(`tenant:${id}`);

    sendSuccess(res, { logoUrl: uploaded.secure_url }, 'Logo uploaded successfully');
};

// GET /api/tenants/:id/residents
// Get paginated list of residents in a society with optional filters
const getTenantResidents = async (req, res) => {
    const { id } = req.params;
    const { page, limit, offset } = getPaginationParams(req.query);
    const { search, block, role } = req.query;

    let whereClause = 'WHERE u.tenant_id = $1';
    const params = [id];
    let paramCount = 1;

    if (search) {
        paramCount++;
        whereClause += ` AND (u.name ILIKE $${paramCount} OR u.email ILIKE $${paramCount} OR u.flat_number ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }

    if (block) {
        paramCount++;
        whereClause += ` AND u.block = $${paramCount}`;
        params.push(block);
    }

    if (role) {
        paramCount++;
        whereClause += ` AND u.role = $${paramCount}`;
        params.push(role);
    }

    const countResult = await query(`SELECT COUNT(*) FROM users u ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.flat_number, u.block, u.floor,
            u.profile_pic_url, u.is_active, u.created_at
     FROM users u ${whereClause}
     ORDER BY u.name ASC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

// GET /api/tenants/:id/stats
// Get society statistics
const getTenantStats = async (req, res) => {
    const { id } = req.params;

    const [residents, complaints, payments, bookings] = await Promise.all([
        query('SELECT COUNT(*) as total FROM users WHERE tenant_id = $1 AND role = $2', [id, 'resident']),
        query(`
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved
      FROM complaints WHERE tenant_id = $1`, [id]),
        query(`
      SELECT 
        COUNT(*) as total,
        SUM(amount) FILTER (WHERE status = 'completed') as total_revenue,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_count
      FROM payments WHERE tenant_id = $1`, [id]),
        query(`
      SELECT COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'approved') as approved,
        COUNT(*) FILTER (WHERE status = 'pending') as pending
      FROM bookings WHERE tenant_id = $1`, [id]),
    ]);

    sendSuccess(res, {
        stats: {
            residents: residents.rows[0],
            complaints: complaints.rows[0],
            payments: payments.rows[0],
            bookings: bookings.rows[0],
        },
    });
};

module.exports = {
    createTenant,
    getAllTenants,
    getTenantById,
    updateTenant,
    uploadLogo,
    getTenantResidents,
    getTenantStats,
};