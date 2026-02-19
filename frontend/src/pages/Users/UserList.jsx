import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import api from '../../utils/api';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';

const EMPTY = { nama: '', email: '', password: '', role_id: '', is_active: true };

export default function UserList() {
  const [users, setUsers]         = useState([]);
  const [roles, setRoles]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [rolesRes, usersRes] = await Promise.all([
        api.get('/roles'),
        userService.getAll(),
      ]);
      const rawRoles = rolesRes.data?.data || [];
      const rawUsers = usersRes.data;
      setRoles(Array.isArray(rawRoles) ? rawRoles : []);
      setUsers(Array.isArray(rawUsers) ? rawUsers : (rawUsers?.data || []));
    } catch (e) {
      setErrMsg('Gagal memuat data: ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditMode(false); setSelected(null);
    setForm(EMPTY); setErrMsg(''); setSuccess('');
    setShowModal(true);
  }

  function openEdit(u) {
    setEditMode(true); setSelected(u);
    setForm({
      nama:      u.nama || '',
      email:     u.email || '',
      password:  '',
      role_id:   u.role_id || u.role?.id || '',
      is_active: u.is_active ?? true,
    });
    setErrMsg(''); setSuccess('');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin hapus user ini?')) return;
    try {
      await userService.delete(id);
      setSuccess('User berhasil dihapus');
      fetchAll();
    } catch (e) {
      alert('Gagal hapus: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg(''); setSaving(true);

    try {
      if (editMode) {
        const payload = {
          nama:      form.nama,
          email:     form.email,
          role_id:   Number(form.role_id),
          is_active: form.is_active,
        };
        await userService.update(selected.id, payload);
        setSuccess('User berhasil diperbarui');
      } else {
        const payload = {
          nama:      form.nama,
          email:     form.email,
          password:  form.password,
          role_id:   Number(form.role_id),
          is_active: form.is_active,
        };
        await userService.create(payload);
        setSuccess('User berhasil ditambahkan');
      }
      setShowModal(false);
      fetchAll();
    } catch (e) {
      const data = e.response?.data;
      const msg  = data?.errors || data?.message || e.message || 'Gagal menyimpan';
      setErrMsg(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    } finally {
      setSaving(false);
    }
  }

  const ch = (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: v }));
  };

  const getRoleName = (u) => {
    const r = u.role;
    if (!r) return '-';
    return (typeof r === 'string') ? r : (r.nama_role || r.nama || r.name || '-');
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Manajemen User</h1>
          <p className="text-text-light mt-1">Total: {users.length} user terdaftar</p>
        </div>
        <button onClick={openAdd} className="btn-primary">➕ Tambah User</button>
      </div>

      {/* WARNING PENTING */}
      <div className="p-4 mb-5 rounded-lg bg-amber-50 border-l-4 border-amber-500 text-sm">
        <div className="flex gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-amber-900 mb-2">Perhatian: Relasi User → Guru/Siswa</p>
            <ul className="space-y-1 text-amber-800">
              <li className="flex gap-2">
                <span>❌</span>
                <span><strong>Jika tambah user dengan role Guru di sini</strong> → user dibuat tapi <strong>TIDAK muncul di Data Guru</strong> (tidak ada relasi)</span>
              </li>
              <li className="flex gap-2">
                <span>✅</span>
                <span><strong>Solusi:</strong> Tambah guru langsung dari menu <strong>Data Guru</strong> — otomatis buat user + relasi</span>
              </li>
              <li className="flex gap-2 mt-2">
                <span>📝</span>
                <span>Menu ini hanya untuk user admin, kepala sekolah, atau role lain yang tidak perlu relasi ke tabel guru/siswa.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">✅ {success}</div>
      )}
      {errMsg && !showModal && (
        <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">❌ {errMsg}</div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr><th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th></tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-text-light">Belum ada data user</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.nama || '-'}</td>
                  <td>{u.email || '-'}</td>
                  <td><span className="badge badge-info">{getRoleName(u)}</span></td>
                  <td>{u.is_active ? <span className="badge badge-success">Aktif</span> : <span className="badge badge-error">Nonaktif</span>}</td>
                  <td>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(u)} className="text-primary text-sm hover:underline">✏️ Edit</button>
                      <button onClick={() => handleDelete(u.id)} className="text-error text-sm hover:underline">🗑️ Hapus</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editMode ? 'Edit User' : 'Tambah User Baru'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              <strong>Error:</strong> {errMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Nama Lengkap *</label>
            <input name="nama" value={form.nama} onChange={ch}
              className="input-field" required minLength={3} placeholder="Min. 3 karakter" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email * <span className="font-normal text-text-light">(untuk login, harus unik)</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={ch}
              className="input-field" required placeholder="email@sekolah.sch.id" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Password {editMode ? <span className="font-normal text-text-light">(kosongkan jika tidak diubah)</span> : '* (min. 8 karakter)'}
            </label>
            <input type="password" name="password" value={form.password} onChange={ch}
              className="input-field" required={!editMode} minLength={editMode ? 0 : 8}
              placeholder={editMode ? 'Kosongkan jika tidak diubah' : 'Min. 8 karakter'} />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Role *</label>
            <select name="role_id" value={form.role_id} onChange={ch}
              className="input-field" required>
              <option value="">-- Pilih Role --</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.nama_role || r.nama || r.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Untuk role <strong>Guru</strong> atau <strong>Siswa</strong>, sebaiknya tambah dari menu <strong>Data Guru</strong> / <strong>Data Siswa</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="chk_active" name="is_active"
              checked={form.is_active} onChange={ch} className="w-4 h-4" />
            <label htmlFor="chk_active" className="text-sm font-medium text-text">User Aktif</label>
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