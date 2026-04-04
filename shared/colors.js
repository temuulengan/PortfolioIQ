// Color palette for PortfolioIQ app
// Centralized color definitions for consistency across the app

export const COLORS = {
  // Backgrounds
  background: '#F5F2EE',
  backgroundDark: '#123C38',
  surface: '#FFFFFF',
  surfaceVariant: '#E8E4DF',
  divider: '#E8E4DF',

  // Text
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textDisabled: '#9E9E9E',
  textWhite: '#FFFFFF',
  textInverse: '#FFFFFF',

  // Brand
  primary: '#123C38',
  primaryLight: '#2C5A56',
  primaryDark: '#062220',
  accent: '#1A7A3A',

  // Semantic
  success: '#1A7A3A',
  error: '#C0392B',
  critical: '#C0392B',
  warning: '#D97706',
  info: '#2563EB',

  // Gain/Loss badges
  gainBg: '#D4EDDA',
  gainText: '#1A7A3A',
  lossBg: '#FDECEA',
  lossText: '#C0392B',

  // Tab bar
  tabActive: '#123C38',
  tabInactive: '#9E9E9E',
  tabBorder: '#E8E4DF',

  // Borders and special
  border: '#E8E4DF',
  borderLight: '#F0ECE7',
  gold: '#B07A2C',

  // Charts
  chartLine: '#123C38',
  chartGrid: '#E8E4DF',
};

export const Colors = COLORS;

export const Spacing = {
  screenHorizontal: 20,
  cardRadius: 16,
  badgeRadius: 20,
  rowPadding: 16,
};

export const Shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
};

// Helper function to determine color based on positive/negative value
export const getGainLossColor = (isPositive) => {
  return isPositive ? COLORS.success : COLORS.critical;
};

// Helper function to get risk level color
export const getRiskLevelColor = (riskLevel) => {
  if (!riskLevel) return COLORS.textSecondary;
  const levels = {
    low: COLORS.success,
    medium: COLORS.warning,
    high: COLORS.error,
  };
  return levels[riskLevel?.toLowerCase()] || COLORS.textSecondary;
};
