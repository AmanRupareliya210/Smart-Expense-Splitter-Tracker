import api from './api';

export const expenseService = {
  // Create / Record an expense
  async addExpense(groupId, data) {
    const res = await api.post(`/groups/${groupId}/expenses`, data);
    return res.data;
  },

  async createExpense(groupId, data) {
    return this.addExpense(groupId, data);
  },

  // List group expenses with filters & pagination
  async getExpenses(groupId, params = {}) {
    const query = new URLSearchParams();
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search && params.search.trim()) query.append('search', params.search.trim());
    if (params.paidBy) query.append('paidBy', params.paidBy);
    if (params.startDate) query.append('startDate', params.startDate);
    if (params.endDate) query.append('endDate', params.endDate);
    if (params.page) query.append('page', params.page);
    if (params.limit) query.append('limit', params.limit);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/groups/${groupId}/expenses${qs}`);
    return res.data;
  },

  // Get single expense details
  async getExpenseDetails(groupId, expenseId) {
    const res = await api.get(`/groups/${groupId}/expenses/${expenseId}`);
    return res.data;
  },

  // Update / Edit an existing expense
  async updateExpense(groupId, expenseId, data) {
    const res = await api.patch(`/groups/${groupId}/expenses/${expenseId}`, data);
    return res.data;
  },

  // Delete an expense
  async deleteExpense(groupId, expenseId) {
    const res = await api.delete(`/groups/${groupId}/expenses/${expenseId}`);
    return res.data;
  }
};
