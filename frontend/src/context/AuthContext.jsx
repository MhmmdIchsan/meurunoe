import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// Ekstrak role name dari berbagai kemungkinan struktur backend
// Kembalikan selalu lowercase string
export const extractRole = (user) => {
  if (!user) return '';
  const r = user.role;
  if (!r) return '';
  // Kemungkinan: { nama_role: "Admin" } | { name: "admin" } | "admin"
  const raw = (typeof r === 'string') ? r : (r.nama_role || r.name || '');
  return raw.toLowerCase().trim();
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token      = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        console.log('[Auth] Restored user:', parsed);
        console.log('[Auth] Role structure:', parsed?.role);
        console.log('[Auth] Extracted role:', extractRole(parsed));
        setUser(parsed);
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
      console.log('[Auth] Login response:', res.data);

      let token, userData;
      if (res.data.data) {
        token    = res.data.data.token;
        userData = res.data.data.user;
      } else {
        token    = res.data.token;
        userData = res.data.user;
      }

      if (!token) throw new Error('Token tidak ditemukan dalam response');

      console.log('[Auth] User object:', userData);
      console.log('[Auth] Role object:', userData?.role);
      console.log('[Auth] Extracted role:', extractRole(userData));

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
      loading,
      isAuthenticated: !!user && !!localStorage.getItem('token'),
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};