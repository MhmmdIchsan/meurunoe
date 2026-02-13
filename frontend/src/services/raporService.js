import api from '../utils/api';

export const raporService = {
  getAll: async (params) => {
    const response = await api.get('/rapor', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/rapor/${id}`);
    return response.data;
  },

  generate: async (data) => {
    const response = await api.post('/rapor/generate', data);
    return response.data;
  },

  getBySiswa: async (siswaId, params) => {
    const response = await api.get(`/rapor/siswa/${siswaId}`, { params });
    return response.data;
  },

  download: async (id) => {
    const response = await api.get(`/rapor/${id}/download`, {
      responseType: 'blob'
    });
    return response;
  }
};