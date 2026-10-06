const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const Group = require('../models/Group');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const notificationService = require('../services/notificationService');
const { calculateGroupBalances } = require('../services/balanceService');
const { toCents } = require('../services/splitEngine');

// Reminder cooldown: 12 hours (in milliseconds)
const REMINDER_COOLDOWN_MS = 12 * 60 * 60 * 1000;

/**
 * GET /api/v1/notifications — List notifications for the authenticated user
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { page, limit, isRead } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const query = { recipient: userId };
    if (isRead !== undefined && isRead !== null && isRead !== '') {
      query.isRead = isRead === 'true' || isRead === true;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('sender', 'name email avatarUrl')
        .populate('groupId', 'name currency category isArchived')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: userId, isRead: false })
    ]);

    return sendSuccess(res, 200, 'Notifications fetched successfully', {
      notifications,
      unreadCount,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum) || 1,
        limit: limitNum
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/notifications/unread-count — Fast query for unread notifications badge
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return sendSuccess(res, 200, 'Unread count fetched', { unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/:id/read — Mark an individual notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return next(new ApiError(400, 'Invalid notification ID format.'));
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return next(new ApiError(404, 'Notification not found.'));
    }

    // Strict multi-tenant isolation: Cannot alter another user's notification
    if (notification.recipient.toString() !== userId.toString()) {
      return next(new ApiError(403, 'Access denied. You cannot modify notifications belonging to another user.'));
    }

    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return sendSuccess(res, 200, 'Notification marked as read', {
      notification,
      unreadCount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/notifications/read-all — Mark all unread notifications as read for current user
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return sendSuccess(res, 200, 'All notifications marked as read', {
      modifiedCount: result.modifiedCount,
      unreadCount: 0
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/notifications/:id — Dismiss or delete a notification
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.isValidObjectId(id)) {
      return next(new ApiError(400, 'Invalid notification ID format.'));
    }

    const notification = await Notification.findById(id);
    if (!notification) {
      return next(new ApiError(404, 'Notification not found.'));
    }

    // Strict multi-tenant isolation
    if (notification.recipient.toString() !== userId.toString()) {
      return next(new ApiError(403, 'Access denied. You cannot delete notifications belonging to another user.'));
    }

    await Notification.findByIdAndDelete(id);

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    return sendSuccess(res, 200, 'Notification deleted successfully', { unreadCount });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/groups/:groupId/reminders — Send a settlement reminder to a debtor
 */
const sendSettlementReminder = async (req, res, next) => {
  try {
    const { debtorId, customNote } = req.body;
    const group = req.group;
    const creditor = req.user;

    // Reject operations on archived groups
    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot send settlement reminders for an archived group. Please unarchive the group first.'));
    }

    if (!debtorId) {
      return next(new ApiError(400, 'Debtor ID (debtorId) is required to send a reminder.'));
    }

    if (!mongoose.isValidObjectId(debtorId)) {
      return next(new ApiError(400, 'Invalid debtor ID format.'));
    }

    if (debtorId.toString() === creditor._id.toString()) {
      return next(new ApiError(400, 'You cannot send a settlement reminder to yourself.'));
    }

    // Verify debtor is a member of the group
    const isDebtorMember = group.members.some(
      (m) => m.userId && (m.userId._id || m.userId).toString() === debtorId.toString()
    );

    if (!isDebtorMember) {
      return next(new ApiError(400, 'The designated debtor is not a member of this group.'));
    }

    const debtorUser = await User.findById(debtorId).select('name email avatarUrl');
    if (!debtorUser) {
      return next(new ApiError(404, 'Debtor user profile not found.'));
    }

    // Rate Limiting / Duplicate Prevention Cooldown Check
    const cooldownThreshold = new Date(Date.now() - REMINDER_COOLDOWN_MS);
    const recentReminder = await Notification.findOne({
      recipient: debtorId,
      sender: creditor._id,
      groupId: group._id,
      type: 'SETTLEMENT_REMINDER',
      createdAt: { $gte: cooldownThreshold }
    }).sort({ createdAt: -1 });

    if (recentReminder) {
      const remainingHours = Math.ceil(
        (recentReminder.createdAt.getTime() + REMINDER_COOLDOWN_MS - Date.now()) / (1000 * 60 * 60)
      );
      return next(
        new ApiError(
          429,
          `A settlement reminder was already sent to ${debtorUser.name} recently. Please wait ${remainingHours}h before sending another reminder.`
        )
      );
    }

    // Calculate current group balances to find exact outstanding debt
    const balances = await calculateGroupBalances(group._id);
    const debtorBalance = balances.memberBalances.find((m) => m.userId === debtorId.toString());

    const debtAmount = debtorBalance && debtorBalance.netBalance < 0
      ? Math.abs(debtorBalance.netBalance)
      : (balances.suggestedSettlements || [])
          .filter((s) => s.from === debtorId.toString() && s.to === creditor._id.toString())
          .reduce((acc, s) => acc + s.amount, 0);

    // Send notification to debtor
    const notification = await notificationService.notifySettlementReminder(
      group,
      debtorUser,
      creditor,
      debtAmount > 0 ? debtAmount : 0,
      group.currency,
      customNote
    );

    // Log to group ActivityLog for authoritative audit history
    await ActivityLog.create({
      groupId: group._id,
      performedBy: creditor._id,
      action: 'SETTLEMENT_RECORDED', // Or general activity
      summary: `${creditor.name} sent a settlement reminder to ${debtorUser.name}.`,
      metadata: {
        debtorId,
        debtorName: debtorUser.name,
        customNote: customNote || null
      }
    });

    return sendSuccess(res, 201, `Settlement reminder sent to ${debtorUser.name}`, {
      notification,
      debtor: {
        id: debtorUser._id,
        name: debtorUser.name,
        email: debtorUser.email
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  sendSettlementReminder
};
