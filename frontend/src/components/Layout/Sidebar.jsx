import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuth();

  const menuItems = [
    {
      title: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      roles: ['admin', 'kepala_sekolah', 'guru', 'wali_kelas', 'siswa', 'orang_tua']
    },
    {
      title: 'Manajemen User',
      path: '/users',
      icon: '👥',
      roles: ['admin']
    },
    {
      title: 'Data Siswa',
      path: '/siswa',
      icon: '🎓',
      roles: ['admin', 'kepala_sekolah', 'guru', 'wali_kelas']
    },
    {
      title: 'Data Guru',
      path: '/guru',
      icon: '👨‍🏫',
      roles: ['admin', 'kepala_sekolah']
    },
    {
      title: 'Data Kelas',
      path: '/kelas',
      icon: '🏫',
      roles: ['admin', 'kepala_sekolah']
    },
    {
      title: 'Mata Pelajaran',
      path: '/mapel',
      icon: '📚',
      roles: ['admin', 'kepala_sekolah']
    },
    {
      title: 'Jadwal Pelajaran',
      path: '/jadwal',
      icon: '📅',
      roles: ['admin', 'kepala_sekolah', 'guru', 'wali_kelas', 'siswa']
    },
    {
      title: 'Absensi',
      path: '/absensi',
      icon: '✅',
      roles: ['admin', 'guru', 'wali_kelas', 'siswa', 'orang_tua']
    },
    {
      title: 'Penilaian',
      path: '/nilai',
      icon: '📝',
      roles: ['admin', 'guru', 'wali_kelas', 'siswa', 'orang_tua']
    },
    {
      title: 'Rapor',
      path: '/rapor',
      icon: '📄',
      roles: ['admin', 'kepala_sekolah', 'guru', 'wali_kelas', 'siswa', 'orang_tua']
    },
    {
      title: 'Laporan',
      path: '/laporan',
      icon: '📈',
      roles: ['admin', 'kepala_sekolah']
    }
  ];

  const filteredMenu = menuItems.filter(item => 
    item.roles.includes(user?.role?.nama_role?.toLowerCase() || '')
  );

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="w-64 bg-surface border-r border-border min-h-screen">
      <div className="p-4 border-b border-border">
        <h1 className="text-xl font-bold text-primary">SIM Sekolah</h1>
        <p className="text-sm text-text-light mt-1">Sistem Informasi Manajemen</p>
      </div>
      
      <nav className="p-4">
        <ul className="space-y-2">
          {filteredMenu.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-text hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;