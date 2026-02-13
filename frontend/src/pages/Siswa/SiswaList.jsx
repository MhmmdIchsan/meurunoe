import { useState, useEffect } from 'react';
import { siswaService } from '../../services/siswaService';
import { kelasService } from '../../services/kelasService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';
import Alert from '../../components/Common/Alert';

const SiswaList = () => {
  const [siswa, setSiswa] = useState([]);
  const [kelas, setKelas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedSiswa, setSelectedSiswa] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [formData, setFormData] = useState({
    nisn: '',
    nama: '',
    jenis_kelamin: 'L',
    tanggal_lahir: '',
    alamat: '',
    no_hp: '',
    email: '',
    kelas_id: '',
    nama_ayah: '',
    nama_ibu: '',
    no_hp_ortu: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [siswaRes, kelasRes] = await Promise.all([
        siswaService.getAll(),
        kelasService.getAll()
      ]);
      setSiswa(siswaRes.data.data || []);
      setKelas(kelasRes.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data siswa');
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
      nisn: '',
      nama: '',
      jenis_kelamin: 'L',
      tanggal_lahir: '',
      alamat: '',
      no_hp: '',
      email: '',
      kelas_id: '',
      nama_ayah: '',
      nama_ibu: '',
      no_hp_ortu: ''
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelectedSiswa(item);
    setFormData({
      nisn: item.nisn,
      nama: item.nama,
      jenis_kelamin: item.jenis_kelamin,
      tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
      alamat: item.alamat || '',
      no_hp: item.no_hp || '',
      email: item.email || '',
      kelas_id: item.kelas_id || '',
      nama_ayah: item.nama_ayah || '',
      nama_ibu: item.nama_ibu || '',
      no_hp_ortu: item.no_hp_ortu || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data siswa ini?')) return;

    try {
      await siswaService.delete(id);
      showAlert('success', 'Data siswa berhasil dihapus');
      fetchData();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menghapus data siswa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode) {
        await siswaService.update(selectedSiswa.id, formData);
        showAlert('success', 'Data siswa berhasil diupdate');
      } else {
        await siswaService.create(formData);
        showAlert('success', 'Data siswa berhasil ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menyimpan data siswa');
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
          <h1 className="text-2xl font-bold text-text">Data Siswa</h1>
          <p className="text-text-light mt-1">Kelola data siswa sekolah</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <span className="mr-2">➕</span>
          Tambah Siswa
        </button>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>NISN</th>
                <th>Nama</th>
                <th>Jenis Kelamin</th>
                <th>Kelas</th>
                <th>No. HP</th>
                <th>Email</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {siswa.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-text-light">
                    Belum ada data siswa
                  </td>
                </tr>
              ) : (
                siswa.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nisn}</td>
                    <td className="font-medium">{item.nama}</td>
                    <td>{item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                    <td>{item.kelas?.nama_kelas || '-'}</td>
                    <td>{item.no_hp || '-'}</td>
                    <td>{item.email || '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="text-primary hover:text-primary-light"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-error hover:text-red-600"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editMode ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">NISN *</label>
              <input
                type="text"
                name="nisn"
                value={formData.nisn}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Nama Lengkap *</label>
              <input
                type="text"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Jenis Kelamin *</label>
              <select
                name="jenis_kelamin"
                value={formData.jenis_kelamin}
                onChange={handleChange}
                className="input-field"
                required
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Tanggal Lahir *</label>
              <input
                type="date"
                name="tanggal_lahir"
                value={formData.tanggal_lahir}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Alamat</label>
            <textarea
              name="alamat"
              value={formData.alamat}
              onChange={handleChange}
              className="input-field"
              rows="3"
            ></textarea>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">No. HP</label>
              <input
                type="text"
                name="no_hp"
                value={formData.no_hp}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Kelas</label>
            <select
              name="kelas_id"
              value={formData.kelas_id}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Pilih Kelas</option>
              {kelas.map((k) => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Nama Ayah</label>
              <input
                type="text"
                name="nama_ayah"
                value={formData.nama_ayah}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">Nama Ibu</label>
              <input
                type="text"
                name="nama_ibu"
                value={formData.nama_ibu}
                onChange={handleChange}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">No. HP Orang Tua</label>
            <input
              type="text"
              name="no_hp_ortu"
              value={formData.no_hp_ortu}
              onChange={handleChange}
              className="input-field"
            />
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

export default SiswaList;