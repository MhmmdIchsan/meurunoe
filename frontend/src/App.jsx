import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './components/Layout/MainLayout';

import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import UserList     from './pages/Users/UserList';
import SiswaList    from './pages/Siswa/SiswaList';
import GuruList     from './pages/Guru/GuruList';
import KelasList    from './pages/Kelas/KelasList';
import JadwalList   from './pages/Jadwal/JadwalList';
import AbsensiInput from './pages/Absensi/AbsensiInput';
import RaporList    from './pages/Rapor/RaporList';

// Nilai
import NilaiInput from './pages/Nilai/NilaiInput';
import NilaiSiswa from './pages/Nilai/NilaiSiswa';

// Wali Kelas
import MonitoringKelas from './pages/WaliKelas/MonitoringKelas';

// Analytics & Reports
import DashboardAnalytics from './pages/Analytics/DashboardAnalytics';
import LaporanList from './pages/Laporan/LaporanList';

// Orang Tua
import DashboardOrangTua from './pages/OrangTua/DashboardOrangTua';
import OrangTuaList from './pages/OrangTua/OrangTuaList';
import NilaiAnak from './pages/OrangTua/NilaiAnak';
import JadwalAnak from './pages/OrangTua/JadwalAnak';
import RaporAnak from './pages/OrangTua/RaporAnak';

const ComingSoon = ({ title }) => (
  <div className="card p-12 text-center">
    <div className="text-5xl mb-4">🚧</div>
    <h2 className="text-xl font-bold text-text mb-2">{title}</h2>
    <p className="text-text-light">Halaman ini sedang dalam pengembangan</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"    element={<Dashboard />} />
            <Route path="users"        element={<UserList />} />
            <Route path="siswa"        element={<SiswaList />} />
            <Route path="guru"         element={<GuruList />} />
            <Route path="kelas"        element={<KelasList />} />
            <Route path="mapel"        element={<ComingSoon title="Mata Pelajaran" />} />
            <Route path="tahun-ajaran" element={<ComingSoon title="Tahun Ajaran" />} />
            <Route path="jadwal"       element={<JadwalList />} />
            <Route path="absensi"      element={<AbsensiInput />} />
            <Route path="nilai"        element={<NilaiInput />} />
            <Route path="nilai-saya"   element={<NilaiSiswa />} />
            <Route path="rapor"        element={<RaporList />} />
            <Route path="analytics"    element={<DashboardAnalytics />} />
            <Route path="laporan"      element={<LaporanList />} />
            <Route path="orang-tua"    element={<DashboardOrangTua />} />
            <Route path="orang-tua-list" element={<OrangTuaList />} />
            <Route path="nilai-anak"   element={<NilaiAnak />} />
            <Route path="jadwal-anak"  element={<JadwalAnak />} />
            <Route path="rapor-anak"   element={<RaporAnak />} />
            
            {/* Wali Kelas Routes */}
            <Route path="wali-kelas/monitoring" element={<MonitoringKelas />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;