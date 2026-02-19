import api from "../utils/api";

export const semesterService = {
  getAll: async () => {
    const res = await api.get("/semester");
    return res.data;
  },
  create: async (data) => {
    const res = await api.post("/semester", data);
    return res.data;
  },
  getAktif: async () => {
  const res = await api.get("/semester/aktif");
  return res.data;
  }
};
