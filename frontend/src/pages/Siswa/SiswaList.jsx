import { useState, useEffect } from 'react';
import { siswaService } from '../../services/siswaService';
import { kelasService } from '../../services/kelasService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';

// Field sesuai dokumentasi:
// CREATE: email*, password*, nisn*, nis, nama*, jenis_kelamin(L/P), tanggal_lahir(YYYY-MM-DD), alamat, kelas_id
// UPDATE: nisn, nis, nama, jenis_kelamin, tanggal_lahir, alamat, kelas_id, email, is_active

const EMPTY_CREATE = {
  nisn: '', nis: '', nama: '', jenis_kelamin: 'L',
  tanggal_lahir: '', alamat: '', kelas_id: '',
  email: '', password: '',
};
const EMPTY_EDIT = {
  nisn: '', nis: '', nama: '', jenis_kelamin: 'L',
  tanggal_lahir: '', alamat: '', kelas_id: '',
  email: '', is_active: true,
};

export default function SiswaList() {
  const [siswa, setSiswa]         = useState([]);
  const [kelas, setKelas]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY_CREATE);
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');
  const [search, setSearch]       = useState('');
  const [filterKelas, setFilterKelas] = useState('');

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
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
    } catch (e) {
      setErrMsg('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditMode(false); setSelected(null);
    setForm(EMPTY_CREATE); setErrMsg(''); setSuccess('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditMode(true); setSelected(item);
    setForm({
      nisn:          item.nisn || '',
      nis:           item.nis || '',
      nama:          item.nama || '',
      jenis_kelamin: item.jenis_kelamin || 'L',
      tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
      alamat:        item.alamat || '',
      kelas_id:      item.kelas_id || item.kelas?.id || '',
      email:         item.user?.email || '',
      is_active:     item.user?.is_active ?? true,
    });
    setErrMsg(''); setSuccess('');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin hapus data siswa ini?')) return;
    try {
      await siswaService.delete(id);
      setSuccess('Data siswa berhasil dihapus');
      fetchData();
    } catch (e) {
      alert('Gagal hapus: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg(''); setSaving(true);

    try {
      if (editMode) {
        // PUT /siswa/{id}
        const payload = {
          nisn:          form.nisn || undefined,
          nis:           form.nis || undefined,
          nama:          form.nama,
          jenis_kelamin: form.jenis_kelamin || undefined,
          tanggal_lahir: form.tanggal_lahir || undefined,
          alamat:        form.alamat || undefined,
          kelas_id:      form.kelas_id ? Number(form.kelas_id) : undefined,
          email:         form.email || undefined,
          is_active:     form.is_active,
        };
        await siswaService.update(selected.id, payload);
        setSuccess('Data siswa berhasil diperbarui');
      } else {
        // POST /siswa — email*, password*, nisn*, nama* wajib
        const payload = {
          email:         form.email,
          password:      form.password,
          nisn:          form.nisn,
          nis:           form.nis || undefined,
          nama:          form.nama,
          jenis_kelamin: form.jenis_kelamin || undefined,
          tanggal_lahir: form.tanggal_lahir || undefined,
          alamat:        form.alamat || undefined,
          kelas_id:      form.kelas_id ? Number(form.kelas_id) : undefined,
        };
        await siswaService.create(payload);
        setSuccess('Data siswa berhasil ditambahkan');
      }
      setShowModal(false);
      fetchData();
    } catch (e) {
      const data = e.response?.data;
      
      // Ekstrak pesan error yang user-friendly
      let msg = 'Gagal menyimpan data siswa';
      
      if (data?.message) {
        msg = data.message;
      } else if (data?.errors) {
        // Jika errors adalah object, ambil values-nya
        if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
          const errorValues = Object.values(data.errors);
          msg = errorValues.join('\n');
        } else {
          msg = String(data.errors);
        }
      } else if (e.message) {
        msg = e.message;
      }
      
      setErrMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  const ch = (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: v }));
  };

  // Filter client-side
  const filtered = siswa.filter(s => {
    const matchSearch = !search ||
      s.nama?.toLowerCase().includes(search.toLowerCase()) ||
      s.nisn?.includes(search);
    const matchKelas = !filterKelas || String(s.kelas_id) === filterKelas ||
      String(s.kelas?.id) === filterKelas;
    return matchSearch && matchKelas;
  });

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Data Siswa</h1>
          <p className="text-text-light mt-1">Total: {siswa.length} siswa terdaftar</p>
        </div>
        <button onClick={openAdd} className="btn-primary">➕ Tambah Siswa</button>
      </div>

      <div className="p-4 mb-5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <strong>ℹ️ Info:</strong> Menambah siswa otomatis membuat akun login dengan role <strong>Siswa</strong>.
        Gunakan email yang belum pernah dipakai di sistem.
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">✅ {success}</div>
      )}

      {/* Filter */}
      <div className="card p-4 mb-4 flex gap-3 flex-wrap">
        <input type="text" placeholder="Cari nama atau NISN..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input-field flex-1 min-w-48" />
        <select value={filterKelas} onChange={e => setFilterKelas(e.target.value)}
          className="input-field w-48">
          <option value="">Semua Kelas</option>
          {kelas.map(k => (
            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
          ))}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr><th>NISN</th><th>Nama</th><th>L/P</th><th>Kelas</th><th>Email Login</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-text-light">
                  {search || filterKelas ? 'Tidak ada data yang cocok' : 'Belum ada data siswa'}
                </td></tr>
              ) : filtered.map(item => (
                <tr key={item.id}>
                  <td className="font-mono text-sm">{item.nisn || '-'}</td>
                  <td className="font-medium">{item.nama}</td>
                  <td>{item.jenis_kelamin === 'L' ? 'L' : 'P'}</td>
                  <td>{item.kelas?.nama_kelas || '-'}</td>
                  <td>{item.user?.email || '-'}</td>
                  <td>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(item)} className="text-primary text-sm hover:underline">✏️ Edit</button>
                      <button onClick={() => handleDelete(item.id)} className="text-error text-sm hover:underline">🗑️ Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editMode ? 'Edit Data Siswa' : 'Tambah Data Siswa'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line">
              {errMsg}
            </div>
          )}

          {/* Akun Login — hanya saat CREATE */}
          {!editMode && (
            <div className="p-4 bg-gray-50 rounded-lg border border-border">
              <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-3">
                🔐 Akun Login Siswa
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Email * <span className="font-normal text-text-light">(harus unik)</span></label>
                  <input type="email" name="email" value={form.email} onChange={ch}
                    className="input-field" required placeholder="siswa@sekolah.sch.id" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Password * (min. 8 karakter)</label>
                  <input type="password" name="password" value={form.password} onChange={ch}
                    className="input-field" required minLength={8} placeholder="Min. 8 karakter" />
                </div>
              </div>
            </div>
          )}

          {/* Edit: bisa update email */}
          {editMode && (
            <div>
              <label className="block text-sm font-medium text-text mb-1">Email Login</label>
              <input type="email" name="email" value={form.email} onChange={ch}
                className="input-field" placeholder="Kosongkan jika tidak diubah" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">NISN *</label>
              <input name="nisn" value={form.nisn} onChange={ch}
                className="input-field" required placeholder="Nomor Induk Siswa Nasional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">NIS</label>
              <input name="nis" value={form.nis} onChange={ch}
                className="input-field" placeholder="Nomor Induk Siswa (lokal)" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nama Lengkap * (min. 3 karakter)</label>
              <input name="nama" value={form.nama} onChange={ch}
                className="input-field" required minLength={3} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Jenis Kelamin</label>
              <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={ch} className="input-field">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Tanggal Lahir</label>
              <input type="date" name="tanggal_lahir" value={form.tanggal_lahir}
                onChange={ch} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Kelas</label>
              <select name="kelas_id" value={form.kelas_id} onChange={ch} className="input-field">
                <option value="">-- Pilih Kelas --</option>
                {kelas.map(k => (
                  <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Alamat</label>
            <textarea name="alamat" value={form.alamat} onChange={ch}
              className="input-field" rows="2" />
          </div>

          {editMode && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="chk_siswa_active" name="is_active"
                checked={form.is_active} onChange={ch} className="w-4 h-4" />
              <label htmlFor="chk_siswa_active" className="text-sm font-medium text-text">Akun Aktif</label>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editMode ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}