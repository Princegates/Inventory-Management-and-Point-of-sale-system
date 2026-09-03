import axios from 'axios';

// Defaults to a same-origin relative path, which works with the Vite dev proxy and the
// Netlify redirect config unmodified. Set VITE_API_BASE_URL at build time when the API is
// hosted on a different origin (e.g. a cPanel Node app on its own subdomain).
const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ims_pos_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ims_pos_token');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export function apiErrorMessage(error) {
  return error?.response?.data?.error || error?.message || 'Something went wrong';
}

export default api;
