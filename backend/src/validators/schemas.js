const Joi = require('joi');
const { AppError } = require('../utils/appError');

const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req[source], {
            abortEarly: false,
            stripUnknown: true,
        });
        if (error) {
            const message = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
            return next(new AppError(message, 400));
        }
        req[source] = value;
        next();
    };
};

const loginSchema = Joi.object({
    fcmToken: Joi.string().optional(),
    name: Joi.string().min(2).max(100).optional().allow('', null),
});

const joinSocietySchema = Joi.object({
    tenantId: Joi.string().uuid().required(),
    flatNumber: Joi.string().max(20).optional(),
    block: Joi.string().max(10).optional(),
    floor: Joi.number().integer().optional(),
});

const updateProfileSchema = Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).optional(),
    flatNumber: Joi.string().max(20).optional(),
    block: Joi.string().max(10).optional(),
    floor: Joi.number().integer().optional(),
    fcmToken: Joi.string().optional(),
});

const createTenantSchema = Joi.object({
    name: Joi.string().min(2).max(200).required(),
    address: Joi.string().max(500).optional(),
    city: Joi.string().max(100).optional(),
    state: Joi.string().max(100).optional(),
    pincode: Joi.string().max(10).optional(),
    subscriptionPlan: Joi.string().valid('basic', 'standard', 'premium').optional(),
    maxResidents: Joi.number().integer().min(1).max(10000).optional(),
});

const createComplaintSchema = Joi.object({
    title: Joi.string().min(5).max(255).required(),
    description: Joi.string().min(10).max(3000).required(),
});

const updateComplaintStatusSchema = Joi.object({
    status: Joi.string().valid('open', 'in_progress', 'resolved', 'closed').required(),
    assignedTo: Joi.string().uuid().optional(),
    resolutionNote: Joi.string().max(1000).optional(),
});

const addCommentSchema = Joi.object({
    comment: Joi.string().min(1).max(1000).required(),
});

const createAmenitySchema = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    capacity: Joi.number().integer().min(1).optional(),
    pricePerSlot: Joi.number().min(0).optional(),
    slotDurationMinutes: Joi.number().integer().valid(30, 60, 90, 120, 180).optional(),
    availableFrom: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    availableUntil: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    availableDays: Joi.array().items(Joi.number().integer().min(1).max(7)).optional(),
});

const createBookingSchema = Joi.object({
    amenityId: Joi.string().uuid().required(),
    bookingDate: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required(),
    startTime: Joi.string().isoDate().required(),
    endTime: Joi.string().isoDate().required(),
    notes: Joi.string().max(500).optional(),
});

const updateBookingStatusSchema = Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    rejectionReason: Joi.string().max(500).optional(),
});

const createOrderSchema = Joi.object({
    amount: Joi.number().positive().required(),
    paymentType: Joi.string().valid('maintenance', 'booking', 'penalty', 'other').required(),
    month: Joi.number().integer().min(1).max(12).optional(),
    year: Joi.number().integer().min(2020).max(2100).optional(),
    currency: Joi.string().valid('INR', 'USD').optional(),
});

const verifyPaymentSchema = Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().required(),
    razorpay_signature: Joi.string().required(),
    paymentDbId: Joi.string().uuid().required(),
});

const createAnnouncementSchema = Joi.object({
    title: Joi.string().min(3).max(255).required(),
    content: Joi.string().min(5).max(5000).required(),
    type: Joi.string().valid('general', 'maintenance', 'event', 'emergency', 'rule').optional(),
    priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional(),
    targetRoles: Joi.array().items(Joi.string().valid('resident', 'society_admin')).optional(),
    isPinned: Joi.boolean().optional(),
    expiresAt: Joi.string().isoDate().optional(),
});

const chatSchema = Joi.object({
    message: Joi.string().min(1).max(1000).required(),
    conversationHistory: Joi.array()
        .items(
            Joi.object({
                role: Joi.string().valid('user', 'assistant').required(),
                content: Joi.string().required(),
            })
        )
        .max(20)
        .optional(),
});

module.exports = {
    validate,
    loginSchema, joinSocietySchema, updateProfileSchema,
    createTenantSchema,
    createComplaintSchema, updateComplaintStatusSchema, addCommentSchema,
    createAmenitySchema, createBookingSchema, updateBookingStatusSchema,
    createOrderSchema, verifyPaymentSchema,
    createAnnouncementSchema,
    chatSchema,
};