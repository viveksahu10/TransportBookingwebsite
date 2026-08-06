const nodemailer = require('nodemailer');
require('dotenv').config();

// Create Transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Send Mail Helper
async function sendEmailNotification(toEmail, subject, htmlContent) {
  try {
    if (!toEmail) {
      console.log('⚠️ Email skipped: Receiver email missing.');
      return false;
    }

    const mailOptions = {
      from: `"Sahu Transport" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: subject,
      html: htmlContent
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent successfully to ${toEmail} | MessageID: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`❌ Nodemailer Error for ${toEmail}:`, error.message);
    return false;
  }
}

// Booking Status Notification Handler
async function notifyBookingStatus(bookingData) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;

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

  const formattedDate = bookingDate ? new Date(bookingDate).toLocaleDateString('en-IN') : 'N/A';

  // Admin HTML Email Body
  const adminHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 20px; border-top: 4px solid #007bff;">
        <h2 style="color: #007bff;">🚛 NEW BOOKING RECEIVED</h2>
        <p><strong>Booking ID:</strong> #${bookingId}</p>
        <hr>
        <p><strong>Customer Name:</strong> ${customerName || 'N/A'}</p>
        <p><strong>Phone:</strong> ${customerPhone || 'N/A'}</p>
        <p><strong>Email:</strong> ${email || 'N/A'}</p>
        <hr>
        <p><strong>Pickup Location:</strong> ${pickupLocation || 'N/A'}</p>
        <p><strong>Drop-off Location:</strong> ${dropoffLocation || 'N/A'}</p>
        <p><strong>Vehicle:</strong> ${vehicleType || 'N/A'}</p>
        <p><strong>Date:</strong> ${formattedDate}</p>
        <p><strong>Status:</strong> <span style="color: orange;">${status || 'Pending'}</span></p>
      </div>
    </div>
  `;

  // Customer HTML Email Body
  const customerHtml = `
    <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f6f8;">
      <div style="max-width: 600px; margin: auto; background: white; border-radius: 8px; padding: 20px; border-top: 4px solid #28a745;">
        <h2 style="color: #28a745;">🎉 Booking Received Successfully!</h2>
        <p>Hello <strong>${customerName || 'Customer'}</strong>,</p>
        <p>Thank you for choosing Sahu Transport & Logistics. We have received your booking request.</p>
        <hr>
        <h3>📋 Booking Details:</h3>
        <p><strong>Booking ID:</strong> #${bookingId}</p>
        <p><strong>Pickup:</strong> ${pickupLocation || 'N/A'}</p>
        <p><strong>Drop-off:</strong> ${dropoffLocation || 'N/A'}</p>
        <p><strong>Vehicle:</strong> ${vehicleType || 'N/A'}</p>
        <p><strong>Booking Date:</strong> ${formattedDate}</p>
        <p><strong>Status:</strong> <span style="color: green;">${status || 'Pending'}</span></p>
        <hr>
        <p>Our team will contact you shortly to confirm details.</p>
        <p>Warm Regards,<br><strong>Sahu Transport & Logistics 🚛</strong></p>
      </div>
    </div>
  `;

  // Send Mails
  if (adminEmail) await sendEmailNotification(adminEmail, `New Booking #${bookingId} - Sahu Transport`, adminHtml);
  if (email) await sendEmailNotification(email, `Booking Confirmation #${bookingId} - Sahu Transport`, customerHtml);
}

// Dummy Route to prevent express route errors
function getQrRoute(req, res) {
  res.send('<h2 style="color:green;text-align:center;margin-top:50px;">✅ Gmail Nodemailer Service Active! (0% Server Load)</h2>');
}

module.exports = { notifyBookingStatus, sendEmailNotification, getQrRoute };