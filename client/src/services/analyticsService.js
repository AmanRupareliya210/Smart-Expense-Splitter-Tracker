import api from './api';

export const analyticsService = {
  // Get user-level overall dashboard insights
  async getDashboardAnalytics() {
    const res = await api.get('/analytics/dashboard');
    return res.data;
  },

  // Get group spending analytics with filters
  async getGroupAnalytics(groupId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/groups/${groupId}/analytics${query ? `?${query}` : ''}`);
    return res.data;
  },

  // Get group activity timeline with pagination
  async getGroupActivity(groupId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/groups/${groupId}/activity${query ? `?${query}` : ''}`);
    return res.data;
  }
};
