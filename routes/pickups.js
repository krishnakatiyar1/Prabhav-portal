const express = require('express');
const router = express.Router();
const Pickup = require('../models/Pickup');
const User = require('../models/User');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Haversine formula to compute distance in meters between two coordinates
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Radius of Earth in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// POST /api/pickups - Citizen creates a bulky waste pickup request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { wasteType, address, scheduledDate, coordinates, redeemPoints } = req.body;

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

    // Swachhata Points Redemption Calculation
    // Doorstep pickup base charge = ₹200
    // User can redeem up to 100 points (1 point = ₹1), getting up to ₹100 discount (paying ₹100 instead of ₹200)
    const BASE_FEE = 200;
    const MAX_REDEEM_POINTS = 100;

    const userDoc = await User.findById(req.user._id);
    if (!userDoc) {
      return res.status(404).json({ error: 'Citizen user profile not found.' });
    }

    const availablePoints = Math.max(0, userDoc.swachhtaPoints || 0);
    let pointsToRedeem = 0;

    if (redeemPoints !== undefined && redeemPoints !== null && redeemPoints !== false) {
      let requested = 0;
      if (typeof redeemPoints === 'boolean') {
        requested = redeemPoints ? Math.min(availablePoints, MAX_REDEEM_POINTS) : 0;
      } else {
        requested = Math.max(0, Math.floor(Number(redeemPoints) || 0));
      }
      pointsToRedeem = Math.min(requested, availablePoints, MAX_REDEEM_POINTS);
    }

    const discountAmount = pointsToRedeem * 1; // 1 point = ₹1
    const finalFee = BASE_FEE - discountAmount; // Paying ₹100 - ₹200

    // Deduct redeemed points from user balance
    if (pointsToRedeem > 0) {
      userDoc.swachhtaPoints = Math.max(0, userDoc.swachhtaPoints - pointsToRedeem);
      await userDoc.save();
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

    // Assign realistic municipal truck location (~1.8 km from user's address)
    const truckLat = coords.lat - 0.012;
    const truckLng = coords.lng - 0.009;

    const newPickup = new Pickup({
      pickupId,
      userId: req.user._id,
      wasteType: wasteType.trim(),
      address: address.trim(),
      coordinates: coords,
      scheduledDate: parsedDate,
      status: 'Requested',
      baseFee: BASE_FEE,
      redeemedPoints: pointsToRedeem,
      discountAmount,
      finalFee,
      paymentStatus: 'Paid',
      assignedVehicle: 'VAN-SPEC-02',
      truckNumber: 'KA-01-EA-4920',
      driverName: 'Rajesh Kumar (Senior Crew Lead)',
      driverPhone: '+91 98450 12890',
      truckLocation: {
        lat: truckLat,
        lng: truckLng,
        addressText: 'Zonal Sanitation Depot, Indiranagar Sector 4',
        heading: 55,
        speedKmH: 26,
        lastUpdated: new Date()
      },
      etaMinutes: 20
    });

    await newPickup.save();

    return res.status(201).json({
      success: true,
      message: pointsToRedeem > 0
        ? `Bulky waste pickup requested successfully! Redeemed ${pointsToRedeem} Swachhata points (Saved ₹${discountAmount}).`
        : 'Bulky waste pickup requested successfully.',
      pickup: newPickup,
      redemption: {
        baseFee: BASE_FEE,
        pointsRedeemed: pointsToRedeem,
        discountAmount,
        finalFee,
        newPointsBalance: userDoc.swachhtaPoints
      },
      updatedUserPoints: userDoc.swachhtaPoints
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

// GET /api/pickups/:id - Public tracking for pickup request and live truck location
router.get('/:id', async (req, res) => {
  try {
    const query = req.params.id;
    let pickup = await Pickup.findOne({ pickupId: query.toUpperCase() }).populate('userId', 'name email');

    // Fallback to _id if valid MongoDB ObjectId
    if (!pickup && query.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findById(query).populate('userId', 'name email');
    }

    if (!pickup) {
      return res.status(404).json({ error: 'Pickup booking ID not found in municipal registry.' });
    }

    // Ensure truck coordinates are available relative to pickup location
    const destLat = (pickup.coordinates && typeof pickup.coordinates.lat === 'number') ? pickup.coordinates.lat : 12.9716;
    const destLng = (pickup.coordinates && typeof pickup.coordinates.lng === 'number') ? pickup.coordinates.lng : 77.5946;

    let truckLat = (pickup.truckLocation && typeof pickup.truckLocation.lat === 'number') ? pickup.truckLocation.lat : (destLat - 0.012);
    let truckLng = (pickup.truckLocation && typeof pickup.truckLocation.lng === 'number') ? pickup.truckLocation.lng : (destLng - 0.009);

    // If Collected, truck is at doorstep or completed
    if (pickup.status === 'Collected' || pickup.status === 'Completed') {
      truckLat = destLat;
      truckLng = destLng;
    }

    const distMeters = calculateHaversineDistance(truckLat, truckLng, destLat, destLng);
    const distanceKm = Number((distMeters / 1000).toFixed(1));
    const etaMinutes = (pickup.status === 'Collected' || pickup.status === 'Completed')
      ? 0
      : (pickup.status === 'Requested')
        ? 45
        : Math.max(5, Math.round(distanceKm * 4.5 + 4));

    return res.status(200).json({
      success: true,
      pickup: {
        ...pickup.toObject(),
        truckLocation: {
          lat: truckLat,
          lng: truckLng,
          addressText: pickup.truckLocation?.addressText || 'Indiranagar Municipal Depot',
          heading: pickup.truckLocation?.heading || 45,
          speedKmH: pickup.status === 'Collected' ? 0 : 28,
          lastUpdated: new Date()
        },
        distanceKm,
        etaMinutes
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while retrieving pickup tracking details.' });
  }
});

// PATCH /api/pickups/:id/status - Only admin can change pickup status and vehicle assignment
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, assignedVehicle, truckNumber, driverName, driverPhone, truckLocation, adminRemarks, progressNote } = req.body;
    const validStatuses = ['Requested', 'Scheduled', 'In-Transit', 'Collected', 'Completed', 'Cancelled'];

    const query = req.params.id;
    let pickup = await Pickup.findOne({ pickupId: query.toUpperCase() });
    if (!pickup && query.match(/^[0-9a-fA-F]{24}$/)) {
      pickup = await Pickup.findById(query);
    }

    if (!pickup) {
      return res.status(404).json({ error: 'Pickup request not found.' });
    }

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      }
      pickup.status = status;
    }

    const customNote = adminRemarks !== undefined ? adminRemarks : progressNote;
    if (typeof customNote === 'string') {
      pickup.adminRemarks = customNote.trim();
      pickup.progressNote = customNote.trim();
    }

    if (assignedVehicle) pickup.assignedVehicle = assignedVehicle.trim();
    if (truckNumber) pickup.truckNumber = truckNumber.trim();
    if (driverName) pickup.driverName = driverName.trim();
    if (driverPhone) pickup.driverPhone = driverPhone.trim();
    if (truckLocation && typeof truckLocation.lat === 'number' && typeof truckLocation.lng === 'number') {
      pickup.truckLocation = {
        lat: truckLocation.lat,
        lng: truckLocation.lng,
        addressText: truckLocation.addressText || pickup.truckLocation?.addressText || '',
        heading: truckLocation.heading || 0,
        speedKmH: truckLocation.speedKmH || 0,
        lastUpdated: new Date()
      };
    }

    pickup.updatedAt = new Date();
    await pickup.save();

    return res.status(200).json({
      success: true,
      message: `Pickup status updated to ${pickup.status}.`,
      pickup
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while updating pickup status.' });
  }
});

module.exports = router;
