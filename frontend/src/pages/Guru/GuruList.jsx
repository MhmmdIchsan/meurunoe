import { useState, useEffect } from 'react';
import { guruService } from '../../services/guruService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';
import Alert from '../../components/Common/Alert';

const GuruList = () => {
  const [guru, setGuru] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedGuru, setSelectedGuru] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [formData, setFormData] = useState({
    nip: '',
    nama: '',
    jenis_kelamin: 'L',
    tanggal_lahir: '',
    alamat: '',
    no_hp: '',
    email: '',
    mata_pelajaran: ''
  });

  useEffect(() => {
    fetchGuru();
  }, []);

  const fetchGuru = async () => {
    try {
      const response = await guruService.getAll();
      setGuru(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data guru');
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
      nip: '',
      nama: '',
      jenis_kelamin: 'L',
      tanggal_lahir: '',
      alamat: '',
      no_hp: '',
      email: '',
      mata_pelajaran: ''
    });
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelectedGuru(item);
    setFormData({
      nip: item.nip,
      nama: item.nama,
      jenis_kelamin: item.jenis_kelamin,
      tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
      alamat: item.alamat || '',
      no_hp: item.no_hp || '',
      email: item.email || '',
      mata_pelajaran: item.mata_pelajaran || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data guru ini?')) return;

    try {
      await guruService.delete(id);
      showAlert('success', 'Data guru berhasil dihapus');
      fetchGuru();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menghapus data guru');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode) {
        await guruService.update(selectedGuru.id, formData);
        showAlert('success', 'Data guru berhasil diupdate');
      } else {
        await guruService.create(formData);
        showAlert('success', 'Data guru berhasil ditambahkan');
      }
      setShowModal(false);
      fetchGuru();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menyimpan data guru');
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
          <h1 className="text-2xl font-bold text-text">Data Guru</h1>
          <p className="text-text-light mt-1">Kelola data guru sekolah</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <span className="mr-2">➕</span>
          Tambah Guru
        </button>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama</th>
                <th>Jenis Kelamin</th>
                <th>Mata Pelajaran</th>
                <th>No. HP</th>
                <th>Email</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {guru.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-text-light">
                    Belum ada data guru
                  </td>
                </tr>
              ) : (
                guru.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nip}</td>
                    <td className="font-medium">{item.nama}</td>
                    <td>{item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                    <td>{item.mata_pelajaran || '-'}</td>
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
        title={editMode ? 'Edit Data Guru' : 'Tambah Data Guru'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">NIP *</label>
              <input
                type="text"
                name="nip"
                value={formData.nip}
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
            <label className="block text-sm font-medium text-text mb-2">Mata Pelajaran</label>
            <input
              type="text"
              name="mata_pelajaran"
              value={formData.mata_pelajaran}
              onChange={handleChange}
              className="input-field"
              placeholder="Contoh: Matematika"
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

export default GuruList;