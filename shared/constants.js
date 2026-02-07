/**
 * Application constants
 */

// ==================== COLORS ====================

export const COLORS = {
  primary: '#6200EE',
  primaryDark: '#3700B3',
  primaryLight: '#BB86FC',
  secondary: '#03DAC6',
  secondaryDark: '#018786',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  error: '#B00020',
  success: '#4CAF50',
  warning: '#FF9800',
  text: '#000000',
  textSecondary: '#757575',
  border: '#E0E0E0',
  disabled: '#9E9E9E',
  backdrop: 'rgba(0, 0, 0, 0.5)',
};

// ==================== ASSET TYPES ====================

export const ASSET_TYPES = {
  STOCK: 'stock',
  ETF: 'etf',
  MUTUAL_FUND: 'mutual_fund',
  BOND: 'bond',
  CRYPTO: 'crypto',
  COMMODITY: 'commodity',
  CASH: 'cash',
  OTHER: 'other',
};

export const ASSET_TYPE_LABELS = {
  [ASSET_TYPES.STOCK]: 'Stock',
  [ASSET_TYPES.ETF]: 'ETF',
  [ASSET_TYPES.MUTUAL_FUND]: 'Mutual Fund',
  [ASSET_TYPES.BOND]: 'Bond',
  [ASSET_TYPES.CRYPTO]: 'Cryptocurrency',
  [ASSET_TYPES.COMMODITY]: 'Commodity',
  [ASSET_TYPES.CASH]: 'Cash',
  [ASSET_TYPES.OTHER]: 'Other',
};

// ==================== PORTFOLIO TYPES ====================

export const PORTFOLIO_TYPES = {
  STOCKS: 'stocks',
  RETIREMENT: 'retirement',
  TRADING: 'trading',
  SAVINGS: 'savings',
  CUSTOM: 'custom',
};

export const PORTFOLIO_TYPE_LABELS = {
  [PORTFOLIO_TYPES.STOCKS]: 'Stocks Portfolio',
  [PORTFOLIO_TYPES.RETIREMENT]: 'Retirement Account',
  [PORTFOLIO_TYPES.TRADING]: 'Trading Account',
  [PORTFOLIO_TYPES.SAVINGS]: 'Savings',
  [PORTFOLIO_TYPES.CUSTOM]: 'Custom Portfolio',
};

// ==================== RISK LEVELS ====================

export const RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high',
};

export const RISK_LEVEL_LABELS = {
  [RISK_LEVELS.LOW]: 'Low Risk',
  [RISK_LEVELS.MEDIUM]: 'Medium Risk',
  [RISK_LEVELS.HIGH]: 'High Risk',
  [RISK_LEVELS.VERY_HIGH]: 'Very High Risk',
};

// ==================== TIME PERIODS ====================

export const TIME_PERIODS = {
  '1D': '1d',
  '1W': '5d',
  '1M': '1mo',
  '3M': '3mo',
  '6M': '6mo',
  '1Y': '1y',
  '5Y': '5y',
  'MAX': 'max',
};

export const TIME_PERIOD_LABELS = {
  [TIME_PERIODS['1D']]: '1 Day',
  [TIME_PERIODS['1W']]: '1 Week',
  [TIME_PERIODS['1M']]: '1 Month',
  [TIME_PERIODS['3M']]: '3 Months',
  [TIME_PERIODS['6M']]: '6 Months',
  [TIME_PERIODS['1Y']]: '1 Year',
  [TIME_PERIODS['5Y']]: '5 Years',
  [TIME_PERIODS.MAX]: 'Max',
};

// ==================== CHART INTERVALS ====================

export const CHART_INTERVALS = {
  '1m': '1 Minute',
  '5m': '5 Minutes',
  '15m': '15 Minutes',
  '1h': '1 Hour',
  '1d': '1 Day',
  '1wk': '1 Week',
  '1mo': '1 Month',
};

// ==================== CURRENCIES ====================

export const CURRENCIES = {
  USD: 'USD',
  EUR: 'EUR',
  GBP: 'GBP',
  JPY: 'JPY',
  CAD: 'CAD',
  AUD: 'AUD',
  CHF: 'CHF',
  CNY: 'CNY',
};

