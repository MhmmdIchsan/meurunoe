import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './routes/PrivateRoute';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UserList from './pages/Users/UserList';
import SiswaList from './pages/Siswa/SiswaList';
import GuruList from './pages/Guru/GuruList';
import KelasList from './pages/Kelas/KelasList';
import JadwalList from './pages/Jadwal/JadwalList';
import AbsensiInput from './pages/Absensi/AbsensiInput';
import RaporList from './pages/Rapor/RaporList';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <PrivateRoute>
              <MainLayout />
            </PrivateRoute>
          }>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="users" element={
              <PrivateRoute allowedRoles={['admin']}>
                <UserList />
              </PrivateRoute>
            } />
            <Route path="siswa" element={<SiswaList />} />
            <Route path="guru" element={<GuruList />} />
            <Route path="kelas" element={<KelasList />} />
            <Route path="jadwal" element={<JadwalList />} />
            <Route path="absensi" element={<AbsensiInput />} />
            <Route path="rapor" element={<RaporList />} />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;