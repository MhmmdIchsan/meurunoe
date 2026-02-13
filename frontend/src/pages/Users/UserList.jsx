import { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';
import Alert from '../../components/Common/Alert';

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [alert, setAlert] = useState({ show: false, type: '', message: '' });
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nama: '',
    email: '',
    role_id: '',
    is_active: true
  });

  const roles = [
    { id: 1, nama: 'Admin' },
    { id: 2, nama: 'Kepala Sekolah' },
    { id: 3, nama: 'Guru' },
    { id: 4, nama: 'Wali Kelas' },
    { id: 5, nama: 'Siswa' },
    { id: 6, nama: 'Orang Tua' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await userService.getAll();
      setUsers(response.data.data || []);
    } catch (error) {
      showAlert('error', 'Gagal memuat data user');
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
      username: '',
      password: '',
      nama: '',
      email: '',
      role_id: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleEdit = (user) => {
    setEditMode(true);
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      nama: user.nama || '',
      email: user.email || '',
      role_id: user.role_id,
      is_active: user.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Yakin ingin menghapus user ini?')) return;

    try {
      await userService.delete(id);
      showAlert('success', 'User berhasil dihapus');
      fetchUsers();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menghapus user');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editMode) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password;
        await userService.update(selectedUser.id, updateData);
        showAlert('success', 'User berhasil diupdate');
      } else {
        await userService.create(formData);
        showAlert('success', 'User berhasil ditambahkan');
      }
      setShowModal(false);
      fetchUsers();
    } catch (error) {
      showAlert('error', error.response?.data?.message || 'Gagal menyimpan user');
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value
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
          <h1 className="text-2xl font-bold text-text">Manajemen User</h1>
          <p className="text-text-light mt-1">Kelola akun pengguna sistem</p>
        </div>
        <button onClick={handleAdd} className="btn-primary">
          <span className="mr-2">➕</span>
          Tambah User
        </button>
      </div>

      {alert.show && <Alert type={alert.type} message={alert.message} />}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>Username</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-text-light">
                    Belum ada data user
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.username}</td>
                    <td>{user.nama || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td>
                      <span className="badge badge-info">
                        {user.role?.nama_role || '-'}
                      </span>
                    </td>
                    <td>
                      {user.is_active ? (
                        <span className="badge badge-success">Aktif</span>
                      ) : (
                        <span className="badge badge-error">Nonaktif</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="text-primary hover:text-primary-light"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
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
        title={editMode ? 'Edit User' : 'Tambah User'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Username *</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className="input-field"
              required
              disabled={editMode}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Password {!editMode && '*'}
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="input-field"
              required={!editMode}
              placeholder={editMode ? 'Kosongkan jika tidak ingin mengubah' : ''}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-2">Nama</label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
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

          <div>
            <label className="block text-sm font-medium text-text mb-2">Role *</label>
            <select
              name="role_id"
              value={formData.role_id}
              onChange={handleChange}
              className="input-field"
              required
            >
              <option value="">Pilih Role</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>{role.nama}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="mr-2"
            />
            <label className="text-sm font-medium text-text">User Aktif</label>
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

export default UserList;