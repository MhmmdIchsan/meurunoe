import { useEffect, useState } from "react";
import { mataPelajaranService } from "../../services/mataPelajaranService";
import Modal from "../../components/Common/Modal";
import Alert from "../../components/Common/Alert";
import LoadingSpinner from "../../components/Common/LoadingSpinner";

const MataPelajaranList = () => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: "", message: "" });

  const [formData, setFormData] = useState({
    kode: "",
    nama: "",
    kkm: 75
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await mataPelajaranService.getAll();
      setList(res.data || []);
    } catch {
      showAlert("error", "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false }), 3000);
  };

  const handleAdd = () => {
    setEditMode(false);
    setFormData({ kode: "", nama: "", kkm: 75 });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelected(item);
    setFormData({
      kode: item.kode,
      nama: item.nama,
      kkm: item.kkm
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus?")) return;

    try {
      await mataPelajaranService.delete(id);
      showAlert("success", "Berhasil dihapus");
      fetchData();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Gagal menghapus");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await mataPelajaranService.update(selected.id, formData);
        showAlert("success", "Berhasil diupdate");
      } else {
        await mataPelajaranService.create(formData);
        showAlert("success", "Berhasil ditambahkan");
      }
      setShowModal(false);
      fetchData();
    } catch (err) {
      showAlert("error", err.response?.data?.message || "Gagal menyimpan");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center h-64 items-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between mb-6">
        <h1 className="text-2xl font-bold">Mata Pelajaran</h1>
        <button onClick={handleAdd} className="btn-primary">
          ➕ Tambah
        </button>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <div className="grid md:grid-cols-3 gap-4">
        {list.map((mp) => (
          <div key={mp.id} className="card p-4">
            <h2 className="font-bold text-lg">{mp.nama}</h2>
            <p>Kode : {mp.kode}</p>
            <p>KKM : {mp.kkm}</p>

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleEdit(mp)}
                className="btn-primary text-sm flex-1"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(mp.id)}
                className="btn-danger text-sm flex-1"
              >
                Hapus
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMode ? "Edit Mata Pelajaran" : "Tambah Mata Pelajaran"}
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Kode"
            className="input-field"
            value={formData.kode}
            onChange={(e) =>
              setFormData({ ...formData, kode: e.target.value })
            }
            required
          />

          <input
            type="text"
            placeholder="Nama"
            className="input-field"
            value={formData.nama}
            onChange={(e) =>
              setFormData({ ...formData, nama: e.target.value })
            }
            required
          />

          <input
            type="number"
            placeholder="KKM"
            className="input-field"
            value={formData.kkm}
            onChange={(e) =>
              setFormData({ ...formData, kkm: e.target.value })
            }
          />

          <button className="btn-primary w-full">
            {editMode ? "Update" : "Simpan"}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default MataPelajaranList;
