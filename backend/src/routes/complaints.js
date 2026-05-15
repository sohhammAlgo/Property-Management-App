const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadImage, handleUpload } = require('../middleware/upload');
const { uploadLimiter } = require('../middleware/rateLimiter');
const {
    createComplaint, getComplaints, getComplaintById,
    updateComplaintStatus, addComment, deleteComplaint, getComplaintAnalytics,
} = require('../controllers/complaintController');
const {
    validate, createComplaintSchema, updateComplaintStatusSchema, addCommentSchema,
} = require('../validators/schemas');

router.use(authenticate);

router.post('/', uploadLimiter, handleUpload(uploadImage.single('image')), validate(createComplaintSchema), createComplaint);
router.get('/', getComplaints);
router.get('/analytics', authorize('society_admin', 'platform_admin'), getComplaintAnalytics);
router.get('/:id', getComplaintById);
router.patch('/:id/status', authorize('society_admin', 'platform_admin'), validate(updateComplaintStatusSchema), updateComplaintStatus);
router.post('/:id/comments', validate(addCommentSchema), addComment);
router.delete('/:id', deleteComplaint);

module.exports = router;