/**
 * Debt Simplification Engine using the Greedy Min-Cash-Flow Algorithm
 * 
 * ALGORITHM OVERVIEW & GUARANTEES:
 * -------------------------------------------------------------
 * 1. Financial Balance Conservation:
 *    Every member's net balance is strictly conserved:
 *    Net Balance = Total Paid - Total Owed + (Settlements Paid - Settlements Received).
 *    Sum of all net balances in a closed group strictly equals zero (within minor rounding).
 * 
 * 2. Greedy Min-Cash-Flow Approach:
 *    - Partition members into Debtors (netBalance < 0) and Creditors (netBalance > 0).
 *    - Sort debtors and creditors descending by balance magnitude (with deterministic ID tie-breaking).
 *    - Greedily settle the maximum possible debt between the largest debtor and largest creditor:
 *      transferAmount = min(debtorOwed, creditorDue).
 *    - Reduce respective balances and advance the pointer when a party reaches 0.
 *    - Terminate when all debts are resolved.
 * 
 * 3. Theoretical Guarantees:
 *    - Produces at most (N - 1) transactions for N participants.
 *    - All proposed transfers are strictly positive (> 0).
 *    - Does not generate self-transfers (fromUser !== toUser).
 *    - Runs in O(N log N) time complexity.
 * 
 * 4. Limitations:
 *    - While greedy heuristic minimizes circular and chain debts efficiently, finding the
 *      absolute theoretical minimum number of transactions across all subsets is an NP-hard
 *      subset-sum partition problem. For all group expense tracking purposes, the greedy
 *      reduction offers near-optimal settlement simplicity with guaranteed correctness.
 */

const ApiError = require('../utils/apiError');

/**
 * Calculates minimal transfer transactions to resolve all group debts.
 *
 * @param {Array<{userId: string, name: string, email: string, avatarUrl: string, netBalance: number}>} memberBalances
 * @param {string} [currency='USD'] Group currency code
 * @returns {Array<{from: {id: string, name: string, email: string, avatarUrl: string}, to: {id: string, name: string, email: string, avatarUrl: string}, amount: number, currency: string}>}
 */
const simplifyDebts = (memberBalances = [], currency = 'USD') => {
  if (!Array.isArray(memberBalances) || memberBalances.length <= 1) {
    return [];
  }

  // Partition members into debtors (netBalance < 0) and creditors (netBalance > 0)
  // All monetary calculations use integer minor units (cents/paise)
  const debtors = [];
  const creditors = [];

  memberBalances.forEach((member) => {
    const rawNet = member.netBalance !== undefined ? member.netBalance : 0;
    const net = Math.round(rawNet);
    const userId = (member.userId?._id || member.userId || member.id || '').toString();

    if (!userId) return;

    if (net < 0) {
      debtors.push({
        id: userId,
        name: member.name || member.userId?.name || 'Member',
        email: member.email || member.userId?.email || '',
        avatarUrl: member.avatarUrl || member.userId?.avatarUrl || '',
        balance: Math.abs(net) // integer cents owed
      });
    } else if (net > 0) {
      creditors.push({
        id: userId,
        name: member.name || member.userId?.name || 'Member',
        email: member.email || member.userId?.email || '',
        avatarUrl: member.avatarUrl || member.userId?.avatarUrl || '',
        balance: net // integer cents to receive
      });
    }
  });

  // If no debtors or creditors exist, group is completely settled
  if (debtors.length === 0 || creditors.length === 0) {
    return [];
  }

  // Deterministic sorting: Descending by balance, tie-break by ID ascending
  debtors.sort((a, b) => b.balance - a.balance || a.id.localeCompare(b.id));
  creditors.sort((a, b) => b.balance - a.balance || a.id.localeCompare(b.id));

  const suggestedTransfers = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const transferAmount = Math.min(debtor.balance, creditor.balance);

    if (transferAmount > 0) {
      suggestedTransfers.push({
        from: {
          id: debtor.id,
          name: debtor.name,
          email: debtor.email,
          avatarUrl: debtor.avatarUrl
        },
        to: {
          id: creditor.id,
          name: creditor.name,
          email: creditor.email,
          avatarUrl: creditor.avatarUrl
        },
        amount: transferAmount, // integer cents
        currency
      });

      debtor.balance -= transferAmount;
      creditor.balance -= transferAmount;
    }

    if (debtor.balance <= 0) {
      dIdx++;
    }
    if (creditor.balance <= 0) {
      cIdx++;
    }
  }

  return suggestedTransfers;
};

module.exports = {
  simplifyDebts
};
