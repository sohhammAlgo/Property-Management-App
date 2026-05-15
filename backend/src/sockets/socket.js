const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const { setSocketIO } = require('../services/notificationService');

/**
 * Initialize Socket.IO with authentication and room management
 * @param {import('socket.io').Server} io
 */
const initializeSocket = (io) => {
    setSocketIO(io);

    // Auth middleware for Socket.IO
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) return next(new Error('Authentication required'));

            let decoded;
            try {
                decoded = jwt.verify(token, process.env.JWT_SECRET);
            } catch {
                return next(new Error('Invalid token'));
            }

            const result = await query(
                'SELECT id, name, role, tenant_id FROM users WHERE id = $1 AND is_active = true',
                [decoded.userId]
            );

            if (result.rows.length === 0) return next(new Error('User not found'));

            socket.user = result.rows[0];
            next();
        } catch (err) {
            next(new Error('Socket authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        const { id: userId, role, tenant_id: tenantId } = socket.user;

        console.log(`🔌 Socket connected: ${socket.user.name} (${role})`);

        // Join personal room
        socket.join(`user:${userId}`);

        // Join tenant room
        if (tenantId) {
            socket.join(`tenant:${tenantId}`);
        }

        // Join role-based room
        socket.join(`role:${role}`);

        // ── Complaint events ──
        socket.on('complaint:join', (complaintId) => {
            socket.join(`complaint:${complaintId}`);
        });

        socket.on('complaint:leave', (complaintId) => {
            socket.leave(`complaint:${complaintId}`);
        });

        // ── Typing indicators ──
        socket.on('complaint:typing', ({ complaintId }) => {
            socket.to(`complaint:${complaintId}`).emit('complaint:typing', {
                userId,
                name: socket.user.name,
            });
        });

        // ── Mark notifications read ──
        socket.on('notifications:read', async (notificationIds) => {
            try {
                if (Array.isArray(notificationIds) && notificationIds.length > 0) {
                    await query(
                        `UPDATE notifications SET is_read = true, read_at = NOW()
             WHERE user_id = $1 AND id = ANY($2::uuid[])`,
                        [userId, notificationIds]
                    );
                }
            } catch (err) {
                console.error('Socket notifications:read error:', err.message);
            }
        });

        // ── Presence ──
        socket.to(`tenant:${tenantId}`).emit('user:online', { userId, name: socket.user.name });

        socket.on('disconnect', (reason) => {
            console.log(`🔌 Socket disconnected: ${socket.user.name} (${reason})`);
            if (tenantId) {
                socket.to(`tenant:${tenantId}`).emit('user:offline', { userId });
            }
        });
    });

    // Utility methods for emitting to rooms
    const socketHelpers = {
        emitToUser: (userId, event, data) => {
            io.to(`user:${userId}`).emit(event, data);
        },
        emitToTenant: (tenantId, event, data) => {
            io.to(`tenant:${tenantId}`).emit(event, data);
        },
        emitToRole: (role, event, data) => {
            io.to(`role:${role}`).emit(event, data);
        },
        emitToComplaint: (complaintId, event, data) => {
            io.to(`complaint:${complaintId}`).emit(event, data);
        },
    };

    return socketHelpers;
};

module.exports = { initializeSocket };