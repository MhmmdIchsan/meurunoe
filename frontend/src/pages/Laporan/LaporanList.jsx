import { useState, useEffect } from 'react';
import { kelasService } from '../../services/kelasService';
import { semesterService } from '../../services/semesterService';
import { absensiService } from '../../services/absensiService';
import { nilaiService } from '../../services/nilaiService';
import { exportAbsensiToExcel, exportNilaiToExcel } from '../../utils/excelExport';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function LaporanList() {
  const [kelasList, setKelasList] = useState([]);
  const [semesterList, setSemesterList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [laporanType, setLaporanType] = useState('absensi');
  
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState('');
  const [errMsg, setErrMsg] = useState('');

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

  async function handleGenerate() {
    if (!selectedKelas || !selectedSemester) {
      setErrMsg('Pilih kelas dan semester');
      return;
    }

    setGenerating(true);
    setErrMsg('');
    setSuccess('');

    try {
      const kelasObj = kelasList.find(k => k.id === Number(selectedKelas));
      const semesterObj = semesterList.find(s => s.id === Number(selectedSemester));

      if (laporanType === 'absensi') {
        const res = await absensiService.getRekapKelas(selectedKelas, {
          semester_id: selectedSemester,
        });
        const rekap = Array.isArray(res.data) ? res.data : (res.data?.data || []);

        exportAbsensiToExcel({
          kelas: kelasObj,
          semester: semesterObj,
          rekapAbsensi: rekap,
        });

        setSuccess('Laporan Absensi berhasil di-export!');
      } else {
        const siswaRes = await kelasService.getSiswaByKelas(selectedKelas);
        const rawSiswa = siswaRes.data;
        const siswa = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []);

        const nilaiPromises = siswa.map(s => 
          nilaiService.getNilaiSiswa(s.id, { semester_id: selectedSemester })
            .then(res => ({
              siswa: s,
              nilai: res.data?.nilai || [],
              rata_rata: res.data?.rata_rata || 0,
              predikat: res.data?.predikat_umum || '-',
            }))
            .catch(() => ({
              siswa: s,
              nilai: [],
              rata_rata: 0,
              predikat: '-',
            }))
        );
        const nilaiData = await Promise.all(nilaiPromises);

        exportNilaiToExcel({
          kelas: kelasObj,
          semester: semesterObj,
          nilaiData: nilaiData,
        });

        setSuccess('Laporan Nilai berhasil di-export!');
      }

      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {
      console.error('Error:', e);
      const msg = e.response?.data?.message || e.message || 'Gagal generate laporan';
      setErrMsg(msg);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Laporan Akademik</h1>
        <p className="text-text-light mt-1">Export laporan absensi dan nilai ke Excel</p>
      </div>

      {success && (
        <div className="p-4 mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800">
          ✅ {success}
        </div>
      )}

      {errMsg && (
        <div className="p-4 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700">
          {errMsg}
        </div>
      )}

      <div className="card p-6">
        <h3 className="font-semibold text-text mb-4">Pilih Laporan</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text mb-2">Jenis Laporan *</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input type="radio" name="laporanType" value="absensi" 
                  checked={laporanType === 'absensi'} onChange={(e) => setLaporanType(e.target.value)} className="mr-2" />
                <span>Laporan Absensi</span>
              </label>
              <label className="flex items-center">
                <input type="radio" name="laporanType" value="nilai" 
                  checked={laporanType === 'nilai'} onChange={(e) => setLaporanType(e.target.value)} className="mr-2" />
                <span>Laporan Nilai</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">Kelas *</label>
              <select value={selectedKelas} onChange={(e) => setSelectedKelas(e.target.value)} className="input-field">
                <option value="">-- Pilih Kelas --</option>
                {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">Semester *</label>
              <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} className="input-field">
                <option value="">-- Pilih Semester --</option>
                {semesterList.map(s => <option key={s.id} value={s.id}>{s.nama} - {s.tahun_ajaran?.nama}</option>)}
              </select>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Info:</strong> Laporan akan di-export ke format Excel (.xlsx)
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button onClick={handleGenerate} disabled={generating || !selectedKelas || !selectedSemester} className="btn-primary">
              {generating ? '⏳ Generating...' : '📊 Export ke Excel'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}