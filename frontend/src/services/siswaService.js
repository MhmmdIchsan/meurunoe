import api from '../utils/api';

export const siswaService = {
  getAll: async (params) => {
    const response = await api.get('/siswa', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/siswa/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/siswa', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/siswa/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/siswa/${id}`);
    return response.data;
  },

  getByKelas: async (kelasId) => {
    const response = await api.get(`/siswa/kelas/${kelasId}`);
    return response.data;
  }
};