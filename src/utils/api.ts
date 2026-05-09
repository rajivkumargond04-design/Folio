import axios from 'axios';

const API_BASE =
  import.meta.env.VITE_API_URL || 'https://folio-rkj7.onrender.com/api';

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const auth = localStorage.getItem('folio-auth');
  if (auth) {
    try {
      const parsed = JSON.parse(auth);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (_) {}
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isLoginRequest = err.config?.url?.includes('/auth/login');
    if (err.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('biblion-auth');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;

// Auth
export const login = (password: string) =>
  api.post('/auth/login', { password });

export const logout = () => api.post('/auth/logout');

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

export const setUniversalPassword = (password: string) =>
  api.post('/auth/universal-password', { password });

export const removeUniversalPassword = () =>
  api.delete('/auth/universal-password');

export const getUniversalPasswordStatus = () =>
  api.get('/auth/universal-password-status');

// Books
export const getBooks = () => api.get('/books');

export const getBookStream = (bookId: string) =>
  `${API_BASE}/books/${bookId}/stream`;

export const saveProgress = (bookId: string, page: number, total: number, title: string) =>
  api.post(`/books/${bookId}/progress`, { page, total, title });

export const getProgress = (bookId: string) =>
  api.get(`/books/${bookId}/progress`);

export const getAllProgress = () => api.get('/books/progress/all');
