const nodemailer = require('nodemailer');
require('dotenv').config();

// Port 465 Direct SSL Setup (Fixes Render Connection Timeout)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL ke liye True rakhein
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  pool: true,
  maxConnections: 3,
  connectionTimeout: 10000, // 10 seconds timeout limit
  greetingTimeout: 5000,
  socketTimeout: 10000
});

// Transporter Connection Verify Code (Logs me check karne ke liye)
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Nodemailer Verification Error:', error.message);
  } else {
    console.log('✅ Gmail SMTP Server is ready to send emails!');
  }
});

// Notification Dispatcher Function
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

  const mailOptions = {
    from: `"Sahu Transport" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Booking Update #${bookingId} - Sahu Transport`,
    html: `
      <h2>Hello ${customerName},</h2>
      <p>Your booking status is now: <strong>${status}</strong></p>
      <ul>
        <li><strong>Booking ID:</strong> #${bookingId}</li>
        <li><strong>Pickup:</strong> ${pickupLocation}</li>
        <li><strong>Dropoff:</strong> ${dropoffLocation}</li>
        <li><strong>Vehicle:</strong> ${vehicleType}</li>
        <li><strong>Date:</strong> ${bookingDate}</li>
      </ul>
    `
  };

  const adminMailOptions = {
    from: `"Sahu Transport System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
    subject: `🔔 New Booking Alert #${bookingId} [${status}]`,
    html: `
      <h2>New Booking Details</h2>
      <p><strong>Customer:</strong> ${customerName} (${customerPhone})</p>
      <p><strong>Status:</strong> ${status}</p>
    `
  };

  return Promise.all([
    transporter.sendMail(mailOptions),
    transporter.sendMail(adminMailOptions)
  ]);
}

function getQrRoute(req, res) {
  res.send("<h3>Nodemailer Email Service Active</h3>");
}

module.exports = {
  notifyBookingStatus,
  getQrRoute
};