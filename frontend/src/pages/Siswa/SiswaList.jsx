import { useState, useEffect } from 'react';
import { siswaService } from '../../services/siswaService';
import { kelasService } from '../../services/kelasService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';
import Alert from '../../components/Common/Alert';

const emptyForm = {
  nisn:           '',
  nama:           '',
  jenis_kelamin:  'L',
  tanggal_lahir:  '',
  alamat:         '',
  no_hp:          '',
  email:          '',   // untuk akun login siswa
  password:       '',   // wajib create, opsional edit
  kelas_id:       '',
};

const SiswaList = () => {
  const [siswa, setSiswa]         = useState([]);
  const [kelas, setKelas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(emptyForm);
  const [alert, setAlert]         = useState({ show: false, type: '', message: '' });
  const [valErr, setValErr]       = useState('');
  const [search, setSearch]       = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [siswaRes, kelasRes] = await Promise.all([
        siswaService.getAll(),
        kelasService.getAll(),
      ]);
      const rawSiswa = siswaRes.data;
      const rawKelas = kelasRes.data;
      setSiswa(Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.data || []));
      setKelas(Array.isArray(rawKelas) ? rawKelas : (rawKelas?.data || []));
    } catch {
      showAlert('error', 'Gagal memuat data');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (type, message) => {
    setAlert({ show: true, type, message });
    setTimeout(() => setAlert({ show: false, type: '', message: '' }), 4000);
  };

  const handleAdd = () => {
    setEditMode(false);
    setSelected(null);
    setForm(emptyForm);
    setValErr('');
    setShowModal(true);
  };

  const handleEdit = (item) => {
    setEditMode(true);
    setSelected(item);
    setForm({
      nisn:          item.nisn || '',
      nama:          item.nama || '',
      jenis_kelamin: item.jenis_kelamin || 'L',
      tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
      alamat:        item.alamat || '',
      no_hp:         item.no_hp || '',
      email:         item.user?.email || item.email || '',
      password:      '',
      kelas_id:      item.kelas_id || '',
    });
    setValErr('');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus data siswa ini?')) return;
    try {
      await siswaService.delete(id);
      showAlert('success', 'Data siswa berhasil dihapus');
      fetchData();
    } catch (e) {
      showAlert('error', e.response?.data?.message || 'Gagal menghapus');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setValErr('');
    setSaving(true);

    const payload = {
      nisn:          form.nisn,
      nama:          form.nama,
      jenis_kelamin: form.jenis_kelamin,
      tanggal_lahir: form.tanggal_lahir,
      alamat:        form.alamat,
      no_hp:         form.no_hp,
      email:         form.email,
      kelas_id:      form.kelas_id ? parseInt(form.kelas_id) : undefined,
    };
    if (form.password) payload.password = form.password;
    else if (!editMode) {
      setValErr('Password wajib diisi untuk siswa baru');
      setSaving(false);
      return;
    }

    try {
      if (editMode) {
        await siswaService.update(selected.id, payload);
        showAlert('success', 'Data siswa berhasil diperbarui');
      } else {
        await siswaService.create(payload);
        showAlert('success', 'Data siswa berhasil ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      const msg = e.response?.data?.errors || e.response?.data?.message || 'Gagal menyimpan';
      showAlert('error', String(msg));
      setValErr(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  // Filter pencarian
  const filtered = siswa.filter(s =>
    s.nama?.toLowerCase().includes(search.toLowerCase()) ||
    s.nisn?.includes(search)
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Data Siswa</h1>
          <p className="text-text-light mt-1">Total: {siswa.length} siswa</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">➕ Tambah Siswa</button>
      </div>

      {/* Info alur */}
      <div className="card p-4 mb-4 bg-blue-50 border-blue-200 text-sm text-blue-800">
        <strong>ℹ️ Info:</strong>
        <span className="ml-2">
          Menambah siswa akan otomatis membuat akun login dengan role <strong>Siswa</strong>.
          Email digunakan untuk login ke sistem.
        </span>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      {/* Search */}
      <div className="card p-4 mb-4">
        <input
          type="text"
          placeholder="Cari nama atau NISN siswa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field max-w-md"
        />
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>NISN</th>
                <th>Nama</th>
                <th>L/P</th>
                <th>Kelas</th>
                <th>Email Login</th>
                <th>No. HP</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-text-light">
                    {search ? 'Siswa tidak ditemukan' : 'Belum ada data siswa'}
                  </td>
                </tr>
              ) : filtered.map((item) => (
                <tr key={item.id}>
                  <td className="font-mono text-sm">{item.nisn}</td>
                  <td className="font-medium">{item.nama}</td>
                  <td>{item.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
                  <td>{item.kelas?.nama_kelas || '-'}</td>
                  <td>{item.user?.email || item.email || '-'}</td>
                  <td>{item.no_hp || '-'}</td>
                  <td>
                    <div className="flex gap-3">
                      <button onClick={() => handleEdit(item)} className="text-primary text-sm hover:underline">✏️ Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-error text-sm hover:underline">🗑️ Hapus</button>
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
        title={editMode ? 'Edit Data Siswa' : 'Tambah Data Siswa'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {valErr && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {valErr}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">NISN *</label>
              <input name="nisn" value={form.nisn} onChange={handleChange}
                className="input-field" required placeholder="Nomor Induk Siswa" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nama Lengkap *</label>
              <input name="nama" value={form.nama} onChange={handleChange}
                className="input-field" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Jenis Kelamin *</label>
              <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={handleChange}
                className="input-field" required>
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Tanggal Lahir</label>
              <input type="date" name="tanggal_lahir" value={form.tanggal_lahir}
                onChange={handleChange} className="input-field" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Kelas</label>
            <select name="kelas_id" value={form.kelas_id} onChange={handleChange}
              className="input-field">
              <option value="">-- Pilih Kelas --</option>
              {kelas.map(k => (
                <option key={k.id} value={k.id}>{k.nama_kelas}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Alamat</label>
            <textarea name="alamat" value={form.alamat} onChange={handleChange}
              className="input-field" rows="2" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">No. HP</label>
              <input name="no_hp" value={form.no_hp} onChange={handleChange}
                className="input-field" placeholder="08xx-xxxx-xxxx" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Email Login {!editMode && '*'}
              </label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="input-field" required={!editMode}
                placeholder="siswa@sekolah.sch.id" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Password {editMode
                ? <span className="text-text-light font-normal">(kosongkan jika tidak diubah)</span>
                : '*'}
            </label>
            <input type="password" name="password" value={form.password}
              onChange={handleChange} className="input-field"
              required={!editMode}
              placeholder={editMode ? 'Biarkan kosong jika tidak diubah' : 'Minimal 8 karakter'} />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editMode ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SiswaList;