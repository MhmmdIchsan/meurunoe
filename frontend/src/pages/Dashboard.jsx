import { useState, useEffect } from 'react';
import { useAuth, extractRole } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { kelasService } from '../services/kelasService';
import LoadingSpinner from '../components/Common/LoadingSpinner';

export default function Dashboard() {
  const { user } = useAuth();
  const role = extractRole(user);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (role === 'wali kelas') {
      fetchWaliKelasStats();
    } else {
      setLoading(false);
    }
  }, [role]);

  async function fetchWaliKelasStats() {
    try {
      const kelasRes = await kelasService.getAll();
      const allKelas = Array.isArray(kelasRes.data) ? kelasRes.data : (kelasRes.data?.data || []);
      const myKelas = allKelas.find(k => k.wali_kelas?.user_id === user.id);
      
      if (myKelas) {
        const siswaRes = await kelasService.getSiswaByKelas(myKelas.id);
        const rawSiswa = siswaRes.data;
        const siswaList = Array.isArray(rawSiswa) ? rawSiswa : (rawSiswa?.siswa || []);
        
        setStats({
          kelas: myKelas,
          jumlahSiswa: siswaList.length,
        });
      }
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Selamat Pagi';
    if (hour < 15) return 'Selamat Siang';
    if (hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text">{greeting()}! 👋</h1>
        <p className="text-text-light mt-2">
          Selamat datang kembali, <span className="font-semibold text-text">{user?.nama}</span>
        </p>
      </div>

      {/* Role-specific Dashboard */}
      {role === 'admin' && <DashboardAdmin />}
      {role === 'wali kelas' && <DashboardWaliKelas stats={stats} />}
      {role === 'guru' && <DashboardGuru />}
      {role === 'kepala sekolah' && <DashboardKepalaSekolah />}
      {role === 'siswa' && <DashboardSiswa />}
      {role === 'orang tua' && <DashboardOrangTua />}

      {/* Default untuk role lain */}
      {!['admin','wali kelas','guru','kepala sekolah','siswa','orang tua'].includes(role) && (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-text mb-2">Dashboard</h2>
          <p className="text-text-light">Selamat datang di Sistem Informasi Manajemen Sekolah</p>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD ADMIN
// ═══════════════════════════════════════════════════════════════
function DashboardAdmin() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Link to="/users" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">👥</div>
          <div>
            <div className="text-sm text-text-light">Manajemen</div>
            <div className="text-lg font-bold text-text">User</div>
          </div>
        </div>
      </Link>

      <Link to="/siswa" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">🎓</div>
          <div>
            <div className="text-sm text-text-light">Data</div>
            <div className="text-lg font-bold text-text">Siswa</div>
          </div>
        </div>
      </Link>

      <Link to="/guru" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">👨‍🏫</div>
          <div>
            <div className="text-sm text-text-light">Data</div>
            <div className="text-lg font-bold text-text">Guru</div>
          </div>
        </div>
      </Link>

      <Link to="/kelas" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">🏫</div>
          <div>
            <div className="text-sm text-text-light">Data</div>
            <div className="text-lg font-bold text-text">Kelas</div>
          </div>
        </div>
      </Link>

      <Link to="/jadwal" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center text-2xl">📅</div>
          <div>
            <div className="text-sm text-text-light">Kelola</div>
            <div className="text-lg font-bold text-text">Jadwal</div>
          </div>
        </div>
      </Link>

      <Link to="/laporan" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center text-2xl">📈</div>
          <div>
            <div className="text-sm text-text-light">Lihat</div>
            <div className="text-lg font-bold text-text">Laporan</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD WALI KELAS
// ═══════════════════════════════════════════════════════════════
function DashboardWaliKelas({ stats }) {
  if (!stats || !stats.kelas) {
    return (
      <div className="card p-12 text-center">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-bold text-text mb-2">Belum Menjadi Wali Kelas</h2>
        <p className="text-text-light">Anda belum ditugaskan sebagai wali kelas.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Kelas Info Card */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary mb-1">Kelas {stats.kelas.nama}</h2>
            <p className="text-text-light">
              {stats.kelas.jurusan?.nama} • Tingkat {stats.kelas.tingkat}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{stats.jumlahSiswa}</div>
            <div className="text-sm text-text-light">Siswa</div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link to="/wali-kelas/monitoring" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📋</div>
            <div>
              <div className="text-sm text-text-light">Monitoring</div>
              <div className="text-lg font-bold text-text">Kelas</div>
            </div>
          </div>
        </Link>

        <Link to="/absensi" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">✅</div>
            <div>
              <div className="text-sm text-text-light">Input</div>
              <div className="text-lg font-bold text-text">Absensi</div>
            </div>
          </div>
        </Link>

        <Link to="/nilai" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📝</div>
            <div>
              <div className="text-sm text-text-light">Input</div>
              <div className="text-lg font-bold text-text">Nilai</div>
            </div>
          </div>
        </Link>

        <Link to="/jadwal" className="card p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center text-2xl">📅</div>
            <div>
              <div className="text-sm text-text-light">Lihat</div>
              <div className="text-lg font-bold text-text">Jadwal</div>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DASHBOARD GURU
// ═══════════════════════════════════════════════════════════════
function DashboardGuru() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Link to="/jadwal" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📅</div>
          <div>
            <div className="text-sm text-text-light">Jadwal</div>
            <div className="text-lg font-bold text-text">Mengajar</div>
          </div>
        </div>
      </Link>

      <Link to="/absensi" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">✅</div>
          <div>
            <div className="text-sm text-text-light">Input</div>
            <div className="text-lg font-bold text-text">Absensi</div>
          </div>
        </div>
      </Link>

      <Link to="/nilai" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📝</div>
          <div>
            <div className="text-sm text-text-light">Input</div>
            <div className="text-lg font-bold text-text">Nilai</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

// Placeholder untuk role lain
function DashboardKepalaSekolah() {
  return (
    <div className="card p-12 text-center">
      <div className="text-5xl mb-4">🏫</div>
      <h2 className="text-xl font-bold text-text mb-2">Dashboard Kepala Sekolah</h2>
      <p className="text-text-light">Fitur monitoring dan laporan akan segera tersedia</p>
    </div>
  );
}

function DashboardSiswa() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Link to="/jadwal" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl">📅</div>
          <div>
            <div className="text-sm text-text-light">Jadwal</div>
            <div className="text-lg font-bold text-text">Pelajaran</div>
          </div>
        </div>
      </Link>

      <Link to="/nilai" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl">📝</div>
          <div>
            <div className="text-sm text-text-light">Lihat</div>
            <div className="text-lg font-bold text-text">Nilai</div>
          </div>
        </div>
      </Link>

      <Link to="/rapor" className="card p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center text-2xl">📄</div>
          <div>
            <div className="text-sm text-text-light">Download</div>
            <div className="text-lg font-bold text-text">Rapor</div>
          </div>
        </div>
      </Link>
    </div>
  );
}

function DashboardOrangTua() {
  return (
    <div className="card p-12 text-center">
      <div className="text-5xl mb-4">👨‍👩‍👧</div>
      <h2 className="text-xl font-bold text-text mb-2">Dashboard Orang Tua</h2>
      <p className="text-text-light">Monitoring nilai dan absensi anak akan segera tersedia</p>
    </div>
  );
}