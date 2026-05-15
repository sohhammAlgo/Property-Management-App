const jwt = require('jsonwebtoken');
const { query } = require('./database');
const { setSocketIO } = require('../services/notificationService');

const initializeSocket = (io) => {
    setSocketIO(io);

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) return next(new Error('Authentication required'));
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const result = await query('SELECT id, name, role, tenant_id FROM users WHERE id = $1 AND is_active = true', [decoded.userId]);
            if (result.rows.length === 0) return next(new Error('User not found'));
            socket.user = result.rows[0];
            next();
        } catch (err) {
            next(new Error('Socket auth failed'));
        }
    });

    io.on('connection', (socket) => {
        const { id: userId, role, tenant_id: tenantId } = socket.user;
        socket.join(`user:${userId}`);
        if (tenantId) socket.join(`tenant:${tenantId}`);
        socket.join(`role:${role}`);

        socket.on('complaint:join', (id) => socket.join(`complaint:${id}`));
        socket.on('complaint:leave', (id) => socket.leave(`complaint:${id}`));
        socket.on('complaint:typing', ({ complaintId }) => {
            socket.to(`complaint:${complaintId}`).emit('complaint:typing', { userId, name: socket.user.name });
        });
        socket.on('disconnect', () => {
            if (tenantId) socket.to(`tenant:${tenantId}`).emit('user:offline', { userId });
        });
    });
};

module.exports = { initializeSocket };