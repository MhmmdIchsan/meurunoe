import { useState, useEffect } from 'react';
import { orangTuaService } from '../../services/orangTuaService';
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
  const [hubunganMap, setHubunganMap] = useState({}); // { siswaId: 'ayah'/'ibu'/'wali' }
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
      const ortList = Array.isArray(rawOrt) ? rawOrt : (rawOrt?.data || []);
      
      setOrangTuaList(ortList);

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
    
    // Gunakan data anak dari backend response
    const anak = orangTua.anak || [];
    setCurrentAnak(anak);
    
    // Pre-select siswa yang sudah di-assign
    const siswaIds = anak.map(a => a.siswa_id || a.siswa?.id).filter(Boolean);
    setSelectedSiswaIds(siswaIds);
    
    // Map hubungan existing
    const hubunganMap = {};
    anak.forEach(a => {
      const sid = a.siswa_id || a.siswa?.id;
      if (sid) {
        hubunganMap[sid] = a.hubungan || 'wali';
      }
    });
    setHubunganMap(hubunganMap);
    
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
        // Untuk create, tambahkan password default
        payload.password = 'password123'; // Password default
        await orangTuaService.create(payload);
        setSuccess('Orang tua berhasil ditambahkan. Password default: password123');
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
      // Format: array of { siswa_id, hubungan }
      const assignments = selectedSiswaIds.map(siswaId => ({
        siswa_id: siswaId,
        hubungan: hubunganMap[siswaId] || 'wali',
      }));

      await orangTuaService.assignSiswa(selected.id, assignments);
      setSuccess(`${selectedSiswaIds.length} siswa berhasil di-assign ke ${selected.nama}`);
      setShowAssignModal(false);
      
      // Reload data untuk update jumlah anak
      await fetchAll();
      
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
        // Uncheck - remove siswa
        setHubunganMap(hm => {
          const newMap = { ...hm };
          delete newMap[siswaId];
          return newMap;
        });
        return prev.filter(id => id !== siswaId);
      } else {
        // Check - add siswa with default hubungan 'wali'
        setHubunganMap(hm => ({ ...hm, [siswaId]: 'wali' }));
        return [...prev, siswaId];
      }
    });
  }

  function handleHubunganChange(siswaId, hubungan) {
    setHubunganMap(prev => ({ ...prev, [siswaId]: hubungan }));
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
                  <td className="text-sm">{o.user?.email || o.email || '-'}</td>
                  <td className="font-mono text-sm">{o.telepon || '-'}</td>
                  <td className="text-sm">{o.pekerjaan || '-'}</td>
                  <td>
                    <button 
                      onClick={() => openAssign(o)}
                      className="text-primary text-sm hover:underline"
                    >
                      {o.anak?.length || 0} anak
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
            <strong>ℹ️ Info:</strong> 
            {editMode ? (
              <span> Setelah update, Anda bisa assign siswa di tabel → klik "X anak"</span>
            ) : (
              <span> Password default untuk login orang tua adalah: <strong>password123</strong>. Orang tua bisa mengubahnya setelah login.</span>
            )}
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
              <div key={s.id} className="p-3 hover:bg-gray-50 border-b border-border">
                <label className="flex items-center gap-3 cursor-pointer">
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
                  {selectedSiswaIds.includes(s.id) && (
                    <select
                      value={hubunganMap[s.id] || 'wali'}
                      onChange={(e) => handleHubunganChange(s.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="input-field py-1 px-2 text-sm w-24"
                    >
                      <option value="wali">Wali</option>
                      <option value="ayah">Ayah</option>
                      <option value="ibu">Ibu</option>
                    </select>
                  )}
                </label>
              </div>
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