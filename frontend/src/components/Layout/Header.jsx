import { useNavigate } from 'react-router-dom';
import { useAuth, extractRole } from '../../context/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';

export default function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    if (window.confirm('Yakin ingin logout?')) {
      logout();
      navigate('/login');
    }
  }

  const role = extractRole(user);
  const roleLabel = (() => {
    const r = user?.role;
    if (!r) return '-';
    return (typeof r === 'string') ? r : (r.nama_role || r.nama || r.name || '-');
  })();

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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
            {user?.nama?.charAt(0).toUpperCase() || 'U'}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-error hover:underline"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}