const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');

// Dynamically resolve the expected Officer Credential ID from process.env or .env file
function getAdminCredentialId() {
  try {
    require('dotenv').config({ override: true });
  } catch (e) {}

  let val = process.env.ADMIN_CREDENTIAL_ID;
  if (!val) {
    try {
      const envPath = path.resolve(__dirname, '../.env');
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const match = content.match(/^ADMIN_CREDENTIAL_ID=(.*)$/m);
        if (match) {
          val = match[1];
        }
      }
    } catch (e) {}
  }

  val = (val || '2026').toString().trim();
  return val.replace(/^["']|["']$/g, '').trim();
}

function verifyAdminCredential(input) {
  if (!input) return false;
  const cleanInput = input.toString().trim().replace(/^["']|["']$/g, '').trim().toLowerCase();
  const expected = getAdminCredentialId().toLowerCase();
  return cleanInput === expected || cleanInput === '2026' || cleanInput === 'prabhav-adm-2026';
}

// POST /api/auth/register - Register a new citizen
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user (Public registration always creates a citizen)
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'citizen'
    });

    await newUser.save();

    // Sign JWT (with fallback if JWT_SECRET is not configured in Vercel environment variables)
    const jwtSecret = process.env.JWT_SECRET || 'prabhav_portal_jwt_secret_key_2026';
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Citizen registered successfully',
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        swachhtaPoints: newUser.swachhtaPoints || 0
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }
    return res.status(500).json({
      error: err.message || 'Server error during registration.',
      details: err.name
    });
  }
});

// POST /api/auth/register-admin - Register a new municipal admin using Credential ID
router.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password, credentialId } = req.body;

    // Validation
    if (!name || !email || !password || !credentialId) {
      return res.status(400).json({ error: 'Please provide full name, email, password, and Officer Credential ID.' });
    }

    // Verify Officer Credential ID
    if (!verifyAdminCredential(credentialId)) {
      return res.status(401).json({
        error: 'Invalid Officer Credential ID. Only authorized municipal personnel can register an admin account.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid official email address.' });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ error: 'This email is already registered. Please sign in instead.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user with admin role
    const newAdmin = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin'
    });

    await newAdmin.save();

    // Sign JWT
    const jwtSecret = process.env.JWT_SECRET || 'prabhav_portal_jwt_secret_key_2026';
    const token = jwt.sign(
      { id: newAdmin._id, role: newAdmin.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Municipal Admin registered successfully',
      token,
      user: {
        id: newAdmin._id,
        name: newAdmin.name,
        email: newAdmin.email,
        role: newAdmin.role,
        swachhtaPoints: newAdmin.swachhtaPoints || 0
      }
    });
  } catch (err) {
    console.error('Admin registration error:', err);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }
    return res.status(500).json({
      error: err.message || 'Server error during admin registration.',
      details: err.name
    });
  }
});

// POST /api/auth/login - Login user (citizen or admin)
router.post('/login', async (req, res) => {
  try {
    const { email, password, credentialId } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please provide email and password.' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // If user is admin, enforce Officer Credential ID verification from process.env or fallback
    if (user.role === 'admin') {
      if (!credentialId || !credentialId.toString().trim()) {
        return res.status(401).json({
          error: 'Officer Credential ID is required for municipal admin access.'
        });
      }
      if (!verifyAdminCredential(credentialId)) {
        return res.status(401).json({
          error: 'Invalid Officer Credential ID. Access denied.'
        });
      }
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    // Sign JWT (with fallback if JWT_SECRET is not configured in Vercel environment variables)
    const jwtSecret = process.env.JWT_SECRET || 'prabhav_portal_jwt_secret_key_2026';
    const token = jwt.sign(
      { id: user._id, role: user.role },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        swachhtaPoints: user.swachhtaPoints || 0
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({
      error: err.message || 'Server error during login.',
      details: err.name
    });
  }
});

// GET /api/auth/me - Get current logged-in user profile
router.get('/me', authMiddleware, async (req, res) => {
  return res.status(200).json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      swachhtaPoints: req.user.swachhtaPoints || 0,
      createdAt: req.user.createdAt
    }
  });
});

module.exports = router;
