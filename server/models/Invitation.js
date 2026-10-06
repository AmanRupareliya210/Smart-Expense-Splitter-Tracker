const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true,
      index: true
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      default: ''
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member'
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      default: 'pending',
      index: true
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    acceptedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Compound index for group invites
invitationSchema.index({ groupId: 1, status: 1 });

// Check if invitation is currently valid
invitationSchema.methods.isValid = function () {
  if (this.status !== 'pending') return false;
  if (new Date() > new Date(this.expiresAt)) return false;
  return true;
};

module.exports = mongoose.model('Invitation', invitationSchema);
