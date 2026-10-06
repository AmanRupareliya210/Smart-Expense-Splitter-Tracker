export const CATEGORIES = [
  { id: 'Food', label: 'Food & Dining', icon: 'Utensils', color: '#f59e0b' },
  { id: 'Transportation', label: 'Transportation', icon: 'Car', color: '#3b82f6' },
  { id: 'Accommodation', label: 'Accommodation', icon: 'Home', color: '#8b5cf6' },
  { id: 'Entertainment', label: 'Entertainment', icon: 'Film', color: '#ec4899' },
  { id: 'Utilities', label: 'Bills & Utilities', icon: 'Zap', color: '#10b981' },
  { id: 'Groceries', label: 'Groceries', icon: 'ShoppingCart', color: '#06b6d4' },
  { id: 'General', label: 'General', icon: 'Layers', color: '#6366f1' },
  { id: 'Other', label: 'Other', icon: 'MoreHorizontal', color: '#64748b' }
];

export const GROUP_CATEGORIES = [
  { id: 'Trip', label: 'Trip & Vacation', emoji: '✈️' },
  { id: 'Home', label: 'Housemates & Flat', emoji: '🏠' },
  { id: 'Event', label: 'Event & Party', emoji: '🎉' },
  { id: 'Project', label: 'Work & Project', emoji: '💼' },
  { id: 'Couple', label: 'Couple / Partner', emoji: '❤️' },
  { id: 'Other', label: 'Other', emoji: '📂' }
];

export const SPLIT_TYPES = [
  { id: 'EQUAL', label: 'Split Equally', desc: 'Split amount evenly between all selected members' },
  { id: 'EXACT', label: 'Exact Amounts', desc: 'Specify exact dollar amount each member pays' },
  { id: 'PERCENTAGE', label: 'By Percentage', desc: 'Split by assigning percentage shares to total 100%' },
  { id: 'SHARES', label: 'By Shares', desc: 'Split proportionally based on weighted units (e.g. 2 shares, 1 share)' }
];

export const PAYMENT_METHODS = [
  { id: 'CASH', label: 'Cash' },
  { id: 'UPI', label: 'UPI / Instant Pay' },
  { id: 'BANK_TRANSFER', label: 'Bank Transfer / Wire' },
  { id: 'PAYPAL', label: 'PayPal' },
  { id: 'VENMO', label: 'Venmo' },
  { id: 'OTHER', label: 'Other' }
];

export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'AU$',
  JPY: '¥'
};
