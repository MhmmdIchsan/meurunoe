import api from '../utils/api';

// ─── Profile ──────────────────────────────────────────────────────────────

export const profileService = {
  /**
   * Ambil profil user yang sedang login
   */
  getProfile: async () => {
    const res = await api.get('/profile');
    return res.data;
  },

  /**
   * Update nama & telepon
   * @param {{ nama: string, telepon?: string }} data
   */
  updateProfile: async (data) => {
    const res = await api.put('/profile', data);
    return res.data;
  },

  /**
   * Upload foto profil
   * @param {File} file - file gambar
   */
  uploadFoto: async (file) => {
    const formData = new FormData();
    formData.append('foto', file);
    const res = await api.post('/profile/foto', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /**
   * Hapus foto profil
   */
  deleteFoto: async () => {
    const res = await api.delete('/profile/foto');
    return res.data;
  },
};

// ─── Notifications ────────────────────────────────────────────────────────

export const notificationService = {
  /**
   * Ambil daftar notifikasi
   * @param {{ unread?: boolean, limit?: number }} params
   */
  getAll: async (params = {}) => {
    const res = await api.get('/notifications', { params });
    return res.data; // { notifications: [], unread_count: number }
  },

  /**
   * Tandai satu notifikasi sebagai sudah dibaca
   */
  markRead: async (id) => {
    const res = await api.put(`/notifications/${id}/read`);
    return res.data;
  },

  /**
   * Tandai semua notifikasi sebagai sudah dibaca
   */
  markAllRead: async () => {
    const res = await api.put('/notifications/read-all');
    return res.data;
  },

  /**
   * Hapus satu notifikasi
   */
  delete: async (id) => {
    const res = await api.delete(`/notifications/${id}`);
    return res.data;
  },

  /**
   * Hapus semua notifikasi
   */
  deleteAll: async () => {
    const res = await api.delete('/notifications');
    return res.data;
  },
};