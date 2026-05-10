const { AppError } = require('../utils/appError');

const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Internal Server Error';

    // PostgreSQL errors
    if (err.code === '23505') {
        statusCode = 409;
        message = extractUniqueConstraintMessage(err);
    } else if (err.code === '23503') {
        statusCode = 400;
        message = 'Referenced resource does not exist';
    } else if (err.code === '22P02') {
        statusCode = 400;
        message = 'Invalid UUID format';
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Joi validation errors
    if (err.isJoi) {
        statusCode = 400;
        message = err.details.map((d) => d.message.replace(/"/g, '')).join(', ');
    }

    // Multer errors
    if (err.code === 'LIMIT_FILE_SIZE') {
        statusCode = 400;
        message = 'File too large. Max size is 5MB';
    }

    if (process.env.NODE_ENV === 'development') {
        console.error('Error:', err);
        return res.status(statusCode).json({
            success: false,
            message,
            stack: err.stack,
            error: err,
        });
    }

    // Production - hide internal errors
    if (statusCode === 500) {
        console.error('Internal Error:', err);
        message = 'Something went wrong. Please try again.';
    }

    res.status(statusCode).json({
        success: false,
        message,
    });
};

const extractUniqueConstraintMessage = (err) => {
    const detail = err.detail || '';
    if (detail.includes('email')) return 'Email already exists';
    if (detail.includes('firebase_uid')) return 'Firebase user already registered';
    if (detail.includes('phone')) return 'Phone number already exists';
    return 'A record with this information already exists';
};

const notFound = (req, res, next) => {
    next(new AppError(`Route ${req.method} ${req.originalUrl} not found`, 404));
};

module.exports = { errorHandler, notFound };