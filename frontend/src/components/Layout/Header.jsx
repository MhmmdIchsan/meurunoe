import { useAuth } from '../../context/AuthContext';

const Header = () => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-surface border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-text">
            Selamat Datang, {user?.nama || user?.username}
          </h2>
          <p className="text-sm text-text-light">
            Role: {user?.role?.nama_role || '-'}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-text">{user?.nama || user?.username}</p>
            <p className="text-xs text-text-light">{user?.email || '-'}</p>
          </div>
          
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
            {(user?.nama || user?.username)?.charAt(0).toUpperCase()}
          </div>
          
          <button
            onClick={logout}
            className="ml-2 px-4 py-2 text-sm text-error hover:bg-red-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;