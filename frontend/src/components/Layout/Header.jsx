import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, extractRole } from '../../context/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [fotoProfil, setFotoProfil] = useState(null);

  // Load foto profil dari localStorage (per user)
  useEffect(() => {
    if (!user?.id) return;
    const fotoKey = `foto_profil_${user.id}`;
    setFotoProfil(localStorage.getItem(fotoKey));
  }, [user?.id]);

  // Listen for profile photo updates
  useEffect(() => {
    function handleFotoUpdate() {
      if (!user?.id) return;
      const fotoKey = `foto_profil_${user.id}`;
      setFotoProfil(localStorage.getItem(fotoKey));
    }
    window.addEventListener('userProfileUpdated', handleFotoUpdate);
    window.addEventListener('fotoProfilUpdated', handleFotoUpdate);
    return () => {
      window.removeEventListener('userProfileUpdated', handleFotoUpdate);
      window.removeEventListener('fotoProfilUpdated', handleFotoUpdate);
    };
  }, [user?.id]);

  function handleLogout() {
    if (window.confirm('Yakin ingin logout?')) {
      logout();
      navigate('/login');
    }
  }

  const roleLabel = (() => {
    const r = user?.role;
    if (!r) return '-';
    return (typeof r === 'string') ? r : (r.nama_role || r.nama || r.name || '-');
  })();

  const initials = (user?.nama || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-text">
          Selamat Datang, {user?.nama || 'User'}
        </h2>
        <p className="text-xs text-text-light capitalize">{roleLabel}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <NotificationBell />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            {fotoProfil ? (
              <img
                src={fotoProfil}
                alt="Foto Profil"
                className="w-9 h-9 rounded-full object-cover border-2 border-accent"
              />
            ) : (
              <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                {initials}
              </div>
            )}
            <span className="text-xs text-text-light hidden sm:block">▾</span>
          </button>

          {/* Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-border z-20 py-1">
                {/* User info */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-text truncate">{user?.nama || '-'}</p>
                  <p className="text-xs text-text-light truncate capitalize">{roleLabel}</p>
                </div>

                {/* Menu items */}
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-gray-50 transition-colors"
                >
                  <span>👤</span> Profil Saya
                </Link>
                <Link
                  to="/profile"
                  onClick={() => setShowUserMenu(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-text hover:bg-gray-50 transition-colors"
                >
                  <span>🔒</span> Ganti Password
                </Link>

                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-error hover:bg-red-50 transition-colors"
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}