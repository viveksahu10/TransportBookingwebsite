const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// WhatsApp Notification Service Load Karein
const { notifyBookingStatus } = require('./services/whatsappService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (used for Admin Panel login)
app.use(session({
    secret: process.env.SESSION_SECRET || 'sahu-transport-secret-key-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 8 // 8 hours
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// MySQL Connection Pool
const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,

    ssl: {
        rejectUnauthorized: false
    }
});

// Test Database Connection
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Database connection failed:");
        console.error(err);
    } else {
        console.log("✅ Connected to Aiven MySQL Database");
        connection.release();
        setupDatabase();
    }
});

// ===================================================================
// DATABASE SETUP (creates tables if they don't exist + seeds admin)
// ===================================================================
function setupDatabase() {
    // Make sure bookings table has the columns the admin panel needs
    const createBookingsTable = `
        CREATE TABLE IF NOT EXISTS bookings (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            phone VARCHAR(50) NOT NULL,
            pickup_location VARCHAR(255) NOT NULL,
            dropoff_location VARCHAR(255) NOT NULL,
            vehicle_type VARCHAR(100) NOT NULL,
            booking_date DATE NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createAdminTable = `
        CREATE TABLE IF NOT EXISTS admin_users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `;

    db.query(createBookingsTable, (err) => {
        if (err) console.error("❌ Error creating bookings table:", err);
    });

    db.query(createAdminTable, (err) => {
        if (err) {
            console.error("❌ Error creating admin_users table:", err);
            return;
        }

        // Seed a default admin if no admin exists yet
        db.query('SELECT COUNT(*) AS count FROM admin_users', (err, results) => {
            if (err) return console.error("❌ Error checking admin_users:", err);

            if (results[0].count === 0) {
                const defaultUsername = process.env.ADMIN_USERNAME || 'admin';
                const defaultPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
                const hash = bcrypt.hashSync(defaultPassword, 10);

                db.query(
                    'INSERT INTO admin_users (username, password_hash) VALUES (?, ?)',
                    [defaultUsername, hash],
                    (err) => {
                        if (err) return console.error("❌ Error seeding admin user:", err);
                        console.log(`✅ Default admin created -> username: "${defaultUsername}", password: "${defaultPassword}"`);
                        console.log("⚠️  Please log in and change this password immediately.");
                    }
                );
            }
        });
    });
}

// ===================================================================
// AUTH MIDDLEWARE
// ===================================================================
function requireAdminAuth(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.status(401).json({ success: false, message: "Unauthorized. Please log in." });
}

function requireAdminPage(req, res, next) {
    if (req.session && req.session.isAdmin) {
        return next();
    }
    return res.redirect('/admin/login.html');
}

// Home Route
app.get("/", (req, res) => {
    res.send("Server is running...");
});

// Booking API (Form Submission + Complete WhatsApp Notification)
app.post("/api/bookings", (req, res) => {
    const {
        customer_name,
        email,
        phone,
        pickup_location,
        dropoff_location,
        vehicle_type,
        booking_date
    } = req.body;

    if (
        !customer_name ||
        !email ||
        !phone ||
        !pickup_location ||
        !dropoff_location ||
        !vehicle_type ||
        !booking_date
    ) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    const sql = `
    INSERT INTO bookings
    (
        customer_name,
        email,
        phone,
        pickup_location,
        dropoff_location,
        vehicle_type,
        booking_date
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
        sql,
        [
            customer_name,
            email,
            phone,
            pickup_location,
            dropoff_location,
            vehicle_type,
            booking_date
        ],
        async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({
                    success: false,
                    message: "Database Error"
                });
            }

            const newBookingId = result.insertId;

            // 🔔 Customer ke saare details WhatsApp notification me bhejein
            try {
                await notifyBookingStatus({
                    bookingId: newBookingId,
                    customerName: customer_name,
                    email: email,
                    customerPhone: phone,
                    pickupLocation: pickup_location,
                    dropoffLocation: dropoff_location,
                    vehicleType: vehicle_type,
                    bookingDate: booking_date,
                    status: 'Pending'
                });
            } catch (notifyErr) {
                console.error("WhatsApp Notification Error:", notifyErr);
            }

            res.status(201).json({
                success: true,
                message: "Booking Submitted Successfully",
                bookingId: newBookingId
            });
        }
    );
});

