const mongoose = require('mongoose');

const pickupSchema = new mongoose.Schema({
  pickupId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  wasteType: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    lat: {
      type: Number,
      default: 12.9716
    },
    lng: {
      type: Number,
      default: 77.5946
    }
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Requested', 'Scheduled', 'In-Transit', 'Collected', 'Completed', 'Cancelled'],
    default: 'Requested'
  },
  assignedVehicle: {
    type: String,
    default: 'VAN-SPEC-02'
  },
  truckNumber: {
    type: String,
    default: 'KA-01-EA-4920'
  },
  driverName: {
    type: String,
    default: 'Rajesh Kumar (Senior Crew)'
  },
  driverPhone: {
    type: String,
    default: '+91 98450 12890'
  },
  truckLocation: {
    lat: {
      type: Number,
      default: 12.9650
    },
    lng: {
      type: Number,
      default: 77.5890
    },
    addressText: {
      type: String,
      default: 'Zonal Sanitation Depot, Indiranagar'
    },
    heading: {
      type: Number,
      default: 45
    },
    speedKmH: {
      type: Number,
      default: 26
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  etaMinutes: {
    type: Number,
    default: 18
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

module.exports = mongoose.models.Pickup || mongoose.model('Pickup', pickupSchema);
