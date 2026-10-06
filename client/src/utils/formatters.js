import { CURRENCY_SYMBOLS } from './constants';

// Format cents (1250) to formatted currency (₹12.50)
export const formatCurrency = (cents, currency = 'INR') => {
  const symbol = CURRENCY_SYMBOLS[currency] || '₹';
  const amount = (Math.abs(cents || 0) / 100).toFixed(2);
  const sign = (cents || 0) < 0 ? '-' : '';
  return `${sign}${symbol}${amount}`;
};

// Format date (e.g., Oct 6, 2026)
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

// Format date with time (e.g., Oct 6, 2026, 5:30 PM)
export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Generate initials from user name (e.g. "John Doe" -> "JD")
export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
