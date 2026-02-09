import React, { createContext, useState, useEffect } from 'react';
import * as NotificationService from '../../services/notifications/notificationService';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await NotificationService.getAllNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await NotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const createNotification = async (notification) => {
    try {
      const newNotif = await NotificationService.createNotification(notification);
      setNotifications([newNotif, ...notifications]);
      setUnreadCount(unreadCount + 1);
      return newNotif;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationService.markAllAsRead();
      setUnreadCount(0);
      const updated = notifications.map(n => ({ ...n, read: true }));
      setNotifications(updated);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const refreshNotifications = async () => {
    await loadNotifications();
    await loadUnreadCount();
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        createNotification,
        markAllAsRead,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
