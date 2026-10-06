import api from './api';

export const invitationService = {
  // Public preview of an invitation token (safe minimal details)
  async getInvitationPreview(token) {
    const res = await api.get(`/invitations/${token}`);
    return res.data;
  },

  // Accept an invitation (requires authentication)
  async acceptInvitation(token) {
    const res = await api.post(`/invitations/${token}/accept`);
    return res.data;
  }
};
