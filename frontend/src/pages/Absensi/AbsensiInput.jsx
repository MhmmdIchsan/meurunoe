import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { absensiService } from '../../services/absensiService';
import { jadwalService } from '../../services/jadwalService';
import { kelasService } from '../../services/kelasService';
import { semesterService } from '../../services/semesterService';
import { useAuth, extractRole } from '../../context/AuthContext';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

const STATUS_OPTIONS = [
  { value: 'hadir', label: 'Hadir', color: 'bg-green-500' },
  { value: 'izin', label: 'Izin', color: 'bg-yellow-500' },
  { value: 'sakit', label: 'Sakit', color: 'bg-blue-500' },
  { value: 'alfa', label: 'Alfa', color: 'bg-red-500' },
];

import { notifyAbsensiSaved } from '../../utils/notifications';

export default function AbsensiInput() {
  const { user } = useAuth();
  const role = extractRole(user);
  const [searchParams] = useSearchParams();
  const jadwalIdParam = searchParams.get('jadwal_id');

  const [step, setStep] = useState(1); // 1: Pilih Jadwal, 2: Input Absensi
  const [jadwalList, setJadwalList] = useState([]);
  const [selectedJadwal, setSelectedJadwal] = useState(null);
  const [siswaList, setSiswaList] = useState([]);
  const [absensiData, setAbsensiData] = useState({});
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [semesterAktif, setSemesterAktif] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      // 1. Ambil semester aktif
      const semRes = await semesterService.getAktif().catch(() => ({ data: null }));
      const aktif = semRes.data;
      setSemesterAktif(aktif);

      // 2. Ambil jadwal mengajar guru
      const jadwalRes = await jadwalService.getJadwalSaya({
        semester_id: aktif?.id,
      });
      const raw = jadwalRes.data;
      const jadwal = raw?.jadwal_per_hari;

      // Flatten jadwal per hari jadi list
      let allJadwal = [];
      if (jadwal) {
        Object.values(jadwal).forEach(hariJadwal => {
          if (Array.isArray(hariJadwal)) {
            allJadwal = [...allJadwal, ...hariJadwal];
          }
        });
      }
      setJadwalList(allJadwal);

      // 3. Jika ada jadwal_id di URL, langsung pilih
      if (jadwalIdParam && allJadwal.length > 0) {
        const selected = allJadwal.find(j => j.id === Number(jadwalIdParam));
        if (selected) {
          await selectJadwal(selected);
        }
      }
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function selectJadwal(jadwal) {
    setSelectedJadwal(jadwal);
    setLoading(true);
    try {
      // Ambil siswa di kelas
      const siswaRes = await kelasService.getSiswaByKelas(jadwal.kelas_id);
      const rawSiswa = siswaRes.data;
      const siswa = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []);
      setSiswaList(siswa);

      // Cek apakah sudah ada absensi untuk tanggal ini
      const absensiRes = await absensiService.getAll({
        jadwal_id: jadwal.id,
        tanggal: tanggal,
      });
      const existing = absensiRes.data;
      const existingMap = {};
      if (Array.isArray(existing)) {
        existing.forEach(a => {
          existingMap[a.siswa_id] = a.status;
        });
      }

      // Init absensi data dengan status default 'hadir' atau existing
      const initData = {};
      siswa.forEach(s => {
        initData[s.id] = existingMap[s.id] || 'hadir';
      });
      setAbsensiData(initData);
      setStep(2);
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat siswa');
    } finally {
      setLoading(false);
    }
  }

  function handleStatusChange(siswaId, status) {
    setAbsensiData(prev => ({ ...prev, [siswaId]: status }));
  }

  function setAllStatus(status) {
    const newData = {};
    siswaList.forEach(s => {
      newData[s.id] = status;
    });
    setAbsensiData(newData);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErrMsg('');
    setSaving(true);

    try {
      // Build payload untuk bulk input
      const absensi = siswaList.map(s => ({
        siswa_id: s.id,
        status: absensiData[s.id],
        keterangan: '',
      }));

      const payload = {
        jadwal_id: selectedJadwal.id,
        tanggal: tanggal,
        absensi: absensi,
      };

      const res = await absensiService.bulkInput(payload);
      setSuccess(`Absensi berhasil disimpan! ${res.message || ''}`);

      // Trigger notification
      notifyAbsensiSaved(
        selectedJadwal.kelas?.nama || 'Kelas',
        siswaList.length
      );

      // Reset
      setTimeout(() => {
        setStep(1);
        setSelectedJadwal(null);
        setSiswaList([]);
        setAbsensiData({});
        setSuccess('');
      }, 2000);
    } catch (e) {
      const data = e.response?.data;
      
      // Handle 207 multi-status (sebagian berhasil)
      if (e.response?.status === 207 && data?.data) {
        const hasil = data.data;
        const gagal = hasil.filter(h => !h.berhasil);
        if (gagal.length > 0) {
          const messages = gagal.map((h, i) => `${i+1}. Siswa ID ${h.siswa_id}: ${h.pesan}`);
          setErrMsg(`⚠️ ${gagal.length} siswa gagal:\n${messages.join('\n')}`);
        } else {
          setSuccess('Semua absensi berhasil disimpan!');
        }
        return;
      }

      // Handle error lainnya
      const msg = data?.message || e.message || 'Gagal menyimpan absensi';
      setErrMsg(String(msg));
    } finally {
      setSaving(false);
    }
  }

  if (loading && step === 1) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Input Absensi</h1>
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

      {/* Step 1: Pilih Jadwal */}
      {step === 1 && (
        <div>
          <div className="card p-6 mb-4">
            <h3 className="font-semibold text-text mb-4">Pilih Jadwal Pelajaran</h3>
            
            {jadwalList.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-text-light">Tidak ada jadwal mengajar untuk semester ini.</p>
                <p className="text-text-light text-sm mt-2">
                  Hubungi admin untuk menambahkan jadwal Anda.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jadwalList.map(j => (
                  <button
                    key={j.id}
                    onClick={() => selectJadwal(j)}
                    className="p-4 rounded-lg border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="badge badge-info">{j.kelas?.nama}</span>
                      <span className="text-xs text-text-light font-mono">
                        {['', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][j.hari_ke]}
                      </span>
                    </div>
                    <p className="font-semibold text-text mb-1">{j.mata_pelajaran?.nama}</p>
                    <p className="text-sm text-text-light font-mono">
                      {j.jam_mulai} - {j.jam_selesai}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Input Absensi */}
      {step === 2 && selectedJadwal && (
        <form onSubmit={handleSubmit}>
          {/* Info Jadwal */}
          <div className="card p-6 mb-4 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary mb-1">
                  {selectedJadwal.mata_pelajaran?.nama}
                </h3>
                <p className="text-text-light">
                  Kelas {selectedJadwal.kelas?.nama} • {['', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][selectedJadwal.hari_ke]} • {selectedJadwal.jam_mulai} - {selectedJadwal.jam_selesai}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedJadwal(null);
                }}
                className="btn-secondary"
              >
                ← Ganti Jadwal
              </button>
            </div>
          </div>

          {/* Tanggal & Quick Actions */}
          <div className="card p-4 mb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-text">Tanggal:</label>
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className="input-field w-auto"
                  required
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                <span className="text-sm text-text-light mr-2">Set Semua:</span>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAllStatus(opt.value)}
                    className={`px-3 py-1 rounded text-xs font-medium text-white ${opt.color}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Daftar Siswa */}
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
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siswaList.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-10 text-text-light">
                          Belum ada siswa di kelas ini
                        </td>
                      </tr>
                    ) : siswaList.map((s, i) => (
                      <tr key={s.id}>
                        <td>{i + 1}</td>
                        <td className="font-mono text-sm">{s.nisn}</td>
                        <td className="font-medium">{s.nama}</td>
                        <td>
                          <div className="flex gap-2">
                            {STATUS_OPTIONS.map(opt => (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() => handleStatusChange(s.id, opt.value)}
                                className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                                  absensiData[s.id] === opt.value
                                    ? `${opt.color} text-white`
                                    : 'bg-gray-100 text-text hover:bg-gray-200'
                                }`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setSelectedJadwal(null);
              }}
              className="btn-secondary"
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving || siswaList.length === 0}
            >
              {saving ? 'Menyimpan...' : `💾 Simpan Absensi (${siswaList.length} Siswa)`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}