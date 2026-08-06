const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const qrcodeImage = require('qrcode'); // Browser QR rendering ke liye
require('dotenv').config();

let latestQrBase64 = ''; // Base64 image store karne ke liye variable

const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/google-chrome';

const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './whatsapp-auth'
  }),
  puppeteer: {
    headless: true,
    executablePath: require('fs').existsSync(executablePath) ? executablePath : undefined,
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

client.on('qr', async (qr) => {
  console.log('\n---------------------------------------------------');
  console.log('Niche diye gaye QR Code ko apne WhatsApp se Scan karein:');
  console.log('---------------------------------------------------\n');
  qrcodeTerminal.generate(qr, { small: true });

  // Browser me dikhane ke liye Base64 Data URL generate kar rahe hain
  try {
    latestQrBase64 = await qrcodeImage.toDataURL(qr);
  } catch (err) {
    console.error('QR Image Generation Error:', err);
  }
});

client.on('ready', () => {
  console.log('✅ WhatsApp Web Client Safaltapoorvak Connect Ho Gaya!');
  latestQrBase64 = ''; // Connect hone par QR clear kar dein
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

// Helper function to handle Web Express QR Route
function getQrRoute(req, res) {
  if (!latestQrBase64) {
    return res.send(`
      <div style="text-align:center; font-family:sans-serif; margin-top:50px;">
        <h2>WhatsApp Client already connected OR QR Code loading...</h2>
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