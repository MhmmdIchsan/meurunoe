import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, LineElement, PointElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import { kelasService } from '../../services/kelasService';
import { siswaService } from '../../services/siswaService';
import { absensiService } from '../../services/absensiService';
import { nilaiService } from '../../services/nilaiService';
import { semesterService } from '../../services/semesterService';
import LoadingSpinner from '../../components/Common/LoadingSpinner';

// Register Chart.js components
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

export default function DashboardAnalytics() {
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0,
    siswaAktif: 0,
  });

  const [kehadiranData, setKehadiranData] = useState(null);
  const [nilaiDistribusi, setNilaiDistribusi] = useState(null);
  const [kelasList, setKelasList] = useState([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [semesterAktif, setSemesterAktif] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  async function init() {
    setLoading(true);
    try {
      const [semRes, kelasRes, siswaRes] = await Promise.all([
        semesterService.getAktif().catch(() => ({ data: null })),
        kelasService.getAll(),
        siswaService.getAll(),
      ]);

      const aktif = semRes.data;
      setSemesterAktif(aktif);

      const rawKelas = kelasRes.data;
      const kelas = Array.isArray(rawKelas) ? rawKelas : (rawKelas?.data || []);
      setKelasList(kelas);

      const rawSiswa = siswaRes.data;
      const siswa = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.data || []);

      setStats({
        totalSiswa: siswa.length,
        totalKelas: kelas.length,
        siswaAktif: siswa.filter(s => s.is_active).length,
      });

      if (kelas.length > 0) {
        setSelectedKelas(String(kelas[0].id));
        await fetchKehadiranData(kelas[0].id, aktif?.id);
        await fetchNilaiData(kelas[0].id, aktif?.id);
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  async function fetchKehadiranData(kelasId, semesterId) {
    if (!semesterId) return;
    try {
      const res = await absensiService.getRekapKelas(kelasId, { semester_id: semesterId });
      const rekap = Array.isArray(res.data) ? res.data : (res.data?.data || []);

      // Hitung total
      const totals = rekap.reduce((acc, r) => ({
        hadir: acc.hadir + (r.hadir || 0),
        izin: acc.izin + (r.izin || 0),
        sakit: acc.sakit + (r.sakit || 0),
        alfa: acc.alfa + (r.alfa || 0),
      }), { hadir: 0, izin: 0, sakit: 0, alfa: 0 });

      setKehadiranData({
        labels: ['Hadir', 'Izin', 'Sakit', 'Alfa'],
        datasets: [{
          label: 'Kehadiran',
          data: [totals.hadir, totals.izin, totals.sakit, totals.alfa],
          backgroundColor: ['#22C55E', '#FACC15', '#3B82F6', '#EF4444'],
          borderColor: ['#16A34A', '#EAB308', '#2563EB', '#DC2626'],
          borderWidth: 2,
        }],
      });
    } catch (e) {
      console.error('Error fetch kehadiran:', e);
    }
  }

  async function fetchNilaiData(kelasId, semesterId) {
    if (!semesterId) return;
    try {
      // Fetch siswa di kelas
      const siswaRes = await kelasService.getSiswaByKelas(kelasId);
      const rawSiswa = siswaRes.data;
      const siswa = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []);

      // Fetch nilai semua siswa
      const nilaiPromises = siswa.map(s => 
        nilaiService.getNilaiSiswa(s.id, { semester_id: semesterId }).catch(() => ({ data: null }))
      );
      const nilaiResults = await Promise.all(nilaiPromises);

      // Hitung distribusi predikat
      const distribusi = { A: 0, B: 0, C: 0, D: 0, E: 0 };
      nilaiResults.forEach(res => {
        const predikat = res.data?.predikat_umum;
        if (predikat && distribusi.hasOwnProperty(predikat)) {
          distribusi[predikat]++;
        }
      });

      setNilaiDistribusi({
        labels: ['A', 'B', 'C', 'D', 'E'],
        datasets: [{
          label: 'Jumlah Siswa',
          data: [distribusi.A, distribusi.B, distribusi.C, distribusi.D, distribusi.E],
          backgroundColor: ['#22C55E', '#3B82F6', '#FACC15', '#F59E0B', '#EF4444'],
          borderColor: ['#16A34A', '#2563EB', '#EAB308', '#D97706', '#DC2626'],
          borderWidth: 2,
        }],
      });
    } catch (e) {
      console.error('Error fetch nilai:', e);
    }
  }

  async function handleKelasChange(e) {
    const kelasId = e.target.value;
    setSelectedKelas(kelasId);
    if (kelasId && semesterAktif) {
      await fetchKehadiranData(kelasId, semesterAktif.id);
      await fetchNilaiData(kelasId, semesterAktif.id);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Dashboard Analytics</h1>
        <p className="text-text-light mt-1">
          Statistik dan laporan akademik • {semesterAktif ? `Semester ${semesterAktif.nama}` : 'Semester belum diset'}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="text-sm opacity-90 mb-2">Total Siswa</div>
          <div className="text-3xl font-bold">{stats.totalSiswa}</div>
          <div className="text-xs opacity-75 mt-2">Aktif: {stats.siswaAktif}</div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="text-sm opacity-90 mb-2">Total Kelas</div>
          <div className="text-3xl font-bold">{stats.totalKelas}</div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="text-sm opacity-90 mb-2">Semester Aktif</div>
          <div className="text-xl font-bold">{semesterAktif?.nama || '-'}</div>
          <div className="text-xs opacity-75 mt-2">{semesterAktif?.tahun_ajaran?.nama || '-'}</div>
        </div>

        <div className="card p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="text-sm opacity-90 mb-2">Rata-rata Kehadiran</div>
          <div className="text-3xl font-bold">
            {kehadiranData ? 
              ((kehadiranData.datasets[0].data[0] / kehadiranData.datasets[0].data.reduce((a,b) => a+b, 0)) * 100).toFixed(1) 
              : '-'}%
          </div>
        </div>
      </div>

      {/* Filter Kelas */}
      <div className="card p-4 mb-6">
        <label className="block text-sm font-medium text-text mb-2">Pilih Kelas untuk Analisis</label>
        <select value={selectedKelas} onChange={handleKelasChange} className="input-field w-64">
          {kelasList.map(k => (
            <option key={k.id} value={k.id}>{k.nama}</option>
          ))}
        </select>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kehadiran Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-4">
            📊 Distribusi Kehadiran
          </h3>
          {kehadiranData ? (
            <div className="h-80 flex items-center justify-center">
              <Pie data={kehadiranData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                      }
                    }
                  }
                },
              }} />
            </div>
          ) : (
            <div className="text-center py-12 text-text-light">Tidak ada data kehadiran</div>
          )}
        </div>

        {/* Nilai Distribusi Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-4">
            📈 Distribusi Predikat Nilai
          </h3>
          {nilaiDistribusi ? (
            <div className="h-80">
              <Bar data={nilaiDistribusi} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
              }} />
            </div>
          ) : (
            <div className="text-center py-12 text-text-light">Tidak ada data nilai</div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="card p-6 mt-6 bg-blue-50 border border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">💡 Informasi</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Data ditampilkan untuk semester aktif: <strong>{semesterAktif?.nama || '-'}</strong></li>
          <li>• Pilih kelas berbeda untuk melihat statistik per kelas</li>
          <li>• Kehadiran dan nilai dihitung real-time dari database</li>
        </ul>
      </div>
    </div>
  );
}