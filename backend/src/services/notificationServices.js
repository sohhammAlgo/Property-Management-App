const { query } = require('../config/database');
const { sendPushNotification, sendMulticastNotification } = require('../config/firebase');
const { sendEmail, emailTemplates } = require('../utils/email');

let io; // Socket.IO instance injected from server

const setSocketIO = (socketIO) => {
    io = socketIO;
};

// Create a notification and optionally emit it via Socket.IO
const createNotification = async ({
    userId,
    tenantId,
    title,
    message,
    type,
    referenceId = null,
    referenceType = null,
    emit = true,
}) => {
    const result = await query(
        `INSERT INTO notifications 
      (user_id, tenant_id, title, message, type, reference_id, reference_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
        [userId, tenantId, title, message, type, referenceId, referenceType]
    );

    const notification = result.rows[0];

    // Emit via Socket.IO
    if (emit && io) {
        io.to(`user:${userId}`).emit('notification', notification);
    }

    return notification;
};

//Notify all residents of a tenant (e.g., for society-wide announcements)
const notifyAllResidents = async ({ tenantId, title, message, type, referenceId, referenceType }) => {
    const residents = await query(
        `SELECT id, fcm_token FROM users WHERE tenant_id = $1 AND role = 'resident' AND is_active = true`,
        [tenantId]
    );

    const notifications = [];
    for (const resident of residents.rows) {
        const notif = await createNotification({
            userId: resident.id,
            tenantId,
            title,
            message,
            type,
            referenceId,
            referenceType,
        });
        notifications.push(notif);
    }

    // Send push notifications
    const fcmTokens = residents.rows.map((r) => r.fcm_token).filter(Boolean);
    if (fcmTokens.length > 0) {
        await sendMulticastNotification(fcmTokens, { title, body: message }, {
            type,
            referenceId: referenceId?.toString() || '',
        }).catch(console.error);
    }

    return notifications;
};

//Notify society admins (e.g., when a new complaint is raised)
const notifyAdmins = async ({ tenantId, title, message, type, referenceId, referenceType }) => {
    const admins = await query(
        `SELECT id, fcm_token FROM users WHERE tenant_id = $1 AND role = 'society_admin' AND is_active = true`,
        [tenantId]
    );

    for (const admin of admins.rows) {
        await createNotification({
            userId: admin.id,
            tenantId,
            title,
            message,
            type,
            referenceId,
            referenceType,
        });
    }

    const fcmTokens = admins.rows.map((a) => a.fcm_token).filter(Boolean);
    if (fcmTokens.length > 0) {
        await sendMulticastNotification(fcmTokens, { title, body: message }).catch(console.error);
    }
};

//Mark notifications as read
const markAsRead = async (userId, notificationIds = []) => {
    if (notificationIds.length === 0) {
        await query(
            `UPDATE notifications SET is_read = true, read_at = NOW() WHERE user_id = $1 AND is_read = false`,
            [userId]
        );
    } else {
        await query(
            `UPDATE notifications SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND id = ANY($2::uuid[])`,
            [userId, notificationIds]
        );
    }
};

module.exports = {
    setSocketIO,
    createNotification,
    notifyAllResidents,
    notifyAdmins,
    markAsRead,
};