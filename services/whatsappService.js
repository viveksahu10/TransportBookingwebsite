const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeImage = require('qrcode');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

let latestQrBase64 = ''; 
let isClientReady = false; 

console.log('🚀 Initializing WhatsApp Web Service...');

// Session Storage Path
const sessionDir = path.join(__dirname, '..', 'whatsapp-auth');

// Executable Path Handler
const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
const defaultPath = '/usr/bin/google-chrome-stable';
const systemChromePath = envPath || defaultPath;

// Render Optimized Puppeteer Configuration
const puppeteerConfig = {
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--memory-pressure-off'
  ]
};

if (fs.existsSync(systemChromePath)) {
  console.log(`✅ Using Chrome binary at: ${systemChromePath}`);
  puppeteerConfig.executablePath = systemChromePath;
} else {
  console.log(`⚠️ Chrome binary not found at "${systemChromePath}". Using default Puppeteer Chromium.`);
}

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: sessionDir
  }),
  puppeteer: puppeteerConfig
});

// Event: QR Code Received
client.on('qr', async (qr) => {
  isClientReady = false;
  console.log('\n===================================================');
  console.log('⚡ NEW QR CODE GENERATED! Open /qr in browser to scan.');
  console.log('===================================================\n');

  try {
    latestQrBase64 = await qrcodeImage.toDataURL(qr);
    console.log('✅ QR Image converted to Base64 successfully!');
  } catch (err) {
    console.error('❌ QR Image Generation Error:', err);
  }
});

// Event: Client Ready
client.on('ready', () => {
  isClientReady = true;
  latestQrBase64 = ''; 
  console.log('\n===================================================');
  console.log('✅ WHATSAPP WEB CLIENT SAFALTAPOORVAK CONNECT HO GAYA!');
  console.log('===================================================\n');
});

// Event: Authentication Successful
client.on('authenticated', () => {
  console.log('🔑 WhatsApp Authentication Successful!');
});

// Event: Authentication Failure
client.on('auth_failure', (msg) => {
  isClientReady = false;
  console.error('❌ AUTHENTICATION FAILURE:', msg);
});

// Event: Disconnected (Auto Re-initialize logic)
client.on('disconnected', async (reason) => {
  isClientReady = false;
  console.log('⚠️ WhatsApp Client Disconnected:', reason);
  console.log('🔄 Attempting to re-initialize WhatsApp client...');
  try {
    await client.initialize();
  } catch (err) {
    console.error('❌ Re-initialization failed:', err.message);
  }
});

// Initialize Service
async function startWhatsAppService() {
  console.log('🔄 Launching client.initialize()...');
  try {
    await client.initialize();
    console.log('👍 client.initialize() executed successfully.');
  } catch (err) {
    console.error('❌ FATAL: client.initialize() crashed:', err.message);
  }
}

startWhatsAppService();

// WhatsApp Message Sender Function (With Number Lookup Fix)
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

    // Clean number to digits only
    let cleanedNumber = phoneNumber.toString().replace(/[^0-9]/g, '');

    // Add country code 91 for Indian 10-digit numbers
    if (cleanedNumber.length === 10) {
      cleanedNumber = '91' + cleanedNumber;
    }

    // WhatsApp ID lookup verify
    const numberDetails = await client.getNumberId(cleanedNumber);

    if (!numberDetails) {
      console.error(`❌ Phone number ${cleanedNumber} is NOT registered on WhatsApp.`);
      return false;
    }

    // Official target WhatsApp ID (_serialized string)
    const targetJid = numberDetails._serialized;

    await client.sendMessage(targetJid, message);
    console.log(`✅ WhatsApp Message Sent to: ${cleanedNumber}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending to ${phoneNumber}:`, error.message);
    return false;
  }
}

// Booking Status Notification Handler
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

  const formattedDate = bookingDate ? new Date(bookingDate).toLocaleDateString('en-IN') : 'N/A';

  // Admin Notification
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

  // Customer Notification
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

  if (customerPhone) await sendWhatsAppMessage(customerPhone, customerMsg);
  if (adminPhone) await sendWhatsAppMessage(adminPhone, adminMsg);
}

// Express Endpoint Handler for /qr
function getQrRoute(req, res) {
  if (isClientReady) {
    return res.send(`
      <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h2 style="color: green;">✅ WhatsApp Client is active and connected!</h2>
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
        <meta http-equiv="refresh" content="10">
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
          <p style="color: #666; font-size: 14px;">This page auto-refreshes every 10 seconds.</p>
        </div>
      </body>
    </html>
  `);
}

module.exports = { notifyBookingStatus, sendWhatsAppMessage, getQrRoute };