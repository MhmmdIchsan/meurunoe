import api from '../utils/api';

export const absensiService = {
  getAll: async (params) => {
    const response = await api.get('/absensi', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/absensi/${id}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post('/absensi', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/absensi/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/absensi/${id}`);
    return response.data;
  },

  getBySiswa: async (siswaId, params) => {
    const response = await api.get(`/absensi/siswa/${siswaId}`, { params });
    return response.data;
  },

  getByKelas: async (kelasId, params) => {
    const response = await api.get(`/absensi/kelas/${kelasId}`, { params });
    return response.data;
  },

  getRekap: async (params) => {
    const response = await api.get('/absensi/rekap', { params });
    return response.data;
  },

  inputBatch: async (data) => {
    const response = await api.post('/absensi/batch', data);
    return response.data;
  }
};