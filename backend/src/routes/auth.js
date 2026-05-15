const express = require('express');
const router = express.Router();
const { authenticate, verifyFirebase } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const {
    firebaseLogin, refreshToken, logout, getMe, updateProfile, joinSociety,
} = require('../controllers/authController');
const {
    validate, loginSchema, joinSocietySchema, updateProfileSchema,
} = require('../validators/schemas');

// Public (Firebase-authenticated)
router.post('/firebase-login', authLimiter, verifyFirebase, validate(loginSchema), firebaseLogin);
router.post('/refresh', authLimiter, refreshToken);

// Protected
router.use(authenticate);
router.get('/me', getMe);
router.patch('/me', validate(updateProfileSchema), updateProfile);
router.post('/logout', logout);
router.post('/join-society', validate(joinSocietySchema), joinSociety);

module.exports = router;