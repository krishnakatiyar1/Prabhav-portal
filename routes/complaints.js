const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
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

// POST /api/complaints - Create a new waste complaint (Citizen must be logged in)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, category, description, locationText, coordinates, isAnonymous, imageUrl } = req.body;

    // Validate Title and Category
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and category are required.' });
    }

    const validCategories = ['Overflowing Bin', 'Road Garbage', 'Illegal Dumping', 'Missed Collection', 'Other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid waste category.' });
    }

    // Validate Coordinates
    if (!coordinates || typeof coordinates.lat !== 'number' || typeof coordinates.lng !== 'number') {
      return res.status(400).json({ error: 'Valid latitude and longitude numbers are required.' });
    }

    const { lat, lng } = coordinates;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Coordinates out of valid geographical range.' });
    }

    // Duplicate detection: Check if any unresolved complaint is within 50 meters
    let duplicateWarning = null;
    const activeComplaints = await Complaint.find({ status: { $ne: 'Resolved' } });

    for (const existing of activeComplaints) {
      const distance = calculateHaversineDistance(lat, lng, existing.coordinates.lat, existing.coordinates.lng);
      if (distance <= 50) {
        duplicateWarning = `Warning: A similar active complaint (${existing.complaintId}) was reported approximately ${Math.round(distance)} meters away.`;
        break;
      }
    }

    // Generate unique complaint ID (e.g., CP-8492)
    let complaintId = '';
    let isUnique = false;
    while (!isUnique) {
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      complaintId = `CP-${randomNum}`;
      const exists = await Complaint.findOne({ complaintId });
      if (!exists) isUnique = true;
    }

    // Save complaint (do not silently delete or discard if duplicate warning)
    const newComplaint = new Complaint({
      complaintId,
      title: title.trim(),
      category,
      description: description ? description.trim() : '',
      locationText: locationText ? locationText.trim() : 'Geotagged Location',
      coordinates: { lat, lng },
      isAnonymous: Boolean(isAnonymous),
      reporterName: isAnonymous ? 'Anonymous Citizen' : req.user.name,
      userId: req.user._id,
      imageUrl: imageUrl || '',
      status: 'Reported'
    });

    await newComplaint.save();

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully.',
      warning: duplicateWarning,
      complaint: newComplaint
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while submitting complaint.' });
  }
});

// GET /api/complaints - Get all complaints
router.get('/', async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: complaints.length, complaints });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while fetching complaints.' });
  }
});

// GET /api/complaints/:id - Get complaint details by complaintId or MongoDB ObjectId
router.get('/:id', async (req, res) => {
  try {
    const query = req.params.id;
    let complaint = await Complaint.findOne({ complaintId: query.toUpperCase() });

    // Fallback to _id if valid MongoDB ObjectId
    if (!complaint && query.match(/^[0-9a-fA-F]{24}$/)) {
      complaint = await Complaint.findById(query);
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    return res.status(200).json({ success: true, complaint });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while retrieving complaint.' });
  }
});

// PATCH /api/complaints/:id/status - Update complaint status (Admin only)
router.patch('/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Reported', 'Assigned', 'In-Progress', 'Resolved'];

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const query = req.params.id;
    let complaint = await Complaint.findOne({ complaintId: query.toUpperCase() });
    if (!complaint && query.match(/^[0-9a-fA-F]{24}$/)) {
      complaint = await Complaint.findById(query);
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    let pointsAwarded = false;
    let awardedUser = null;

    // Reward System: Award 10 Swachhta Points when complaint status becomes Resolved
    if (status === 'Resolved' && !complaint.pointsAwarded && complaint.userId) {
      const reporter = await User.findById(complaint.userId);
      if (reporter) {
        reporter.swachhtaPoints = (reporter.swachhtaPoints || 0) + 10;
        await reporter.save();
        complaint.pointsAwarded = true;
        pointsAwarded = true;
        awardedUser = {
          id: reporter._id,
          name: reporter.name,
          swachhtaPoints: reporter.swachhtaPoints
        };
      }
    }

    complaint.status = status;
    complaint.updatedAt = new Date();
    await complaint.save();

    return res.status(200).json({
      success: true,
      message: pointsAwarded
        ? `Complaint status updated to ${status}. 10 Swachhta Points awarded to reporter!`
        : `Complaint status updated to ${status}`,
      pointsAwarded,
      awardedUser,
      complaint
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while updating complaint status.' });
  }
});

// POST /api/complaints/:id/feedback - Submit feedback for a resolved complaint
router.post('/:id/feedback', authMiddleware, async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const ratingNum = Number(rating);
    if (!ratingNum || ratingNum < 1 || ratingNum > 5 || !Number.isInteger(ratingNum)) {
      return res.status(400).json({ error: 'Feedback rating must be an integer between 1 and 5.' });
    }

    const query = req.params.id;
    let complaint = await Complaint.findOne({ complaintId: query.toUpperCase() });
    if (!complaint && query.match(/^[0-9a-fA-F]{24}$/)) {
      complaint = await Complaint.findById(query);
    }

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found.' });
    }

    // Feedback can only be submitted when status = Resolved
    if (complaint.status !== 'Resolved') {
      return res.status(400).json({ error: 'Feedback can only be submitted after the complaint is resolved.' });
    }

    complaint.feedbackRating = ratingNum;
    complaint.feedbackComment = comment ? comment.trim() : '';
    complaint.updatedAt = new Date();
    await complaint.save();

    return res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully.',
      complaint
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error while submitting feedback.' });
  }
});

module.exports = router;
