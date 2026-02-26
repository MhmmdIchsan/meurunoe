import api from '../utils/api';

export const orangTuaService = {
  // GET /orang-tua - list all
  getAll: async (params) => {
    const response = await api.get('/orang-tua', { params });
    return response.data;
  },

  // GET /orang-tua/:id
  getById: async (id) => {
    const response = await api.get(`/orang-tua/${id}`);
    return response.data;
  },

  // GET /orang-tua/:id/siswa - anak-anak dari orang tua
  getAnak: async (orangTuaId) => {
    const response = await api.get(`/orang-tua/${orangTuaId}/siswa`);
    return response.data;
  },

  // GET /orang-tua/saya - orang tua yang login
  getSaya: async () => {
    const response = await api.get('/orang-tua/saya');
    return response.data;
  },

  // GET /orang-tua/saya/anak - anak dari orang tua login
  getAnakSaya: async () => {
    const response = await api.get('/orang-tua/saya/anak');
    return response.data;
  },

  // POST /orang-tua - create
  create: async (data) => {
    const response = await api.post('/orang-tua', data);
    return response.data;
  },

  // PUT /orang-tua/:id - update
  update: async (id, data) => {
    const response = await api.put(`/orang-tua/${id}`, data);
    return response.data;
  },

  // DELETE /orang-tua/:id
  delete: async (id) => {
    const response = await api.delete(`/orang-tua/${id}`);
    return response.data;
  },

  // POST /orang-tua/:id/assign-siswa - assign siswa ke orang tua
  assignSiswa: async (orangTuaId, siswaIds) => {
    const response = await api.post(`/orang-tua/${orangTuaId}/assign-siswa`, {
      siswa_ids: siswaIds,
    });
    return response.data;
  },

  // DELETE /orang-tua/:id/unassign-siswa/:siswa_id
  unassignSiswa: async (orangTuaId, siswaId) => {
    const response = await api.delete(`/orang-tua/${orangTuaId}/unassign-siswa/${siswaId}`);
    return response.data;
  },
};