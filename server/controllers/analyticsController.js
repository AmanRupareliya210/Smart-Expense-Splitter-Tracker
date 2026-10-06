const mongoose = require('mongoose');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const ActivityLog = require('../models/ActivityLog');
const ApiError = require('../utils/apiError');
const { sendSuccess } = require('../utils/apiResponse');
const { calculateGroupBalances } = require('../services/balanceService');

/**
 * GET /api/v1/analytics/dashboard — User-level overall financial insights & recent activity
 */
const getUserDashboardAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // Find all groups the user participates in
    const userGroups = await Group.find({ 'members.userId': userId })
      .select('_id name currency category isArchived');

    const groupIds = userGroups.map((g) => g._id);

    if (groupIds.length === 0) {
      return sendSuccess(res, 200, 'User dashboard analytics (Empty)', {
        summary: {
          totalExpensesPaid: 0,
          totalExpensesShare: 0,
          totalOwedToUser: 0,
          totalUserOwes: 0,
          globalNetBalance: 0,
          activeGroupCount: 0,
          archivedGroupCount: 0,
          currency: req.user.defaultCurrency || 'INR'
        },
        groupSummaries: [],
        categorySpending: [],
        recentExpenses: [],
        recentSettlements: [],
        recentActivity: []
      });
    }

    // 1. Compute Cross-Group Net Balances
    let totalOwedToUser = 0;
    let totalUserOwes = 0;
    let totalExpensesPaid = 0;
    let totalExpensesShare = 0;
    const groupSummaries = [];

    for (const grp of userGroups) {
      const groupBal = await calculateGroupBalances(grp._id);
      const userEntry = groupBal.memberBalances.find((m) => m.userId === userId.toString());

      if (userEntry) {
        totalExpensesPaid += userEntry.totalPaid;
        totalExpensesShare += userEntry.totalOwed;

        if (userEntry.netBalance > 0) {
          totalOwedToUser += userEntry.netBalance;
        } else if (userEntry.netBalance < 0) {
          totalUserOwes += Math.abs(userEntry.netBalance);
        }

        groupSummaries.push({
          groupId: grp._id,
          groupName: grp.name,
          currency: grp.currency,
          category: grp.category,
          isArchived: grp.isArchived,
          userNetBalance: userEntry.netBalance,
          userPaid: userEntry.totalPaid,
          userShare: userEntry.totalOwed,
          status: userEntry.status,
          totalSpending: groupBal.totalSpending
        });
      }
    }

    // 2. Aggregate Category Spending Share for the User
    const categorySpending = await Expense.aggregate([
      {
        $match: {
          groupId: { $in: groupIds },
          'splits.userId': userId
        }
      },
      { $unwind: '$splits' },
      {
        $match: {
          'splits.userId': userId
        }
      },
      {
        $group: {
          _id: '$category',
          userShareAmount: { $sum: '$splits.amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { userShareAmount: -1 } }
    ]);

    // 3. Fetch Recent Expenses Involving the User
    const recentExpenses = await Expense.find({
      groupId: { $in: groupIds },
      $or: [{ paidBy: userId }, { 'splits.userId': userId }]
    })
      .populate('groupId', 'name currency category')
      .populate('paidBy', 'name email avatarUrl')
      .populate('splits.userId', 'name email avatarUrl')
      .sort({ expenseDate: -1, createdAt: -1 })
      .limit(8);

    // 4. Fetch Recent Settlements Involving the User
    const recentSettlements = await Settlement.find({
      groupId: { $in: groupIds },
      $or: [{ paidBy: userId }, { paidTo: userId }]
    })
      .populate('groupId', 'name currency')
      .populate('paidBy', 'name email avatarUrl')
      .populate('paidTo', 'name email avatarUrl')
      .sort({ settledAt: -1, createdAt: -1 })
      .limit(8);

    // 5. Fetch Recent Activity across User's Groups
    const recentActivity = await ActivityLog.find({ groupId: { $in: groupIds } })
      .populate('groupId', 'name')
      .populate('performedBy', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .limit(8);

    const activeGroups = userGroups.filter((g) => !g.isArchived);
    const archivedGroups = userGroups.filter((g) => g.isArchived);

    return sendSuccess(res, 200, 'User dashboard analytics fetched successfully', {
      summary: {
        totalExpensesPaid,
        totalExpensesShare,
        totalOwedToUser,
        totalUserOwes,
        globalNetBalance: totalOwedToUser - totalUserOwes,
        activeGroupCount: activeGroups.length,
        archivedGroupCount: archivedGroups.length,
        currency: req.user.defaultCurrency || 'INR'
      },
      groupSummaries,
      categorySpending,
      recentExpenses,
      recentSettlements,
      recentActivity
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/:groupId/analytics — Group-level spending analytics with date range & category filters
 */
const getGroupAnalytics = async (req, res, next) => {
  try {
    const groupId = req.group._id;
    const { startDate, endDate, category, timeRange } = req.query;

    const matchQuery = { groupId };

    // Date range filtering
    if (startDate || endDate) {
      matchQuery.expenseDate = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return next(new ApiError(400, 'Invalid startDate format. Must be a valid date.'));
        }
        matchQuery.expenseDate.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return next(new ApiError(400, 'Invalid endDate format. Must be a valid date.'));
        }
        // Set end of day if only date is passed
        end.setHours(23, 59, 59, 999);
        matchQuery.expenseDate.$lte = end;
      }
    } else if (timeRange) {
      const now = new Date();
      if (timeRange === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        matchQuery.expenseDate = { $gte: firstDay };
      } else if (timeRange === 'last_30_days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchQuery.expenseDate = { $gte: past30 };
      } else if (timeRange === 'last_90_days') {
        const past90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        matchQuery.expenseDate = { $gte: past90 };
      } else if (timeRange === 'this_year') {
        const firstDayYear = new Date(now.getFullYear(), 0, 1);
        matchQuery.expenseDate = { $gte: firstDayYear };
      }
    }

    // Category filter
    if (category && category !== 'All' && category !== 'all') {
      matchQuery.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // 1. Overall Summary in Filter Window
    const summaryAgg = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalSpending: { $sum: '$totalAmount' },
          expenseCount: { $sum: 1 },
          avgExpenseAmount: { $avg: '$totalAmount' },
          minExpenseAmount: { $min: '$totalAmount' },
          maxExpenseAmount: { $max: '$totalAmount' }
        }
      }
    ]);

    const totalSpending = summaryAgg.length > 0 ? summaryAgg[0].totalSpending : 0;
    const expenseCount = summaryAgg.length > 0 ? summaryAgg[0].expenseCount : 0;
    const avgExpenseAmount = summaryAgg.length > 0 ? Math.round(summaryAgg[0].avgExpenseAmount) : 0;

    // 2. Category Breakdown
    const categoryStats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const enrichedCategoryStats = categoryStats.map((item) => ({
      category: item._id,
      totalAmount: item.totalAmount,
      count: item.count,
      percentage: totalSpending > 0 ? Number(((item.totalAmount / totalSpending) * 100).toFixed(1)) : 0
    }));

    // 3. Monthly / Timeline Trends
    const monthlyStats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: {
            year: { $year: '$expenseDate' },
            month: { $month: '$expenseDate' }
          },
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const formattedMonthlyStats = monthlyStats.map((item) => {
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthLabel = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      return {
        year: item._id.year,
        month: item._id.month,
        label: monthLabel,
        totalAmount: item.totalAmount,
        count: item.count
      };
    });

    // 4. Payer Upfront Contribution Distribution
    const payerStats = await Expense.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$paidBy',
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          email: '$user.email',
          avatarUrl: '$user.avatarUrl',
          totalAmount: 1,
          count: 1
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    const enrichedPayerStats = payerStats.map((item) => ({
      ...item,
      percentage: totalSpending > 0 ? Number(((item.totalAmount / totalSpending) * 100).toFixed(1)) : 0
    }));

    return sendSuccess(res, 200, 'Group analytics generated successfully', {
      currency: req.group.currency || 'INR',
      summary: {
        totalSpending,
        expenseCount,
        avgExpenseAmount
      },
      categoryStats: enrichedCategoryStats,
      monthlyStats: formattedMonthlyStats,
      payerStats: enrichedPayerStats,
      appliedFilters: {
        startDate: startDate || null,
        endDate: endDate || null,
        category: category || 'All',
        timeRange: timeRange || 'all'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/v1/groups/:groupId/activity — Group activity log timeline with pagination
 */
const getGroupActivity = async (req, res, next) => {
  try {
    const { limit, page } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find({ groupId: req.group._id })
        .populate('performedBy', 'name email avatarUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      ActivityLog.countDocuments({ groupId: req.group._id })
    ]);

    return sendSuccess(res, 200, 'Group activity logs fetched successfully', {
      logs,
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

module.exports = {
  getUserDashboardAnalytics,
  getGroupAnalytics,
  getGroupActivity
};
