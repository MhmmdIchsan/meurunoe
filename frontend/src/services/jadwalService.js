import api from '../utils/api';

export const jadwalService = {
  getAll: async (params) => {
    const response = await api.get('/jadwal', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/jadwal/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/jadwal', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/jadwal/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/jadwal/${id}`);
    return response.data;
  },

  getByKelas: async (kelasId, params) => {
    const response = await api.get(`/jadwal/kelas/${kelasId}`, { params });
    return response.data;
  },

  getByGuru: async (guruId, params) => {
    const response = await api.get(`/jadwal/guru/${guruId}`, { params });
    return response.data;
  },

  checkBentrok: async (data) => {
    const response = await api.post('/jadwal/check-bentrok', data);
    return response.data;
  }
};