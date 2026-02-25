import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { nilaiService } from '../../services/nilaiService';
import { kelasService } from '../../services/kelasService';
import { mataPelajaranService } from '../../services/mataPelajaranService';
import { semesterService } from '../../services/semesterService';
import { useAuth, extractRole } from '../../context/AuthContext';
import { notifyNilaiUpdated } from '../../utils/notifications';
import LoadingSpinner from '../../components/Common/LoadingSpinner';
import Modal from '../../components/Common/Modal';

export default function NilaiInput() {
  const { user } = useAuth();
  const role = extractRole(user);
  const [searchParams] = useSearchParams();

  const [step, setStep] = useState(1); // 1: Pilih Kelas & Mapel, 2: Input Nilai
  const [kelasList, setKelasList]       = useState([]);
  const [mapelList, setMapelList]       = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [semesterAktif, setSemesterAktif] = useState(null);

  const [selectedKelas, setSelectedKelas]   = useState(null);
  const [selectedMapel, setSelectedMapel]   = useState(null);
  const [selectedSemester, setSelectedSemester] = useState('');
  const [siswaList, setSiswaList]           = useState([]);
  const [nilaiData, setNilaiData]           = useState({});

  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSiswa, setEditingSiswa] = useState(null);
  const [form, setForm]           = useState({ nilai_harian: '', nilai_uts: '', nilai_uas: '' });
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const [semRes, semAktifRes, kelasRes, mapelRes] = await Promise.all([
        semesterService.getAll(),
        semesterService.getAktif().catch(() => ({ data: null })),
        kelasService.getAll(),
        mataPelajaranService.getAll(),
      ]);

      const rawSem = semRes.data;
      setSemesterList(Array.isArray(rawSem) ? rawSem : (rawSem?.data || []));

      const aktif = semAktifRes.data;
      setSemesterAktif(aktif);
      if (aktif) setSelectedSemester(String(aktif.id));

      const rawKelas = kelasRes.data;
      setKelasList(Array.isArray(rawKelas) ? rawKelas : (rawKelas?.data || []));

      const rawMapel = mapelRes.data;
      setMapelList(Array.isArray(rawMapel) ? rawMapel : (rawMapel?.data || []));
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectKelasMapel() {
    if (!selectedKelas || !selectedMapel || !selectedSemester) {
      setErrMsg('Pilih kelas, mata pelajaran, dan semester');
      return;
    }

    setLoading(true);
    setErrMsg('');
    try {
      // Fetch siswa di kelas
      const siswaRes = await kelasService.getSiswaByKelas(selectedKelas);
      const rawSiswa = siswaRes.data;
      const siswa = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []);
      setSiswaList(siswa);

      // Fetch nilai yang sudah ada
      const nilaiRes = await nilaiService.getAll({
        mata_pelajaran_id: selectedMapel,
        semester_id: selectedSemester,
      });
      const existingNilai = Array.isArray(nilaiRes.data) ? nilaiRes.data : (nilaiRes.data?.data || []);

      // Map nilai existing ke siswa
      const nilaiMap = {};
      siswa.forEach(s => {
        const existing = existingNilai.find(n => n.siswa_id === s.id);
        if (existing) {
          nilaiMap[s.id] = {
            id: existing.id,
            nilai_harian: existing.nilai_harian || 0,
            nilai_uts: existing.nilai_uts || 0,
            nilai_uas: existing.nilai_uas || 0,
            nilai_akhir: existing.nilai_akhir || 0,
            predikat: existing.predikat || '-',
          };
        } else {
          nilaiMap[s.id] = null;
        }
      });
      setNilaiData(nilaiMap);
      setStep(2);
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data siswa');
    } finally {
      setLoading(false);
    }
  }

  function openInputModal(siswa) {
    setEditingSiswa(siswa);
    const existing = nilaiData[siswa.id];
    if (existing) {
      setForm({
        nilai_harian: existing.nilai_harian || '',
        nilai_uts: existing.nilai_uts || '',
        nilai_uas: existing.nilai_uas || '',
      });
    } else {
      setForm({ nilai_harian: '', nilai_uts: '', nilai_uas: '' });
    }
    setErrMsg('');
    setShowModal(true);
  }

  async function handleSubmitNilai(e) {
    e.preventDefault();
    setErrMsg('');
    setSaving(true);

    try {
      const payload = {
        siswa_id: editingSiswa.id,
        mata_pelajaran_id: Number(selectedMapel),
        semester_id: Number(selectedSemester),
        nilai_harian: Number(form.nilai_harian) || 0,
        nilai_uts: Number(form.nilai_uts) || 0,
        nilai_uas: Number(form.nilai_uas) || 0,
      };

      const existing = nilaiData[editingSiswa.id];
      let result;

      if (existing?.id) {
        // Update
        result = await nilaiService.update(existing.id, payload);
      } else {
        // Create
        result = await nilaiService.create(payload);
      }

      // Update local state
      const newNilai = result.data;
      setNilaiData(prev => ({
        ...prev,
        [editingSiswa.id]: {
          id: newNilai.id,
          nilai_harian: newNilai.nilai_harian,
          nilai_uts: newNilai.nilai_uts,
          nilai_uas: newNilai.nilai_uas,
          nilai_akhir: newNilai.nilai_akhir,
          predikat: newNilai.predikat,
        },
      }));

      const kelasObj = kelasList.find(k => k.id === Number(selectedKelas));
      const mapelObj = mapelList.find(m => m.id === Number(selectedMapel));
      notifyNilaiUpdated(mapelObj?.nama || 'Mata Pelajaran', kelasObj?.nama || 'Kelas');

      setSuccess(`Nilai ${editingSiswa.nama} berhasil disimpan`);
      setShowModal(false);

      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      const data = e.response?.data;
      const msg = data?.message || e.message || 'Gagal menyimpan nilai';
      setErrMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  const ch = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const kelasObj = kelasList.find(k => k.id === Number(selectedKelas));
  const mapelObj = mapelList.find(m => m.id === Number(selectedMapel));
  const semesterObj = semesterList.find(s => s.id === Number(selectedSemester));

  if (loading && step === 1) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Input & Kelola Nilai</h1>
        <p className="text-text-light mt-1">
          {semesterAktif
            ? `Semester ${semesterAktif.nama} • ${semesterAktif.tahun_ajaran?.nama}`
            : 'Semester belum diset'}
        </p>
      </div>

      {success && (
        <div className="p-4 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          ✅ {success}
        </div>
      )}

      {errMsg && (
        <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 whitespace-pre-line">
          {errMsg}
        </div>
      )}

      {/* Step 1: Pilih Kelas & Mapel */}
      {step === 1 && (
        <div className="card p-6">
          <h3 className="font-semibold text-text mb-4">Pilih Kelas & Mata Pelajaran</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Kelas *</label>
              <select
                value={selectedKelas || ''}
                onChange={(e) => setSelectedKelas(e.target.value)}
                className="input-field"
              >
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map(k => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Mata Pelajaran *</label>
              <select
                value={selectedMapel || ''}
                onChange={(e) => setSelectedMapel(e.target.value)}
                className="input-field"
              >
                <option value="">-- Pilih Mata Pelajaran --</option>
                {mapelList.map(m => (
                  <option key={m.id} value={m.id}>{m.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Semester *</label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                className="input-field"
              >
                <option value="">-- Pilih Semester --</option>
                {semesterList.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.nama} - {s.tahun_ajaran?.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSelectKelasMapel}
              className="btn-primary"
              disabled={!selectedKelas || !selectedMapel || !selectedSemester}
            >
              Lanjutkan →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Input Nilai per Siswa */}
      {step === 2 && (
        <div>
          {/* Info Header */}
          <div className="card p-6 mb-4 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary mb-1">
                  {mapelObj?.nama || 'Mata Pelajaran'}
                </h3>
                <p className="text-text-light">
                  Kelas {kelasObj?.nama || '-'} • Semester {semesterObj?.nama || '-'}
                </p>
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setSelectedKelas(null);
                  setSelectedMapel(null);
                }}
                className="btn-secondary"
              >
                ← Ganti Kelas/Mapel
              </button>
            </div>
          </div>

          {/* Tabel Nilai */}
          <div className="card overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12"><LoadingSpinner /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>NISN</th>
                      <th>Nama Siswa</th>
                      <th>Harian</th>
                      <th>UTS</th>
                      <th>UAS</th>
                      <th>Akhir</th>
                      <th>Predikat</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-10 text-text-light">
                          Belum ada siswa di kelas ini
                        </td>
                      </tr>
                    ) : siswaList.map((s, i) => {
                      const nilai = nilaiData[s.id];
                      return (
                        <tr key={s.id}>
                          <td>{i + 1}</td>
                          <td className="font-mono text-sm">{s.nisn}</td>
                          <td className="font-medium">{s.nama}</td>
                          <td className="text-center">
                            {nilai ? nilai.nilai_harian : <span className="text-text-light">-</span>}
                          </td>
                          <td className="text-center">
                            {nilai ? nilai.nilai_uts : <span className="text-text-light">-</span>}
                          </td>
                          <td className="text-center">
                            {nilai ? nilai.nilai_uas : <span className="text-text-light">-</span>}
                          </td>
                          <td className="text-center font-semibold">
                            {nilai ? nilai.nilai_akhir.toFixed(2) : <span className="text-text-light">-</span>}
                          </td>
                          <td className="text-center">
                            {nilai ? (
                              <span className={`badge ${getPredikatColor(nilai.predikat)}`}>
                                {nilai.predikat}
                              </span>
                            ) : (
                              <span className="text-text-light">-</span>
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => openInputModal(s)}
                              className="text-primary hover:underline text-sm"
                            >
                              {nilai ? '✏️ Edit' : '➕ Input'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Input Nilai */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)}
        title={`Input Nilai - ${editingSiswa?.nama}`} size="md">
        <form onSubmit={handleSubmitNilai} className="space-y-4">
          {errMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-line">
              {errMsg}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nilai Harian (0-100) *
            </label>
            <input
              type="number"
              name="nilai_harian"
              value={form.nilai_harian}
              onChange={ch}
              min="0"
              max="100"
              step="0.01"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nilai UTS (0-100) *
            </label>
            <input
              type="number"
              name="nilai_uts"
              value={form.nilai_uts}
              onChange={ch}
              min="0"
              max="100"
              step="0.01"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Nilai UAS (0-100) *
            </label>
            <input
              type="number"
              name="nilai_uas"
              value={form.nilai_uas}
              onChange={ch}
              min="0"
              max="100"
              step="0.01"
              className="input-field"
              required
            />
          </div>

          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            <strong>Formula Nilai Akhir:</strong> Harian (40%) + UTS (30%) + UAS (30%)
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Batal
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Nilai'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function getPredikatColor(predikat) {
  switch (predikat) {
    case 'A': return 'badge-success';
    case 'B': return 'badge-info';
    case 'C': return 'badge-warning';
    case 'D': return 'badge-warning';
    case 'E': return 'badge-error';
    default: return 'badge-secondary';
  }
}