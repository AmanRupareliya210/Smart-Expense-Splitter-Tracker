import api from './api';

export const notificationService = {
  // Get user notifications with pagination and optional isRead filter
  async getNotifications(params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/notifications${query ? `?${query}` : ''}`);
    return res.data;
  },

  // Fast fetch of unread notifications count
  async getUnreadCount() {
    const res = await api.get('/notifications/unread-count');
    return res.data;
  },

  // Mark single notification as read
  async markAsRead(id) {
    const res = await api.patch(`/notifications/${id}/read`);
    return res.data;
  },

  // Mark all unread notifications as read
  async markAllAsRead() {
    const res = await api.patch('/notifications/read-all');
    return res.data;
  },

  // Dismiss/delete a notification
  async deleteNotification(id) {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  // Send a settlement reminder to a debtor in a group
  async sendSettlementReminder(groupId, data) {
    const res = await api.post(`/notifications/groups/${groupId}/reminders`, data);
    return res.data;
  }
};
