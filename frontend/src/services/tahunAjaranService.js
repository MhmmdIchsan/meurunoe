import api from "../utils/api";

export const tahunAjaranService = {
  getAll: async () => {
    const res = await api.get("/tahun-ajaran");
    return res.data;
  },
  create: async (data) => {
    const res = await api.post("/tahun-ajaran", data);
    return res.data;
  }
};
