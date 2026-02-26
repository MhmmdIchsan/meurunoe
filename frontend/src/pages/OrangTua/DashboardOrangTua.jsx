import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orangTuaService } from '../../services/orangtuaService';
import { nilaiService } from '../../services/nilaiService';
import { absensiService } from '../../services/absensiService';
import { semesterService } from '../../services/semesterService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

export default function DashboardOrangTua() {
  const { user } = useAuth();
  const [anakList, setAnakList] = useState([]);
  const [selectedAnak, setSelectedAnak] = useState(null);
  const [nilaiData, setNilaiData] = useState(null);
  const [absensiData, setAbsensiData] = useState(null);
  const [semesterAktif, setSemesterAktif] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      // Fetch semester aktif
      const semRes = await semesterService.getAktif().catch(() => ({ data: null }));
      const aktif = semRes.data;
      setSemesterAktif(aktif);

      // Fetch anak-anak dari orang tua yang login
      const anakRes = await orangTuaService.getAnakSaya();
      const rawAnak = anakRes.data;
      const anak = Array.isArray(rawAnak) ? rawAnak : (rawAnak?.siswa || []);
      
      setAnakList(anak);

      if (anak.length > 0 && aktif) {
        // Auto select first child
        await selectAnak(anak[0].id, aktif.id);
      } else if (anak.length === 0) {
        setErrMsg('Belum ada anak yang terdaftar. Hubungi admin untuk menghubungkan akun Anda dengan siswa.');
      }
    } catch (e) {
      console.error('Error:', e);
      setErrMsg('Gagal memuat data. ' + (e.response?.data?.message || e.message));
    } finally {
      setLoading(false);
    }
  }

  async function selectAnak(siswaId, semesterId) {
    const anak = anakList.find(a => a.id === siswaId) || anakList[0];
    setSelectedAnak(anak);

    if (!semesterId) return;

    try {
      // Fetch nilai
      const nilaiRes = await nilaiService.getNilaiSiswa(siswaId, { semester_id: semesterId });
      setNilaiData(nilaiRes.data);

      // Fetch absensi
      const absensiRes = await absensiService.getRekapSiswa(siswaId, { semester_id: semesterId });
      setAbsensiData(absensiRes.data);
    } catch (e) {
      console.error('Error:', e);
    }
  }

  function handleAnakChange(e) {
    const siswaId = Number(e.target.value);
    if (semesterAktif) {
      selectAnak(siswaId, semesterAktif.id);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Dashboard Orang Tua</h1>
        <p className="text-text-light mt-1">Pantau perkembangan akademik anak Anda</p>
      </div>

      {errMsg && (
        <div className="card p-8 text-center border-2 border-red-200 bg-red-50">
          <div className="text-5xl mb-4">⚠️</div>
          <h3 className="text-lg font-semibold text-red-900 mb-2">Perhatian</h3>
          <p className="text-red-700">{errMsg}</p>
        </div>
      )}

      {/* Pilih Anak */}
      {anakList.length > 1 && (
        <div className="card p-4 mb-4">
          <label className="block text-sm font-medium text-text mb-2">Pilih Anak</label>
          <select 
            value={selectedAnak?.id || ''} 
            onChange={handleAnakChange} 
            className="input-field w-64"
          >
            {anakList.map(a => (
              <option key={a.id} value={a.id}>{a.nama}</option>
            ))}
          </select>
        </div>
      )}

      {selectedAnak && (
        <>
          {/* Info Anak */}
          <div className="card p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {selectedAnak.nama.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-primary mb-1">{selectedAnak.nama}</h2>
                <p className="text-text-light">
                  NISN: {selectedAnak.nisn} • Kelas: {selectedAnak.kelas?.nama || '-'}
                </p>
                <p className="text-text-light text-sm">
                  Semester {semesterAktif?.nama || '-'} • {semesterAktif?.tahun_ajaran?.nama || '-'}
                </p>
              </div>
              {nilaiData && (
                <div className="text-right">
                  <div className="text-4xl font-bold text-primary">
                    {nilaiData.rata_rata ? nilaiData.rata_rata.toFixed(2) : '-'}
                  </div>
                  <div className="text-sm text-text-light">Rata-rata Nilai</div>
                  {nilaiData.predikat_umum && (
                    <span className={`badge ${getPredikatColor(nilaiData.predikat_umum)} mt-2 text-base px-4 py-1`}>
                      {nilaiData.predikat_umum}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="card p-6 bg-blue-50 border-2 border-blue-200">
              <div className="text-sm text-blue-700 mb-1">Total Mata Pelajaran</div>
              <div className="text-3xl font-bold text-blue-900">
                {nilaiData?.total_mapel || 0}
              </div>
            </div>

            <div className="card p-6 bg-green-50 border-2 border-green-200">
              <div className="text-sm text-green-700 mb-1">Kehadiran</div>
              <div className="text-3xl font-bold text-green-900">
                {absensiData ? 
                  ((absensiData.hadir / (absensiData.hadir + absensiData.izin + absensiData.sakit + absensiData.alfa)) * 100).toFixed(1)
                  : '-'}%
              </div>
              <div className="text-xs text-green-700 mt-1">
                {absensiData?.hadir || 0} dari {(absensiData?.hadir + absensiData?.izin + absensiData?.sakit + absensiData?.alfa) || 0} hari
              </div>
            </div>

            <div className="card p-6 bg-yellow-50 border-2 border-yellow-200">
              <div className="text-sm text-yellow-700 mb-1">Izin + Sakit</div>
              <div className="text-3xl font-bold text-yellow-900">
                {(absensiData?.izin || 0) + (absensiData?.sakit || 0)}
              </div>
              <div className="text-xs text-yellow-700 mt-1">hari</div>
            </div>

            <div className="card p-6 bg-red-50 border-2 border-red-200">
              <div className="text-sm text-red-700 mb-1">Alfa (Tanpa Keterangan)</div>
              <div className="text-3xl font-bold text-red-900">
                {absensiData?.alfa || 0}
              </div>
              <div className="text-xs text-red-700 mt-1">hari</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Link to="/nilai-saya" className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-semibold text-text mb-2">Lihat Nilai</h3>
              <p className="text-sm text-text-light">Nilai lengkap semua mata pelajaran</p>
            </Link>

            <Link to="/rapor" className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="font-semibold text-text mb-2">Download Rapor</h3>
              <p className="text-sm text-text-light">Rapor semester dalam format PDF</p>
            </Link>

            <Link to="/jadwal" className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📅</div>
              <h3 className="font-semibold text-text mb-2">Jadwal Pelajaran</h3>
              <p className="text-sm text-text-light">Jadwal mingguan anak Anda</p>
            </Link>
          </div>

          {/* Recent Nilai */}
          {nilaiData && nilaiData.nilai && nilaiData.nilai.length > 0 && (
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text">📊 Nilai Terbaru</h3>
                <Link to="/nilai-saya" className="text-primary text-sm hover:underline">
                  Lihat Semua →
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="table-auto">
                  <thead>
                    <tr>
                      <th>Mata Pelajaran</th>
                      <th>Harian</th>
                      <th>UTS</th>
                      <th>UAS</th>
                      <th>Akhir</th>
                      <th>Predikat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nilaiData.nilai.slice(0, 5).map(n => (
                      <tr key={n.id}>
                        <td className="font-medium">{n.mata_pelajaran?.nama || '-'}</td>
                        <td className="text-center">{n.nilai_harian}</td>
                        <td className="text-center">{n.nilai_uts}</td>
                        <td className="text-center">{n.nilai_uas}</td>
                        <td className="text-center font-semibold">{n.nilai_akhir.toFixed(2)}</td>
                        <td className="text-center">
                          <span className={`badge ${getPredikatColor(n.predikat)}`}>
                            {n.predikat}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
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