const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-auth'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

client.on('qr', (qr) => {
  console.log('\n---------------------------------------------------');
  console.log('Niche diye gaye QR Code ko apne WhatsApp se Scan karein:');
  console.log('---------------------------------------------------\n');
  qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
  console.log('✅ WhatsApp Web Client Safaltapoorvak Connect Ho Gaya!');
});

client.initialize();

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!phoneNumber) return false;

    let cleanedNumber = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (cleanedNumber.length === 10) {
      cleanedNumber = '91' + cleanedNumber;
    }

    const chatId = `${cleanedNumber}@c.us`;
    await client.sendMessage(chatId, message);
    console.log(`✅ WhatsApp Message Sent to: ${cleanedNumber}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending to ${phoneNumber}:`, error.message);
    return false;
  }
}

// Full Customer Data formatted Notification Function
async function notifyBookingStatus(bookingData) {
  const adminPhone = process.env.ADMIN_PHONE;

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

  // Formatting Date
  const formattedDate = bookingDate ? new Date(bookingDate).toLocaleDateString('en-IN') : 'N/A';

  // 1. Admin ke liye Complete Details Message
  const adminMsg = `*NEW BOOKING RECEIVED* 

🆔 *Booking ID:* #${bookingId}
👤 *Name:* ${customerName || 'N/A'}
📞 *Phone:* ${customerPhone || 'N/A'}
📧 *Email:* ${email || 'N/A'}

📍 *Pickup:* ${pickupLocation || 'N/A'}
🏁 *Drop-off:* ${dropoffLocation || 'N/A'}
🚚 *Vehicle:* ${vehicleType || 'N/A'}
📅 *Date:* ${formattedDate}
📌 *Status:* ${status || 'Pending'}`;

  // 2. Customer ke liye Confirmation Message
  const customerMsg = `🎉 *Booking Received!*

Hello ${customerName || 'Customer'},
We have successfully received your booking request! 🚛

📋 *Booking Summary:*

🆔 *Booking ID:* #${bookingId}
📍 *Pickup:* ${pickupLocation || 'N/A'}
🏁 *Drop-off:* ${dropoffLocation || 'N/A'}
🚚 *Vehicle:* ${vehicleType || 'N/A'}
📅 *Date:* ${formattedDate}
📌 *Status:* ${status || 'Pending'}

Our team will get in touch with you shortly to confirm your booking details. 
📞 For Any Query Contact: ${adminPhone || 'N/A'}

Warm Regards,

Sahu Transport & Logistics🚛`;

  // Messages send karein
  if (customerPhone) await sendWhatsAppMessage(customerPhone, customerMsg);
  if (adminPhone) await sendWhatsAppMessage(adminPhone, adminMsg);
}

module.exports = { notifyBookingStatus, sendWhatsAppMessage };