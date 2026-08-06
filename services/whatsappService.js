const { Resend } = require('resend');
require('dotenv').config();

const resend = new Resend(process.env.RESEND_API_KEY);

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

  try {
    // Customer Email
    await resend.emails.send({
      from: 'Sahu Transport <onboarding@resend.dev>', // Free default domain
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
    });

    // Admin Notification Email
    await resend.emails.send({
      from: 'Sahu Transport System <onboarding@resend.dev>',
      to: process.env.ADMIN_EMAIL || 'yourgmail@gmail.com',
      subject: `🔔 New Booking Alert #${bookingId} [${status}]`,
      html: `
        <h2>New Booking Notification</h2>
        <p><strong>Customer:</strong> ${customerName} (${customerPhone})</p>
        <p><strong>Status:</strong> ${status}</p>
        <p><strong>Pickup:</strong> ${pickupLocation} ➡️ <strong>Dropoff:</strong> ${dropoffLocation}</p>
      `
    });

    console.log('✅ Emails sent successfully via Resend API!');
  } catch (error) {
    console.error('❌ Resend API Error:', error.message);
  }
}

function getQrRoute(req, res) {
  res.send("<h3>Resend Email Service Active</h3>");
}

module.exports = {
  notifyBookingStatus,
  getQrRoute
};