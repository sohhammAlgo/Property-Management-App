const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const { chat, getDashboardInsights, getAIHealth } = require('../controllers/aiController');
const { validate, chatSchema } = require('../validators/schemas');

router.use(authenticate);

router.post('/chat', aiLimiter, validate(chatSchema), chat);
router.post('/insights', aiLimiter, authorize('society_admin', 'platform_admin'), getDashboardInsights);
router.get('/health', getAIHealth);

module.exports = router;