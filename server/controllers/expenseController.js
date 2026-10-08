const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { toCents, toDecimal, validateAndCalculateSplit } = require('../services/splitEngine');
const { calculateGroupBalances } = require('../services/balanceService');
const notificationService = require('../services/notificationService');

/**
 * POST /api/v1/groups/:groupId/expenses — Record a new group expense
 */
const addExpense = async (req, res, next) => {
  try {
    const { title, description, totalAmount, paidBy, splitType, splits, category, expenseDate, notes } = req.body;
    const group = req.group;

    // Reject operations on archived groups
    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot add expenses to an archived group. Please unarchive the group first.'));
    }

    const expenseTitle = (title || description || '').trim();
    if (!expenseTitle) {
      return next(new ApiError(400, 'Expense description/title is required.'));
    }

    if (expenseTitle.length > 100) {
      return next(new ApiError(400, 'Expense title cannot exceed 100 characters.'));
    }

    if (!totalAmount) {
      return next(new ApiError(400, 'Expense amount is required.'));
    }

    const totalCents = toCents(totalAmount);
    if (totalCents <= 0) {
      return next(new ApiError(400, 'Expense amount must be greater than zero.'));
    }

    if (totalCents > 10000000000) {
      return next(new ApiError(400, 'Expense amount exceeds maximum allowed limit.'));
    }

    // Verify paidBy is a registered member of the group
    const payerId = (paidBy || req.user._id).toString();
    const isPayerMember = group.members.some(
      (m) => m.userId && (m.userId._id || m.userId).toString() === payerId
    );

    if (!isPayerMember) {
      return next(new ApiError(400, 'Payer must be an active member of this group.'));
    }

    const splitEntries = splits || req.body.participantIds || req.body.participants;

    // Execute Split Engine to calculate and validate exact integer splits
    const { splitType: finalSplitType, splits: calculatedSplits } = validateAndCalculateSplit(
      totalCents,
      splitType,
      splitEntries,
      group.members
    );

    const categoryMap = {
      food: 'Food',
      transport: 'Transportation',
      transportation: 'Transportation',
      accommodation: 'Accommodation',
      housing: 'Accommodation',
      entertainment: 'Entertainment',
      utilities: 'Utilities',
      groceries: 'Groceries',
      general: 'General',
      other: 'Other'
    };
    const selectedCategory = category ? (categoryMap[category.toLowerCase()] || 'General') : 'General';

    const expense = await Expense.create({
      groupId: group._id,
      title: expenseTitle,
      totalAmount: totalCents,
      currency: group.currency || 'INR',
      paidBy: payerId,
      splitType: finalSplitType,
      splits: calculatedSplits,
      category: selectedCategory,
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      notes: notes ? notes.trim() : '',
      createdBy: req.user._id
    });

    const currSymbol = group.currency === 'INR' ? '₹' : (group.currency === 'EUR' ? '€' : (group.currency === 'GBP' ? '£' : '$'));
    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'EXPENSE_ADDED',
      targetId: expense._id,
      summary: `${req.user.name} recorded expense "${expense.title}" for ${currSymbol}${toDecimal(totalCents)} (${finalSplitType} split).`,
      metadata: { totalAmount: totalCents, splitType: finalSplitType, category: selectedCategory }
    });

    // In-App Notification Trigger
    try {
      await notificationService.notifyExpenseCreated(expense, req.user, group);
    } catch (err) {
      console.error('[ExpenseController] Notification trigger error:', err.message);
    }

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatarUrl')
      .populate('splits.userId', 'name email avatarUrl')
      .populate('createdBy', 'name email');

    const updatedBalances = await calculateGroupBalances(group._id);

    return sendSuccess(res, 201, 'Expense recorded successfully', {
      expense: populatedExpense,
      balances: updatedBalances
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/:groupId/expenses — List expenses with filters and pagination
 */
const getExpenses = async (req, res, next) => {
  try {
    const { category, search, paidBy, startDate, endDate, page = 1, limit = 50 } = req.query;
    const query = { groupId: req.group._id };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (paidBy && mongoose.isValidObjectId(paidBy)) {
      query.paidBy = paidBy;
    }

    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { notes: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    if (startDate || endDate) {
      query.expenseDate = {};
      if (startDate) query.expenseDate.$gte = new Date(startDate);
      if (endDate) query.expenseDate.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [expenses, total, totalAggregate] = await Promise.all([
      Expense.find(query)
        .populate('paidBy', 'name email avatarUrl')
        .populate('splits.userId', 'name email avatarUrl')
        .populate('createdBy', 'name email')
        .populate('lastEditedBy', 'name')
        .sort({ expenseDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Expense.countDocuments(query),
      Expense.aggregate([
        { $match: { groupId: req.group._id } },
        { $group: { _id: null, totalSpent: { $sum: '$totalAmount' } } }
      ])
    ]);

    const totalGroupSpending = totalAggregate.length > 0 ? totalAggregate[0].totalSpent : 0;

    return sendSuccess(res, 200, 'Expenses retrieved successfully', {
      expenses,
      totalGroupSpending,
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
 * GET /api/v1/groups/:groupId/expenses/:expenseId — Get single expense details
 */
const getExpenseDetails = async (req, res, next) => {
  try {
    const { expenseId } = req.params;

    if (!mongoose.isValidObjectId(expenseId)) {
      return next(new ApiError(400, 'Invalid Expense ID format.'));
    }

    const expense = await Expense.findOne({ _id: expenseId, groupId: req.group._id })
      .populate('paidBy', 'name email avatarUrl')
      .populate('splits.userId', 'name email avatarUrl')
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name email');

    if (!expense) {
      return next(new ApiError(404, 'Expense not found in this group.'));
    }

    return sendSuccess(res, 200, 'Expense details retrieved', expense);
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH / PUT /api/v1/groups/:groupId/expenses/:expenseId — Update an existing expense
 */
const updateExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const group = req.group;
    const currentUserId = req.user._id.toString();
    const callerRole = req.userMemberRole; // 'owner' | 'admin' | 'member'

    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot modify expenses in an archived group.'));
    }

    if (!mongoose.isValidObjectId(expenseId)) {
      return next(new ApiError(400, 'Invalid Expense ID.'));
    }

    const expense = await Expense.findOne({ _id: expenseId, groupId: group._id });
    if (!expense) {
      return next(new ApiError(404, 'Expense not found in this group.'));
    }

    // Authorization check: Only expense creator, payer, group admin, or owner can edit
    const isCreator = expense.createdBy.toString() === currentUserId;
    const isPayer = expense.paidBy.toString() === currentUserId;
    const isPrivileged = callerRole === 'owner' || callerRole === 'admin';

    if (!isCreator && !isPayer && !isPrivileged) {
      return next(new ApiError(403, 'You do not have permission to edit this expense.'));
    }

    const { title, description, totalAmount, paidBy, splitType, splits, category, expenseDate, notes } = req.body;

    if (title !== undefined || description !== undefined) {
      const updatedTitle = (title || description || '').trim();
      if (!updatedTitle) {
        return next(new ApiError(400, 'Expense title cannot be empty.'));
      }
      expense.title = updatedTitle;
    }

    if (notes !== undefined) {
      expense.notes = notes.trim();
    }

    if (category !== undefined) {
      const categoryMap = {
        food: 'Food',
        transport: 'Transportation',
        transportation: 'Transportation',
        accommodation: 'Accommodation',
        housing: 'Accommodation',
        entertainment: 'Entertainment',
        utilities: 'Utilities',
        groceries: 'Groceries',
        general: 'General',
        other: 'Other'
      };
      expense.category = categoryMap[category.toLowerCase()] || category;
    }

    if (expenseDate !== undefined) {
      expense.expenseDate = new Date(expenseDate);
    }

    if (paidBy !== undefined) {
      const payerId = paidBy.toString();
      const isMember = group.members.some(
        (m) => m.userId && (m.userId._id || m.userId).toString() === payerId
      );
      if (!isMember) {
        return next(new ApiError(400, 'Updated payer must be a member of this group.'));
      }
      expense.paidBy = payerId;
    }

    // Recompute splits if totalAmount, splitType, or splits array is modified
    if (totalAmount !== undefined || splitType !== undefined || splits !== undefined || req.body.participantIds !== undefined) {
      const newTotalCents = totalAmount !== undefined ? toCents(totalAmount) : expense.totalAmount;
      const newSplitType = splitType || expense.splitType;
      const newSplitsInput = splits !== undefined ? splits : (req.body.participantIds || expense.splits);

      const { splitType: finalType, splits: calculated } = validateAndCalculateSplit(
        newTotalCents,
        newSplitType,
        newSplitsInput,
        group.members
      );

      expense.totalAmount = newTotalCents;
      expense.splitType = finalType;
      expense.splits = calculated;
    }

    expense.isEdited = true;
    expense.lastEditedBy = req.user._id;

    await expense.save();

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'EXPENSE_UPDATED',
      targetId: expense._id,
      summary: `${req.user.name} updated expense "${expense.title}".`,
      metadata: { totalAmount: expense.totalAmount, splitType: expense.splitType }
    });

    // In-App Notification Trigger
    try {
      await notificationService.notifyExpenseUpdated(expense, req.user, group);
    } catch (err) {
      console.error('[ExpenseController] Update notification trigger error:', err.message);
    }

    const populatedExpense = await Expense.findById(expense._id)
      .populate('paidBy', 'name email avatarUrl')
      .populate('splits.userId', 'name email avatarUrl')
      .populate('createdBy', 'name email')
      .populate('lastEditedBy', 'name');

    const updatedBalances = await calculateGroupBalances(group._id);

    return sendSuccess(res, 200, 'Expense updated successfully', {
      expense: populatedExpense,
      balances: updatedBalances
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/v1/groups/:groupId/expenses/:expenseId — Delete an expense
 */
const deleteExpense = async (req, res, next) => {
  try {
    const { expenseId } = req.params;
    const group = req.group;
    const currentUserId = req.user._id.toString();
    const callerRole = req.userMemberRole;

    if (group.isArchived) {
      return next(new ApiError(400, 'Cannot delete expenses from an archived group.'));
    }

    if (!mongoose.isValidObjectId(expenseId)) {
      return next(new ApiError(400, 'Invalid Expense ID.'));
    }

    const expense = await Expense.findOne({ _id: expenseId, groupId: group._id });
    if (!expense) {
      return next(new ApiError(404, 'Expense not found in this group.'));
    }

    // Authorization check: Only creator, payer, admin, or owner can delete
    const isCreator = expense.createdBy.toString() === currentUserId;
    const isPayer = expense.paidBy.toString() === currentUserId;
    const isPrivileged = callerRole === 'owner' || callerRole === 'admin';

    if (!isCreator && !isPayer && !isPrivileged) {
      return next(new ApiError(403, 'You do not have permission to delete this expense.'));
    }

    await Expense.findByIdAndDelete(expense._id);

    await ActivityLog.create({
      groupId: group._id,
      performedBy: req.user._id,
      action: 'EXPENSE_DELETED',
      summary: `${req.user.name} deleted expense "${expense.title}" ($${toDecimal(expense.totalAmount)}).`
    });

    // In-App Notification Trigger
    try {
      await notificationService.notifyExpenseDeleted(expense, req.user, group);
    } catch (err) {
      console.error('[ExpenseController] Delete notification trigger error:', err.message);
    }

    const updatedBalances = await calculateGroupBalances(group._id);

    return sendSuccess(res, 200, 'Expense deleted successfully', {
      balances: updatedBalances
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addExpense,
  getExpenses,
  getExpenseDetails,
  updateExpense,
  deleteExpense
};
