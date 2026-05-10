const rateLimit = require('express-rate-limit');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { getRedisClient } = require('../config/redis');
const { AppError } = require('../utils/appError');

// Standard rate limiter (express-rate-limit)
const standardLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests. Please try again after 15 minutes.',
    },
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
    },
});

// Redis-based rate limiter for distributed environments
const createRedisRateLimiter = (points, duration, keyPrefix) => {
    return async (req, res, next) => {
        try {
            const client = getRedisClient();
            const limiter = new RateLimiterRedis({
                storeClient: client,
                keyPrefix,
                points,
                duration,
            });

            const key = req.user ? req.user.id : req.ip;
            await limiter.consume(key);
            next();
        } catch (rejRes) {
            const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
            res.set('Retry-After', retryAfter);
            next(new AppError(`Rate limit exceeded. Retry after ${retryAfter} seconds.`, 429));
        }
    };
};

// Specific limiters
const aiLimiter = createRedisRateLimiter(20, 60, 'ai'); // 20 req/min
const uploadLimiter = createRedisRateLimiter(10, 60, 'upload'); // 10 uploads/min
const paymentLimiter = createRedisRateLimiter(5, 60, 'payment'); // 5 payments/min

module.exports = { standardLimiter, authLimiter, aiLimiter, uploadLimiter, paymentLimiter };