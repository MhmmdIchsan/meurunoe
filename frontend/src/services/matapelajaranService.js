import api from '../utils/api';

export const mataPelajaranService = {
  getAll: async (params) => {
    const response = await api.get('/mata-pelajaran', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/mata-pelajaran/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/mata-pelajaran', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/mata-pelajaran/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/mata-pelajaran/${id}`);
    return response.data;
  },
};