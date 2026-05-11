const { query } = require('../config/database');
const { markAsRead } = require('../services/notificationService');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

// GET /api/notifications
// Get notifications for the logged-in user with pagination and optional read/unread filter
const getNotifications = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { isRead } = req.query;
    const { id: userId } = req.user;

    let whereClause = 'WHERE user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (isRead !== undefined) {
        paramCount++;
        whereClause += ` AND is_read = $${paramCount}`;
        params.push(isRead === 'true');
    }

    const countResult = await query(`SELECT COUNT(*) FROM notifications ${whereClause}`, params);
    const unreadCount = await query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId]
    );

    const result = await query(
        `SELECT * FROM notifications ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, parseInt(countResult.rows[0].count), page, limit, 'Success');
    // Override to add unread count
};

// GET /api/notifications/unread-count
// Get count of unread notifications for the logged-in user
const getUnreadCount = async (req, res) => {
    const result = await query(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [req.user.id]
    );
    sendSuccess(res, { count: parseInt(result.rows[0].count) });
};

// POST /api/notifications/mark-read
// Mark notifications as read (accepts optional array of notification IDs; if empty, marks all as read)
const markNotificationsRead = async (req, res) => {
    const { notificationIds } = req.body; // optional array; if empty, marks all
    await markAsRead(req.user.id, notificationIds);
    sendSuccess(res, {}, 'Notifications marked as read');
};

// DELETE /api/notifications/:id
// Delete a notification
const deleteNotification = async (req, res) => {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [
        req.params.id,
        req.user.id,
    ]);
    sendSuccess(res, {}, 'Notification deleted');
};

module.exports = { getNotifications, getUnreadCount, markNotificationsRead, deleteNotification };