import { useState, useEffect } from 'react';
import { guruService } from '../../services/guruService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';

const EMPTY = {
  nip: '', nama: '', jenis_kelamin: 'L',
  tanggal_lahir: '', alamat: '', telepon: '',  // ← backend pakai "telepon" bukan "no_hp"
  email: '', password: '',
};

export default function GuruList() {
  const [guru, setGuru]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  useEffect(() => { fetchGuru(); }, []);

  async function fetchGuru() {
    setLoading(true);
    try {
      const res = await guruService.getAll();
      const raw = res.data;
      setGuru(Array.isArray(raw) ? raw : (raw?.data || []));
    } catch {
      setErrMsg('Gagal memuat data guru');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditMode(false); setSelected(null);
    setForm(EMPTY); setErrMsg(''); setSuccess('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditMode(true); setSelected(item);
    setForm({
      nip:           item.nip || '',
      nama:          item.nama || '',
      jenis_kelamin: item.jenis_kelamin || 'L',
      tanggal_lahir: item.tanggal_lahir?.split('T')[0] || '',
      alamat:        item.alamat || '',
      telepon:       item.telepon || '',   // ← field backend
      email: '', password: '',
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
        // UPDATE — kirim minimal 1 field agar guruUpdates tidak kosong
        // Backend butuh setidaknya satu field untuk diupdate
        const payload = {
          nama:          form.nama,           // selalu kirim nama (required)
          nip:           form.nip || undefined,
          jenis_kelamin: form.jenis_kelamin || undefined,
          alamat:        form.alamat || undefined,
          telepon:       form.telepon || undefined,
          // Tidak kirim email/password saat update profil
        };
        console.log('[Guru] update payload:', payload);
        await guruService.update(selected.id, payload);
        setSuccess('Data guru berhasil diperbarui');
      } else {
        // CREATE — kirim semua termasuk akun login
        const payload = {
          nip:           form.nip || undefined,
          nama:          form.nama,
          jenis_kelamin: form.jenis_kelamin || undefined,
          alamat:        form.alamat || undefined,
          telepon:       form.telepon || undefined,
          email:         form.email,
          password:      form.password,
        };
        console.log('[Guru] create payload:', payload);
        await guruService.create(payload);
        setSuccess('Data guru berhasil ditambahkan');
      }
      setShowModal(false);
      fetchGuru();
    } catch (e) {
      const data = e.response?.data;
      const msg  = data?.errors || data?.message || e.message || 'Gagal menyimpan';
      console.error('[Guru] backend error:', data);
      setErrMsg(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
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
        <strong>ℹ️ Info:</strong> Menambah guru otomatis membuat akun login.
        Email &amp; password yang diisi digunakan guru untuk masuk ke sistem.
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          ✅ {success}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama</th>
                <th>L/P</th>
                <th>Email Login</th>
                <th>Telepon</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {guru.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-10 text-text-light">
                    Belum ada data guru
                  </td>
                </tr>
              ) : guru.map(item => (
                <tr key={item.id}>
                  <td className="font-mono text-sm">{item.nip || '-'}</td>
                  <td className="font-medium">{item.nama}</td>
                  <td>{item.jenis_kelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</td>
                  <td>{item.user?.email || '-'}</td>
                  <td>{item.telepon || '-'}</td>
                  <td>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(item)}
                        className="text-primary text-sm hover:underline">✏️ Edit</button>
                      <button onClick={() => handleDelete(item.id)}
                        className="text-error text-sm hover:underline">🗑️ Hapus</button>
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
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <strong>Error:</strong> {errMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">NIP</label>
              <input name="nip" value={form.nip} onChange={ch}
                className="input-field" placeholder="Nomor Induk Pegawai" />
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-1">Nama Lengkap *</label>
              <input name="nama" value={form.nama} onChange={ch}
                className="input-field" required minLength={3} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Jenis Kelamin</label>
              <select name="jenis_kelamin" value={form.jenis_kelamin} onChange={ch}
                className="input-field">
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

          {/* Email & Password HANYA saat CREATE */}
          {!editMode && (
            <>
              <div className="border-t border-border pt-4">
                <p className="text-xs font-semibold text-text-light uppercase tracking-wide mb-3">
                  Akun Login Guru
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Email *</label>
                    <input type="email" name="email" value={form.email} onChange={ch}
                      className="input-field" required placeholder="guru@sekolah.sch.id" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Password *</label>
                    <input type="password" name="password" value={form.password} onChange={ch}
                      className="input-field" required minLength={8}
                      placeholder="Min. 8 karakter" />
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)}
              className="btn-secondary">Batal</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editMode ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}