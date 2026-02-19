import { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/Common/LoadingSpinner';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role?.nama_role?.toLowerCase() || '';

  const [stats, setStats] = useState({ totalSiswa: 0, totalGuru: 0, totalKelas: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [role]);

  const fetchDashboardData = async () => {
    try {
      const isAdmin   = ['admin', 'kepala_sekolah'].includes(role);
      const isGuru    = ['guru', 'wali_kelas'].includes(role);

      if (isAdmin || isGuru) {
        const results = await Promise.allSettled([
          api.get('/siswa'),
          api.get('/guru'),
          api.get('/kelas'),
        ]);

        const getLen = (res) => {
          if (res.status !== 'fulfilled') return 0;
          const d = res.value?.data?.data;
          return Array.isArray(d) ? d.length : 0;
        };

        setStats({
          totalSiswa: getLen(results[0]),
          totalGuru:  getLen(results[1]),
          totalKelas: getLen(results[2]),
        });
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin  = ['admin', 'kepala_sekolah'].includes(role);
  const isStaff  = ['guru', 'wali_kelas'].includes(role);
  const isSiswa  = role === 'siswa';
  const isOrtu   = role === 'orang_tua';

  const statsCards = [
    { title: 'Total Siswa', value: stats.totalSiswa, icon: '🎓', color: 'bg-blue-500',   show: isAdmin || isStaff },
    { title: 'Total Guru',  value: stats.totalGuru,  icon: '👨‍🏫', color: 'bg-green-500',  show: isAdmin },
    { title: 'Total Kelas', value: stats.totalKelas, icon: '🏫', color: 'bg-purple-500', show: isAdmin || isStaff },
  ].filter(s => s.show);

  const quickActions = [
    { label: 'Input Absensi',  icon: '✅', to: '/absensi', show: isAdmin || isStaff },
    { label: 'Input Nilai',    icon: '📝', to: '/nilai',   show: isAdmin || isStaff },
    { label: 'Lihat Jadwal',   icon: '📅', to: '/jadwal',  show: true },
    { label: 'Rapor Saya',     icon: '📄', to: '/rapor',   show: isSiswa || isOrtu },
    { label: 'Generate Rapor', icon: '📋', to: '/rapor',   show: isAdmin || role === 'wali_kelas' },
    { label: 'Data Siswa',     icon: '🎓', to: '/siswa',   show: isAdmin || isStaff },
  ].filter(a => a.show);

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
        <p className="text-text-light mt-1">
          Selamat datang, <strong>{user?.nama || user?.email}</strong>
        </p>
      </div>

      {/* Stats Cards */}
      {statsCards.length > 0 && (
        <div className={`grid grid-cols-1 gap-6 mb-6 ${
          statsCards.length === 3 ? 'md:grid-cols-3' :
          statsCards.length === 2 ? 'md:grid-cols-2' : ''
        }`}>
          {statsCards.map((stat, i) => (
            <div key={i} className="card p-6">
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
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info Absensi — tanpa API call */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-1">Statistik Absensi</h3>
          <p className="text-xs text-text-light mb-4">
            Lihat rekap absensi detail per kelas atau per siswa di menu Absensi
          </p>
          <div className="h-48 flex flex-col items-center justify-center text-text-light gap-3">
            <span className="text-5xl">📊</span>
            <p className="text-sm text-center">Pilih kelas di menu <strong>Absensi</strong><br/>untuk melihat rekap kehadiran</p>
            <Link to="/absensi" className="btn-primary text-sm">
              Buka Absensi
            </Link>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-text mb-4">Aksi Cepat</h3>
          <div className="space-y-3">
            {quickActions.map((action, i) => (
              <Link
                key={i}
                to={action.to}
                className="flex items-center gap-3 w-full btn-primary"
              >
                <span>{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;