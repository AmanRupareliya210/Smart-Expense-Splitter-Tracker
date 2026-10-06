import api from './api';

export const settlementService = {
  // Record new settlement
  async recordSettlement(groupId, data) {
    const res = await api.post(`/groups/${groupId}/settlements`, data);
    return res.data;
  },

  // List settlements with pagination & filters
  async getGroupSettlements(groupId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const res = await api.get(`/groups/${groupId}/settlements${query ? `?${query}` : ''}`);
    return res.data;
  },

  // Get single settlement details
  async getSettlementDetails(groupId, settlementId) {
    const res = await api.get(`/groups/${groupId}/settlements/${settlementId}`);
    return res.data;
  },

  // Update settlement notes or method
  async updateSettlement(groupId, settlementId, data) {
    const res = await api.patch(`/groups/${groupId}/settlements/${settlementId}`, data);
    return res.data;
  },

  // Auditable reversal
  async reverseSettlement(groupId, settlementId, reason = '') {
    const res = await api.post(`/groups/${groupId}/settlements/${settlementId}/reverse`, { reason });
    return res.data;
  },

  // Get calculated group balances
  async getGroupBalances(groupId) {
    const res = await api.get(`/groups/${groupId}/balances`);
    return res.data;
  },

  // Get debt minimization suggestions
  async getSettlementSuggestions(groupId) {
    const res = await api.get(`/groups/${groupId}/settlement-suggestions`);
    return res.data;
  },

  // Global cross-group summary
  async getUserGlobalSummary() {
    const res = await api.get('/groups/user-summary');
    return res.data;
  }
};
