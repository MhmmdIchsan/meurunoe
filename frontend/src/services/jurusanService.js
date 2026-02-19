import api from "../utils/api";

export const jurusanService = {
    getAll: async () => {
    const res = await api.get("/jurusan");
    return res.data;
    },
    
    create: async (data) => {
        const res = await api.post("/jurusan", {
            kode: data.kode,
            nama: data.nama,
        });
        return res.data;
    },

    update: async (id, data) => {
        const res = await api.put(`/jurusan/${id}`, {
            kode: data.kode,
            nama: data.nama,
        });
        return res.data;
    },
    
    delete: async (id) => {
        const res = await api.delete(`/jurusan/${id}`);
        return res.data;
    }
};
