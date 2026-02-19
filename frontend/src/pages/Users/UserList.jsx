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
      // Fetch roles dari backend
      try {
        const rolesRes = await api.get('/roles');
        const raw = rolesRes.data?.data || rolesRes.data;
        console.log('[Users] roles response:', rolesRes.data);
        setRoles(Array.isArray(raw) ? raw : []);
      } catch {
        // Fallback statis jika /roles gagal
        setRoles([
          { id: 1, nama_role: 'Admin' },
          { id: 2, nama_role: 'Kepala Sekolah' },
          { id: 3, nama_role: 'Guru' },
          { id: 4, nama_role: 'Wali Kelas' },
          { id: 5, nama_role: 'Siswa' },
          { id: 6, nama_role: 'Orang Tua' },
        ]);
      }

      const res = await userService.getAll();
      const raw = res.data;
      console.log('[Users] getAll response:', res);
      setUsers(Array.isArray(raw) ? raw : (raw?.data || []));
    } catch {
      setErrMsg('Gagal memuat data user');
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

    const payload = {
      nama:      form.nama,
      email:     form.email,
      role_id:   Number(form.role_id),
      is_active: form.is_active,
    };
    if (form.password) payload.password = form.password;

    console.log('[Users] payload:', payload);

    try {
      if (editMode) {
        await userService.update(selected.id, payload);
        setSuccess('User berhasil diperbarui');
      } else {
        await userService.create(payload);
        setSuccess('User berhasil ditambahkan');
      }
      setShowModal(false);
      fetchAll();
    } catch (e) {
      const data = e.response?.data;
      const msg  = data?.errors || data?.message || e.message || 'Gagal menyimpan';
      console.error('[Users] error:', data);
      setErrMsg(typeof msg === 'object' ? JSON.stringify(msg) : String(msg));
    } finally {
      setSaving(false);
    }
  }

  const ch = (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm(p => ({ ...p, [e.target.name]: v }));
  };

  // Helper tampilkan nama role dari object user
  const getRoleName = (u) => {
    const r = u.role;
    if (!r) return '-';
    return (typeof r === 'string') ? r : (r.nama_role || r.name || String(r.id) || '-');
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

      <div className="p-4 mb-5 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
        <strong>ℹ️ Catatan penting:</strong>
        <ul className="mt-1 ml-4 list-disc space-y-0.5">
          <li>User dengan role <strong>Guru</strong> → lengkapi profil di menu <strong>Data Guru</strong></li>
          <li>User dengan role <strong>Siswa</strong> → lengkapi profil di menu <strong>Data Siswa</strong></li>
          <li>Atau tambah langsung dari Data Guru / Data Siswa (otomatis buat akun)</li>
        </ul>
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
              <tr>
                <th>Nama</th><th>Email</th><th>Role</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan="5" className="text-center py-10 text-text-light">Belum ada data user</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td className="font-medium">{u.nama || '-'}</td>
                  <td>{u.email || '-'}</td>
                  <td><span className="badge badge-info">{getRoleName(u)}</span></td>
                  <td>
                    {u.is_active
                      ? <span className="badge badge-success">Aktif</span>
                      : <span className="badge badge-error">Nonaktif</span>}
                  </td>
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
              className="input-field" required placeholder="Nama lengkap" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Email * <span className="font-normal text-text-light">(untuk login)</span>
            </label>
            <input type="email" name="email" value={form.email} onChange={ch}
              className="input-field" required placeholder="email@sekolah.sch.id" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Password {editMode
                ? <span className="font-normal text-text-light">(kosongkan jika tidak diubah)</span>
                : '*'}
            </label>
            <input type="password" name="password" value={form.password} onChange={ch}
              className="input-field" required={!editMode}
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
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="chk" name="is_active"
              checked={form.is_active} onChange={ch} className="w-4 h-4" />
            <label htmlFor="chk" className="text-sm font-medium text-text">User Aktif</label>
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