import api from './api';

export const authService = {
  async register(data) {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  async login(data) {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  async quickLogin() {
    const res = await api.post('/auth/quick-login');
    return res.data;
  },

  async logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
  },

  async getMe() {
    const res = await api.get('/auth/me');
    return res.data;
  },

  async updateProfile(data) {
    const res = await api.put('/auth/profile', data);
    return res.data;
  },

  async searchUsers(query) {
    const res = await api.get(`/auth/search?query=${encodeURIComponent(query)}`);
    return res.data;
  }
};
