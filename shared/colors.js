// Color palette for PortfolioIQ app
// Centralized color definitions for consistency across the app

export const COLORS = {
  // Primary brand colors
  primary: '#6200EE',
  primaryLight: '#BB86FC',
  primaryDark: '#3700B3',
  
  // Semantic colors
  success: '#4CAF50',
  error: '#F44336',
  critical: '#B00020',
  warning: '#FF9800',
  info: '#2196F3',
  
  // Text colors
  textPrimary: '#000000',
  textSecondary: '#757575',
  textDisabled: '#9E9E9E',
  textWhite: '#FFFFFF',
  
  // Background colors
  background: '#F5F5F5',
  surface: '#FFFFFF',
  surfaceVariant: '#E0E0E0',
  
  // Border colors
  border: '#E0E0E0',
  borderLight: '#F5F5F5',
  
  // Special colors
  gold: '#FFD700',
  
  // Chart colors
  chartLine: '#6200EE',
  chartGrid: '#E0E0E0',
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
