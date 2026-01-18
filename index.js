// Load environment variables first
require('dotenv').config();

// Configure Puppeteer for serverless deployment
process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'true';

// Global error handlers to capture and log uncaught errors during startup
process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err && err.stack ? err.stack : err);
});
const express = require('express');
const mongoose = require('mongoose');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
const logger = require('./utils/logger');

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

// Security middleware
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

// Apply basic security headers
if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
} else {
    // In development, skip helmet to avoid CSP issues
    console.log('🚧 Development mode: Skipping helmet for easier debugging');
}
// Enable CORS only when explicitly enabled via env
if (process.env.ENABLE_CORS === 'true') {
    app.use(cors());
}

// Basic rate limiter
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 100,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use(limiter);

// Request logging middleware
app.use(logger.requestLogger);

// Sessions (for admin auth). Use SESSION_SECRET in .env
const session = require('express-session');
app.use(session({
    secret: process.env.SESSION_SECRET || 'devsecret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// Health endpoint for load-balancers / probes
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Optional Prometheus metrics endpoint (enable with ENABLE_METRICS=true)
if (process.env.ENABLE_METRICS === 'true') {
    try {
        const client = require('prom-client');
        // collect node defaults
        client.collectDefaultMetrics();

        // HTTP request duration histogram
        const httpRequestDuration = new client.Histogram({
            name: 'http_request_duration_seconds',
            help: 'Duration of HTTP requests in seconds',
            labelNames: ['method', 'route', 'status'],
            buckets: [0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5]
        });

        // observe all requests
        app.use((req, res, next) => {
            const end = httpRequestDuration.startTimer();
            res.on('finish', () => {
                httpRequestDuration.labels(req.method, req.route ? req.route.path : req.path, String(res.statusCode)).observe(end());
            });
            next();
        });

        app.get('/metrics', async (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(await client.register.metrics());
        });
    } catch (err) {
        logger.warn('prom-client not installed; /metrics not available');
    }
}

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

// Documents routes (public download flow for ID card / joining letter)
app.use('/documents', require('./routes/documents'));

// Connect to MongoDB if MONGO_URI is provided
if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        logger.info('Connected to MongoDB Atlas');
    }).catch(err => {
        logger.error('MongoDB connection error: %o', err);
        logger.warn('Starting without DB');
    });
} else {
    logger.warn('No MONGO_URI provided - starting without database');
}

// Start the server only when running directly (prevents tests from starting a second server)
const PORT = process.env.PORT || 5000;
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}

module.exports = app;
