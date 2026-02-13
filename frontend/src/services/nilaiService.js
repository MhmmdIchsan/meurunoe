import api from '../utils/api';

export const nilaiService = {
  getAll: async (params) => {
    const response = await api.get('/nilai', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/nilai/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/nilai', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/nilai/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/nilai/${id}`);
    return response.data;
  },

  getBySiswa: async (siswaId, params) => {
    const response = await api.get(`/nilai/siswa/${siswaId}`, { params });
    return response.data;
  },

  getByKelas: async (kelasId, params) => {
    const response = await api.get(`/nilai/kelas/${kelasId}`, { params });
    return response.data;
  },

  inputBatch: async (data) => {
    const response = await api.post('/nilai/batch', data);
    return response.data;
  }
};