import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalSiswa: 0,
    totalGuru: 0,
    totalKelas: 0,
    totalMapel: 0
  });
  const [absensiStats, setAbsensiStats] = useState({
    hadir: 0,
    izin: 0,
    sakit: 0,
    alpha: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch statistics based on role
      const [siswaRes, guruRes, kelasRes] = await Promise.all([
        api.get('/siswa?limit=1'),
        api.get('/guru?limit=1'),
        api.get('/kelas?limit=1')
      ]);

      setStats({
        totalSiswa: siswaRes.data.data?.total || 0,
        totalGuru: guruRes.data.data?.total || 0,
        totalKelas: kelasRes.data.data?.total || 0,
        totalMapel: 12 // Static for now
      });

      // Fetch absensi stats
      const today = new Date().toISOString().split('T')[0];
      const absensiRes = await api.get(`/absensi/rekap?tanggal=${today}`);
      if (absensiRes.data.data) {
        const rekap = absensiRes.data.data;
        setAbsensiStats({
          hadir: rekap.total_hadir || 0,
          izin: rekap.total_izin || 0,
          sakit: rekap.total_sakit || 0,
          alpha: rekap.total_alpha || 0
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const absensiChartData = {
    labels: ['Hadir', 'Izin', 'Sakit', 'Alpha'],
    datasets: [
      {
        data: [absensiStats.hadir, absensiStats.izin, absensiStats.sakit, absensiStats.alpha],
        backgroundColor: ['#22C55E', '#3B82F6', '#FACC15', '#EF4444'],
        borderWidth: 0
      }
    ]
  };

  const statsCards = [
    { title: 'Total Siswa', value: stats.totalSiswa, icon: '🎓', color: 'bg-blue-500' },
    { title: 'Total Guru', value: stats.totalGuru, icon: '👨‍🏫', color: 'bg-green-500' },
    { title: 'Total Kelas', value: stats.totalKelas, icon: '🏫', color: 'bg-purple-500' },
    { title: 'Mata Pelajaran', value: stats.totalMapel, icon: '📚', color: 'bg-orange-500' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Dashboard</h1>
        <p className="text-text-light mt-1">Ringkasan Data Akademik</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {statsCards.map((stat, index) => (
          <div key={index} className="card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-light text-sm mb-1">{stat.title}</p>
                <p className="text-3xl font-bold text-text">{stat.value}</p>
              </div>
              <div className={`w-14 h-14 ${stat.color} rounded-lg flex items-center justify-center text-3xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Absensi Chart */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Statistik Absensi Hari Ini</h3>
          <div className="h-64 flex items-center justify-center">
            <Doughnut 
              data={absensiChartData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            <button className="w-full btn-primary justify-start">
              <span className="mr-2">➕</span>
              Input Absensi
            </button>
            <button className="w-full btn-primary justify-start">
              <span className="mr-2">📝</span>
              Input Nilai
            </button>
            <button className="w-full btn-primary justify-start">
              <span className="mr-2">📅</span>
              Lihat Jadwal
            </button>
            <button className="w-full btn-primary justify-start">
              <span className="mr-2">📄</span>
              Generate Rapor
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6 mt-6">
        <h3 className="text-lg font-semibold text-text mb-4">Aktivitas Terbaru</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white">
              📝
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Input nilai Matematika kelas XII IPA 1</p>
              <p className="text-xs text-text-light">2 jam yang lalu</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center text-white">
              ✅
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-text">Absensi kelas XI IPA 2 berhasil disimpan</p>
              <p className="text-xs text-text-light">3 jam yang lalu</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;