import { useState, useEffect } from 'react';
import { orangTuaService } from '../../services/orangtuaService';
import { siswaService } from '../../services/siswaService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';

const EMPTY_FORM = {
  nama: '',
  email: '',
  telepon: '',
  alamat: '',
  pekerjaan: '',
};

export default function OrangTuaList() {
  const [orangTuaList, setOrangTuaList] = useState([]);
  const [siswaList, setSiswaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [success, setSuccess] = useState('');
  const [errMsg, setErrMsg] = useState('');
  const [search, setSearch] = useState('');

  // Assign siswa state
  const [selectedSiswaIds, setSelectedSiswaIds] = useState([]);
  const [currentAnak, setCurrentAnak] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [ortRes, siswaRes] = await Promise.all([
        orangTuaService.getAll(),
        siswaService.getAll(),
      ]);

      const rawOrt = ortRes.data;
      setOrangTuaList(Array.isArray(rawOrt) ? rawOrt : (rawOrt?.data || []));

      const rawSiswa = siswaRes.data;
      setSiswaList(Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.data || []));
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  function openAdd() {
    setEditMode(false);
    setSelected(null);
    setForm(EMPTY_FORM);
    setErrMsg('');
    setSuccess('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditMode(true);
    setSelected(item);
    setForm({
      nama: item.nama || '',
      email: item.email || '',
      telepon: item.telepon || '',
      alamat: item.alamat || '',
      pekerjaan: item.pekerjaan || '',
    });
    setErrMsg('');
    setSuccess('');
    setShowModal(true);
  }

  async function openAssign(orangTua) {
    setSelected(orangTua);
    try {
      const res = await orangTuaService.getAnak(orangTua.id);
      const anak = Array.isArray(res.data) ? res.data : (res.data?.siswa || []);
      setCurrentAnak(anak);
      setSelectedSiswaIds(anak.map(a => a.id));
    } catch (e) {
      console.error('Error:', e);
      setCurrentAnak([]);
      setSelectedSiswaIds([]);
    }
    setShowAssignModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin hapus orang tua ini?')) return;
    try {
      await orangTuaService.delete(id);
      setSuccess('Orang tua berhasil dihapus');
      fetchAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      alert('Gagal hapus: ' + (e.response?.data?.message || e.message));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg('');
    setSaving(true);

    try {
      const payload = {
        nama: form.nama,
        email: form.email,
        telepon: form.telepon,
        alamat: form.alamat,
        pekerjaan: form.pekerjaan,
      };

      if (editMode) {
        await orangTuaService.update(selected.id, payload);
        setSuccess('Orang tua berhasil diperbarui');
      } else {
        await orangTuaService.create(payload);
        setSuccess('Orang tua berhasil ditambahkan');
      }

      setShowModal(false);
      fetchAll();
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      const data = e.response?.data;
      let msg = 'Gagal menyimpan data orang tua';
      
      if (data?.message) {
        msg = data.message;
      } else if (data?.errors) {
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

  async function handleAssignSiswa(e) {
    e.preventDefault();
    setErrMsg('');
    setSaving(true);

    try {
      await orangTuaService.assignSiswa(selected.id, selectedSiswaIds);
      setSuccess(`${selectedSiswaIds.length} siswa berhasil di-assign ke ${selected.nama}`);
      setShowAssignModal(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Gagal assign siswa';
      setErrMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  function toggleSiswa(siswaId) {
    setSelectedSiswaIds(prev => {
      if (prev.includes(siswaId)) {
        return prev.filter(id => id !== siswaId);
      } else {
        return [...prev, siswaId];
      }
    });
  }

  const ch = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const filtered = orangTuaList.filter(o => 
    o.nama?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase()) ||
    o.telepon?.includes(search)
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Data Orang Tua</h1>
          <p className="text-text-light mt-1">Manajemen data orang tua / wali siswa</p>
        </div>
        <button onClick={openAdd} className="btn-primary">➕ Tambah Orang Tua</button>
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Search */}
      <div className="card p-4 mb-4">
        <input
          type="text"
          placeholder="Cari nama, email, atau telepon..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="table-auto">
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Telepon</th>
                <th>Pekerjaan</th>
                <th>Anak</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-text-light">
                    {search ? 'Tidak ada hasil' : 'Belum ada data orang tua'}
                  </td>
                </tr>
              ) : filtered.map((o, i) => (
                <tr key={o.id}>
                  <td>{i + 1}</td>
                  <td className="font-medium">{o.nama}</td>
                  <td className="text-sm">{o.email || '-'}</td>
                  <td className="font-mono text-sm">{o.telepon || '-'}</td>
                  <td className="text-sm">{o.pekerjaan || '-'}</td>
                  <td>
                    <button 
                      onClick={() => openAssign(o)}
                      className="text-primary text-sm hover:underline"
                    >
                      {o.siswa?.length || 0} anak
                    </button>
                  </td>
                  <td>
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(o)} className="text-primary text-sm hover:underline">
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(o.id)} className="text-error text-sm hover:underline">
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editMode ? 'Edit Orang Tua' : 'Tambah Orang Tua'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line">
              {errMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">Nama Lengkap *</label>
            <input type="text" name="nama" value={form.nama} onChange={ch}
              className="input-field" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Email *</label>
              <input type="email" name="email" value={form.email} onChange={ch}
                className="input-field" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Telepon *</label>
              <input type="tel" name="telepon" value={form.telepon} onChange={ch}
                className="input-field" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Pekerjaan</label>
            <input type="text" name="pekerjaan" value={form.pekerjaan} onChange={ch}
              className="input-field" />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">Alamat</label>
            <textarea name="alamat" value={form.alamat} onChange={ch}
              className="input-field" rows="3" />
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <strong>ℹ️ Info:</strong> Setelah membuat orang tua, Anda bisa assign siswa (anak) di tabel → klik "X anak"
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : (editMode ? 'Update' : 'Simpan')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Assign Siswa */}
      <Modal isOpen={showAssignModal} onClose={() => setShowAssignModal(false)}
        title={`Assign Siswa ke ${selected?.nama}`} size="lg">
        <form onSubmit={handleAssignSiswa} className="space-y-4">
          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {errMsg}
            </div>
          )}

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800 mb-4">
            <strong>ℹ️ Pilih siswa</strong> yang merupakan anak dari {selected?.nama}. 
            Centang/uncentang untuk assign/unassign.
          </div>

          <div className="max-h-96 overflow-y-auto border border-border rounded-lg">
            {siswaList.length === 0 ? (
              <div className="text-center py-12 text-text-light">Belum ada siswa</div>
            ) : siswaList.map(s => (
              <label key={s.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b border-border">
                <input
                  type="checkbox"
                  checked={selectedSiswaIds.includes(s.id)}
                  onChange={() => toggleSiswa(s.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium text-text">{s.nama}</div>
                  <div className="text-sm text-text-light">
                    {s.nisn} • Kelas {s.kelas?.nama || '-'}
                  </div>
                </div>
              </label>
            ))}
          </div>

          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <strong>Total terpilih:</strong> {selectedSiswaIds.length} siswa
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowAssignModal(false)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : `Simpan (${selectedSiswaIds.length} siswa)`}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}