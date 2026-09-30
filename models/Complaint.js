const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['Overflowing Bin', 'Road Garbage', 'Illegal Dumping', 'Missed Collection', 'Other']
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  locationText: {
    type: String,
    default: ''
  },
  coordinates: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  reporterName: {
    type: String,
    default: 'Citizen'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  imageUrl: {
    type: String,
    default: ''
  },
  resolvedImageUrl: {
    type: String,
    default: ''
  },
  adminRemarks: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Reported', 'Assigned', 'In-Progress', 'Resolved'],
    default: 'Reported'
  },
  pointsAwarded: {
    type: Boolean,
    default: false
  },
  feedbackRating: {
    type: Number,
    min: 1,
    max: 5
  },
  feedbackComment: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.models.Complaint || mongoose.model('Complaint', complaintSchema);
