const ApiError = require('../utils/apiError');

/**
 * Currency & Split Calculation Engine
 * 
 * Financial precision rules:
 * 1. All internal monetary amounts are handled as integer cents/paise.
 * 2. Floating-point numbers are strictly converted to integers before split calculation.
 * 3. Indivisible remainder cents are distributed deterministically to guarantee
 *    that the sum of split allocations strictly equals the total expense amount.
 */

// Convert decimal amount (12.50) to integer cents (1250)
const toCents = (amount) => {
  if (amount === undefined || amount === null || amount === '') {
    throw new ApiError(400, 'Expense amount is required.');
  }
  if (typeof amount === 'number') {
    if (isNaN(amount) || !isFinite(amount) || amount <= 0) {
      throw new ApiError(400, 'Expense amount must be a valid positive number.');
    }
    return Math.round(amount * 100);
  }
  const parsed = parseFloat(amount);
  if (isNaN(parsed) || !isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, 'Expense amount must be a valid positive number.');
  }
  return Math.round(parsed * 100);
};

// Convert integer cents (1250) to formatted decimal string (12.50)
const toDecimal = (cents) => {
  if (typeof cents !== 'number' || isNaN(cents)) return '0.00';
  return (cents / 100).toFixed(2);
};

/**
 * A. Equal Split
 * Divides totalCents equally among selected userIds.
 * Indivisible remainder cents are distributed (+1 cent) to the first R participants.
 */
const calculateEqualSplit = (totalCents, userIds) => {
  if (!Array.isArray(userIds) || userIds.length === 0) {
    throw new ApiError(400, 'At least one participant is required for equal split.');
  }

  // Ensure unique participant IDs
  const stringIds = userIds.map((id) => (id._id || id.userId?._id || id.userId || id).toString());
  const uniqueIds = Array.from(new Set(stringIds));
  if (uniqueIds.length !== stringIds.length) {
    throw new ApiError(400, 'Duplicate participants detected in split.');
  }

  const count = uniqueIds.length;
  const baseAmount = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  return uniqueIds.map((userId) => {
    let amount = baseAmount;
    if (remainder > 0) {
      amount += 1;
      remainder -= 1;
    }
    return {
      userId,
      amount
    };
  });
};

/**
 * B. Exact Amount Split
 * Validates that participant amounts are non-negative and sum exactly to totalCents.
 */
const calculateExactSplit = (totalCents, splitEntries) => {
  if (!Array.isArray(splitEntries) || splitEntries.length === 0) {
    throw new ApiError(400, 'Exact split entries are required.');
  }

  const seenIds = new Set();
  let runningSum = 0;

  const calculated = splitEntries.map((item) => {
    const rawId = (item.userId?._id || item.userId || '').toString();
    if (!rawId) {
      throw new ApiError(400, 'Invalid participant ID in exact split.');
    }
    if (seenIds.has(rawId)) {
      throw new ApiError(400, 'Duplicate participants detected in exact split.');
    }
    seenIds.add(rawId);

    let amountInCents;
    if (item.amountInCents !== undefined) {
      amountInCents = parseInt(item.amountInCents, 10);
    } else if (typeof item.amount === 'number') {
      amountInCents = Math.round(item.amount * 100);
    } else {
      const parsed = parseFloat(item.amount);
      if (isNaN(parsed) || parsed < 0) {
        throw new ApiError(400, `Invalid amount for participant ${rawId}.`);
      }
      amountInCents = Math.round(parsed * 100);
    }

    if (isNaN(amountInCents) || amountInCents < 0) {
      throw new ApiError(400, 'Participant amounts cannot be negative or invalid.');
    }

    runningSum += amountInCents;

    return {
      userId: rawId,
      amount: amountInCents
    };
  });

  if (runningSum !== totalCents) {
    throw new ApiError(
      400,
      `Exact split total ($${toDecimal(runningSum)}) does not match the expense total ($${toDecimal(totalCents)}). Difference: $${toDecimal(Math.abs(totalCents - runningSum))}.`
    );
  }

  return calculated;
};

/**
 * C. Percentage Split
 * Validates percentages sum to 100% and calculates minor units with delta reconciliation.
 */
const calculatePercentageSplit = (totalCents, percentageEntries) => {
  if (!Array.isArray(percentageEntries) || percentageEntries.length === 0) {
    throw new ApiError(400, 'Percentage split entries are required.');
  }

  const seenIds = new Set();
  let totalPercentage = 0;

  const normalized = percentageEntries.map((item) => {
    const rawId = (item.userId?._id || item.userId || '').toString();
    if (!rawId) {
      throw new ApiError(400, 'Invalid participant ID in percentage split.');
    }
    if (seenIds.has(rawId)) {
      throw new ApiError(400, 'Duplicate participants detected in percentage split.');
    }
    seenIds.add(rawId);

    const percent = parseFloat(item.percentage);
    if (isNaN(percent) || percent < 0) {
      throw new ApiError(400, `Percentage for participant ${rawId} must be non-negative.`);
    }

    totalPercentage += percent;

    return {
      userId: rawId,
      percentage: percent
    };
  });

  // Validate percentage sum (allow tiny float variance like 99.99% - 100.01%)
  if (Math.abs(totalPercentage - 100) > 0.05) {
    throw new ApiError(
      400,
      `Percentage split values must sum to 100%. Current sum: ${totalPercentage.toFixed(2)}%.`
    );
  }

  let allocatedSum = 0;
  const splits = normalized.map((item) => {
    const calculatedAmount = Math.floor((item.percentage / 100) * totalCents);
    allocatedSum += calculatedAmount;
    return {
      userId: item.userId,
      amount: calculatedAmount,
      percentage: item.percentage
    };
  });

  // Distribute remainder cents to participants with largest percentage share
  let remainder = totalCents - allocatedSum;
  if (remainder > 0) {
    const sortedIndices = splits
      .map((item, index) => ({ index, percentage: item.percentage }))
      .sort((a, b) => b.percentage - a.percentage);

    for (let i = 0; i < sortedIndices.length && remainder > 0; i++) {
      splits[sortedIndices[i].index].amount += 1;
      remainder -= 1;
    }
  }

  return splits;
};

