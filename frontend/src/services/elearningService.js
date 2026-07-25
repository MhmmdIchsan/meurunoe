import api from '../utils/api';

const BASE = '/elearning';

export const elearningService = {
  // Pertemuan
  getPertemuan: async (params) => (await api.get(`${BASE}/pertemuan`, { params })).data,
  getPertemuanById: async (id) => (await api.get(`${BASE}/pertemuan/${id}`)).data,
  createPertemuan: async (data) => (await api.post(`${BASE}/pertemuan`, data)).data,
  updatePertemuan: async (id, data) => (await api.put(`${BASE}/pertemuan/${id}`, data)).data,
  deletePertemuan: async (id) => (await api.delete(`${BASE}/pertemuan/${id}`)).data,

  // Kehadiran
  getKehadiran: async (params) => (await api.get(`${BASE}/kehadiran`, { params })).data,
  inputKehadiran: async (data) => (await api.post(`${BASE}/kehadiran`, data)).data,

  // Materi
  getMateri: async (pertemuan_id) => (await api.get(`${BASE}/materi`, { params: { pertemuan_id } })).data,
  createMateri: async (data) => (await api.post(`${BASE}/materi`, data)).data,
  deleteMateri: async (id) => (await api.delete(`${BASE}/materi/${id}`)).data,

  // Quiz
  getQuiz: async (params) => (await api.get(`${BASE}/quiz`, { params })).data,
  getQuizById: async (id) => (await api.get(`${BASE}/quiz/${id}`)).data,
  createQuiz: async (data) => (await api.post(`${BASE}/quiz`, data)).data,
  deleteQuiz: async (id) => (await api.delete(`${BASE}/quiz/${id}`)).data,
  submitQuiz: async (data) => (await api.post(`${BASE}/quiz/submit`, data)).data,
  getQuizJawaban: async (quiz_id) => (await api.get(`${BASE}/quiz/jawaban`, { params: { quiz_id } })).data,

  // Tugas
  getTugas: async (pertemuan_id) => (await api.get(`${BASE}/tugas`, { params: { pertemuan_id } })).data,
  createTugas: async (data) => (await api.post(`${BASE}/tugas`, data)).data,
  deleteTugas: async (id) => (await api.delete(`${BASE}/tugas/${id}`)).data,
  uploadTugas: async (formData) => (await api.post(`${BASE}/tugas/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data,
  nilaiPengumpulan: async (id, nilai) => (await api.put(`${BASE}/tugas/nilai/${id}`, { nilai })).data,
};
