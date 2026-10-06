import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationService.getUnreadCount();
      const count = res.data?.unreadCount ?? res.unreadCount ?? 0;
      setUnreadCount(count);
    } catch (err) {
      // Quiet fail on background poll
    }
  }, [user]);

  const fetchNotifications = useCallback(async (params = {}) => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await notificationService.getNotifications(params);
      const items = res.data?.notifications || res.notifications || [];
      const count = res.data?.unreadCount ?? res.unreadCount ?? 0;
      setNotifications(items);
      setUnreadCount(count);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load and periodic unread count polling every 30 seconds
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchUnreadCount();

      const interval = setInterval(() => {
        fetchUnreadCount();
      }, 30000);

      return () => clearInterval(interval);
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications, fetchUnreadCount]);

  const markAsRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true, readAt: new Date() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all notifications read:', err);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const target = notifications.find((n) => n._id === id);
      await notificationService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      if (target && !target.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  const sendReminder = async (groupId, { debtorId, customNote }) => {
    const res = await notificationService.sendSettlementReminder(groupId, { debtorId, customNote });
    return res;
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        fetchUnreadCount,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        sendReminder
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
