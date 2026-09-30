const express = require('express');
const router = express.Router();
const Pickup = require('../models/Pickup');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// POST /api/pickups - Citizen creates a bulky waste pickup request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { wasteType, address, scheduledDate, coordinates } = req.body;

    if (!wasteType || !address || !scheduledDate) {
      return res.status(400).json({ error: 'Waste type, address, and scheduled date are required.' });
    }

    const parsedDate = new Date(scheduledDate);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled date format.' });
    }

    // Default coordinates if not provided
    let coords = { lat: 12.9716, lng: 77.5946 };
    if (coordinates && typeof coordinates.lat === 'number' && typeof coordinates.lng === 'number') {
      coords = { lat: coordinates.lat, lng: coordinates.lng };
    }

    // Generate unique pickup ID (e.g., PU-8821)
    let pickupId = '';
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      pickupId = `PU-${randomNum}`;
      const existing = await Pickup.findOne({ pickupId });
      if (!existing) isUnique = true;
    }

    const newPickup = new Pickup({
      pickupId,
      userId: req.user._id,
      wasteType: wasteType.trim(),
      address: address.trim(),
      coordinates: coords,
      scheduledDate: parsedDate,
      status: 'Requested'
    });

    await newPickup.save();

    return res.status(201).json({
      success: true,
      message: 'Bulky waste pickup requested successfully.',
      pickup: newPickup
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while scheduling pickup request.' });
  }
});

// GET /api/pickups - View pickups (Admin views all, Citizen views only their own)
router.get('/', authMiddleware, async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'admin') {
      // Citizen only sees their own requests
      query = { userId: req.user._id };
    }

    const pickups = await Pickup.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: pickups.length,
      pickups
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while fetching pickups.' });
  }
});

// PATCH /api/pickups/:id/status - Only admin can change pickup status
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Requested', 'Scheduled', 'Collected'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const query = req.params.id;
    let pickup = await Pickup.findOne({ pickupId: query.toUpperCase() });
    if (!pickup && query.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findById(query);
    }

    if (!pickup) {
      return res.status(404).json({ error: 'Pickup request not found.' });
    }

    pickup.status = status;
    pickup.updatedAt = new Date();
    await pickup.save();

    return res.status(200).json({
      success: true,
      message: `Pickup status updated to ${status}.`,
      pickup
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while updating pickup status.' });
  }
});

module.exports = router;
