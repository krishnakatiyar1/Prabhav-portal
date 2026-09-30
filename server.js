require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health Check API
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Prabhav Portal API is running'
  });
});

// Authentication Routes
app.use('/api/auth', authRoutes);

// Complaint Routes
const complaintRoutes = require('./routes/complaints');
app.use('/api/complaints', complaintRoutes);

// Pickup Routes
const pickupRoutes = require('./routes/pickups');
app.use('/api/pickups', pickupRoutes);

// AI Routes
const aiRoutes = require('./routes/ai');
app.use('/api/ai', aiRoutes);

// Seed default admin account
async function seedAdmin() {
  try {
    const adminEmails = [
      (process.env.ADMIN_EMAIL || 'admin@prabhav.gov').toLowerCase(),
      'admin@cleanpulse.gov'
    ];
    for (const email of adminEmails) {
      const existing = await User.findOne({ email });
      if (!existing) {
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123', 10);
        await User.create({
          name: 'Chief Municipal Officer',
          email,
          password: hashedPassword,
          role: 'admin'
        });
        console.log(`✓ Admin account created: ${email}`);
      }
    }
  } catch (err) {
    console.error('Admin seed error:', err.message);
  }
}

// Connect to MongoDB
if (process.env.MONGO_URI) {
  mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
      console.log('✓ Connected to MongoDB');
      await seedAdmin();
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err.message);
    });
} else {
  console.warn('⚠ Note: MONGO_URI is not set in .env');
}

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

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Prabhav Portal server running on http://127.0.0.1:${PORT}`);
});
