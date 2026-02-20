import api from '../utils/api';

export const kelasService = {
  getAll: async (params) => {
    const response = await api.get('/kelas', { params });
    return response.data;
  },

  getSummary: async () => {
    const response = await api.get('/kelas/summary');
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/kelas/${id}`);
    return response.data;
  },

  getSiswaByKelas: async (kelasId) => {
    const response = await api.get(`/kelas/${kelasId}/siswa`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/kelas', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/kelas/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/kelas/${id}`);
    return response.data;
  },
};