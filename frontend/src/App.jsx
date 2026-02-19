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
import TahunAjaranList from './pages/TahunAjaran/TahunAjaranList';
import JurusanList from './pages/Jurusan/JurusanList';
import MataPelajaranList from './pages/MataPelajaran/MataPelajaranList';

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
            <Route path="mapel"        element={<MataPelajaranList />} />
            <Route path="tahun-ajaran" element={<TahunAjaranList />} />
            <Route path="jadwal"       element={<JadwalList />} />
            <Route path="absensi"      element={<AbsensiInput />} />
            <Route path="nilai"        element={<ComingSoon title="Penilaian" />} />
            <Route path="rapor"        element={<RaporList />} />
            <Route path="laporan" element={<ComingSoon title="Laporan" />} />
            <Route path="jurusan" element={<JurusanList />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;