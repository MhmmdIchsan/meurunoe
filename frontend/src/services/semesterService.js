import api from '../utils/api';

export const semesterService = {
  getAll: async (params) => {
    const response = await api.get('/semester', { params });
    return response.data;
  },

  getAktif: async () => {
    const response = await api.get('/semester/aktif');
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/semester', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/semester/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/semester/${id}`);
    return response.data;
  },
};