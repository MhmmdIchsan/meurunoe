import api from '../utils/api';

export const nilaiService = {
  // GET /nilai - list dengan filter
  getAll: async (params) => {
    const response = await api.get('/nilai', { params });
    return response.data;
  },

  // GET /nilai/:id
  getById: async (id) => {
    const response = await api.get(`/nilai/${id}`);
    return response.data;
  },

  // GET /nilai/siswa/:siswa_id
  getNilaiSiswa: async (siswaId, params) => {
    const response = await api.get(`/nilai/siswa/${siswaId}`, { params });
    return response.data;
  },

  // GET /nilai/saya
  getNilaiSaya: async (params) => {
    const response = await api.get('/nilai/saya', { params });
    return response.data;
  },

  // POST /nilai - input nilai
  create: async (data) => {
    const response = await api.post('/nilai', data);
    return response.data;
  },

  // PUT /nilai/:id
  update: async (id, data) => {
    const response = await api.put(`/nilai/${id}`, data);
    return response.data;
  },

  // DELETE /nilai/:id
  delete: async (id) => {
    const response = await api.delete(`/nilai/${id}`);
    return response.data;
  },
};