/**
 * D. Shares / Weighted Split
 * Divides proportionally according to positive integer weights.
 */
const calculateSharesSplit = (totalCents, sharesEntries) => {
  if (!Array.isArray(sharesEntries) || sharesEntries.length === 0) {
    throw new ApiError(400, 'Shares split entries are required.');
  }

  const seenIds = new Set();
  let totalShares = 0;

  const normalized = sharesEntries.map((item) => {
    const rawId = (item.userId?._id || item.userId || '').toString();
    if (!rawId) {
      throw new ApiError(400, 'Invalid participant ID in shares split.');
    }
    if (seenIds.has(rawId)) {
      throw new ApiError(400, 'Duplicate participants detected in shares split.');
    }
    seenIds.add(rawId);

    const shares = parseInt(item.shares, 10);
    if (isNaN(shares) || shares <= 0) {
      throw new ApiError(400, `Shares for participant ${rawId} must be a positive integer (>= 1).`);
    }

    totalShares += shares;

    return {
      userId: rawId,
      shares
    };
  });

  if (totalShares <= 0) {
    throw new ApiError(400, 'Total shares must be greater than zero.');
  }

  let allocatedSum = 0;
  const splits = normalized.map((item) => {
    const calculatedAmount = Math.floor((item.shares / totalShares) * totalCents);
    allocatedSum += calculatedAmount;
    return {
      userId: item.userId,
      amount: calculatedAmount,
      shares: item.shares
    };
  });

  // Distribute indivisible remainder cents to participants with highest shares
  let remainder = totalCents - allocatedSum;
  if (remainder > 0) {
    const sortedIndices = splits
      .map((item, index) => ({ index, shares: item.shares }))
      .sort((a, b) => b.shares - a.shares);

    for (let i = 0; i < sortedIndices.length && remainder > 0; i++) {
      splits[sortedIndices[i].index].amount += 1;
      remainder -= 1;
    }
  }

  return splits;
};

/**
 * Master Split Dispatcher & Validator
 */
const validateAndCalculateSplit = (totalCents, splitType, entries, groupMembers) => {
  if (!totalCents || totalCents <= 0) {
    throw new ApiError(400, 'Expense amount must be greater than zero.');
  }

  const type = (splitType || 'EQUAL').toUpperCase();

  // Validate group membership of all participants
  const memberIdSet = new Set(
    (groupMembers || []).map((m) => (m.userId?._id || m.userId || '').toString())
  );

  let calculatedSplits = [];

  switch (type) {
    case 'EQUAL': {
      let participantIds;
      if (Array.isArray(entries) && entries.length > 0) {
        participantIds = entries.map((e) => (e.userId?._id || e.userId || e).toString());
      } else {
        participantIds = Array.from(memberIdSet);
      }

      participantIds.forEach((id) => {
        if (!memberIdSet.has(id)) {
          throw new ApiError(400, `Participant ${id} is not a member of this group.`);
        }
      });

      calculatedSplits = calculateEqualSplit(totalCents, participantIds);
      break;
    }

    case 'EXACT': {
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new ApiError(400, 'Exact split allocations are required.');
      }
      entries.forEach((e) => {
        const id = (e.userId?._id || e.userId || '').toString();
        if (!memberIdSet.has(id)) {
          throw new ApiError(400, `Participant ${id} is not a member of this group.`);
        }
      });
      calculatedSplits = calculateExactSplit(totalCents, entries);
      break;
    }

    case 'PERCENTAGE': {
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new ApiError(400, 'Percentage split allocations are required.');
      }
      entries.forEach((e) => {
        const id = (e.userId?._id || e.userId || '').toString();
        if (!memberIdSet.has(id)) {
          throw new ApiError(400, `Participant ${id} is not a member of this group.`);
        }
      });
      calculatedSplits = calculatePercentageSplit(totalCents, entries);
      break;
    }

    case 'SHARES': {
      if (!Array.isArray(entries) || entries.length === 0) {
        throw new ApiError(400, 'Shares split allocations are required.');
      }
      entries.forEach((e) => {
        const id = (e.userId?._id || e.userId || '').toString();
        if (!memberIdSet.has(id)) {
          throw new ApiError(400, `Participant ${id} is not a member of this group.`);
        }
      });
      calculatedSplits = calculateSharesSplit(totalCents, entries);
      break;
    }

    default:
      throw new ApiError(400, `Unsupported split type: ${splitType}. Must be EQUAL, EXACT, PERCENTAGE, or SHARES.`);
  }

  // Final sanity check: strictly verify allocation sum === totalCents
  const finalSum = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
  if (finalSum !== totalCents) {
    throw new ApiError(
      500,
      `Financial precision fault: Split total ($${toDecimal(finalSum)}) does not match expense amount ($${toDecimal(totalCents)}).`
    );
  }

  return {
    splitType: type,
    splits: calculatedSplits
  };
};

module.exports = {
  toCents,
  toDecimal,
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  validateAndCalculateSplit
};
