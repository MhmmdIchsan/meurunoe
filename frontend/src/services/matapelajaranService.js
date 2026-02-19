import api from "../utils/api";

export const mataPelajaranService = {
  getAll: async (search = "") => {
    const res = await api.get("/mata-pelajaran", {
      params: { search }
    });
    return res.data;
  },

  create: async (data) => {
    const res = await api.post("/mata-pelajaran", {
      kode: data.kode,
      nama: data.nama,
      kkm: Number(data.kkm)
    });
    return res.data;
  },

  update: async (id, data) => {
    const res = await api.put(`/mata-pelajaran/${id}`, {
      kode: data.kode,
      nama: data.nama,
      kkm: Number(data.kkm)
    });
    return res.data;
  },

  delete: async (id) => {
    const res = await api.delete(`/mata-pelajaran/${id}`);
    return res.data;
  }
};
