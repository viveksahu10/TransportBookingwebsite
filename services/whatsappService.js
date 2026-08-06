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

  // Free Resend domain par error se bachne ke liye mail aapki verified email ID par reroute hoga
  const targetEmail = process.env.ADMIN_EMAIL || 'viveksahu160305@gmail.com';

  try {
    // 1. Customer Booking Confirmation Mail
    await resend.emails.send({
      from: 'Sahu Transport <onboarding@resend.dev>',
      to: [targetEmail],
      subject: `Booking Update #${bookingId} - Sahu Transport`,
      html: `
        <h2>Hello ${customerName},</h2>
        <p>Your booking status is now: <strong>${status}</strong></p>
        <p><em>[Testing Mode: Customer Email (${email}) rerouted to Admin]</em></p>
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
    });

    // 2. Admin Alert Mail
    await resend.emails.send({
      from: 'Sahu Transport System <onboarding@resend.dev>',
      to: [targetEmail],
      subject: `🔔 New Booking Alert #${bookingId} [${status}]`,
      html: `
        <h2>New Booking Notification</h2>
        <p><strong>Customer Name:</strong> ${customerName}</p>
        <p><strong>Phone:</strong> ${customerPhone}</p>
        <p><strong>Customer Email:</strong> ${email}</p>
        <p><strong>Route:</strong> ${pickupLocation} ➡️ ${dropoffLocation}</p>
        <p><strong>Vehicle:</strong> ${vehicleType}</p>
        <p><strong>Date:</strong> ${bookingDate}</p>
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