const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeImage = require('qrcode');
const path = require('path');
require('dotenv').config();

let latestQrBase64 = ''; 
let isClientReady = false; 

// Memory-Optimized Puppeteer Config for Render Free Tier
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
    '--no-zygote',
    '--single-process',
    '--js-flags="--max-old-space-size=128"',
    '--renderer-process-limit=1'
  ]
};

if (process.env.PUPPETEER_EXECUTABLE_PATH) {
  puppeteerConfig.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
}

const client = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, '..', 'whatsapp-auth') }),
  puppeteer: puppeteerConfig
});

client.on('qr', async (qr) => {
  isClientReady = false;
  try {
    latestQrBase64 = await qrcodeImage.toDataURL(qr);
    console.log('⚡ NEW QR CODE GENERATED! Open /qr in browser.');
  } catch (err) {
    console.error('❌ QR Generation Error:', err);
  }
});

client.on('ready', () => {
  isClientReady = true;
  latestQrBase64 = ''; 
  console.log('✅ WHATSAPP CLIENT READY & CONNECTED!');
});

client.on('auth_failure', (msg) => {
  isClientReady = false;
  console.error('❌ AUTH FAILURE:', msg);
});

client.on('disconnected', async (reason) => {
  isClientReady = false;
  console.log('⚠️ Disconnected:', reason);
  try {
    await client.initialize();
  } catch (err) {
    console.error('❌ Re-init failed:', err.message);
  }
});

(async () => {
  try {
    await client.initialize();
  } catch (err) {
    console.error('❌ FATAL Init Error:', err.message);
  }
})();

async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    if (!isClientReady || !phoneNumber) return false;

    let cleanedNumber = phoneNumber.toString().replace(/[^0-9]/g, '');
    if (cleanedNumber.length === 10) cleanedNumber = '91' + cleanedNumber;

    const numberDetails = await client.getNumberId(cleanedNumber);
    if (!numberDetails) {
      console.error(`❌ Number ${cleanedNumber} not on WhatsApp.`);
      return false;
    }

    await client.sendMessage(numberDetails._serialized, message);
    console.log(`✅ Message Sent to: ${cleanedNumber}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending to ${phoneNumber}:`, error.message);
    return false;
  }
}

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

For Any Query Contact: ${adminPhone || 'N/A'}

Warm Regards,
Sahu Transport & Logistics🚛`;

  if (customerPhone) await sendWhatsAppMessage(customerPhone, customerMsg);
  if (adminPhone) await sendWhatsAppMessage(adminPhone, adminMsg);
}

function getQrRoute(req, res) {
  if (isClientReady) {
    return res.send('<h2 style="color:green;text-align:center;margin-top:50px;">✅ WhatsApp Client Connected!</h2>');
  }

  if (!latestQrBase64) {
    return res.send('<h2 style="text-align:center;margin-top:50px;">⏳ QR Code loading... Refresh in 5s.</h2>');
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>WhatsApp QR Scan</title>
        <meta http-equiv="refresh" content="10">
        <style>
          body { display:flex; justify-content:center; align-items:center; min-height:80vh; font-family:sans-serif; background:#f4f6f8; }
          .card { background:#fff; padding:30px; border-radius:12px; text-align:center; box-shadow:0 4px 12px rgba(0,0,0,0.1); }
          img { border:4px solid #25D366; border-radius:8px; margin:15px 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>Scan with WhatsApp</h2>
          <img src="${latestQrBase64}" width="280" height="280" alt="QR Code" />
          <p style="color:#666;font-size:14px;">Auto-refreshes every 10 seconds</p>
        </div>
      </body>
    </html>
  `);
}

module.exports = { notifyBookingStatus, sendWhatsAppMessage, getQrRoute };