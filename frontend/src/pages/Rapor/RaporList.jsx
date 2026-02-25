import { useState, useEffect } from 'react';
import { useAuth, extractRole } from '../../context/AuthContext';
import { kelasService } from '../../services/kelasService';
import { semesterService } from '../../services/semesterService';
import { nilaiService } from '../../services/nilaiService';
import { absensiService } from '../../services/absensiService';
import { exportRaporToPDF } from '../../utils/pdfExport';
import { notifyRaporReady } from '../../utils/notifications';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function RaporList() {
  const { user } = useAuth();
  const role = extractRole(user);

  const [step, setStep] = useState(1); // 1: Pilih, 2: Preview & Generate
  const [kelasList, setKelasList]       = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [siswaList, setSiswaList]       = useState([]);

  const [selectedKelas, setSelectedKelas]   = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedSiswa, setSelectedSiswa]   = useState(null);
  
  const [raporData, setRaporData] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess]     = useState('');
  const [errMsg, setErrMsg]       = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const [semRes, semAktifRes, kelasRes] = await Promise.all([
        semesterService.getAll(),
        semesterService.getAktif().catch(() => ({ data: null })),
        kelasService.getAll(),
      ]);

      const rawSem = semRes.data;
      setSemesterList(Array.isArray(rawSem) ? rawSem : (rawSem?.data || []));

      const aktif = semAktifRes.data;
      if (aktif) setSelectedSemester(String(aktif.id));

      const rawKelas = kelasRes.data;
      setKelasList(Array.isArray(rawKelas) ? rawKelas : (rawKelas?.data || []));
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data');
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectKelas() {
    if (!selectedKelas) {
      setErrMsg('Pilih kelas terlebih dahulu');
      return;
    }

    setLoading(true);
    setErrMsg('');
    try {
      const siswaRes = await kelasService.getSiswaByKelas(selectedKelas);
      const rawSiswa = siswaRes.data;
      const siswa = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []);
      setSiswaList(siswa);
      setStep(2);
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat siswa');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateRapor(siswa) {
    setGenerating(true);
    setErrMsg('');
    setSuccess('');

    try {
      // Fetch nilai siswa
      const nilaiRes = await nilaiService.getNilaiSiswa(siswa.id, {
        semester_id: selectedSemester,
      });
      const nilaiData = nilaiRes.data;

      // Fetch rekap absensi siswa
      const absensiRes = await absensiService.getRekapSiswa(siswa.id, {
        semester_id: selectedSemester,
      });
      const absensiData = absensiRes.data;

      const kelasObj = kelasList.find(k => k.id === Number(selectedKelas));
      const semesterObj = semesterList.find(s => s.id === Number(selectedSemester));

      // Generate PDF
      exportRaporToPDF({
        siswa: {
          ...siswa,
          kelas: kelasObj,
        },
        semester: semesterObj,
        nilai: nilaiData?.nilai || [],
        rataRata: nilaiData?.rata_rata || 0,
        predikat: nilaiData?.predikat_umum || '-',
        absensi: {
          hadir: absensiData?.hadir || 0,
          izin: absensiData?.izin || 0,
          sakit: absensiData?.sakit || 0,
          alfa: absensiData?.alfa || 0,
        },
      });

      notifyRaporReady(siswa.nama, semesterObj?.nama || 'Semester');
      setSuccess(`Rapor ${siswa.nama} berhasil di-generate!`);

      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Error:', e);
      const msg = e.response?.data?.message || e.message || 'Gagal generate rapor';
      setErrMsg(msg);
    } finally {
      setGenerating(false);
    }
  }

  const kelasObj = kelasList.find(k => k.id === Number(selectedKelas));
  const semesterObj = semesterList.find(s => s.id === Number(selectedSemester));

  if (loading && step === 1) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Generate Rapor</h1>
        <p className="text-text-light mt-1">Cetak rapor siswa per semester</p>
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

      {/* Step 1: Pilih Kelas & Semester */}
      {step === 1 && (
        <div className="card p-6">
          <h3 className="font-semibold text-text mb-4">Pilih Kelas & Semester</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Kelas *</label>
              <select
                value={selectedKelas}
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
              onClick={handleSelectKelas}
              className="btn-primary"
              disabled={!selectedKelas || !selectedSemester}
            >
              Lanjutkan →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Pilih Siswa & Generate */}
      {step === 2 && (
        <div>
          {/* Info Header */}
          <div className="card p-6 mb-4 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-primary mb-1">
                  Kelas {kelasObj?.nama || '-'}
                </h3>
                <p className="text-text-light">
                  Semester {semesterObj?.nama || '-'} • {semesterObj?.tahun_ajaran?.nama || '-'}
                </p>
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setSiswaList([]);
                }}
                className="btn-secondary"
              >
                ← Ganti Kelas
              </button>
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
                      <th>Aksi</th>
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
                          <button
                            onClick={() => handleGenerateRapor(s)}
                            disabled={generating}
                            className="btn-primary text-sm"
                          >
                            {generating ? '⏳ Generating...' : '📄 Generate Rapor'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}