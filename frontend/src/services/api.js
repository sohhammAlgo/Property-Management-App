import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'authToken';
const REFRESH_KEY = 'refreshToken';

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_KEY);

export const setTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
};

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      const refreshToken = getRefreshToken();
      if (refreshToken && !original.url?.includes('/auth/refresh')) {
        original._retry = true;
        try {
          refreshPromise = refreshPromise || axios.post('/api/auth/refresh', { refreshToken });
          const { data } = await refreshPromise;
          refreshPromise = null;
          setTokens(data.accessToken, data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          refreshPromise = null;
          clearTokens();
          if (!window.location.pathname.startsWith('/login')) {
            window.location.href = '/login';
          }
        }
      } else {
        clearTokens();
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(err);
  }
);

/** Firebase login — uses Firebase ID token in Authorization header */
export async function firebaseLogin(idToken, body = {}) {
  const { data } = await axios.post('/api/auth/firebase-login', body, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return data;
}

export const formatPriority = (p) => {
  if (!p) return 'Low';
  return p.charAt(0).toUpperCase() + p.slice(1);
};

export const formatStatus = (s) => {
  if (!s) return 'Open';
  return s.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export default api;
