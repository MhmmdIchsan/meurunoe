import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Inject token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Log semua error secara detail
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url    = error.config?.url;
    const status = error.response?.status;
    const body   = error.response?.data;

    console.group(`❌ API Error [${status}] ${url}`);
    console.log('Message :', body?.message);
    console.log('Errors  :', body?.errors);
    console.log('Full body:', body);
    console.groupEnd();

    // Jangan redirect jika sedang login
    if (status === 401 && !url?.includes('/auth/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.replace('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default api;