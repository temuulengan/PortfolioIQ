import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY_PREFIX = '@portfolioiq_notifications';
const LEGACY_KEY = '@portfolioiq_notifications';

/**
 * Notification Service
 * Manages in-app notifications with AsyncStorage persistence.
 *
 * Notifications are scoped per user id: signing in as a different account on the
 * same device must never surface the previous account's notifications.
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

// ==================== USER SCOPING ====================

let activeUserId = null;

/**
 * Point the service at a user's notification bucket. Pass null on sign-out so a
 * signed-out app cannot read or write the previous user's notifications.
 */
export const setNotificationUser = (uid) => {
  activeUserId = uid || null;
  emitChange();
};

const storageKey = () => (activeUserId ? `${KEY_PREFIX}:${activeUserId}` : null);

// ==================== CHANGE SUBSCRIPTIONS ====================

const listeners = new Set();

/**
 * Subscribe to any change in stored notifications. Returns an unsubscribe fn.
 * Lets the UI stay in sync no matter which module created the notification.
 */
export const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const emitChange = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (err) {
      console.error('Notification listener failed:', err);
    }
  });
};

// ==================== CRUD ====================

const writeAll = async (notifications) => {
  const key = storageKey();
  if (!key) return false;
  await AsyncStorage.setItem(key, JSON.stringify(notifications));
  emitChange();
  return true;
};

/**
 * Get all notifications for the active user
 */
export const getAllNotifications = async () => {
  try {
    const key = storageKey();
    if (!key) return [];
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

/**
 * Create a new notification
 */
export const createNotification = async (notification) => {
  try {
    if (!storageKey()) return null;
    const notifications = await getAllNotifications();

    const newNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: Date.now(),
      read: false,
      ...notification,
      icon: NOTIFICATION_ICONS[notification.type] || '📬',
    };

    notifications.unshift(newNotification);

    // Keep only last 100 notifications
    await writeAll(notifications.slice(0, 100));

    return newNotification;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const notifications = await getAllNotifications();
    return notifications.filter((n) => !n.read).length;
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
    return await writeAll(
      notifications.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
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
    if (!notifications.some((n) => !n.read)) return true;
    return await writeAll(notifications.map((n) => ({ ...n, read: true })));
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
    return await writeAll(notifications.filter((n) => n.id !== notificationId));
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
    return await writeAll([]);
  } catch (error) {
    console.error('Error clearing notifications:', error);
    return false;
  }
};

/**
 * Remove the pre-scoping notification bucket, if one is still around.
 */
export const clearLegacyNotifications = async () => {
  try {
    await AsyncStorage.removeItem(LEGACY_KEY);
  } catch (error) {
    // non-fatal
  }
};

// ==================== ALERT RULES ====================

/**
 * Should this notification be created, or is it a duplicate of a recent one?
 * @param {string} type
 * @param {Object} data
 * @param {number} windowMs how far back to look for a duplicate (default 6h)
 */
export const shouldNotify = async (type, data, windowMs = 6 * 60 * 60 * 1000) => {
  const notifications = await getAllNotifications();
  const recent = notifications.filter(
    (n) => n.type === type && Date.now() - n.timestamp < windowMs
  );

  if (!recent.length) return true;

  // Prevent duplicate notifications for the same symbol
  if (data?.symbol) {
    return !recent.some((n) => n.data?.symbol === data.symbol);
  }

  return true;
};

/**
 * Raise alerts for holdings whose price moved sharply since the previous refresh.
 *
 * @param {Array} holdings holdings carrying the freshly fetched `currentPrice`
 * @param {Object} previousPrices map of symbol -> price at the previous refresh
 * @param {number} threshold percent move that counts as significant
 *
 * Note: this deliberately compares against the previous *refresh*, not the
 * purchase price. Comparing against cost basis re-fires the same alert on every
 * refresh for as long as the position stays up, which is just spam.
 */
export const checkPriceAlerts = async (holdings, previousPrices = {}, threshold = 5) => {
  const alerts = [];
  if (!Array.isArray(holdings)) return alerts;

  for (const holding of holdings) {
    const symbol = holding?.symbol;
    const current = Number(holding?.currentPrice);
    const previous = Number(previousPrices?.[symbol]);

    if (!symbol || !Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) {
      continue;
    }

    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < threshold) continue;

    // eslint-disable-next-line no-await-in-loop
    if (!(await shouldNotify(NOTIFICATION_TYPES.PRICE_ALERT, { symbol }))) continue;

    // eslint-disable-next-line no-await-in-loop
    const alert = await createNotification({
      type: NOTIFICATION_TYPES.PRICE_ALERT,
      title: `${symbol} ${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
      message: `${holding.name || symbol} ${change > 0 ? 'gained' : 'dropped'} significantly since the last update`,
      data: { symbol, change, currentPrice: current, previousPrice: previous },
    });
    if (alert) alerts.push(alert);
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
      // eslint-disable-next-line no-await-in-loop
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

  const direction = gainLoss >= 0 ? 'gained' : 'lost';

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

export default {
  setNotificationUser,
  subscribe,
  createNotification,
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  clearLegacyNotifications,
  checkPriceAlerts,
  checkMilestones,
  generateDailySummary,
  shouldNotify,
  NOTIFICATION_TYPES,
};
