const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeImage = require('qrcode'); // Browser QR rendering ke liye
const fs = require('fs');
require('dotenv').config();

let latestQrBase64 = ''; // Base64 image store karne ke liye variable
let isClientReady = false; // State tracking for readiness

console.log('🚀 Initializing WhatsApp Web Service...');

// Executable Path Handler
const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
const defaultPath = '/usr/bin/google-chrome-stable';
const systemChromePath = envPath || defaultPath;

const puppeteerConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process', // Crucial for Render Free Tier RAM limits
    '--disable-gpu'
  ]
};

if (fs.existsSync(systemChromePath)) {
  console.log(`✅ Using Chrome binary at: ${systemChromePath}`);
  puppeteerConfig.executablePath = systemChromePath;
} else {
  console.log(`⚠️ Chrome executable not found at "${systemChromePath}". Falling back to Puppeteer default Chromium.`);
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-auth'
  }),
  puppeteer: puppeteerConfig
});

// QR Code Event
client.on('qr', async (qr) => {
  isClientReady = false;
  console.log('\n===================================================');
  console.log('⚡ NEW QR CODE GENERATED! Open /qr in browser to scan.');
  console.log('===================================================\n');

  // Browser me dikhane ke liye Base64 Data URL generate kar rahe hain
  try {
    latestQrBase64 = await qrcodeImage.toDataURL(qr);
    console.log('✅ QR Image converted to Base64 successfully!');
  } catch (err) {
    console.error('❌ QR Image Generation Error:', err);
  }
});

// Client Ready Event
client.on('ready', () => {
  isClientReady = true;
  latestQrBase64 = ''; // Connect hone par QR clear kar dein
  console.log('\n===================================================');
  console.log('✅ WHATSAPP WEB CLIENT SAFALTAPOORVAK CONNECT HO GAYA!');
  console.log('===================================================\n');
});

// Authentication Status Logs
client.on('authenticated', () => {
  console.log('🔑 WhatsApp Authentication Successful!');
});

client.on('auth_failure', (msg) => {
  isClientReady = false;
  console.error('❌ AUTHENTICATION FAILURE:', msg);
});

client.on('disconnected', (reason) => {
  isClientReady = false;
  console.log('⚠️ WhatsApp Client Disconnected:', reason);
});

// Client Initialize Call with Catch Block
console.log('🔄 Launching client.initialize()...');
client.initialize().then(() => {
  console.log('👍 client.initialize() triggered successfully.');
}).catch((err) => {
  console.error('❌ FATAL: client.initialize() crashed:', err);
});

// WhatsApp Message Sender Function
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!isClientReady) {
      console.error(`❌ Message not sent to ${phoneNumber}: WhatsApp Client is NOT READY yet.`);
      return false;
    }

    if (!phoneNumber) {
      console.error('❌ Message Error: Phone number is missing.');
      return false;
    }

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

// Helper function to handle Web Express QR Route
function getQrRoute(req, res) {
  if (isClientReady) {
    return res.send(`
      <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h2 style="color: green;">✅ WhatsApp Client is already Connected & Active!</h2>
      </div>
    `);
  }

  if (!latestQrBase64) {
    return res.send(`
      <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h2>⏳ QR Code loading or regenerating...</h2>
        <p>Please refresh in 5 seconds.</p>
      </div>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp Web QR Scan</title>
        <meta http-equiv="refresh" content="15">
        <style>
          body { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; font-family: sans-serif; background-color: #f4f6f8; }
          .card { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; }
          img { border: 4px solid #25D366; border-radius: 8px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Scan with WhatsApp</h2>
          <img src="${latestQrBase64}" width="280" height="280" alt="WhatsApp QR Code" />
          <p style="color: #666; font-size: 14px;">This page auto-refreshes every 15 seconds.</p>
        </div>
      </body>
    </html>
  `);
}

module.exports = { notifyBookingStatus, sendWhatsAppMessage, getQrRoute };