const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification recipient is required'],
      index: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: [
        'EXPENSE_ADDED',
        'EXPENSE_UPDATED',
        'EXPENSE_DELETED',
        'SETTLEMENT_RECORDED',
        'SETTLEMENT_REVERSED',
        'SETTLEMENT_REMINDER',
        'GROUP_INVITATION',
        'MEMBER_ADDED',
        'MEMBER_REMOVED',
        'ROLE_UPDATED',
        'SYSTEM'
      ]
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Group',
      default: null,
      index: true
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    entityType: {
      type: String,
      enum: ['Expense', 'Settlement', 'Group', 'Invitation', 'User', null],
      default: null
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
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

// High-performance compound index for user notification inbox queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
