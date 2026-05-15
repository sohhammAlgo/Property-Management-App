const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadImage, handleUpload } = require('../middleware/upload');
const {
    createTenant, getAllTenants, getTenantById, updateTenant,
    uploadLogo, getTenantResidents, getTenantStats,
} = require('../controllers/tenantController');

router.use(authenticate);

// Platform admin only
router.post('/', authorize('platform_admin'), createTenant);
router.get('/', authorize('platform_admin'), getAllTenants);

// Society admin + platform admin
router.get('/:id', getTenantById);
router.patch('/:id', authorize('platform_admin', 'society_admin'), updateTenant);
router.post('/:id/logo', authorize('platform_admin', 'society_admin'), handleUpload(uploadImage.single('logo')), uploadLogo);
router.get('/:id/residents', authorize('platform_admin', 'society_admin'), getTenantResidents);
router.get('/:id/stats', authorize('platform_admin', 'society_admin'), getTenantStats);

module.exports = router;