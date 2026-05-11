const { query, getClient } = require('../config/database');
const { createNotification, notifyAdmins } = require('../services/notificationService');
const { sendEmail, emailTemplates } = require('../utils/email');
const { AppError } = require('../utils/appError');
const { sendSuccess, sendPaginated, getPaginationParams } = require('../utils/response');

// ────────────────────────── AMENITY MANAGEMENT ──────────────────────────

/// POST /api/amenities
// Admin creates a new amenity
const createAmenity = async (req, res) => {
    const {
        name, description, capacity, pricePerSlot,
        slotDurationMinutes, availableFrom, availableUntil, availableDays,
    } = req.body;
    const tenantId = req.user.tenant_id;

    const result = await query(
        `INSERT INTO amenities
      (tenant_id, name, description, capacity, price_per_slot, slot_duration_minutes,
       available_from, available_until, available_days)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [tenantId, name, description, capacity || 1, pricePerSlot || 0,
            slotDurationMinutes || 60, availableFrom || '06:00', availableUntil || '22:00',
            availableDays || [1, 2, 3, 4, 5, 6, 7]]
    );

    sendSuccess(res, { amenity: result.rows[0] }, 'Amenity created', 201);
};

// GET /api/amenities
// Get list of amenities for the tenant
const getAmenities = async (req, res) => {
    const tenantId = req.user.tenant_id;

    const result = await query(
        'SELECT * FROM amenities WHERE tenant_id = $1 AND is_active = true ORDER BY name',
        [tenantId]
    );

    sendSuccess(res, { amenities: result.rows });
};

/// GET /api/amenities/:id/available-slots
// Get available time slots for a given date
const getAvailableSlots = async (req, res) => {
    const { id } = req.params;
    const { date } = req.query; // YYYY-MM-DD

    if (!date) throw new AppError('Date is required', 400);

    const amenityResult = await query('SELECT * FROM amenities WHERE id = $1', [id]);
    if (amenityResult.rows.length === 0) throw new AppError('Amenity not found', 404);
    const amenity = amenityResult.rows[0];

    // Get existing bookings for this date
    const existingBookings = await query(
        `SELECT start_time, end_time FROM bookings
     WHERE amenity_id = $1 AND booking_date = $2 AND status IN ('approved', 'pending')`,
        [id, date]
    );

    // Generate slots
    const slots = generateTimeSlots(
        date,
        amenity.available_from,
        amenity.available_until,
        amenity.slot_duration_minutes,
        amenity.capacity,
        existingBookings.rows
    );

    sendSuccess(res, { slots, amenity: { id: amenity.id, name: amenity.name } });
};

const generateTimeSlots = (date, from, until, durationMins, capacity, existingBookings) => {
    const slots = [];
    const [fromH, fromM] = from.split(':').map(Number);
    const [untilH, untilM] = until.split(':').map(Number);

    let current = new Date(`${date}T${from}:00`);
    const end = new Date(`${date}T${until}:00`);

    while (current < end) {
        const slotEnd = new Date(current.getTime() + durationMins * 60000);
        if (slotEnd > end) break;

        // Count bookings overlapping this slot
        const overlapping = existingBookings.filter((b) => {
            const bStart = new Date(b.start_time);
            const bEnd = new Date(b.end_time);
            return bStart < slotEnd && bEnd > current;
        }).length;

        slots.push({
            startTime: current.toISOString(),
            endTime: slotEnd.toISOString(),
            available: overlapping < capacity,
            spotsLeft: Math.max(0, capacity - overlapping),
        });

        current = slotEnd;
    }

    return slots;
};

// ────────────────────────── BOOKING MANAGEMENT ──────────────────────────

// POST /api/bookings
// Resident creates a booking request
const createBooking = async (req, res) => {
    const { amenityId, bookingDate, startTime, endTime, notes } = req.body;
    const { id: userId, tenant_id: tenantId } = req.user;

    if (!tenantId) throw new AppError('You must be part of a society', 400);

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Lock amenity row for this check
        const amenityResult = await client.query(
            'SELECT * FROM amenities WHERE id = $1 AND tenant_id = $2 AND is_active = true FOR UPDATE',
            [amenityId, tenantId]
        );
        if (amenityResult.rows.length === 0) throw new AppError('Amenity not found', 404);
        const amenity = amenityResult.rows[0];

        // Check for conflicts
        const conflict = await client.query(
            `SELECT id FROM bookings
       WHERE amenity_id = $1 AND status IN ('approved', 'pending')
         AND NOT (end_time <= $2 OR start_time >= $3)`,
            [amenityId, startTime, endTime]
        );

        if (conflict.rows.length >= amenity.capacity) {
            throw new AppError('This time slot is fully booked', 409);
        }

        // Check user doesn't have conflicting booking
        const userConflict = await client.query(
            `SELECT id FROM bookings
       WHERE user_id = $1 AND status IN ('approved', 'pending')
         AND NOT (end_time <= $2 OR start_time >= $3)`,
            [userId, startTime, endTime]
        );
        if (userConflict.rows.length > 0) {
            throw new AppError('You have a conflicting booking', 409);
        }

        const result = await client.query(
            `INSERT INTO bookings (user_id, tenant_id, amenity_id, booking_date, start_time, end_time, notes, amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [userId, tenantId, amenityId, bookingDate, startTime, endTime, notes, amenity.price_per_slot]
        );

        await client.query('COMMIT');
        const booking = result.rows[0];

        // Notify admins
        await notifyAdmins({
            tenantId,
            title: 'New Booking Request',
            message: `${req.user.name} requested ${amenity.name} on ${bookingDate}`,
            type: 'booking_new',
            referenceId: booking.id,
            referenceType: 'booking',
        });

        sendSuccess(res, { booking }, 'Booking request submitted', 201);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
};

// GET /api/bookings
// Get bookings for the user (residents see their own, admins see all)
const getBookings = async (req, res) => {
    const { page, limit, offset } = getPaginationParams(req.query);
    const { status, amenityId, date } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (req.user.role === 'resident') {
        paramCount++;
        whereClause += ` AND b.user_id = $${paramCount}`;
        params.push(req.user.id);
    } else {
        paramCount++;
        whereClause += ` AND b.tenant_id = $${paramCount}`;
        params.push(req.user.tenant_id);
    }

    if (status) {
        paramCount++;
        whereClause += ` AND b.status = $${paramCount}`;
        params.push(status);
    }

    if (amenityId) {
        paramCount++;
        whereClause += ` AND b.amenity_id = $${paramCount}`;
        params.push(amenityId);
    }

    if (date) {
        paramCount++;
        whereClause += ` AND b.booking_date = $${paramCount}`;
        params.push(date);
    }

    const countResult = await query(`SELECT COUNT(*) FROM bookings b ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
        `SELECT b.*, a.name as amenity_name, u.name as user_name, u.flat_number, u.block
     FROM bookings b
     LEFT JOIN amenities a ON b.amenity_id = a.id
     LEFT JOIN users u ON b.user_id = u.id
     ${whereClause}
     ORDER BY b.start_time DESC
     LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`,
        [...params, limit, offset]
    );

    sendPaginated(res, result.rows, total, page, limit);
};

// PUT /api/bookings/:id/status
// Admin approves or rejects a booking
const updateBookingStatus = async (req, res) => {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
        throw new AppError('Status must be approved or rejected', 400);
    }

    const bookingResult = await query(
        'SELECT b.*, a.name as amenity_name FROM bookings b LEFT JOIN amenities a ON b.amenity_id = a.id WHERE b.id = $1 AND b.tenant_id = $2',
        [id, req.user.tenant_id]
    );

    if (bookingResult.rows.length === 0) throw new AppError('Booking not found', 404);
    const booking = bookingResult.rows[0];

    const result = await query(
        `UPDATE bookings SET
      status = $1,
      approved_by = $2,
      approved_at = NOW(),
      rejection_reason = $3
     WHERE id = $4 RETURNING *`,
        [status, req.user.id, rejectionReason || null, id]
    );

    // Notify resident
    await createNotification({
        userId: booking.user_id,
        tenantId: booking.tenant_id,
        title: `Booking ${status === 'approved' ? 'Confirmed ✅' : 'Rejected ❌'}`,
        message: `Your booking for ${booking.amenity_name} has been ${status}`,
        type: `booking_${status}`,
        referenceId: id,
        referenceType: 'booking',
    });

    sendSuccess(res, { booking: result.rows[0] }, `Booking ${status} successfully`);
};

// DELETE /api/bookings/:id
// Resident cancels their booking, Admin can cancel any booking
const cancelBooking = async (req, res) => {
    const { id } = req.params;

    let whereClause = 'id = $1';
    const params = [id];

    if (req.user.role === 'resident') {
        whereClause += ' AND user_id = $2 AND status = $3';
        params.push(req.user.id, 'pending');
    } else {
        whereClause += ' AND tenant_id = $2';
        params.push(req.user.tenant_id);
    }

    const result = await query(
        `UPDATE bookings SET status = 'cancelled' WHERE ${whereClause} RETURNING *`,
        params
    );

    if (result.rows.length === 0) throw new AppError('Booking not found or cannot be cancelled', 404);

    sendSuccess(res, {}, 'Booking cancelled');
};

module.exports = {
    createAmenity,
    getAmenities,
    getAvailableSlots,
    createBooking,
    getBookings,
    updateBookingStatus,
    cancelBooking,
};