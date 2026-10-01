require('dotenv').config();

// DNS Resolver configuration: Use custom DNS in local development (helps Windows resolve MongoDB Atlas SRV records)
if (!process.env.VERCEL) {
  try {
    const dns = require('dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch (e) {}
}

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Core Middleware
app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// URL Normalization Middleware for Vercel Serverless Rewrites
app.use((req, res, next) => {
  const orig = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.originalUrl;
  if (orig && (orig.startsWith('/api') || orig.startsWith('/auth') || orig.startsWith('/complaints') || orig.startsWith('/pickups') || orig.startsWith('/ai'))) {
    if (req.url === '/api' || req.url === '/' || req.url === '/api/' || req.url.startsWith('/api/index')) {
      req.url = orig;
    }
  }
  next();
});

const Complaint = require('./models/Complaint');
const Pickup = require('./models/Pickup');

// Seed default admin account if not already present
async function seedDefaults() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@prabhav.gov').toLowerCase();
    let existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
      await User.create({
        name: 'Chief Municipal Officer',
        email: adminEmail,
        password: hashedPassword,
        role: 'admin'
      });
      console.log(`✓ Admin account created: ${adminEmail}`);
    }
  } catch (err) {
    console.error('Data seed error:', err.message);
  }
}

// Default fallback Atlas URI in case environment variable is not yet configured in Vercel Dashboard
const DEFAULT_MONGO_URI = 'mongodb+srv://katiyark712_db_user:X1Q9uctS1X9uLmJh@hackthon.ucvremz.mongodb.net/?appName=Hackthon';

// Cached MongoDB Connection for Serverless (Vercel) & Traditional Node.js
let cachedPromise = null;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGO_URI || DEFAULT_MONGO_URI;

  if (!cachedPromise) {
    const opts = {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    };

    cachedPromise = mongoose.connect(mongoUri, opts)
      .then((conn) => {
        console.log('✓ Connected to MongoDB');
        // Run default seed non-blockingly so it doesn't hold up API requests
        seedDefaults().catch(e => console.warn('Non-fatal seed message:', e.message));
        return conn;
      })
      .catch((err) => {
        cachedPromise = null;
        console.error('MongoDB connection error:', err.message);
        throw new Error(
          err.message.includes('bad auth') || err.message.includes('Authentication failed')
            ? 'MongoDB authentication failed. Check credentials in MONGO_URI.'
            : err.message.includes('querySrv') || err.message.includes('getaddrinfo')
              ? 'MongoDB DNS lookup failed. Please check internet connection or Atlas cluster hostname.'
              : err.name === 'MongooseServerSelectionError' || err.message.includes('Server selection timed out')
                ? 'MongoDB connection timed out. On Vercel, please ensure MongoDB Atlas Network Access allows 0.0.0.0/0 (Allow access from anywhere).'
                : err.message
        );
      });
  }

  return await cachedPromise;
}

// Root API Endpoint
app.get(['/api', '/api/'], (req, res) => {
  res.json({
    success: true,
    message: 'Prabhav Portal API is live and operational.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      complaints: '/api/complaints',
      pickups: '/api/pickups',
      ai: '/api/ai'
    }
  });
});

// Ensure Database is connected before processing /api requests
app.use(async (req, res, next) => {
  const isApi = req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/complaints') || req.path.startsWith('/pickups') || req.path.startsWith('/ai');
  if (isApi) {
    // Exclude health check and root from blocking
    if (req.path === '/api/health' || req.path === '/health' || req.path === '/api' || req.path === '/') return next();

    try {
      await connectToDatabase();
    } catch (err) {
      return res.status(503).json({
        error: 'Database connection failed: ' + err.message,
        hint: 'If running on Vercel, ensure MONGO_URI is set in Vercel Environment Variables and MongoDB Atlas Network Access allows 0.0.0.0/0 (Anywhere).'
      });
    }
  }
  next();
});

// Health Check API (Diagnostic endpoint for Vercel deployments)
app.get(['/api/health', '/health'], async (req, res) => {
  let dbState = 'disconnected';
  let dbError = null;

  try {
    await connectToDatabase();
    dbState = mongoose.connection.readyState === 1 ? 'connected' : 'connecting';
  } catch (err) {
    dbError = err.message;
  }

  const isHealthy = dbState === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    message: 'Prabhav Portal API Health Status',
    database: {
      status: dbState,
      readyState: mongoose.connection.readyState,
      error: dbError
    },
    environment: {
      hasEnvMongoUri: !!process.env.MONGO_URI,
      hasEnvJwtSecret: !!process.env.JWT_SECRET,
      hasEnvGeminiKey: !!process.env.GEMINI_API_KEY,
      isVercel: !!process.env.VERCEL
    },
    timestamp: new Date()
  });
});

// Authentication Routes (support both /api/auth and /auth)
app.use(['/api/auth', '/auth'], authRoutes);

// Complaint Routes (support both /api/complaints and /complaints)
const complaintRoutes = require('./routes/complaints');
app.use(['/api/complaints', '/complaints'], complaintRoutes);

// Pickup Routes (support both /api/pickups and /pickups)
const pickupRoutes = require('./routes/pickups');
app.use(['/api/pickups', '/pickups'], pickupRoutes);

// AI Routes (support both /api/ai and /ai)
const aiRoutes = require('./routes/ai');
app.use(['/api/ai', '/ai'], aiRoutes);

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'API endpoint not found'
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error'
  });
});

// Start Server locally if run directly
if (require.main === module) {
  connectToDatabase().catch(() => {});
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Prabhav Portal server running on http://127.0.0.1:${PORT}`);
  });
}

module.exports = app;
