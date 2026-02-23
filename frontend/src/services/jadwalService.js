import api from '../utils/api';

export const jadwalService = {
  // GET /jadwal - list dengan filter
  getAll: async (params) => {
    const response = await api.get('/jadwal', { params });
    return response.data;
  },

  // GET /jadwal/:id
  getById: async (id) => {
    const response = await api.get(`/jadwal/${id}`);
    return response.data;
  },

  // GET /jadwal/kelas/:kelas_id
  getJadwalKelas: async (kelasId, params) => {
    const response = await api.get(`/jadwal/kelas/${kelasId}`, { params });
    return response.data;
  },

  // GET /jadwal/guru/:guru_id
  getJadwalGuru: async (guruId, params) => {
    const response = await api.get(`/jadwal/guru/${guruId}`, { params });
    return response.data;
  },

  // GET /jadwal/saya
  getJadwalSaya: async (params) => {
    const response = await api.get('/jadwal/saya', { params });
    return response.data;
  },

  // POST /jadwal/validasi - cek bentrok
  validasiJadwal: async (data) => {
    const response = await api.post('/jadwal/validasi', data);
    return response.data;
  },

  // POST /jadwal
  create: async (data) => {
    const response = await api.post('/jadwal', data);
    return response.data;
  },

  // POST /jadwal/bulk
  bulkCreate: async (data) => {
    const response = await api.post('/jadwal/bulk', data);
    return response.data;
  },

  // PUT /jadwal/:id
  update: async (id, data) => {
    const response = await api.put(`/jadwal/${id}`, data);
    return response.data;
  },

  // DELETE /jadwal/:id
  delete: async (id) => {
    const response = await api.delete(`/jadwal/${id}`);
    return response.data;
  },
};