const { query, getClient } = require('../config/database');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');
const { classifyComplaint } = require('../services/aiService');
const { createNotification, notifyAdmins } = require('../services/notificationService');
const { sendEmail, emailTemplates } = require('../utils/email');
const { AppError } = require('../utils/appError');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

// AI Service client
// POST /api/complaints
const createComplaint = async (req, res) => {
    const { title, description } = req.body;
    const { id: userId, tenant_id: tenantId } = req.user;

    if (!tenantId) throw new AppError('You must be part of a society to raise complaints', 400);

    // Upload image if provided
    let imageUrl = null;
    let imagePublicId = null;
    if (req.file) {
        const uploaded = await uploadToCloudinary(req.file.buffer, {
            folder: `society-management/${tenantId}/complaints`,
        });
        imageUrl = uploaded.secure_url;
        imagePublicId = uploaded.public_id;
    }

    // AI classification (non-blocking)
    let aiClassification = { category: 'Other', priority: 'medium' };
    try {
        aiClassification = await classifyComplaint(description);
    } catch {
        console.warn('AI classification unavailable, using defaults');
    }

    const result = await query(
        `INSERT INTO complaints 
      (user_id, tenant_id, title, description, category, priority, image_url, image_public_id, ai_classification)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
        [
            userId, tenantId, title, description,
            aiClassification.category, aiClassification.priority,
            imageUrl, imagePublicId, JSON.stringify(aiClassification),
        ]
    );

    const complaint = result.rows[0];

    // Notify admins
    await notifyAdmins({
        tenantId,
        title: 'New Complaint Raised',
        message: `${req.user.name} raised: ${title}`,
        type: 'complaint_new',
        referenceId: complaint.id,
        referenceType: 'complaint',
    });

    // Email confirmation to user
    sendEmail({ to: req.user.email, ...emailTemplates.complaintRaised(req.user, complaint) }).catch(console.error);

    sendSuccess(res, { complaint }, 'Complaint raised successfully', 201);
};

// GET /api/complaints
// Residents see their complaints, admins see all complaints for their tenant
const getComplaints = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status, category, priority, search, userId: filterUserId } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    // Residents can only see their own complaints
    if (req.user.role === 'resident') {
        paramCount++;
        whereClause += ` AND c.user_id = $${paramCount}`;
        params.push(req.user.id);
    } else {
        // Society admin sees all complaints for their tenant
        paramCount++;
        whereClause += ` AND c.tenant_id = $${paramCount}`;
        params.push(req.user.tenant_id);

        if (filterUserId) {
            paramCount++;
            whereClause += ` AND c.user_id = $${paramCount}`;
            params.push(filterUserId);
        }
    }

    if (status) {
        paramCount++;
        whereClause += ` AND c.status = $${paramCount}`;
        params.push(status);
    }

    if (category) {
        paramCount++;
        whereClause += ` AND c.category = $${paramCount}`;
        params.push(category);
    }

    if (priority) {
        paramCount++;
        whereClause += ` AND c.priority = $${paramCount}`;
        params.push(priority);
    }

    if (search) {
        paramCount++;
        whereClause += ` AND (c.title ILIKE $${paramCount} OR c.description ILIKE $${paramCount})`;
        params.push(`%${search}%`);
    }

    const countResult = await query(`SELECT COUNT(*) FROM complaints c ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT c.*, 
      u.name as user_name, u.email as user_email, u.flat_number, u.block,
      au.name as assigned_to_name
     FROM complaints c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN users au ON c.assigned_to = au.id
     ${whereClause}
     ORDER BY 
       CASE c.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
       c.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

// GET /api/complaints/:id
// Residents can see their own complaints, admins can see all complaints for their tenant
const getComplaintById = async (req, res) => {
    const { id } = req.params;

    const result = await query(
        `SELECT c.*,
      u.name as user_name, u.email as user_email, u.flat_number, u.block, u.profile_pic_url,
      au.name as assigned_to_name
     FROM complaints c
     LEFT JOIN users u ON c.user_id = u.id
     LEFT JOIN users au ON c.assigned_to = au.id
     WHERE c.id = $1`,
        [id]
    );

    if (result.rows.length === 0) throw new AppError('Complaint not found', 404);
    const complaint = result.rows[0];

    // Access control
    if (req.user.role === 'resident' && complaint.user_id !== req.user.id) {
        throw new AppError('Access denied', 403);
    }
    if (req.user.role === 'society_admin' && complaint.tenant_id !== req.user.tenant_id) {
        throw new AppError('Access denied', 403);
    }

    // Get comments
    const comments = await query(
        `SELECT cc.*, u.name as user_name, u.role, u.profile_pic_url
     FROM complaint_comments cc
     LEFT JOIN users u ON cc.user_id = u.id
     WHERE cc.complaint_id = $1
     ORDER BY cc.created_at ASC`,
        [id]
    );

    sendSuccess(res, { complaint: { ...complaint, comments: comments.rows } });
};

// PATCH /api/complaints/:id/status
// Admin updates complaint status
const updateComplaintStatus = async (req, res) => {
    const { id } = req.params;
    const { status, assignedTo, resolutionNote } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        throw new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400);
    }

    const complaintResult = await query(
        'SELECT * FROM complaints WHERE id = $1 AND tenant_id = $2',
        [id, req.user.tenant_id]
    );

    if (complaintResult.rows.length === 0) throw new AppError('Complaint not found', 404);
    const complaint = complaintResult.rows[0];

    const resolvedAt = status === 'resolved' ? new Date() : null;

    const result = await query(
        `UPDATE complaints SET
      status = $1,
      assigned_to = COALESCE($2, assigned_to),
      resolution_note = COALESCE($3, resolution_note),
      resolved_at = COALESCE($4, resolved_at)
     WHERE id = $5 RETURNING *`,
        [status, assignedTo, resolutionNote, resolvedAt, id]
    );

    // Notify the complainant
    await createNotification({
        userId: complaint.user_id,
        tenantId: complaint.tenant_id,
        title: 'Complaint Status Updated',
        message: `Your complaint "${complaint.title}" status changed to ${status}`,
        type: 'complaint_update',
        referenceId: id,
        referenceType: 'complaint',
    });

    // Get user for email
    const userResult = await query('SELECT * FROM users WHERE id = $1', [complaint.user_id]);
    if (userResult.rows.length > 0) {
        sendEmail({
            to: userResult.rows[0].email,
            ...emailTemplates.complaintStatusUpdate(userResult.rows[0], result.rows[0]),
        }).catch(console.error);
    }

    sendSuccess(res, { complaint: result.rows[0] }, 'Complaint status updated');
};