export const CURRENCY_SYMBOLS = {
  [CURRENCIES.USD]: '$',
  [CURRENCIES.EUR]: '€',
  [CURRENCIES.GBP]: '£',
  [CURRENCIES.JPY]: '¥',
  [CURRENCIES.CAD]: 'C$',
  [CURRENCIES.AUD]: 'A$',
  [CURRENCIES.CHF]: 'CHF',
  [CURRENCIES.CNY]: '¥',
};

// ==================== ERROR MESSAGES ====================

export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  AUTH_FAILED: 'Authentication failed. Please try again.',
  INVALID_INPUT: 'Invalid input. Please check your data.',
  SERVER_ERROR: 'Server error. Please try again later.',
  NOT_FOUND: 'Resource not found.',
  PERMISSION_DENIED: 'Permission denied.',
  UNKNOWN: 'An unknown error occurred.',
};

// ==================== SUCCESS MESSAGES ====================

export const SUCCESS_MESSAGES = {
  LOGIN: 'Successfully logged in!',
  REGISTER: 'Account created successfully!',
  LOGOUT: 'Successfully logged out!',
  PASSWORD_RESET: 'Password reset email sent!',
  PORTFOLIO_CREATED: 'Portfolio created successfully!',
  PORTFOLIO_UPDATED: 'Portfolio updated successfully!',
  PORTFOLIO_DELETED: 'Portfolio deleted successfully!',
  HOLDING_ADDED: 'Holding added successfully!',
  HOLDING_UPDATED: 'Holding updated successfully!',
  HOLDING_DELETED: 'Holding deleted successfully!',
  PRICES_REFRESHED: 'Prices refreshed successfully!',
};

// ==================== VALIDATION RULES ====================

export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 128,
  MIN_DISPLAY_NAME_LENGTH: 2,
  MAX_DISPLAY_NAME_LENGTH: 50,
  MIN_PORTFOLIO_NAME_LENGTH: 1,
  MAX_PORTFOLIO_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTES_LENGTH: 1000,
  MIN_QUANTITY: 0.000001,
  MAX_QUANTITY: 1000000000,
  MIN_PRICE: 0.01,
  MAX_PRICE: 1000000000,
};

// ==================== CHART COLORS ====================

export const CHART_COLORS = {
  primary: '#6200EE',
  success: '#4CAF50',
  error: '#B00020',
  warning: '#FF9800',
  info: '#2196F3',
  colors: [
    '#6200EE', '#03DAC6', '#FF6B6B', '#4ECDC4',
    '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E2', '#F8B739', '#E74C3C',
  ],
};

// ==================== ANIMATION DURATIONS ====================

export const ANIMATION = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
};

// ==================== SCREEN NAMES ====================

export const SCREENS = {
  AUTH: 'Auth',
  DASHBOARD: 'Dashboard',
  HOLDINGS: 'Holdings',
  ADD_HOLDING: 'AddHolding',
  ANALYTICS: 'Analytics',
  RISK: 'Risk',
  SETTINGS: 'Settings',
};

// ==================== STORAGE KEYS ====================

export const STORAGE_KEYS = {
  USER: '@portfolioiq:user',
  THEME: '@portfolioiq:theme',
  SELECTED_PORTFOLIO: '@portfolioiq:selected_portfolio',
  SETTINGS: '@portfolioiq:settings',
};

// ==================== API SETTINGS ====================

export const API = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// ==================== PAGINATION ====================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// ==================== DIVERSIFICATION THRESHOLDS ====================

export const DIVERSIFICATION = {
  MIN_HOLDINGS_DIVERSIFIED: 5,
  MAX_SINGLE_POSITION_PERCENT: 30,
  MIN_DIVERSIFICATION_SCORE: 60,
};

// ==================== RISK THRESHOLDS ====================

export const RISK_THRESHOLDS = {
  LOW_BETA: 0.8,
  MEDIUM_BETA: 1.2,
  HIGH_VOLATILITY: 20,
  CONCENTRATION_WARNING: 40,
};
