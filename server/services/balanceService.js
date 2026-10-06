const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { simplifyDebts } = require('./debtSimplifier');

/**
 * Calculates authoritative financial balance state for a single group.
 *
 * Balance Formula & Sign Convention:
 * -------------------------------------------------------------
 * For each member in the group:
 * - totalPaid: Sum of expense payments made by member (cents)
 * - totalOwed: Sum of expense split allocations assigned to member (cents)
 * - settlementsPaid: Sum of active, confirmed settlements paid out by member (cents)
 * - settlementsReceived: Sum of active, confirmed settlements received by member (cents)
 *
 * Net Balance = (totalPaid + settlementsPaid) - (totalOwed + settlementsReceived)
 * - Positive (> 0): Member is owed money ("Gets Back")
 * - Negative (< 0): Member owes money ("Owes")
 * - Zero (= 0): Member is fully settled ("Settled")
 *
 * @param {string|ObjectId} groupId
 * @returns {Promise<Object>} Full group balance report & simplified settlement plan
 */
const calculateGroupBalances = async (groupId) => {
  const group = await Group.findById(groupId)
    .populate('members.userId', 'name email avatarUrl defaultCurrency');

  if (!group) {
    throw new Error('Group not found');
  }

  // Fetch all expenses and active, confirmed settlements in parallel
  const [expenses, settlements] = await Promise.all([
    Expense.find({ groupId })
      .populate('paidBy', 'name email avatarUrl')
      .populate('splits.userId', 'name email avatarUrl'),
    Settlement.find({
      groupId,
      status: 'CONFIRMED',
      isReversed: { $ne: true }
    })
      .populate('paidBy', 'name email avatarUrl')
      .populate('paidTo', 'name email avatarUrl')
  ]);

  // Initialize ledger map for all registered group members
  const memberMap = new Map();
  (group.members || []).forEach((m) => {
    if (m.userId) {
      const uId = (m.userId._id || m.userId).toString();
      memberMap.set(uId, {
        userId: uId,
        name: m.userId.name || 'Member',
        email: m.userId.email || '',
        avatarUrl: m.userId.avatarUrl || '',
        role: m.role || 'member',
        totalPaid: 0,
        totalOwed: 0,
        totalShare: 0, // Backward compatibility alias
        settlementsPaid: 0,
        settlementsReceived: 0,
        netBalance: 0,
        status: 'SETTLED' // 'GETS_BACK' | 'OWES' | 'SETTLED'
      });
    }
  });

  let totalGroupSpending = 0;

  // 1. Process Expenses
  expenses.forEach((expense) => {
    const expenseAmount = expense.totalAmount || 0;
    totalGroupSpending += expenseAmount;
    const payerId = (expense.paidBy?._id || expense.paidBy || '').toString();

    if (memberMap.has(payerId)) {
      memberMap.get(payerId).totalPaid += expenseAmount;
    }

    (expense.splits || []).forEach((split) => {
      const splitUserId = (split.userId?._id || split.userId || '').toString();
      const splitAmount = split.amount || 0;
      if (memberMap.has(splitUserId)) {
        const member = memberMap.get(splitUserId);
        member.totalOwed += splitAmount;
        member.totalShare += splitAmount;
      }
    });
  });

  // 2. Process Confirmed Settlements (Direct repayments)
  settlements.forEach((settlement) => {
    const payerId = (settlement.paidBy?._id || settlement.paidBy || '').toString();
    const receiverId = (settlement.paidTo?._id || settlement.paidTo || '').toString();
    const amount = settlement.amount || 0;

    if (memberMap.has(payerId)) {
      memberMap.get(payerId).settlementsPaid += amount;
    }
    if (memberMap.has(receiverId)) {
      memberMap.get(receiverId).settlementsReceived += amount;
    }
  });

  // 3. Compute Net Balance for each member
  const memberBalances = Array.from(memberMap.values()).map((member) => {
    member.netBalance =
      (member.totalPaid + member.settlementsPaid) -
      (member.totalOwed + member.settlementsReceived);

    if (member.netBalance > 0) {
      member.status = 'GETS_BACK';
    } else if (member.netBalance < 0) {
      member.status = 'OWES';
    } else {
      member.status = 'SETTLED';
    }

    return member;
  });

  // 4. Compute Minimal Settlements via Debt Minimizer Engine
  const simplifiedSettlements = simplifyDebts(memberBalances, group.currency || 'USD');

  return {
    groupId: group._id.toString(),
    groupName: group.name,
    currency: group.currency || 'USD',
    totalSpending: totalGroupSpending,
    expenseCount: expenses.length,
    settlementCount: settlements.length,
    memberBalances,
    simplifiedSettlements
  };
};

/**
 * Calculates global cross-group balance summary for a user.
 */
const calculateUserGlobalBalances = async (userId) => {
  const groups = await Group.find({ 'members.userId': userId }).select('_id name currency isArchived');

  let totalOwedToUser = 0; // Positive (You get back)
  let totalUserOwes = 0;   // Negative (You owe)
  const groupSummaries = [];

  for (const group of groups) {
    const groupBal = await calculateGroupBalances(group._id);
    const userEntry = groupBal.memberBalances.find(
      (m) => m.userId === userId.toString()
    );

    if (userEntry) {
      const userNet = userEntry.netBalance;
      if (userNet > 0) {
        totalOwedToUser += userNet;
      } else if (userNet < 0) {
        totalUserOwes += Math.abs(userNet);
      }

      groupSummaries.push({
        groupId: group._id.toString(),
        groupName: group.name,
        currency: group.currency,
        isArchived: group.isArchived || false,
        userNetBalance: userNet,
        totalPaid: userEntry.totalPaid,
        totalOwed: userEntry.totalOwed,
        totalSpending: groupBal.totalSpending,
        status: userEntry.status
      });
    }
  }

  return {
    totalOwedToUser,
    totalUserOwes,
    globalNetBalance: totalOwedToUser - totalUserOwes,
    groupSummaries
  };
};

module.exports = {
  calculateGroupBalances,
  calculateUserGlobalBalances
};
