const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    action: {
      type: String,
      enum: [
        'GROUP_CREATED',
        'GROUP_UPDATED',
        'GROUP_ARCHIVED',
        'GROUP_UNARCHIVED',
        'MEMBER_ADDED',
        'MEMBER_REMOVED',
        'MEMBER_ROLE_UPDATED',
        'MEMBER_LEFT',
        'OWNERSHIP_TRANSFERRED',
        'INVITATION_CREATED',
        'INVITATION_ACCEPTED',
        'INVITATION_REVOKED',
        'EXPENSE_ADDED',
        'EXPENSE_UPDATED',
        'EXPENSE_DELETED',
        'SETTLEMENT_RECORDED',
        'SETTLEMENT_UPDATED',
        'SETTLEMENT_REVERSED'
      ],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    summary: {
      type: String,
      required: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Indexes
activityLogSchema.index({ groupId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);
