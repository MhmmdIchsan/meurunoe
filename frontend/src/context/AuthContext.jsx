import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Ekstrak role name dari berbagai kemungkinan struktur backend
export const extractRole = (user) => {
  if (!user) return '';
  const r = user.role;
  if (!r) return '';
  const raw = (typeof r === 'string') ? r : (r.nama_role || r.name || '');
  return raw.toLowerCase().trim();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token      = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });

      let token, userData;
      if (res.data.data) {
        token    = res.data.data.token;
        userData = res.data.data.user;
      } else {
        token    = res.data.token;
        userData = res.data.user;
      }

      if (!token) throw new Error('Token tidak ditemukan dalam response');

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (e) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      return {
        success: false,
        message: e.response?.data?.message || e.message || 'Login gagal',
      };
    }
  };

  /**
   * Update sebagian field user di context + localStorage
   * Dipanggil setelah edit profil atau upload foto
   * @param {Partial<User>} partialUser - field yang berubah saja
   */
  const updateUser = (partialUser) => {
    setUser(prev => {
      const updated = { ...prev, ...partialUser };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.replace('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      updateUser,
      loading,
      isAuthenticated: !!user && !!localStorage.getItem('token'),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};