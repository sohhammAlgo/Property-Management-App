const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');

//Generate JWT access token
const generateAccessToken = (userId, role, tenantId = null) => {
    return jwt.sign(
        { userId, role, tenantId },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '120m' }
    );
};

//Generate refresh token and store in DB
const generateRefreshToken = async (userId) => {
    const token = uuidv4() + '-' + uuidv4(); // More entropy
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [userId, token, expiresAt]
    );

    return token;
};

//Rotate refresh token: validate old token, delete it, and issue new tokens
const rotateRefreshToken = async (oldToken) => {
    const result = await query(
        `SELECT rt.*, u.role, u.tenant_id 
     FROM refresh_tokens rt
     JOIN users u ON rt.user_id = u.id
     WHERE rt.token = $1 AND rt.expires_at > NOW()`,
        [oldToken]
    );

    if (result.rows.length === 0) return null;

    const { user_id, role, tenant_id } = result.rows[0];

    // Delete old token
    await query('DELETE FROM refresh_tokens WHERE token = $1', [oldToken]);

    // Generate new tokens
    const newRefreshToken = await generateRefreshToken(user_id);
    const accessToken = generateAccessToken(user_id, role, tenant_id);

    return { accessToken, refreshToken: newRefreshToken, userId: user_id };
};

//Revoke all refresh tokens for a user (e.g., on password change)
const revokeAllTokens = async (userId) => {
    await query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
};

//Clean up expired refresh tokens (can be run as a scheduled job)
const cleanExpiredTokens = async () => {
    const result = await query('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
    return result.rowCount;
};

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    rotateRefreshToken,
    revokeAllTokens,
    cleanExpiredTokens,
};