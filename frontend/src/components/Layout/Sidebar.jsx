import { Link, useLocation } from 'react-router-dom';
import { useAuth, extractRole } from '../../context/AuthContext';

const ALL_MENU = [
  { title: 'Dashboard',      path: '/dashboard',    icon: '📊',
    roles: ['admin','kepala sekolah','guru','wali_kelas','siswa','orang tua'] },
  { title: 'Manajemen User', path: '/users',         icon: '👥',  roles: ['admin'] },
  { title: 'Data Siswa',     path: '/siswa',         icon: '🎓',
    roles: ['admin','kepala sekolah','guru','wali_kelas'] },
  { title: 'Data Guru',      path: '/guru',          icon: '👨‍🏫',
    roles: ['admin','kepala sekolah'] },
  { title: 'Data Kelas',     path: '/kelas',         icon: '🏫',
    roles: ['admin', 'kepala sekolah', 'guru', 'wali_kelas']
  },
     { title: 'Monitoring Kelas', path: '/wali-kelas/monitoring', icon: '📋',  
    roles: ['wali_kelas'] },
  { title: 'Mata Pelajaran', path: '/mapel',         icon: '📚',  roles: ['admin'] },
  { title: 'Tahun Ajaran',   path: '/tahun-ajaran',  icon: '🗓️',  roles: ['admin'] },
  { title: 'Jadwal Pelajaran', path: '/jadwal',      icon: '📅',
    roles: ['admin','kepala sekolah','guru','wali_kelas','siswa'] },
  { title: 'Absensi',        path: '/absensi',       icon: '✅',
    roles: ['admin','guru','wali_kelas','siswa','orang tua'] },
  { title: 'Penilaian',      path: '/nilai',         icon: '📝',
    roles: ['admin','guru','wali_kelas','siswa','orang tua'] },
  { title: 'Rapor',          path: '/rapor',         icon: '📄',
    roles: ['admin','kepala sekolah','guru','wali_kelas','siswa','orang tua'] },
  { title: 'Laporan',        path: '/laporan',       icon: '📈',
    roles: ['admin', 'kepala sekolah']
  },
  {
    title: 'Jurusan', path: '/jurusan', icon: '🎯',
    roles: ['admin','kepala sekolah']
  }
];

export default function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const role = extractRole(user);   // misal: "admin", "guru", "kepala sekolah"

  console.log('[Sidebar] role =', role, '| user.role raw =', user?.role);

  // Filter: role cocok jika ada item.roles yang SAMA atau role mengandung item.roles
  const menu = ALL_MENU.filter(item =>
    item.roles.some(r => role === r || role.includes(r) || r.includes(role))
  );

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  // Tampilkan nama role yang ramah
  const roleLabel = (() => {
    const r = user?.role;
    if (!r) return '-';
    return (typeof r === 'string') ? r : (r.nama_role || r.name || '-');
  })();

  return (
    <aside className="w-64 bg-surface border-r border-border min-h-screen flex flex-col">
      <div className="p-5 border-b border-border">
        <h1 className="text-xl font-bold text-primary">SIM Sekolah</h1>
        <p className="text-xs text-text-light mt-0.5">Sistem Informasi Manajemen</p>
      </div>

      <div className="px-5 py-3 border-b border-border bg-gray-50">
        <p className="text-xs font-semibold text-text truncate">{user?.nama || user?.email || '-'}</p>
        <p className="text-xs text-primary font-medium mt-0.5">{roleLabel}</p>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-0.5">
          {menu.map(item => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path)
                    ? 'bg-primary text-white'
                    : 'text-text hover:bg-gray-100'
                }`}
              >
                <span className="w-5 text-center">{item.icon}</span>
                <span>{item.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}
