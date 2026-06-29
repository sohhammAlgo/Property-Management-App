import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Token storage keys ──────────────────────────────────────────────────────
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

// ── JWT injection on every request ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auto-refresh on 401 ─────────────────────────────────────────────────────
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
          refreshPromise =
            refreshPromise ||
            axios.post(`${import.meta.env.VITE_API_URL || '/api'}/auth/refresh`, {
              refreshToken,
            });
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

// ── AUTH ────────────────────────────────────────────────────────────────────
/** Firebase login — sends Firebase ID token in Authorization header.
 *  Omits `name` if empty/too short so Joi doesn't reject with 400. */
export async function firebaseLogin(idToken, body = {}) {
  const payload = {};
  if (body.name && typeof body.name === 'string' && body.name.trim().length >= 2) {
    payload.name = body.name.trim();
  }
  if (body.fcmToken) payload.fcmToken = body.fcmToken;

  const baseURL = import.meta.env.VITE_API_URL || '/api';
  const { data } = await axios.post(`${baseURL}/auth/firebase-login`, payload, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return data; // { accessToken, refreshToken, user }
}

export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.patch('/auth/me', data);
export const joinSociety = (data) => api.post('/auth/join-society', data);
export const logoutApi = () => api.post('/auth/logout');
export const refreshTokens = (refreshToken) =>
  api.post('/auth/refresh', { refreshToken });

// ── COMPLAINTS ──────────────────────────────────────────────────────────────
export const getComplaints = (params = {}) => api.get('/complaints', { params });
export const createComplaint = (formData) =>
  api.post('/complaints', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getComplaint = (id) => api.get(`/complaints/${id}`);
export const updateComplaintStatus = (id, data) =>
  api.patch(`/complaints/${id}/status`, data);
export const addComplaintComment = (id, comment) =>
  api.post(`/complaints/${id}/comments`, { comment });
export const deleteComplaint = (id) => api.delete(`/complaints/${id}`);
export const getComplaintAnalytics = () => api.get('/complaints/analytics');

// ── BOOKINGS & AMENITIES ────────────────────────────────────────────────────
export const getAmenities = () => api.get('/bookings/amenities');
export const getAvailableSlots = (amenityId, date) =>
  api.get(`/bookings/amenities/${amenityId}/slots`, { params: { date } });
export const createBooking = (data) => api.post('/bookings', data);
export const getBookings = (params = {}) => api.get('/bookings', { params });
export const updateBookingStatus = (id, data) =>
  api.patch(`/bookings/${id}/status`, data);
export const cancelBooking = (id) => api.delete(`/bookings/${id}`);

// ── PAYMENTS ────────────────────────────────────────────────────────────────
export const createPaymentOrder = (data) => api.post('/payments/create-order', data);
export const verifyPayment = (data) => api.post('/payments/verify', data);
export const getPayments = (params = {}) => api.get('/payments', { params });
export const getPaymentStats = () => api.get('/payments/stats');
export const getDefaulters = (params = {}) =>
  api.get('/payments/defaulters', { params });

// ── ANNOUNCEMENTS ───────────────────────────────────────────────────────────
export const getAnnouncements = (params = {}) =>
  api.get('/announcements', { params });
export const createAnnouncement = (data) => api.post('/announcements', data);
export const updateAnnouncement = (id, data) =>
  api.patch(`/announcements/${id}`, data);
export const deleteAnnouncement = (id) => api.delete(`/announcements/${id}`);

// ── NOTIFICATIONS ───────────────────────────────────────────────────────────
export const getNotifications = (params = {}) =>
  api.get('/notifications', { params });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationsRead = (ids = []) =>
  api.post('/notifications/mark-read', { notificationIds: ids });
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// ── AI ──────────────────────────────────────────────────────────────────────
export const sendChatMessage = (message, conversationHistory = [], context = {}) =>
  api.post('/ai/chat', { message, conversationHistory, context });
export const getAIInsights = () => api.post('/ai/insights', {});
export const checkAIHealth = () => api.get('/ai/health');

// ── TENANTS ─────────────────────────────────────────────────────────────────
export const getTenant = (id) => api.get(`/tenants/${id}`);
export const getTenantStats = (id) => api.get(`/tenants/${id}/stats`);
export const getTenantResidents = (id, params = {}) =>
  api.get(`/tenants/${id}/residents`, { params });
export const updateTenant = (id, data) => api.patch(`/tenants/${id}`, data);

// ── PLATFORM ADMIN ──────────────────────────────────────────────────────────
export const getPlatformDashboard = () => api.get('/admin/dashboard');
export const getTenantGrowth = () => api.get('/admin/tenants/growth');
export const getRevenueAnalytics = () => api.get('/admin/revenue');
export const getAllUsers = (params = {}) => api.get('/admin/users', { params });
export const toggleUserStatus = (id, isActive) =>
  api.patch(`/admin/users/${id}/status`, { isActive });
export const changeUserRole = (id, role) =>
  api.patch(`/admin/users/${id}/role`, { role });

// ── HELPERS ─────────────────────────────────────────────────────────────────
export const formatPriority = (p) => {
  if (!p) return 'Low';
  return p.charAt(0).toUpperCase() + p.slice(1);
};

export const formatStatus = (s) => {
  if (!s) return 'Open';
  return s
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};

export default api;
