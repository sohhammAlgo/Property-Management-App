const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    getPlatformDashboard,
    getTenantGrowth,
    getRevenueAnalytics,
    getAllUsers,
    toggleUserStatus,
    changeUserRole,
    deleteTenant,
} = require('../controllers/adminController');

router.use(authenticate);
router.use(authorize('platform_admin'));

// Dashboard
router.get('/dashboard', getPlatformDashboard);
router.get('/tenants/growth', getTenantGrowth);
router.get('/revenue', getRevenueAnalytics);

// User management
router.get('/users', getAllUsers);
router.patch('/users/:id/status', toggleUserStatus);
router.patch('/users/:id/role', changeUserRole);

// Tenant management
router.delete('/tenants/:id', deleteTenant);

module.exports = router;