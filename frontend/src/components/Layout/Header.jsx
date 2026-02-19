import { useAuth } from '../../context/AuthContext';

// Sama persis dengan Sidebar agar konsisten
const getRoleName = (user) => {
  if (!user || !user.role) return '-';
  const r = user.role;
  return r.nama_role || r.name || (typeof r === 'string' ? r : '-');
};

const Header = () => {
  const { user, logout } = useAuth();

  const displayName = user?.nama || user?.email || 'User';
  const roleName    = getRoleName(user);
  const initial     = displayName.charAt(0).toUpperCase();

  return (
    <header className="bg-surface border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-text">
            Selamat Datang, {displayName}
          </h2>
          <p className="text-sm text-text-light capitalize">{roleName}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-text">{displayName}</p>
            <p className="text-xs text-text-light">{user?.email || ''}</p>
          </div>

          <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0">
            {initial}
          </div>

          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm text-error border border-red-200 hover:bg-red-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;