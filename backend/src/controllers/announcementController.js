const { query } = require('../config/database');
const { notifyAllResidents } = require('../services/notificationService');
const { AppError } = require('../utils/appError');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

// POST /api/announcements
// Create a new announcement
const createAnnouncement = async (req, res) => {
    const { title, content, type, priority, targetRoles, isPinned, expiresAt } = req.body;
    const { id: userId, tenant_id: tenantId } = req.user;

    const result = await query(
        `INSERT INTO announcements
      (tenant_id, created_by, title, content, type, priority, target_roles, is_pinned, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
            tenantId, userId, title, content,
            type || 'general', priority || 'normal',
            targetRoles || ['resident'],
            isPinned || false,
            expiresAt || null,
        ]
    );

    const announcement = result.rows[0];

    // Push notification to all residents
    await notifyAllResidents({
        tenantId,
        title: `📢 ${title}`,
        message: content.substring(0, 100) + (content.length > 100 ? '...' : ''),
        type: 'announcement',
        referenceId: announcement.id,
        referenceType: 'announcement',
    });

    sendSuccess(res, { announcement }, 'Announcement created', 201);
};

// GET /api/announcements
// Get announcements with pagination and optional filters
const getAnnouncements = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { type, priority } = req.query;
    const tenantId = req.user.tenant_id;

    let whereClause = `WHERE a.tenant_id = $1
    AND (a.expires_at IS NULL OR a.expires_at > NOW())
    AND $2 = ANY(a.target_roles)`;
    const params = [tenantId, req.user.role];
    let paramCount = 2;

    if (type) {
        paramCount++;
        whereClause += ` AND a.type = $${paramCount}`;
        params.push(type);
    }

    if (priority) {
        paramCount++;
        whereClause += ` AND a.priority = $${paramCount}`;
        params.push(priority);
    }

    const countResult = await query(`SELECT COUNT(*) FROM announcements a ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT a.*, u.name as created_by_name
     FROM announcements a
     LEFT JOIN users u ON a.created_by = u.id
     ${whereClause}
     ORDER BY a.is_pinned DESC, a.created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

// PUT /api/announcements/:id
// Update an announcement
const updateAnnouncement = async (req, res) => {
    const { id } = req.params;
    const { title, content, type, priority, isPinned, expiresAt } = req.body;

    const result = await query(
        `UPDATE announcements SET
      title = COALESCE($1, title),
      content = COALESCE($2, content),
      type = COALESCE($3, type),
      priority = COALESCE($4, priority),
      is_pinned = COALESCE($5, is_pinned),
      expires_at = COALESCE($6, expires_at)
     WHERE id = $7 AND tenant_id = $8 RETURNING *`,
        [title, content, type, priority, isPinned, expiresAt, id, req.user.tenant_id]
    );

    if (result.rows.length === 0) throw new AppError('Announcement not found', 404);
    sendSuccess(res, { announcement: result.rows[0] }, 'Announcement updated');
};

// DELETE /api/announcements/:id
// Delete an announcement
const deleteAnnouncement = async (req, res) => {
    const result = await query(
        'DELETE FROM announcements WHERE id = $1 AND tenant_id = $2 RETURNING id',
        [req.params.id, req.user.tenant_id]
    );

    if (result.rows.length === 0) throw new AppError('Announcement not found', 404);
    sendSuccess(res, {}, 'Announcement deleted');
};

module.exports = { createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement };