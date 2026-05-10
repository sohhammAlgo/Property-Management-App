const jwt = require('jsonwebtoken');
const { verifyFirebaseToken } = require('../config/firebase');
const { query } = require('../config/database');
const { cache } = require('../config/redis');
const { AppError } = require('../utils/appError');

//Authenticate user by verifying JWT token and checking against blacklist
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No token provided', 401);
        }

        const token = authHeader.split(' ')[1];

        // Check if token is blacklisted
        const isBlacklisted = await cache.get(`blacklist:${token}`);
        if (isBlacklisted) throw new AppError('Token has been revoked', 401);

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            if (err.name === 'TokenExpiredError') throw new AppError('Token expired', 401);
            throw new AppError('Invalid token', 401);
        }

        // Try to get user from cache
        let user = await cache.get(`user:${decoded.userId}`);

        if (!user) {
            const result = await query(
                `SELECT u.*, t.name as tenant_name, t.subscription_status as tenant_subscription_status
         FROM users u
         LEFT JOIN tenants t ON u.tenant_id = t.id
         WHERE u.id = $1 AND u.is_active = true`,
                [decoded.userId]
            );

            if (result.rows.length === 0) throw new AppError('User not found', 401);
            user = result.rows[0];
            await cache.set(`user:${decoded.userId}`, user, 300); // Cache for 5 min
        }

        req.user = user;
        req.token = token;
        next();
    } catch (err) {
        next(err);
    }
};

//Authenticate user by verifying Firebase ID token
const verifyFirebase = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError('No Firebase token provided', 401);
        }

        const idToken = authHeader.split(' ')[1];
        const decodedToken = await verifyFirebaseToken(idToken);
        req.firebaseUser = decodedToken;
        next();
    } catch (err) {
        next(new AppError('Invalid Firebase token', 401));
    }
};

/**
 * Role-based authorization middleware
 * @param  {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return next(new AppError('Not authenticated', 401));
        if (!roles.includes(req.user.role)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }
        next();
    };
};

//Middleware to ensure user has access to the tenant (society) they are trying to access
const requireTenantAccess = (req, res, next) => {
    const tenantId = req.params.tenantId || req.body.tenantId || req.query.tenantId;

    if (req.user.role === 'platform_admin') return next();

    if (!req.user.tenant_id) {
        return next(new AppError('You are not associated with any society', 403));
    }

    if (tenantId && req.user.tenant_id !== tenantId) {
        return next(new AppError('Access denied to this society', 403));
    }

    req.tenantId = req.user.tenant_id;
    next();
};

//Optional authentication middleware - if token is valid, attach user to req, otherwise continue without user
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const result = await query('SELECT * FROM users WHERE id = $1 AND is_active = true', [
            decoded.userId,
        ]);

        if (result.rows.length > 0) req.user = result.rows[0];
        next();
    } catch (err) {
        next();
    }
};

module.exports = { authenticate, verifyFirebase, authorize, requireTenantAccess, optionalAuth };