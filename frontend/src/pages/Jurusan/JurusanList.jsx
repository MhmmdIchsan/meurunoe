import { useEffect, useState } from "react";
import { jurusanService } from "../../services/jurusanService";

import LoadingSpinner from "../../components/Common/LoadingSpinner";
import Modal from "../../components/Common/Modal";

const EMPTY = { kode: "", nama: "" };

export default function JurusanList() {
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm]         = useState(EMPTY);
  const [success, setSuccess]   = useState("");
  const [errMsg, setErrMsg]     = useState("");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const res = await jurusanService.getAll();
      setList(res.data || []);   // ✅ BENAR
    } catch (e) {
      setErrMsg("Gagal memuat data: " + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditMode(false);
    setSelected(null);
    setForm(EMPTY);
    setErrMsg("");
    setSuccess("");
    setShowModal(true);
  }

  function openEdit(j) {
    setEditMode(true);
    setSelected(j);
    setForm({
      kode: j.kode || "",
      nama: j.nama || "",
    });
    setErrMsg("");
    setSuccess("");
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm("Yakin hapus jurusan ini?")) return;
    try {
      await jurusanService.delete(id);
      setSuccess("Jurusan berhasil dihapus");
      fetchData();
    } catch (e) {
      alert("Gagal hapus: " + (e.response?.data?.message || e.message));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setErrMsg("");

    try {
      if (editMode) {
        await jurusanService.update(selected.id, form);
        setSuccess("Jurusan berhasil diperbarui");
      } else {
        await jurusanService.create(form);
        setSuccess("Jurusan berhasil ditambahkan");
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      const data = e.response?.data;
      const msg  = data?.errors || data?.message || e.message;
      setErrMsg(typeof msg === "object" ? JSON.stringify(msg) : msg);
    } finally {
      setSaving(false);
    }
  }

  const ch = (e) => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg"/>
    </div>
  );

  return (
    <div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Master Jurusan</h1>
          <p className="text-text-light mt-1">Total: {list.length} jurusan</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          ➕ Tambah Jurusan
        </button>
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          ✅ {success}
        </div>
      )}
      {errMsg && !showModal && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
          ❌ {errMsg}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Jurusan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-10 text-text-light">
                    Belum ada data jurusan
                  </td>
                </tr>
              ) : list.map(j => (
                <tr key={j.id}>
                  <td>
                    <span className="badge badge-info">
                      {j.kode}
                    </span>
                  </td>
                  <td className="font-medium">{j.nama}</td>
                  <td>
                    <div className="flex gap-3">
                      <button
                        onClick={() => openEdit(j)}
                        className="text-primary text-sm hover:underline"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(j.id)}
                        className="text-error text-sm hover:underline"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMode ? "Edit Jurusan" : "Tambah Jurusan"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">

          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <strong>Error:</strong> {errMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Kode Jurusan *
            </label>
            <input
              name="kode"
              value={form.kode}
              onChange={ch}
              className="input-field"
              required
              maxLength={10}
              placeholder="Contoh: RPL"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nama Jurusan *
            </label>
            <input
              name="nama"
              value={form.nama}
              onChange={ch}
              className="input-field"
              required
              placeholder="Contoh: Rekayasa Perangkat Lunak"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Menyimpan..." : (editMode ? "Update" : "Simpan")}
            </button>
          </div>

        </form>
      </Modal>
    </div>
  );
}