// POST /api/complaints/:id/comments
// Add a comment to a complaint (resident or admin)
const addComment = async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;

    const complaintResult = await query('SELECT * FROM complaints WHERE id = $1', [id]);
    if (complaintResult.rows.length === 0) throw new AppError('Complaint not found', 404);
    const complaint = complaintResult.rows[0];

    const result = await query(
        'INSERT INTO complaint_comments (complaint_id, user_id, comment) VALUES ($1, $2, $3) RETURNING *',
        [id, req.user.id, comment]
    );

    // Notify complaint owner if commenter is admin
    if (req.user.role !== 'resident' && complaint.user_id !== req.user.id) {
        await createNotification({
            userId: complaint.user_id,
            tenantId: complaint.tenant_id,
            title: 'New Comment on Your Complaint',
            message: `Admin commented on: ${complaint.title}`,
            type: 'complaint_comment',
            referenceId: id,
            referenceType: 'complaint',
        });
    }

    sendSuccess(res, { comment: result.rows[0] }, 'Comment added', 201);
};

// DELETE /api/complaints/:id
// Residents can close their own complaints, admins can close any complaint
const deleteComplaint = async (req, res) => {
    const { id } = req.params;

    let whereClause = 'id = $1';
    const params = [id];

    if (req.user.role === 'resident') {
        whereClause += ' AND user_id = $2 AND status = $3';
        params.push(req.user.id, 'open');
    } else {
        whereClause += ' AND tenant_id = $2';
        params.push(req.user.tenant_id);
    }

    const result = await query(
        `UPDATE complaints SET status = 'closed' WHERE ${whereClause} RETURNING id`,
        params
    );

    if (result.rows.length === 0) {
        throw new AppError('Complaint not found or cannot be deleted', 404);
    }

    sendSuccess(res, {}, 'Complaint closed successfully');
};

// GET /api/complaints/analytics
// Get complaint analytics for dashboard
const getComplaintAnalytics = async (req, res) => {
    const tenantId = req.user.tenant_id;

    const [byCategory, byPriority, byStatus, monthly] = await Promise.all([
        query(
            `SELECT category, COUNT(*) as count 
       FROM complaints WHERE tenant_id = $1 
       GROUP BY category ORDER BY count DESC`,
            [tenantId]
        ),
        query(
            `SELECT priority, COUNT(*) as count 
       FROM complaints WHERE tenant_id = $1 
       GROUP BY priority`,
            [tenantId]
        ),
        query(
            `SELECT status, COUNT(*) as count 
       FROM complaints WHERE tenant_id = $1 
       GROUP BY status`,
            [tenantId]
        ),
        query(
            `SELECT 
         TO_CHAR(created_at, 'YYYY-MM') as month, 
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'resolved') as resolved
       FROM complaints WHERE tenant_id = $1 
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY month ORDER BY month`,
            [tenantId]
        ),
    ]);

    sendSuccess(res, {
        analytics: {
            byCategory: byCategory.rows,
            byPriority: byPriority.rows,
            byStatus: byStatus.rows,
            monthly: monthly.rows,
        },
    });
};

module.exports = {
    createComplaint,
    getComplaints,
    getComplaintById,
    updateComplaintStatus,
    addComment,
    deleteComplaint,
    getComplaintAnalytics,
};