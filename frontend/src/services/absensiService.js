import api from '../utils/api';

export const absensiService = {
  // GET /absensi - list dengan filter
  getAll: async (params) => {
    const response = await api.get('/absensi', { params });
    return response.data;
  },

  // GET /absensi/:id
  getById: async (id) => {
    const response = await api.get(`/absensi/${id}`);
    return response.data;
  },

  // POST /absensi - input single
  inputAbsensi: async (data) => {
    const response = await api.post('/absensi', data);
    return response.data;
  },

  // POST /absensi/bulk - input bulk (satu kelas sekaligus)
  bulkInput: async (data) => {
    const response = await api.post('/absensi/bulk', data);
    return response.data;
  },

  // PUT /absensi/:id
  update: async (id, data) => {
    const response = await api.put(`/absensi/${id}`, data);
    return response.data;
  },

  // DELETE /absensi/:id
  delete: async (id) => {
    const response = await api.delete(`/absensi/${id}`);
    return response.data;
  },

  // GET /absensi/rekap/siswa/:siswa_id
  getRekapSiswa: async (siswaId, params) => {
    const response = await api.get(`/absensi/rekap/siswa/${siswaId}`, { params });
    return response.data;
  },

  // GET /absensi/rekap/kelas/:kelas_id
  getRekapKelas: async (kelasId, params) => {
    const response = await api.get(`/absensi/rekap/kelas/${kelasId}`, { params });
    return response.data;
  },

  // GET /absensi/saya
  getAbsensiSaya: async (params) => {
    const response = await api.get('/absensi/saya', { params });
    return response.data;
  },
};