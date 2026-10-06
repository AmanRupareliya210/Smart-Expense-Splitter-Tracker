import api from './api';

export const groupService = {
  // Group CRUD
  async createGroup(data) {
    const res = await api.post('/groups', data);
    return res.data;
  },

  async getMyGroups(params = {}) {
    const query = new URLSearchParams();
    if (params.includeArchived) query.append('includeArchived', params.includeArchived);
    if (params.category && params.category !== 'All') query.append('category', params.category);
    if (params.search) query.append('search', params.search);

    const qs = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/groups${qs}`);
    return res.data;
  },

  async getGroupDetails(groupId) {
    const res = await api.get(`/groups/${groupId}`);
    return res.data;
  },

  async updateGroup(groupId, data) {
    const res = await api.patch(`/groups/${groupId}`, data);
    return res.data;
  },

  async archiveGroup(groupId) {
    const res = await api.post(`/groups/${groupId}/archive`);
    return res.data;
  },

  async unarchiveGroup(groupId) {
    const res = await api.post(`/groups/${groupId}/unarchive`);
    return res.data;
  },

  async deleteGroup(groupId) {
    const res = await api.delete(`/groups/${groupId}`);
    return res.data;
  },

  // Member Management
  async getMembers(groupId) {
    const res = await api.get(`/groups/${groupId}/members`);
    return res.data;
  },

  async addMember(groupId, email, role = 'member') {
    const res = await api.post(`/groups/${groupId}/members`, { email, role });
    return res.data;
  },

  async updateMemberRole(groupId, userId, role) {
    const res = await api.patch(`/groups/${groupId}/members/${userId}/role`, { role });
    return res.data;
  },

  async removeMember(groupId, userId) {
    const res = await api.delete(`/groups/${groupId}/members/${userId}`);
    return res.data;
  },

  async leaveGroup(groupId) {
    const res = await api.post(`/groups/${groupId}/leave`);
    return res.data;
  },

  async transferOwnership(groupId, newOwnerId) {
    const res = await api.post(`/groups/${groupId}/transfer-ownership`, { newOwnerId });
    return res.data;
  },

  // Invitations
  async createInvitation(groupId, data = {}) {
    const res = await api.post(`/groups/${groupId}/invitations`, data);
    return res.data;
  },

  async getGroupInvitations(groupId) {
    const res = await api.get(`/groups/${groupId}/invitations`);
    return res.data;
  },

  async revokeInvitation(groupId, invitationId) {
    const res = await api.delete(`/groups/${groupId}/invitations/${invitationId}`);
    return res.data;
  },

  // Analytics & Activity
  async getGroupAnalytics(groupId) {
    const res = await api.get(`/groups/${groupId}/analytics`);
    return res.data;
  },

  async getGroupActivity(groupId) {
    const res = await api.get(`/groups/${groupId}/activity`);
    return res.data;
  }
};
