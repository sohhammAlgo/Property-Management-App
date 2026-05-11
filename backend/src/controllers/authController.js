const { query } = require('../config/database');
const { generateAccessToken, generateRefreshToken, rotateRefreshToken, revokeAllTokens } = require('../utils/jwt');
const { cache } = require('../config/redis');
const { sendEmail, emailTemplates } = require('../utils/email');
const { AppError } = require('../utils/appError');
const { sendSuccess } = require('../utils/response');

// AI Service client
const firebaseLogin = async (req, res) => {
    const { firebaseUser } = req; // Set by verifyFirebase middleware
    const { name, fcmToken } = req.body;

    let user;
    const existingUser = await query(
        'SELECT * FROM users WHERE firebase_uid = $1',
        [firebaseUser.uid]
    );

    if (existingUser.rows.length > 0) {
        // Existing user - update last login and FCM token
        const updateResult = await query(
            `UPDATE users SET last_login = NOW(), fcm_token = COALESCE($1, fcm_token)
       WHERE firebase_uid = $2 RETURNING *`,
            [fcmToken || null, firebaseUser.uid]
        );
        user = updateResult.rows[0];
    } else {
        // New user registration
        const displayName = name || firebaseUser.name || firebaseUser.email.split('@')[0];
        const newUser = await query(
            `INSERT INTO users (firebase_uid, name, email, role, fcm_token, last_login)
       VALUES ($1, $2, $3, 'resident', $4, NOW())
       RETURNING *`,
            [firebaseUser.uid, displayName, firebaseUser.email, fcmToken || null]
        );
        user = newUser.rows[0];

        // Send welcome email async
        sendEmail({ to: user.email, ...emailTemplates.welcome(user) }).catch(console.error);
    }

    const accessToken = generateAccessToken(user.id, user.role, user.tenant_id);
    const refreshToken = await generateRefreshToken(user.id);

    // Clear user cache to ensure fresh data
    await cache.del(`user:${user.id}`);

    sendSuccess(
        res,
        {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenant_id,
                profilePicUrl: user.profile_pic_url,
            },
        },
        existingUser.rows.length > 0 ? 'Login successful' : 'Registration successful',
        existingUser.rows.length > 0 ? 200 : 201
    );
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res) => {
    const { refreshToken: token } = req.body;
    if (!token) throw new AppError('Refresh token required', 400);

    const result = await rotateRefreshToken(token);
    if (!result) throw new AppError('Invalid or expired refresh token', 401);

    sendSuccess(res, {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
    });
};

// POST /api/auth/logout
const logout = async (req, res) => {
    const { id } = req.user;

    // Blacklist current access token
    const token = req.token;
    if (token) {
        const decoded = require('jsonwebtoken').decode(token);
        const ttl = decoded ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
        if (ttl > 0) await cache.set(`blacklist:${token}`, true, ttl);
    }

    await revokeAllTokens(id);
    await cache.del(`user:${id}`);

    sendSuccess(res, {}, 'Logged out successfully');
};

// GET /api/auth/me
const getMe = async (req, res) => {
    const result = await query(
        `SELECT u.id, u.name, u.email, u.phone, u.role, u.tenant_id,
            u.flat_number, u.block, u.floor, u.profile_pic_url,
            u.fcm_token, u.is_active, u.last_login, u.created_at,
            t.name as tenant_name, t.address as tenant_address,
            t.subscription_plan, t.subscription_status
     FROM users u
     LEFT JOIN tenants t ON u.tenant_id = t.id
     WHERE u.id = $1`,
        [req.user.id]
    );

    if (result.rows.length === 0) throw new AppError('User not found', 404);

    sendSuccess(res, { user: result.rows[0] });
};

// PATCH /api/auth/me
// Update user profile
const updateProfile = async (req, res) => {
    const { name, phone, flatNumber, block, floor, fcmToken } = req.body;
    const { id } = req.user;

    const result = await query(
        `UPDATE users SET
      name = COALESCE($1, name),
      phone = COALESCE($2, phone),
      flat_number = COALESCE($3, flat_number),
      block = COALESCE($4, block),
      floor = COALESCE($5, floor),
      fcm_token = COALESCE($6, fcm_token)
     WHERE id = $7 RETURNING *`,
        [name, phone, flatNumber, block, floor, fcmToken, id]
    );

    // Invalidate cache
    await cache.del(`user:${id}`);

    sendSuccess(res, { user: result.rows[0] }, 'Profile updated successfully');
};

// POST /api/auth/join-society
const joinSociety = async (req, res) => {
    const { tenantId, flatNumber, block, floor } = req.body;
    const { id } = req.user;

    if (req.user.tenant_id) {
        throw new AppError('You are already part of a society. Leave first.', 400);
    }

    const tenant = await query('SELECT * FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) throw new AppError('Society not found', 404);

    await query(
        `UPDATE users SET tenant_id = $1, flat_number = $2, block = $3, floor = $4 WHERE id = $5`,
        [tenantId, flatNumber, block, floor, id]
    );

    await cache.del(`user:${id}`);

    sendSuccess(res, {}, `Successfully joined ${tenant.rows[0].name}`);
};

module.exports = { firebaseLogin, refreshToken, logout, getMe, updateProfile, joinSociety };