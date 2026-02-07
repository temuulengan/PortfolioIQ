/**
 * Helper utility functions for PortfolioIQ
 */

import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

// ==================== FORMATTING FUNCTIONS ====================

/**
 * Format currency value
 */
export const formatCurrency = (value, currency = 'USD', decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

/**
 * Format percentage
 */
export const formatPercent = (value, decimals = 2) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`;
};

/**
 * Format large numbers with abbreviations (K, M, B)
 */
export const formatNumber = (value) => {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
};

/**
 * Format date using date-fns
 */
export const formatDate = (date, formatType = 'short') => {
  if (!date) return 'N/A';
  
  // Handle Firebase Timestamp
  let d;
  if (date?.toDate && typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = parseISO(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return 'Invalid Date';
  }
  
  if (!isValid(d)) return 'Invalid Date';
  
  try {
    if (formatType === 'short') {
      return format(d, 'MMM d, yyyy');
    } else if (formatType === 'long') {
      return format(d, 'MMMM d, yyyy');
    } else if (formatType === 'time') {
      return format(d, 'MMM d, h:mm a');
    } else if (formatType === 'full') {
      return format(d, 'EEEE, MMMM d, yyyy');
    }
    
    return format(d, 'P'); // Default format
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
export const formatRelativeTime = (date) => {
  if (!date) return 'N/A';
  
  // Handle Firebase Timestamp
  let d;
  if (date?.toDate && typeof date.toDate === 'function') {
    d = date.toDate();
  } else if (typeof date === 'string') {
    d = parseISO(date);
  } else if (date instanceof Date) {
    d = date;
  } else {
    return 'Unknown';
  }
  
  if (!isValid(d)) return 'Invalid Date';
  
  try {
    return formatDistanceToNow(d, { addSuffix: true });
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return 'Invalid Date';
  }
};

// ==================== VALIDATION FUNCTIONS ====================

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isValidPassword = (password) => {
  return password.length >= 6;
};

/**
 * Validate stock symbol format
 */
export const isValidSymbol = (symbol) => {
  const symbolRegex = /^[A-Z]{1,5}$/;
  return symbolRegex.test(symbol.toUpperCase());
};

/**
 * Validate positive number
 */
export const isPositiveNumber = (value) => {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
};

/**
 * Validate date is not in future
 */
export const isValidPurchaseDate = (date) => {
  const purchaseDate = new Date(date);
  const today = new Date();
  return purchaseDate <= today;
};

// ==================== COLOR HELPERS ====================

/**
 * Get color based on value (red for negative, green for positive)
 */
export const getColorForValue = (value, colors) => {
  if (value > 0) return colors.success;
  if (value < 0) return colors.error;
  return colors.text;
};

/**
 * Get risk level color
 */
export const getRiskColor = (riskLevel, colors) => {
  switch (riskLevel) {
    case 'low':
      return colors.success;
    case 'medium':
      return colors.warning;
    case 'high':
      return colors.error;
    default:
      return colors.text;
  }
};

// ==================== DATA PROCESSING ====================

/**
 * Group array by key
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Sort array by key
 */
export const sortBy = (array, key, order = 'asc') => {
  return [...array].sort((a, b) => {
    const aValue = a[key];
    const bValue = b[key];
    
    if (order === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
};

/**
 * Calculate sum of array values
 */
export const sumBy = (array, key) => {
  return array.reduce((sum, item) => sum + (item[key] || 0), 0);
};

/**
 * Calculate average of array values
 */
export const averageBy = (array, key) => {
  if (array.length === 0) return 0;
  return sumBy(array, key) / array.length;
};

/**
 * Debounce function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// ==================== STORAGE HELPERS ====================

/**
 * Safely parse JSON
 */
export const safeJSONParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Safely stringify JSON
 */
export const safeJSONStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch (error) {
    return defaultValue;
  }
};

// ==================== ERROR HANDLING ====================

/**
 * Get user-friendly error message
 */
export const getErrorMessage = (error) => {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    // Firebase error messages
    if (error.message.includes('auth/user-not-found')) {
      return 'No account found with this email';
    }
    if (error.message.includes('auth/wrong-password')) {
      return 'Incorrect password';
    }
    if (error.message.includes('auth/email-already-in-use')) {
      return 'Email already registered';
    }
    if (error.message.includes('auth/weak-password')) {
      return 'Password should be at least 6 characters';
    }
    if (error.message.includes('auth/invalid-email')) {
      return 'Invalid email address';
    }
    if (error.message.includes('auth/too-many-requests')) {
      return 'Too many attempts. Please try again later';
    }
    
    return error.message;
  }
  
  return 'An unexpected error occurred';
};

/**
 * Log error with context
 */
export const logError = (context, error) => {
  console.error(`[${context}]`, error);
  // In production, you might want to send this to an error tracking service
};

// ==================== CLIPBOARD ====================

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text) => {
  try {
    // For web
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  } catch (error) {
    logError('Clipboard', error);
    return false;
  }
};

// ==================== RANDOM GENERATORS ====================

/**
 * Generate random ID
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Generate random color
 */
export const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', 
    '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};
