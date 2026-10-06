const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  },
  { _id: false }
);

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Group name is required'],
      trim: true,
      maxlength: [80, 'Group name cannot exceed 80 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: ''
    },
    category: {
      type: String,
      enum: ['Trip', 'Home', 'Event', 'Project', 'Couple', 'Other'],
      default: 'Other'
    },
    currency: {
      type: String,
      default: 'USD',
      enum: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: {
      type: [memberSchema],
      validate: {
        validator: function (members) {
          if (!members || members.length === 0) return true;
          // Ensure no duplicate user IDs
          const userIds = members.map((m) => m.userId.toString());
          const uniqueIds = new Set(userIds);
          if (uniqueIds.size !== userIds.length) return false;
          // Ensure at least one owner exists
          const hasOwner = members.some((m) => m.role === 'owner');
          return hasOwner;
        },
        message: 'Group must have unique members and at least one owner.'
      }
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date,
      default: null
    },
    archivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for fast lookups & multi-tenant isolation
groupSchema.index({ 'members.userId': 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ isArchived: 1 });
groupSchema.index({ 'members.userId': 1, isArchived: 1 });

module.exports = mongoose.model('Group', groupSchema);
