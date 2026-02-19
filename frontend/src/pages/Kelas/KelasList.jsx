import { useState, useEffect } from 'react';
import { kelasService } from '../../services/kelasService';
import { guruService } from '../../services/guruService';
import { jurusanService } from "../../services/jurusanService";
import { tahunAjaranService } from "../../services/tahunajaranService";
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';
import Alert from '../../components/Common/Alert';

const KelasList = () => {
  const [kelas, setKelas] = useState([]);
  const [guru, setGuru] = useState([]);
  const [jurusanList, setJurusanList] = useState([]);
  const [taList, setTaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedKelas, setSelectedKelas] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [formData, setFormData] = useState({
    nama: "",
    tingkat: "",
    jurusan_id: "",
    tahun_ajaran_id: "",
    wali_kelas_id: null
  });


  useEffect(() => {
    fetchData();
  }, []);

const fetchData = async () => {
  try {
    const [kelasRes, guruRes, jurusanRes, taRes] = await Promise.all([
      kelasService.getAll(),
      guruService.getAll({ page: 1, limit: 1000 }),
      jurusanService.getAll(),
      tahunAjaranService.getAll(),
    ]);

    setKelas(kelasRes.data || []);
    setGuru(guruRes.data || []);
    setJurusanList(jurusanRes.data || []);
    setTaList(taRes.data || []);

  } catch (error) {
    console.log(error); // 🔥 WAJIB buat debug
    showAlert('error', 'Gagal memuat data');
  } finally {
    setLoading(false);
  }
};


  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 3000);
  };

  const handleAdd = () => {
    setEditMode(false);
    setFormData({
      nama: '',
      tingkat: '',
      jurusan_id: '',
      tahun_ajaran_id: '',
      wali_kelas_id: ''
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelectedKelas(item);
    setFormData({
      nama: item.nama,
      tingkat: item.tingkat,
      jurusan_id: item.jurusan_id,
      tahun_ajaran_id: item.tahun_ajaran_id,
      wali_kelas_id: item.wali_kelas_id || null
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus kelas ini?')) return;

    try {
      await kelasService.delete(id);
      showAlert('success', 'Kelas berhasil dihapus');
      fetchData();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menghapus kelas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode) {
        await kelasService.update(selectedKelas.id, formData);
        showAlert('success', 'Kelas berhasil diupdate');
      } else {
        await kelasService.create(formData);
        showAlert('success', 'Kelas berhasil ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menyimpan kelas');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]:
        name === "jurusan_id" ||
        name === "tahun_ajaran_id" ||
        name === "wali_kelas_id"
          ? (value === "" ? null : Number(value))
          : value
    }));
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Data Kelas</h1>
          <p className="text-text-light mt-1">Kelola data kelas sekolah</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <span className="mr-2">➕</span>
          Tambah Kelas
        </button>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kelas.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-text-light">
            Belum ada data kelas
          </div>
        ) : (
          kelas.map((item) => (
            <div key={item.id} className="card p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center text-3xl">
                  🏫
                </div>
                <span className="badge badge-info">
                  {item.tahun_ajaran?.nama}
                </span>
              </div>

              <h3 className="text-xl font-bold text-text mb-2">
                {item.nama}
              </h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <span className="text-text-light w-24">Tingkat:</span>
                  <span className="font-medium text-text">{item.tingkat}</span>
                </div>
                  {item.jurusan && (
                    <div className="flex items-center text-sm">
                      <span className="text-text-light w-24">Jurusan:</span>
                      <span className="font-medium text-text">
                        {item.jurusan?.nama}
                      </span>
                    </div>
                  )}
                <div className="flex items-center text-sm">
                  <span className="text-text-light w-24">Wali Kelas:</span>
                  <span className="font-medium text-text">
                    {item.wali_kelas?.nama || '-'}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 btn-primary text-sm py-2"
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 btn-danger text-sm py-2"
                >
                  🗑️ Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMode ? 'Edit Kelas' : 'Tambah Kelas'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Nama Kelas *</label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              className="input-field"
              placeholder="Contoh: X IPA 1"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Tingkat *</label>
              <select
                name="tingkat"
                value={formData.tingkat}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="">Pilih Tingkat</option>
                <option value="X">X</option>
                <option value="XI">XI</option>
                <option value="XII">XII</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Jurusan</label>
                <select
                  name="jurusan_id"
                  value={formData.jurusan_id}
                  onChange={handleChange}
                  className="input-field"
                  required
                >
                  <option value="">Pilih Jurusan</option>
                  {jurusanList.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.nama}
                    </option>
                  ))}
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Tahun Ajaran *</label>
            <select
              name="tahun_ajaran_id"
              value={formData.tahun_ajaran_id}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="">Pilih Tahun Ajaran</option>
              {taList.map(t => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Wali Kelas</label>
            <select
              name="wali_kelas_id"
              value={formData.wali_kelas_id}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Pilih Wali Kelas</option>
              {guru.map((g) => (
                <option key={g.id} value={g.id}>{g.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="btn-secondary"
            >
              Batal
            </button>
            <button type="submit" className="btn-primary">
              {editMode ? 'Update' : 'Simpan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KelasList;