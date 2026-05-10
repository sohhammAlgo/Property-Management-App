//Utility functions for sending API responses
const sendSuccess = (res, data = {}, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        ...data,
    });
};

//Send paginated response
const sendPaginated = (res, data, total, page, limit, message = 'Success') => {
    const totalPages = Math.ceil(total / limit);
    return res.status(200).json({
        success: true,
        message,
        data,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
};

//Extract pagination parameters from query
const getPaginationParams = (query) => {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
    const offset = (page - 1) * limit;
    return { page, limit, offset };
};

module.exports = { sendSuccess, sendPaginated, getPaginationParams };