// ===================================================================
// ADMIN PANEL ROUTES
// ===================================================================

// Serve the protected dashboard page only if logged in
app.get('/admin/dashboard.html', requireAdminPage, (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-views', 'dashboard.html'));
});

app.get('/admin', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.redirect('/admin/dashboard.html');
    }
    res.redirect('/admin/login.html');
});

// Admin Login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ success: false, message: "Username and password are required." });
    }

    db.query('SELECT * FROM admin_users WHERE username = ?', [username], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Server error." });
        }

        if (results.length === 0) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        const admin = results[0];
        const isMatch = bcrypt.compareSync(password, admin.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Invalid username or password." });
        }

        req.session.isAdmin = true;
        req.session.username = admin.username;

        res.json({ success: true, message: "Login successful.", username: admin.username });
    });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
    req.session.destroy(() => {
        res.clearCookie('connect.sid');
        res.json({ success: true, message: "Logged out." });
    });
});

// Check current session status (used by dashboard page on load)
app.get('/api/admin/session', (req, res) => {
    if (req.session && req.session.isAdmin) {
        return res.json({ loggedIn: true, username: req.session.username });
    }
    res.json({ loggedIn: false });
});

// Get all bookings (with optional status filter + search)
app.get('/api/admin/bookings', requireAdminAuth, (req, res) => {
    const { status, search } = req.query;

    let sql = 'SELECT * FROM bookings WHERE 1=1';
    const params = [];

    if (status && status !== 'All') {
        sql += ' AND status = ?';
        params.push(status);
    }

    if (search) {
        sql += ' AND (customer_name LIKE ? OR phone LIKE ? OR email LIKE ? OR pickup_location LIKE ? OR dropoff_location LIKE ?)';
        const term = `%${search}%`;
        params.push(term, term, term, term, term);
    }

    sql += ' ORDER BY created_at DESC';

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, bookings: results });
    });
});

// Get booking stats for dashboard cards
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
    const sql = `
        SELECT
            COUNT(*) AS total,
            SUM(status = 'Pending') AS pending,
            SUM(status = 'Confirmed') AS confirmed,
            SUM(status = 'Completed') AS completed,
            SUM(status = 'Cancelled') AS cancelled
        FROM bookings
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        res.json({ success: true, stats: results[0] });
    });
});

// Update booking status & Send WhatsApp Notification with Full Details
app.patch('/api/admin/bookings/:id/status', requireAdminAuth, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const allowedStatuses = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];

    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    // Existing booking detail fetch karein
    db.query('SELECT * FROM bookings WHERE id = ?', [id], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error." });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }

        const booking = results[0];

        // Status Database me update karein
        db.query('UPDATE bookings SET status = ? WHERE id = ?', [status, id], async (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: "Database error." });
            }

            // WhatsApp Notification Bhejna (Saari details ke saath)
            try {
                await notifyBookingStatus({
                    bookingId: booking.id,
                    customerName: booking.customer_name,
                    email: booking.email,
                    customerPhone: booking.phone,
                    pickupLocation: booking.pickup_location,
                    dropoffLocation: booking.dropoff_location,
                    vehicleType: booking.vehicle_type,
                    bookingDate: booking.booking_date,
                    status: status
                });
            } catch (notifyErr) {
                console.error("WhatsApp Notification Error:", notifyErr);
            }

            res.json({ 
                success: true, 
                message: "Status updated successfully and WhatsApp notification sent." 
            });
        });
    });
});

// Delete a booking
app.delete('/api/admin/bookings/:id', requireAdminAuth, (req, res) => {
    const { id } = req.params;

    db.query('DELETE FROM bookings WHERE id = ?', [id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Database error." });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Booking not found." });
        }
        res.json({ success: true, message: "Booking deleted." });
    });
});

// Change admin password
app.post('/api/admin/change-password', requireAdminAuth, (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: "Both current and new password are required." });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: "New password must be at least 6 characters." });
    }

    db.query('SELECT * FROM admin_users WHERE username = ?', [req.session.username], (err, results) => {
        if (err || results.length === 0) {
            return res.status(500).json({ success: false, message: "Server error." });
        }

        const admin = results[0];
        if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        const newHash = bcrypt.hashSync(newPassword, 10);
        db.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, admin.id], (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Database error." });
            }
            res.json({ success: true, message: "Password changed successfully." });
        });
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});