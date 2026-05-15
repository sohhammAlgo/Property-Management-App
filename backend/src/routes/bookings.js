const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
    createAmenity, getAmenities, getAvailableSlots,
    createBooking, getBookings, updateBookingStatus, cancelBooking,
} = require('../controllers/bookingController');
const {
    validate, createAmenitySchema, createBookingSchema, updateBookingStatusSchema,
} = require('../validators/schemas');

router.use(authenticate);

// Amenity management
router.post('/amenities', authorize('society_admin', 'platform_admin'), validate(createAmenitySchema), createAmenity);
router.get('/amenities', getAmenities);
router.get('/amenities/:id/slots', getAvailableSlots);

// Booking management
router.post('/', validate(createBookingSchema), createBooking);
router.get('/', getBookings);
router.patch('/:id/status', authorize('society_admin', 'platform_admin'), validate(updateBookingStatusSchema), updateBookingStatus);
router.delete('/:id', cancelBooking);

module.exports = router;