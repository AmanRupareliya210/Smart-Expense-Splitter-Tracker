const mongoose = require('mongoose');
const Settlement = require('../models/Settlement');
const ActivityLog = require('../models/ActivityLog');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { toCents, toDecimal } = require('../services/splitEngine');
const { calculateGroupBalances, calculateUserGlobalBalances } = require('../services/balanceService');
const { simplifyDebts } = require('../services/debtSimplifier');
const notificationService = require('../services/notificationService');

/**
 * POST /api/v1/groups/:groupId/settlements — Record a direct debt payment
 */
const recordSettlement = async (req, res, next) => {
  try {
    const { paidBy, paidTo, amount, paymentMethod, notes, settledAt } = req.body;
    const group = req.group;

    // Reject operations on archived groups
    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot record settlements in an archived group. Please unarchive the group first.'));
    }

    const payer = paidBy || req.user._id;
    if (!payer || !paidTo) {
      return next(new ApiError(400, 'Both payer (paidBy) and receiver (paidTo) are required.'));
    }

    const payerId = (payer._id || payer).toString();
    const receiverId = (paidTo._id || paidTo).toString();

    if (payerId === receiverId) {
      return next(new ApiError(400, 'Self-settlements are not permitted. Payer and receiver must be different members.'));
    }

    // Verify both participants are active members of this group
    const isPayerMember = group.members.some(
      (m) => m.userId && (m.userId._id || m.userId).toString() === payerId
    );
    const isReceiverMember = group.members.some(
      (m) => m.userId && (m.userId._id || m.userId).toString() === receiverId
    );

    if (!isPayerMember) {
      return next(new ApiError(400, 'Payer must be a member of this group.'));
    }
    if (!isReceiverMember) {
      return next(new ApiError(400, 'Receiver must be a member of this group.'));
    }

    if (!amount) {
      return next(new ApiError(400, 'Settlement amount is required.'));
    }

    const settleCents = toCents(amount);
    if (settleCents <= 0) {
      return next(new ApiError(400, 'Settlement amount must be greater than zero.'));
    }

    if (settleCents > 10000000000) {
      return next(new ApiError(400, 'Settlement amount exceeds maximum allowed limit.'));
    }

    const validMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'PAYPAL', 'VENMO', 'OTHER'];
    const methodUpper = paymentMethod ? paymentMethod.toUpperCase() : 'CASH';
    const finalMethod = validMethods.includes(methodUpper) ? methodUpper : 'OTHER';

    const settlement = await Settlement.create({
      groupId: group._id,
      paidBy: payerId,
      paidTo: receiverId,
      amount: settleCents,
      currency: group.currency || 'INR',
      paymentMethod: finalMethod,
      status: 'CONFIRMED',
      notes: notes ? notes.trim() : '',
      settledAt: settledAt ? new Date(settledAt) : new Date(),
      createdBy: req.user._id,
      isReversed: false
    });

    const [payerUser, receiverUser] = await Promise.all([
      User.findById(payerId).select('name email'),
      User.findById(receiverId).select('name email')
    ]);

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'SETTLEMENT_RECORDED',
      targetId: settlement._id,
      summary: `${payerUser?.name || 'Member'} recorded a payment of $${toDecimal(settleCents)} to ${receiverUser?.name || 'Member'} (${finalMethod}).`,
      metadata: {
        amount: settleCents,
        paidBy: payerId,
        paidTo: receiverId,
        paymentMethod: finalMethod
      }
    });

    // In-App Notification Trigger
    try {
      await notificationService.notifySettlementRecorded(settlement, payerUser, receiverUser, group, req.user._id);
    } catch (err) {
      console.error('[SettlementController] Notification trigger error:', err.message);
    }

    const populatedSettlement = await Settlement.findById(settlement._id)
      .populate('paidBy', 'name email avatarUrl')
      .populate('paidTo', 'name email avatarUrl')
      .populate('createdBy', 'name email');

    const updatedBalances = await calculateGroupBalances(group._id);

    return sendSuccess(res, 201, 'Settlement recorded successfully', {
      settlement: populatedSettlement,
      balances: updatedBalances
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/:groupId/settlements — List group settlements with pagination
 */
const getGroupSettlements = async (req, res, next) => {
  try {
    const { status, page, limit } = req.query;
    const query = { groupId: req.group._id };

    if (status) {
      query.status = status.toUpperCase();
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [settlements, total] = await Promise.all([
      Settlement.find(query)
        .populate('paidBy', 'name email avatarUrl')
        .populate('paidTo', 'name email avatarUrl')
        .populate('createdBy', 'name email')
        .populate('reversedBy', 'name email')
        .sort({ settledAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Settlement.countDocuments(query)
    ]);

    return sendSuccess(res, 200, 'Settlements retrieved successfully', {
      settlements,
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
 * GET /api/v1/groups/:groupId/settlements/:settlementId — Get single settlement details
 */
const getSettlementDetails = async (req, res, next) => {
  try {
    const { settlementId } = req.params;

    if (!mongoose.isValidObjectId(settlementId)) {
      return next(new ApiError(400, 'Invalid Settlement ID format.'));
    }

    const settlement = await Settlement.findOne({ _id: settlementId, groupId: req.group._id })
      .populate('paidBy', 'name email avatarUrl')
      .populate('paidTo', 'name email avatarUrl')
      .populate('createdBy', 'name email')
      .populate('reversedBy', 'name email');

    if (!settlement) {
      return next(new ApiError(404, 'Settlement not found in this group.'));
    }

    return sendSuccess(res, 200, 'Settlement details retrieved', settlement);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/v1/groups/:groupId/settlements/:settlementId — Update settlement notes or payment method
 */
const updateSettlement = async (req, res, next) => {
  try {
    const { settlementId } = req.params;
    const group = req.group;
    const currentUserId = req.user._id.toString();
    const callerRole = req.userMemberRole;

    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot modify settlements in an archived group.'));
    }

    if (!mongoose.isValidObjectId(settlementId)) {
      return next(new ApiError(400, 'Invalid Settlement ID.'));
    }

    const settlement = await Settlement.findOne({ _id: settlementId, groupId: group._id });
    if (!settlement) {
      return next(new ApiError(404, 'Settlement not found in this group.'));
    }

    if (settlement.isReversed) {
      return next(new ApiError(400, 'Cannot edit a reversed settlement.'));
    }

    const isCreator = settlement.createdBy.toString() === currentUserId;
    const isPayer = settlement.paidBy.toString() === currentUserId;
    const isReceiver = settlement.paidTo.toString() === currentUserId;
    const isPrivileged = callerRole === 'owner' || callerRole === 'admin';

    if (!isCreator && !isPayer && !isReceiver && !isPrivileged) {
      return next(new ApiError(403, 'You do not have permission to edit this settlement.'));
    }

    const { notes, paymentMethod } = req.body;
    if (notes !== undefined) {
      settlement.notes = notes.trim();
    }
    if (paymentMethod !== undefined) {
      const validMethods = ['CASH', 'UPI', 'BANK_TRANSFER', 'PAYPAL', 'VENMO', 'OTHER'];
      const methodUpper = paymentMethod.toUpperCase();
      if (validMethods.includes(methodUpper)) {
        settlement.paymentMethod = methodUpper;
      }
    }

    await settlement.save();

    const populated = await Settlement.findById(settlement._id)
      .populate('paidBy', 'name email avatarUrl')
      .populate('paidTo', 'name email avatarUrl')
      .populate('createdBy', 'name email');

    return sendSuccess(res, 200, 'Settlement updated successfully', populated);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/groups/:groupId/settlements/:settlementId/reverse (or DELETE)
 * Auditable financial reversal of a confirmed settlement
 */
const reverseSettlement = async (req, res, next) => {
  try {
    const { settlementId } = req.params;
    const group = req.group;
    const currentUserId = req.user._id.toString();
    const callerRole = req.userMemberRole;

    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot reverse settlements in an archived group.'));
    }

    if (!mongoose.isValidObjectId(settlementId)) {
      return next(new ApiError(400, 'Invalid Settlement ID.'));
    }

    const settlement = await Settlement.findOne({ _id: settlementId, groupId: group._id });
    if (!settlement) {
      return next(new ApiError(404, 'Settlement not found in this group.'));
    }

    if (settlement.isReversed || settlement.status === 'REVERSED') {
      return next(new ApiError(400, 'This settlement has already been reversed.'));
    }

    // Authorization: Payer, Receiver, Admin, or Owner
    const isCreator = settlement.createdBy.toString() === currentUserId;
    const isPayer = settlement.paidBy.toString() === currentUserId;
    const isReceiver = settlement.paidTo.toString() === currentUserId;
    const isPrivileged = callerRole === 'owner' || callerRole === 'admin';

    if (!isCreator && !isPayer && !isReceiver && !isPrivileged) {
      return next(new ApiError(403, 'You do not have permission to reverse this settlement.'));
    }

    const reason = (req.body.reason || req.body.reversalReason || 'Reversed by authorized user').trim();

    settlement.status = 'REVERSED';
    settlement.isReversed = true;
    settlement.reversedBy = req.user._id;
    settlement.reversalReason = reason;
    settlement.reversedAt = new Date();

    await settlement.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'SETTLEMENT_REVERSED',
      targetId: settlement._id,
      summary: `${req.user.name} reversed settlement payment of $${toDecimal(settlement.amount)} (Reason: ${reason}).`,
      metadata: {
        settlementId: settlement._id,
        amount: settlement.amount,
        reason
      }
    });

    // In-App Notification Trigger
    try {
      await notificationService.notifySettlementReversed(settlement, req.user, group);
    } catch (err) {
      console.error('[SettlementController] Reverse notification trigger error:', err.message);
    }

    const populated = await Settlement.findById(settlement._id)
      .populate('paidBy', 'name email avatarUrl')
      .populate('paidTo', 'name email avatarUrl')
      .populate('reversedBy', 'name email');

    const updatedBalances = await calculateGroupBalances(group._id);

    return sendSuccess(res, 200, 'Settlement reversed successfully', {
      settlement: populated,
      balances: updatedBalances
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/:groupId/balances — Get group balances & simplified debt transfers
 */
const getGroupBalances = async (req, res, next) => {
  try {
    const balances = await calculateGroupBalances(req.group._id);
    return sendSuccess(res, 200, 'Group balances calculated successfully', balances);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/:groupId/settlement-suggestions — Get debt minimization suggestions without side effects
 */
const getSettlementSuggestions = async (req, res, next) => {
  try {
    const balances = await calculateGroupBalances(req.group._id);
    const suggestions = simplifyDebts(balances.memberBalances, req.group.currency || 'INR');

    return sendSuccess(res, 200, 'Settlement suggestions calculated successfully', {
      currency: req.group.currency || 'INR',
      transferCount: suggestions.length,
      suggestions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/user-summary — Global user cross-group net summary
 */
const getUserGlobalSummary = async (req, res, next) => {
  try {
    const summary = await calculateUserGlobalBalances(req.user._id);
    return sendSuccess(res, 200, 'Global balance summary calculated successfully', summary);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  recordSettlement,
  getGroupSettlements,
  getSettlementDetails,
  updateSettlement,
  reverseSettlement,
  getGroupBalances,
  getSettlementSuggestions,
  getUserGlobalSummary
};
