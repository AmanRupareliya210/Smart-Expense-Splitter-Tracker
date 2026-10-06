/**
 * Currency & Split Math Utilities
 * All internal monetary calculations are performed in minor currency units (cents/paise)
 * as integers to guarantee zero floating point loss.
 */

// Convert human readable decimal currency ($12.50) to integer cents (1250)
const toCents = (amount) => {
  if (typeof amount === 'number') {
    return Math.round(amount * 100);
  }
  const parsed = parseFloat(amount);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
};

// Convert integer cents (1250) to formatted float string (12.50)
const toDecimal = (cents) => {
  return (cents / 100).toFixed(2);
};

// Equal split: distributes remainder cents evenly among the first R members
const calculateEqualSplits = (totalCents, userIds) => {
  const count = userIds.length;
  if (count === 0) return [];

  const baseAmount = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  return userIds.map((userId) => {
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

// Exact splits: verifies that the exact items sum exactly to totalCents
const validateAndCalculateExactSplits = (totalCents, splitEntries) => {
  let runningSum = 0;
  const splits = splitEntries.map((item) => {
    const amount = typeof item.amount === 'number' && Number.isInteger(item.amount) 
      ? item.amount 
      : toCents(item.amount);
    runningSum += amount;
    return {
      userId: item.userId,
      amount
    };
  });

  if (runningSum !== totalCents) {
    throw new Error(
      `Exact split amounts (${(runningSum / 100).toFixed(2)}) do not match total expense amount (${(totalCents / 100).toFixed(2)})`
    );
  }

  return splits;
};

// Percentage splits: verifies percentages sum to 100% and calculates cents with delta adjustment
const validateAndCalculatePercentageSplits = (totalCents, percentageEntries) => {
  const totalPercent = percentageEntries.reduce((sum, item) => sum + parseFloat(item.percentage || 0), 0);
  
  // Allow microscopic floating margin on percentages (e.g. 33.33 + 33.33 + 33.34 = 100)
  if (Math.abs(totalPercent - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100%. Current sum: ${totalPercent.toFixed(2)}%`);
  }

  let allocatedCents = 0;
  const splits = percentageEntries.map((item) => {
    const percent = parseFloat(item.percentage);
    const amount = Math.floor((percent / 100) * totalCents);
    allocatedCents += amount;
    return {
      userId: item.userId,
      percentage: percent,
      amount
    };
  });

  // Distribute remaining cents if any due to floor
  let remainder = totalCents - allocatedCents;
  if (remainder > 0) {
    // Sort descending by percentage to assign cents to highest share holders
    const sortedIndices = splits
      .map((item, idx) => ({ idx, percentage: item.percentage }))
      .sort((a, b) => b.percentage - a.percentage);

    for (let i = 0; i < remainder; i++) {
      const targetIdx = sortedIndices[i % sortedIndices.length].idx;
      splits[targetIdx].amount += 1;
    }
  }

  return splits;
};

// Shares split: computes split amounts proportionally based on unit shares
const validateAndCalculateSharesSplits = (totalCents, sharesEntries) => {
  const totalShares = sharesEntries.reduce((sum, item) => sum + parseInt(item.shares || 0, 10), 0);
  if (totalShares <= 0) {
    throw new Error('Total shares must be greater than 0');
  }

  let allocatedCents = 0;
  const splits = sharesEntries.map((item) => {
    const shares = parseInt(item.shares, 10);
    const amount = Math.floor((shares / totalShares) * totalCents);
    allocatedCents += amount;
    return {
      userId: item.userId,
      shares,
      amount
    };
  });

  let remainder = totalCents - allocatedCents;
  for (let i = 0; i < remainder; i++) {
    splits[i % splits.length].amount += 1;
  }

  return splits;
};

module.exports = {
  toCents,
  toDecimal,
  calculateEqualSplits,
  validateAndCalculateExactSplits,
  validateAndCalculatePercentageSplits,
  validateAndCalculateSharesSplits
};
