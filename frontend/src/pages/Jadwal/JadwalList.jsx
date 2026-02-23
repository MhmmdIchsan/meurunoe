import { useState, useEffect } from 'react';
import { jadwalService } from '../../services/jadwalService';
import { kelasService } from '../../services/kelasService';
import { guruService } from '../../services/guruService';
import { mataPelajaranService } from '../../services/mataPelajaranService';
import { semesterService } from '../../services/semesterService';
import { useAuth, extractRole } from '../../context/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';
import { Link } from 'react-router-dom';

const HARI = {
  1: 'Senin',
  2: 'Selasa', 
  3: 'Rabu',
  4: 'Kamis',
  5: 'Jumat',
  6: 'Sabtu',
};

const EMPTY_FORM = {
  kelas_id: '',
  guru_id: '',
  mata_pelajaran_id: '',
  semester_id: '',
  hari_ke: '',
  jam_mulai: '',
  jam_selesai: '',
};

export default function JadwalList() {
  const { user } = useAuth();
  const role = extractRole(user);

  const [viewMode, setViewMode] = useState('table'); // table | timetable
  const [jadwalList, setJadwalList] = useState([]);
  const [kelasList, setKelasList]   = useState([]);
  const [guruList, setGuruList]     = useState([]);
  const [mapelList, setMapelList]   = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [semesterAktif, setSemesterAktif] = useState(null);

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [selected, setSelected]   = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  // Filter
  const [filterSemester, setFilterSemester] = useState('');
  const [filterKelas, setFilterKelas]       = useState('');
  const [filterHari, setFilterHari]         = useState('');

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => {
    if (semesterAktif && !filterSemester) {
      setFilterSemester(String(semesterAktif.id));
    }
  }, [semesterAktif]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [semRes, semAktifRes, kelasRes, guruRes, mapelRes] = await Promise.all([
        semesterService.getAll(),
        semesterService.getAktif().catch(() => ({ data: null })),
        kelasService.getAll(),
        guruService.getAll(),
        mataPelajaranService.getAll(),
      ]);

      const rawSem = semRes.data;
      setSemesterList(Array.isArray(rawSem) ? rawSem : (rawSem?.data || []));

      const aktif = semAktifRes.data;
      setSemesterAktif(aktif);

      const rawKelas = kelasRes.data;
      setKelasList(Array.isArray(rawKelas) ? rawKelas : (rawKelas?.data || []));

      const rawGuru = guruRes.data;
      setGuruList(Array.isArray(rawGuru) ? rawGuru : (rawGuru?.data || []));

      const rawMapel = mapelRes.data;
      setMapelList(Array.isArray(rawMapel) ? rawMapel : (rawMapel?.data || []));

      // Fetch jadwal dengan filter default semester aktif
      if (aktif) {
        await fetchJadwal({ semester_id: aktif.id });
      } else {
        await fetchJadwal();
      }
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function fetchJadwal(params = {}) {
    try {
      const res = await jadwalService.getAll(params);
      const raw = res.data;
      setJadwalList(Array.isArray(raw) ? raw : (raw?.data || []));
    } catch (e) {
      console.error('Error fetch jadwal:', e);
    }
  }

  function applyFilter() {
    const params = {};
    if (filterSemester) params.semester_id = filterSemester;
    if (filterKelas) params.kelas_id = filterKelas;
    if (filterHari) params.hari_ke = filterHari;
    fetchJadwal(params);
  }

  useEffect(() => {
    if (!loading) applyFilter();
  }, [filterSemester, filterKelas, filterHari]);

  function openAdd() {
    setEditMode(false);
    setSelected(null);
    setForm({
      ...EMPTY_FORM,
      semester_id: semesterAktif?.id || '',
    });
    setErrMsg('');
    setSuccess('');
    setShowModal(true);
  }

  function openEdit(item) {
    setEditMode(true);
    setSelected(item);
    setForm({
      kelas_id:         item.kelas_id || '',
      guru_id:          item.guru_id || '',
      mata_pelajaran_id: item.mata_pelajaran_id || '',
      semester_id:      item.semester_id || '',
      hari_ke:          item.hari_ke || '',
      jam_mulai:        item.jam_mulai || '',
      jam_selesai:      item.jam_selesai || '',
    });
    setErrMsg('');
    setSuccess('');
    setShowModal(true);
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin hapus jadwal ini?')) return;
    try {
      await jadwalService.delete(id);
      setSuccess('Jadwal berhasil dihapus');
      applyFilter();
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
        kelas_id:         Number(form.kelas_id),
        guru_id:          Number(form.guru_id),
        mata_pelajaran_id: Number(form.mata_pelajaran_id),
        semester_id:      Number(form.semester_id),
        hari_ke:          Number(form.hari_ke),
        jam_mulai:        form.jam_mulai,
        jam_selesai:      form.jam_selesai,
      };

      if (editMode) {
        await jadwalService.update(selected.id, payload);
        setSuccess('Jadwal berhasil diperbarui');
      } else {
        await jadwalService.create(payload);
        setSuccess('Jadwal berhasil ditambahkan');
      }

      setShowModal(false);
      applyFilter();
    } catch (e) {
      const data = e.response?.data;
      
      // Handle conflict error (409) - jadwal bentrok
      if (e.response?.status === 409 && data?.errors) {
        const errors = data.errors;
        if (errors.ada_konflik && Array.isArray(errors.konflik)) {
          // Ambil keterangan dari setiap konflik
          const messages = errors.konflik.map(k => k.keterangan || '').filter(Boolean);
          if (messages.length > 0) {
            setErrMsg('⚠️ Jadwal Bentrok:\n' + messages.join('\n'));
            return;
          }
        }
      }

      // Handle error lainnya
      const msg = data?.message || e.message || 'Gagal menyimpan jadwal';
      setErrMsg(String(msg));
    } finally {
      setSaving(false);
    }
  }

  const ch = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  // Hitung jadwal per hari untuk timetable view
  const jadwalPerHari = {};
  for (let i = 1; i <= 6; i++) {
    jadwalPerHari[i] = jadwalList
      .filter(j => j.hari_ke === i)
      .sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai));
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Jadwal Pelajaran</h1>
          <p className="text-text-light mt-1">
            {semesterAktif
              ? `Semester ${semesterAktif.nama} • ${semesterAktif.tahun_ajaran?.nama}`
              : 'Semester belum diset'}
          </p>
        </div>
        {role === 'admin' && (
          <button onClick={openAdd} className="btn-primary">➕ Tambah Jadwal</button>
        )}
      </div>

      {success && (
        <div className="p-3 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Filter & View Mode */}
      <div className="card p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select value={filterSemester} onChange={(e) => setFilterSemester(e.target.value)}
            className="input-field">
            <option value="">Semua Semester</option>
            {semesterList.map(s => (
              <option key={s.id} value={s.id}>
                {s.nama} - {s.tahun_ajaran?.nama}
              </option>
            ))}
          </select>

          <select value={filterKelas} onChange={(e) => setFilterKelas(e.target.value)}
            className="input-field">
            <option value="">Semua Kelas</option>
            {kelasList.map(k => (
              <option key={k.id} value={k.id}>{k.nama}</option>
            ))}
          </select>

          <select value={filterHari} onChange={(e) => setFilterHari(e.target.value)}
            className="input-field">
            <option value="">Semua Hari</option>
            {Object.entries(HARI).map(([key, val]) => (
              <option key={key} value={key}>{val}</option>
            ))}
          </select>

          <div className="md:col-span-2 flex gap-2">
            <button
              onClick={() => setViewMode('table')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'table'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text hover:bg-gray-200'
              }`}
            >
              📋 Tabel
            </button>
            <button
              onClick={() => setViewMode('timetable')}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'timetable'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-text hover:bg-gray-200'
              }`}
            >
              📅 Jadwal Mingguan
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <TableView
          jadwalList={jadwalList}
          role={role}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      ) : (
        <TimetableView
          jadwalPerHari={jadwalPerHari}
          filterKelas={filterKelas}
          kelasList={kelasList}
        />
      )}

      {/* Modal Form */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={editMode ? 'Edit Jadwal' : 'Tambah Jadwal'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line">
              {errMsg}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Kelas *</label>
              <select name="kelas_id" value={form.kelas_id} onChange={ch}
                className="input-field" required>
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Guru *</label>
              <select name="guru_id" value={form.guru_id} onChange={ch}
                className="input-field" required>
                <option value="">-- Pilih Guru --</option>
                {guruList.map(g => (
                  <option key={g.id} value={g.id}>{g.nama}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Mata Pelajaran *</label>
              <select name="mata_pelajaran_id" value={form.mata_pelajaran_id} onChange={ch}
                className="input-field" required>
                <option value="">-- Pilih Mapel --</option>
                {mapelList.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Semester *</label>
              <select name="semester_id" value={form.semester_id} onChange={ch}
                className="input-field" required>
                <option value="">-- Pilih Semester --</option>
                {semesterList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nama} - {s.tahun_ajaran?.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">Hari *</label>
              <select name="hari_ke" value={form.hari_ke} onChange={ch}
                className="input-field" required>
                <option value="">-- Pilih Hari --</option>
                {Object.entries(HARI).map(([key, val]) => (
                  <option key={key} value={key}>{val}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Jam Mulai *</label>
              <input type="time" name="jam_mulai" value={form.jam_mulai} onChange={ch}
                className="input-field" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">Jam Selesai *</label>
              <input type="time" name="jam_selesai" value={form.jam_selesai} onChange={ch}
                className="input-field" required />
            </div>
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
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TABLE VIEW
// ═══════════════════════════════════════════════════════════════
function TableView({ jadwalList, role, onEdit, onDelete }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="table-auto">
          <thead>
            <tr>
              <th>Hari</th>
              <th>Jam</th>
              <th>Kelas</th>
              <th>Mata Pelajaran</th>
              <th>Guru</th>
              {role === 'admin' && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {jadwalList.length === 0 ? (
              <tr>
                <td colSpan={role === 'admin' ? 6 : 5} className="text-center py-10 text-text-light">
                  Belum ada jadwal
                </td>
              </tr>
            ) : jadwalList.map(j => (
              <tr key={j.id}>
                <td className="font-medium">{HARI[j.hari_ke]}</td>
                <td className="font-mono text-sm">{j.jam_mulai} - {j.jam_selesai}</td>
                <td>
                  <span className="badge badge-info">{j.kelas?.nama}</span>
                </td>
                <td className="font-medium">{j.mata_pelajaran?.nama}</td>
                <td className="text-sm">{j.guru?.nama}</td>
                {role === 'admin' && (
                  <td>
                    <div className="flex gap-3">
                      <button onClick={() => onEdit(j)} className="text-primary text-sm hover:underline">
                        ✏️ Edit
                      </button>
                      <button onClick={() => onDelete(j.id)} className="text-error text-sm hover:underline">
                        🗑️ Hapus
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIMETABLE VIEW (Jadwal Mingguan)
// ═══════════════════════════════════════════════════════════════
function TimetableView({ jadwalPerHari, filterKelas, kelasList }) {
  const selectedKelas = kelasList.find(k => k.id === Number(filterKelas));

  return (
    <div>
      {filterKelas && selectedKelas && (
        <div className="mb-4 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-sm text-text">
            Jadwal Kelas: <strong className="text-primary">{selectedKelas.nama}</strong>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(HARI).map(([hariKe, namaHari]) => (
          <div key={hariKe} className="card">
            <div className="p-4 bg-primary/5 border-b border-border">
              <h3 className="font-semibold text-text">{namaHari}</h3>
            </div>
            <div className="p-4 space-y-3">
              {jadwalPerHari[hariKe]?.length === 0 ? (
                <p className="text-sm text-text-light text-center py-4">Tidak ada jadwal</p>
              ) : jadwalPerHari[hariKe]?.map(j => (
                <Link
                  key={j.id}
                  to={`/absensi?jadwal_id=${j.id}`}
                  className="block p-3 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="font-mono text-xs text-text-light">
                      {j.jam_mulai} - {j.jam_selesai}
                    </span>
                    <span className="badge badge-info text-xs">{j.kelas?.nama}</span>
                  </div>
                  <p className="font-semibold text-text text-sm mb-1">
                    {j.mata_pelajaran?.nama}
                  </p>
                  <p className="text-xs text-text-light">
                    👨‍🏫 {j.guru?.nama}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}