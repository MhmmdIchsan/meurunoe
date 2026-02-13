import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handle error
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response?.status, error.config?.url); // Debug log
    
    // Jangan redirect jika error dari endpoint login
    if (error.config?.url?.includes('/auth/login')) {
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401) {
      console.log('Unauthorized - clearing auth data'); // Debug log
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Prevent redirect loop
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;