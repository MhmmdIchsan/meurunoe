import { useState, useEffect } from 'react';
import { guruService } from '../../services/guruService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';

// Field sesuai dokumentasi backend:
// CREATE: email*, password*, nip, nama*, jenis_kelamin(L/P), alamat, telepon
// UPDATE: nip, nama, jenis_kelamin, alamat, telepon, email, is_active

const EMPTY_CREATE = {
  nip: '', nama: '', jenis_kelamin: 'L',
  alamat: '', telepon: '',
  email: '', password: '',
};
const EMPTY_EDIT = {
  nip: '', nama: '', jenis_kelamin: 'L',
  alamat: '', telepon: '',
};

export default function GuruList() {
  const [guru, setGuru]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY_CREATE);
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  useEffect(() => { fetchGuru(); }, []);

  async function fetchGuru() {
    setLoading(true);
    try {
      const res = await guruService.getAll();
      const raw = res.data;
      setGuru(Array.isArray(raw) ? raw : (raw?.data || []));
    } catch (e) {
      setErrMsg('Gagal memuat data guru');
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
      nip:           item.nip || '',
      nama:          item.nama || '',
      jenis_kelamin: item.jenis_kelamin || 'L',
      alamat:        item.alamat || '',
      telepon:       item.telepon || '',
    });
    setErrMsg(''); setSuccess('');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin hapus data guru ini?')) return;
    try {
      await guruService.delete(id);
      setSuccess('Data guru berhasil dihapus');
      fetchGuru();
    } catch (e) {
      alert('Gagal hapus: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg(''); setSaving(true);

    try {
      if (editMode) {
        // PUT /guru/{id} — hanya data profil, TANPA email/password
        // Backend UpdateGuruRequest: nip, nama, jenis_kelamin, alamat, telepon
        const payload = {
          nama:          form.nama,
          nip:           form.nip || undefined,
          jenis_kelamin: form.jenis_kelamin || undefined,
          alamat:        form.alamat || undefined,
          telepon:       form.telepon || undefined,
        };
        await guruService.update(selected.id, payload);
        setSuccess('Data guru berhasil diperbarui');
      } else {
        // POST /guru — email*, password*, nama*, + data profil
        const payload = {
          email:         form.email,
          password:      form.password,
          nama:          form.nama,
          nip:           form.nip || undefined,
          jenis_kelamin: form.jenis_kelamin || undefined,
          alamat:        form.alamat || undefined,
          telepon:       form.telepon || undefined,
        };
        await guruService.create(payload);
        setSuccess('Data guru berhasil ditambahkan');
      }
      setShowModal(false);
      fetchGuru();
    } catch (e) {
      const data = e.response?.data;
      
      // Ekstrak pesan error yang user-friendly
      let msg = 'Gagal menyimpan data guru';
      
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

  const ch = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Data Guru</h1>
          <p className="text-text-light mt-1">Total: {guru.length} guru terdaftar</p>
        </div>
        <button onClick={openAdd} className="btn-primary">➕ Tambah Guru</button>
      </div>

      <div className="p-4 mb-5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <strong>ℹ️ Info:</strong> Menambah guru otomatis membuat akun login dengan role <strong>Guru</strong>.
        Gunakan email yang belum pernah dipakai di sistem.
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">✅ {success}</div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr><th>NIP</th><th>Nama</th><th>L/P</th><th>Email Login</th><th>Telepon</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {guru.length === 0 ? (
                <tr><td colSpan="6" className="text-center py-10 text-text-light">Belum ada data guru</td></tr>
              ) : guru.map(item => (
                <tr key={item.id}>
                  <td className="font-mono text-sm">{item.nip || '-'}</td>
                  <td className="font-medium">{item.nama}</td>
                  <td>{item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td>{item.user?.email || '-'}</td>
                  <td>{item.telepon || '-'}</td>
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
        title={editMode ? 'Edit Data Guru' : 'Tambah Data Guru'} size="lg">
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
                🔐 Akun Login Guru
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Email * <span className="font-normal text-text-light">(harus unik)</span></label>
                  <input type="email" name="email" value={form.email} onChange={ch}
                    className="input-field" required placeholder="guru@sekolah.sch.id" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Password * (min. 8 karakter)</label>
                  <input type="password" name="password" value={form.password} onChange={ch}
                    className="input-field" required minLength={8} placeholder="Min. 8 karakter" />
                </div>
              </div>
            </div>
          )}

          {/* Data Profil */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">NIP</label>
              <input name="nip" value={form.nip} onChange={ch}
                className="input-field" placeholder="Nomor Induk Pegawai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nama Lengkap * (min. 3 karakter)</label>
              <input name="nama" value={form.nama} onChange={ch}
                className="input-field" required minLength={3} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Jenis Kelamin</label>
              <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={ch} className="input-field">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Telepon</label>
              <input name="telepon" value={form.telepon} onChange={ch}
                className="input-field" placeholder="08xx-xxxx-xxxx" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Alamat</label>
            <textarea name="alamat" value={form.alamat} onChange={ch}
              className="input-field" rows="2" />
          </div>

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