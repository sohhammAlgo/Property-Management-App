const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_PORT === '465',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
    try {
        const t = getTransporter();
        const info = await t.sendMail({
            from: `"Society Management" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
            text,
        });
        console.log('Email sent:', info.messageId);
        return info;
    } catch (err) {
        console.error('Email error:', err.message);
        // Don't throw — email failures shouldn't break the main flow
    }
};

// Email templates
const emailTemplates = {
    complaintRaised: (resident, complaint) => ({
        subject: `Complaint Raised: ${complaint.title}`,
        html: `
      <h2>Your complaint has been received</h2>
      <p>Dear ${resident.name},</p>
      <p>Your complaint has been successfully registered.</p>
      <table>
        <tr><td><strong>Title:</strong></td><td>${complaint.title}</td></tr>
        <tr><td><strong>Category:</strong></td><td>${complaint.category}</td></tr>
        <tr><td><strong>Priority:</strong></td><td>${complaint.priority}</td></tr>
        <tr><td><strong>Status:</strong></td><td>${complaint.status}</td></tr>
      </table>
      <p>We will update you on the progress.</p>
    `,
    }),

    complaintStatusUpdate: (resident, complaint) => ({
        subject: `Complaint Update: ${complaint.title}`,
        html: `
      <h2>Your complaint status has been updated</h2>
      <p>Dear ${resident.name},</p>
      <p>Complaint <strong>${complaint.title}</strong> status is now: <strong>${complaint.status}</strong></p>
      ${complaint.resolution_note ? `<p>Note: ${complaint.resolution_note}</p>` : ''}
    `,
    }),

    paymentConfirmation: (user, payment) => ({
        subject: 'Payment Confirmation',
        html: `
      <h2>Payment Successful</h2>
      <p>Dear ${user.name},</p>
      <p>Your payment of <strong>₹${payment.amount}</strong> has been confirmed.</p>
      <p>Payment ID: ${payment.gateway_payment_id}</p>
    `,
    }),

    bookingConfirmation: (user, booking, amenity) => ({
        subject: `Booking Confirmed: ${amenity.name}`,
        html: `
      <h2>Booking Confirmation</h2>
      <p>Dear ${user.name},</p>
      <p>Your booking for <strong>${amenity.name}</strong> has been confirmed.</p>
      <p>Date: ${new Date(booking.booking_date).toLocaleDateString()}</p>
      <p>Time: ${new Date(booking.start_time).toLocaleTimeString()} - ${new Date(booking.end_time).toLocaleTimeString()}</p>
    `,
    }),

    welcome: (user) => ({
        subject: 'Welcome to Society Management',
        html: `
      <h2>Welcome, ${user.name}!</h2>
      <p>Your account has been successfully created.</p>
      <p>You can now access your society management portal.</p>
    `,
    }),
};

module.exports = { sendEmail, emailTemplates };