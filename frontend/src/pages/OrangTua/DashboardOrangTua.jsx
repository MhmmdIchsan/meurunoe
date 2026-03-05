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
  const [initialized, setInitialized] = useState(false);

  // First effect: Fetch anak list
  useEffect(() => { 
    if (!initialized) {
      init(); 
    }
  }, [initialized]);

  // Second effect: Select first anak when list is ready
  useEffect(() => {
    if (anakList.length > 0 && semesterAktif && !selectedAnak) {
      console.log('🎯 Auto-selecting first anak from list');
      selectAnak(anakList[0].id, semesterAktif.id);
    }
  }, [anakList, semesterAktif, selectedAnak]);

  async function init() {
    setLoading(true);
    try {
      // Fetch semester aktif
      const semRes = await semesterService.getAktif().catch(() => ({ data: null }));
      const aktif = semRes.data;
      setSemesterAktif(aktif);

      console.log('🔍 Fetching anak data...');
      
      // Fetch anak-anak dari orang tua yang login
      try {
        const anakRes = await orangTuaService.getAnakSaya();
        console.log('📦 Response getAnakSaya:', anakRes);
        
        // Multiple format handling
        let anak = [];
        if (anakRes.data) {
          if (Array.isArray(anakRes.data)) {
            anak = anakRes.data;
          } else if (anakRes.data.siswa && Array.isArray(anakRes.data.siswa)) {
            anak = anakRes.data.siswa;
          } else if (anakRes.data.anak && Array.isArray(anakRes.data.anak)) {
            // Extract siswa from anak relation
            anak = anakRes.data.anak.map(a => a.siswa || a).filter(Boolean);
          } else if (anakRes.data.data) {
            anak = Array.isArray(anakRes.data.data) ? anakRes.data.data : [];
          }
        }
        
        console.log('👶 Parsed anak list:', anak);
        setAnakList(anak);

        if (anak.length > 0) {
          console.log('✅ Anak list set, auto-select will happen in useEffect');
          setInitialized(true);
        } else if (anak.length === 0) {
          console.warn('⚠️ No anak found');
          setErrMsg('Belum ada anak yang terdaftar. Hubungi admin untuk menghubungkan akun Anda dengan siswa.');
          setInitialized(true);
        }
      } catch (backendError) {
        console.error('❌ Backend error:', backendError);
        console.error('Response:', backendError.response?.data);
        
        setErrMsg(
          'Gagal memuat data anak.\n\n' +
          'Error: ' + (backendError.response?.data?.message || backendError.message) + '\n\n' +
          'Pastikan:\n' +
          '1. Anda sudah di-assign sebagai orang tua siswa\n' +
          '2. Backend endpoint /orang-tua/saya/anak sudah berfungsi\n' +
          '3. Hubungi admin jika masalah berlanjut'
        );
        setInitialized(true);
      }
    } catch (e) {
      console.error('💥 Init error:', e);
      setErrMsg('Gagal memuat data. ' + (e.response?.data?.message || e.message));
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  }

  async function selectAnak(siswaId, semesterId) {
    console.log('🎯 selectAnak called with:', { siswaId, semesterId });
    
    const anak = anakList.find(a => a.id === siswaId);
    console.log('👤 Found anak:', anak);
    
    if (!anak) {
      console.error('❌ Anak not found in list!');
      return;
    }
    
    setSelectedAnak(anak);
    console.log('✅ setSelectedAnak called');

    if (!semesterId) {
      console.warn('⚠️ No semesterId, skipping fetch nilai & absensi');
      return;
    }

    try {
      console.log('📊 Fetching nilai...');
      const nilaiRes = await nilaiService.getNilaiSiswa(siswaId, { semester_id: semesterId });
      console.log('📊 Nilai response:', nilaiRes.data);
      setNilaiData(nilaiRes.data);

      console.log('📅 Fetching absensi...');
      const absensiRes = await absensiService.getRekapSiswa(siswaId, { semester_id: semesterId });
      console.log('📅 Absensi response:', absensiRes.data);
      setAbsensiData(absensiRes.data);
      
      console.log('✅ All data loaded successfully');
    } catch (e) {
      console.error('❌ Error fetching nilai/absensi:', e);
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

  console.log('🎨 Render - State:', { 
    anakList: anakList.length, 
    selectedAnak: selectedAnak?.nama,
    nilaiData: !!nilaiData,
    absensiData: !!absensiData,
    errMsg: !!errMsg 
  });

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
            <Link to="/nilai-anak" className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📝</div>
              <h3 className="font-semibold text-text mb-2">Lihat Nilai</h3>
              <p className="text-sm text-text-light">Nilai lengkap semua mata pelajaran</p>
            </Link>

            <Link to="/rapor-anak" className="card p-6 hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-3">📄</div>
              <h3 className="font-semibold text-text mb-2">Download Rapor</h3>
              <p className="text-sm text-text-light">Rapor semester dalam format PDF</p>
            </Link>

            <Link to="/jadwal-anak" className="card p-6 hover:shadow-lg transition-shadow">
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