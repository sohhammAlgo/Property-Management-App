const express = require('express');
const announcementRouter = express.Router();
const notificationRouter = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    createAnnouncement, getAnnouncements, updateAnnouncement, deleteAnnouncement,
} = require('../controllers/announcementController');
const {
    getNotifications, getUnreadCount, markNotificationsRead, deleteNotification,
} = require('../controllers/notificationController');
const { validate, createAnnouncementSchema } = require('../validators/schemas');

// Announcements
announcementRouter.use(authenticate);
announcementRouter.post('/', authorize('society_admin', 'platform_admin'), validate(createAnnouncementSchema), createAnnouncement);
announcementRouter.get('/', getAnnouncements);
announcementRouter.patch('/:id', authorize('society_admin', 'platform_admin'), updateAnnouncement);
announcementRouter.delete('/:id', authorize('society_admin', 'platform_admin'), deleteAnnouncement);

// Notifications
notificationRouter.use(authenticate);
notificationRouter.get('/', getNotifications);
notificationRouter.get('/unread-count', getUnreadCount);
notificationRouter.post('/mark-read', markNotificationsRead);
notificationRouter.delete('/:id', deleteNotification);

module.exports = { announcementRouter, notificationRouter };