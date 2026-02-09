import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIFICATIONS_KEY = '@portfolioiq_notifications';

/**
 * Notification Service
 * Manages in-app notifications with AsyncStorage persistence
 */

export const NOTIFICATION_TYPES = {
  PRICE_ALERT: 'price_alert',
  AI_INSIGHT: 'ai_insight',
  MILESTONE: 'milestone',
  RISK_ALERT: 'risk_alert',
  HOLDING_ADDED: 'holding_added',
  HOLDING_DELETED: 'holding_deleted',
  DAILY_SUMMARY: 'daily_summary',
  PORTFOLIO_UPDATE: 'portfolio_update',
};

export const NOTIFICATION_ICONS = {
  [NOTIFICATION_TYPES.PRICE_ALERT]: '📈',
  [NOTIFICATION_TYPES.AI_INSIGHT]: '💡',
  [NOTIFICATION_TYPES.MILESTONE]: '🎉',
  [NOTIFICATION_TYPES.RISK_ALERT]: '⚠️',
  [NOTIFICATION_TYPES.HOLDING_ADDED]: '✅',
  [NOTIFICATION_TYPES.HOLDING_DELETED]: '🗑️',
  [NOTIFICATION_TYPES.DAILY_SUMMARY]: '📊',
  [NOTIFICATION_TYPES.PORTFOLIO_UPDATE]: '🔄',
};

/**
 * Create a new notification
 */
export const createNotification = async (notification) => {
  try {
    const notifications = await getAllNotifications();
    
    const newNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      read: false,
      ...notification,
      icon: NOTIFICATION_ICONS[notification.type] || '📬',
    };

    notifications.unshift(newNotification);
    
    // Keep only last 100 notifications
    const trimmed = notifications.slice(0, 100);
    
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(trimmed));
    
    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Get all notifications
 */
export const getAllNotifications = async () => {
  try {
    const data = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const notifications = await getAllNotifications();
    return notifications.filter(n => !n.read).length;
  } catch (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }
};

/**
 * Mark notification as read
 */
export const markAsRead = async (notificationId) => {
  try {
    const notifications = await getAllNotifications();
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error marking as read:', error);
    return false;
  }
};

/**
 * Mark all notifications as read
 */
export const markAllAsRead = async () => {
  try {
    const notifications = await getAllNotifications();
    const updated = notifications.map(n => ({ ...n, read: true }));
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(updated));
    return true;
  } catch (error) {
    console.error('Error marking all as read:', error);
    return false;
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const notifications = await getAllNotifications();
    const filtered = notifications.filter(n => n.id !== notificationId);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async () => {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([]));
    return true;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
};

/**
 * Check for price alerts (call after price refresh)
 */
export const checkPriceAlerts = async (holdings, threshold = 5) => {
  const alerts = [];
  
  for (const holding of holdings) {
    const change = ((holding.currentPrice - holding.purchasePrice) / holding.purchasePrice) * 100;
    
    // Check if change is significant
    if (Math.abs(change) >= threshold) {
      const alert = await createNotification({
        type: NOTIFICATION_TYPES.PRICE_ALERT,
        title: `${holding.symbol} ${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
        message: `${holding.name} ${change > 0 ? 'gained' : 'dropped'} significantly`,
        data: {
          symbol: holding.symbol,
          change: change,
          currentPrice: holding.currentPrice,
        },
      });
      alerts.push(alert);
    }
  }
  
  return alerts;
};

/**
 * Check for portfolio milestones
 */
export const checkMilestones = async (currentValue, previousValue) => {
  const milestones = [10000, 25000, 50000, 75000, 100000, 250000, 500000, 1000000];
  
  for (const milestone of milestones) {
    // Check if we just crossed this milestone
    if (previousValue < milestone && currentValue >= milestone) {
      await createNotification({
        type: NOTIFICATION_TYPES.MILESTONE,
        title: 'Portfolio Milestone! 🎉',
        message: `Your portfolio reached $${milestone.toLocaleString()}!`,
        data: { milestone, currentValue },
      });
    }
  }
};

/**
 * Generate daily summary notification
 */
export const generateDailySummary = async (portfolioData) => {
  const { totalValue, gainLoss, gainLossPercent, holdings } = portfolioData;
  
  const isPositive = gainLoss >= 0;
  const direction = isPositive ? 'gained' : 'lost';
  
  await createNotification({
    type: NOTIFICATION_TYPES.DAILY_SUMMARY,
    title: '📊 Daily Summary',
    message: `Your portfolio ${direction} $${Math.abs(gainLoss).toFixed(2)} (${Math.abs(gainLossPercent).toFixed(2)}%)`,
    data: {
      totalValue,
      gainLoss,
      gainLossPercent,
      holdingsCount: holdings.length,
    },
  });
};

/**
 * Check if notification should be shown (prevent spam)
 */
export const shouldNotify = async (type, data) => {
  const notifications = await getAllNotifications();
  const recent = notifications.filter(n => 
    n.type === type && 
    Date.now() - n.timestamp < 3600000 // Within last hour
  );
  
  // Prevent duplicate notifications for same symbol
  if (type === NOTIFICATION_TYPES.PRICE_ALERT && data?.symbol) {
    const duplicate = recent.find(n => n.data?.symbol === data.symbol);
    if (duplicate) return false;
  }
  
  return true;
};

export default {
  createNotification,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  checkPriceAlerts,
  checkMilestones,
  generateDailySummary,
  shouldNotify,
  NOTIFICATION_TYPES,
};
