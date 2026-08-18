import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import * as NotificationService from '../../services/notifications/notificationService';
import { AuthContext } from './AuthContext';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const refreshNotifications = useCallback(async () => {
    try {
      const data = await NotificationService.getAllNotifications();
      setNotifications(data);
      setUnreadCount(data.filter((n) => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }, []);

  // Point the service at the signed-in user's bucket. Notifications are stored
  // per uid so a second account on the same device starts clean.
  useEffect(() => {
    NotificationService.setNotificationUser(user?.uid || null);
    NotificationService.clearLegacyNotifications();
  }, [user?.uid]);

  // Stay in sync no matter who writes a notification — several services create
  // them directly rather than going through this context.
  useEffect(() => {
    const unsubscribe = NotificationService.subscribe(refreshNotifications);
    refreshNotifications();
    return unsubscribe;
  }, [refreshNotifications]);

  const createNotification = useCallback(async (notification) => {
    try {
      return await NotificationService.createNotification(notification);
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await NotificationService.markAllAsRead();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, []);

  const value = useMemo(
    () => ({ notifications, unreadCount, createNotification, markAllAsRead, refreshNotifications }),
    [notifications, unreadCount, createNotification, markAllAsRead, refreshNotifications]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};
