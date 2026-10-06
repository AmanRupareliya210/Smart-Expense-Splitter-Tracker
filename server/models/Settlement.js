const mongoose = require('mongoose');

const settlementSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: [true, 'Group ID is required'],
      index: true
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Payer (paidBy) is required'],
      index: true
    },
    paidTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Receiver (paidTo) is required'],
      index: true
    },
    amount: {
      type: Number, // Stored as integer minor currency units (cents/paise)
      required: [true, 'Settlement amount is required'],
      min: [1, 'Settlement amount must be at least 1 minor currency unit'],
      validate: {
        validator: Number.isInteger,
        message: 'Settlement amount must be an integer in minor currency units'
      }
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']
    },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'UPI', 'BANK_TRANSFER', 'PAYPAL', 'VENMO', 'OTHER'],
      default: 'CASH'
    },
    status: {
      type: String,
      enum: ['CONFIRMED', 'PENDING', 'CANCELLED', 'REVERSED'],
      default: 'CONFIRMED',
      index: true
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: ''
    },
    settledAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    isReversed: {
      type: Boolean,
      default: false,
      index: true
    },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    reversalReason: {
      type: String,
      trim: true,
      default: ''
    },
    reversedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Performance compound indexes
settlementSchema.index({ groupId: 1, settledAt: -1 });
settlementSchema.index({ groupId: 1, status: 1 });
settlementSchema.index({ paidBy: 1, paidTo: 1 });

module.exports = mongoose.model('Settlement', settlementSchema);
