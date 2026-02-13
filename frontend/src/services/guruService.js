import api from '../utils/api';

export const guruService = {
  getAll: async (params) => {
    const response = await api.get('/guru', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/guru/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/guru', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/guru/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/guru/${id}`);
    return response.data;
  }
};