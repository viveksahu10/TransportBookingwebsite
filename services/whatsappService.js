const nodemailer = require('nodemailer');
require('dotenv').config();

// Gmail SMTP Transporter with SSL
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  pool: true,             // Connections reuse karne ke liye
  maxConnections: 3,
  maxMessages: 100,
  connectionTimeout: 10000 // 10 sec timeout limit
});

// Transporter Verify Function (Server startup testing)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer Transporter Error:', error.message);
  } else {
    console.log('✅ Gmail SMTP Server is ready to send emails!');
  }
});

// Main Notification Function
async function notifyBookingStatus(bookingData) {
  const {
    bookingId,
    customerName,
    email,
    customerPhone,
    pickupLocation,
    dropoffLocation,
    vehicleType,
    bookingDate,
    status
  } = bookingData;

  // 1. Email to Customer
  const customerMailOptions = {
    from: `"Sahu Transport" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Update #${bookingId} - Sahu Transport`,
    html: `
      <h2>Hello ${customerName},</h2>
      <p>Your booking status is now: <strong>${status}</strong></p>
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Booking ID:</strong> #${bookingId}</li>
        <li><strong>Pickup Location:</strong> ${pickupLocation}</li>
        <li><strong>Dropoff Location:</strong> ${dropoffLocation}</li>
        <li><strong>Vehicle:</strong> ${vehicleType}</li>
        <li><strong>Date:</strong> ${bookingDate}</li>
      </ul>
      <p>Thank you for choosing Sahu Transport!</p>
    `
  };

  // 2. Email Notification to Admin
  const adminMailOptions = {
    from: `"Sahu Transport System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: `🔔 New Booking/Status Alert #${bookingId} [${status}]`,
    html: `
      <h2>New Booking Notification</h2>
      <p><strong>Status:</strong> ${status}</p>
      <ul>
        <li><strong>Customer Name:</strong> ${customerName}</li>
        <li><strong>Phone:</strong> ${customerPhone}</li>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Pickup:</strong> ${pickupLocation}</li>
        <li><strong>Dropoff:</strong> ${dropoffLocation}</li>
        <li><strong>Vehicle:</strong> ${vehicleType}</li>
        <li><strong>Date:</strong> ${bookingDate}</li>
      </ul>
    `
  };

  // Parallel background email dispatch
  return Promise.all([
    transporter.sendMail(customerMailOptions),
    transporter.sendMail(adminMailOptions)
  ]);
}

// Dummy QR Route Handler (To prevent breaking server.js route)
function getQrRoute(req, res) {
  res.send("<h3>Nodemailer Email Service Active (WhatsApp QR Discontinued)</h3>");
}

module.exports = {
  notifyBookingStatus,
  getQrRoute
};