// Configure Puppeteer for Render deployment
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';
process.env.PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser';

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');

const app = express();

// Set the view engine to ejs
app.set('view engine', 'ejs');

// Use express-ejs-layouts
app.use(expressLayouts);
app.set('views', path.join(__dirname, 'views')); // Set views directory

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

// === YE NAYI LINE ADD KI HAI ===
// Uploads folder ko bhi static serve karo (photos, documents, PDFs ke liye zaroori!)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// PDFs folder ko bhi static serve karo (joining letters ke liye)
app.use('/pdfs', express.static(path.join(__dirname, 'public/pdfs')));

// Middleware for parsing request bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sessions (for admin auth). Use SESSION_SECRET in .env
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// populate user middleware
const { populateUser } = require('./middleware/auth');
app.use(populateUser);

// Public routes (verification)
app.use('/', require('./routes/public'));

// Auth routes
app.use('/', require('./routes/auth'));

// Admin routes (user management, protected)
app.use('/admin', require('./routes/admin'));

// Pages routes (join form, home etc.)
app.use('/', require('./routes/pages'));

const PORT = process.env.PORT || 5000;

// Connect to MongoDB if MONGO_URI is provided
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log('✅ Connected to MongoDB Atlas');
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    }).catch(err => {
        console.error('❌ MongoDB connection error:', err);
        console.log(`⚠️ Starting server without DB on port ${PORT}`);
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    });
} else {
    console.log('⚠️ No MONGO_URI provided - starting without database');
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
    });
}