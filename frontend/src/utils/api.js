import axios from 'axios';

const BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/$/, '');
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  withCredentials: true,  // httpOnly cookie auth — sole auth mechanism
});

// Centralised 401 handling: clear any stale localStorage and bounce to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user'); // legacy cache only
      const path = window.location.pathname;
      if (!['/login', '/register', '/'].includes(path) && !path.startsWith('/verify')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const plotAPI = {
  getMyPlot: () => api.get('/plot/my-plot'),
  getStats: () => api.get('/plots/stats'),
  getAll: () => api.get('/plots/all'),
};

export const birthMoonAPI = {
  preview: (birth_date) => api.post('/birth-moon/preview', { birth_date }),
};

export const certificateAPI = {
  createCheckout: (origin_url) => api.post('/certificate/checkout', {
    origin_url,
    success_url: `${origin_url}/dashboard?certificate=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin_url}/upgrade`
  }),
  getStatus: (session_id) => api.get(`/certificate/status/${session_id}`),
  getMyCertificate: () => api.get('/certificate/my-certificate'),
  getNftStatus: () => api.get('/certificate/nft-status'),
  retryNft: () => api.post('/certificate/nft-retry'),
  downloadPdf: () => api.get('/certificate/download-pdf', { responseType: 'blob' }),
};

export const shareCardAPI = {
  generate: () => api.get('/share-card/generate', { responseType: 'blob' }),
  getBase64: () => api.get('/share-card/base64'),
};

export const educationalAPI = {
  getContent: () => api.get('/educational/content'),
};

export const referralAPI = {
  validate: (code) => api.get(`/referral/validate/${code}`),
  getDiscountStatus: () => api.get('/referral/discount-status'),
  getMyStats: () => api.get('/referral/my-stats'),
  getLeaderboard: () => api.get('/referral/leaderboard'),
};

export const registryAPI = {
  getCounter: () => api.get('/registry/counter'),
  getCountries: () => api.get('/registry/countries'),
  getLeaderboard: () => api.get('/registry/leaderboard'),
  getViralStats: () => api.get('/registry/viral-stats'),
  getRecentCitizens: (limit = 8) => api.get(`/registry/recent-citizens?limit=${limit}`),
};

export const verifyAPI = {
  getCertificate: (certificate_number) => api.get(`/verify/${certificate_number}`),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getAnalytics: () => api.get('/admin/analytics'),
  getUsers: (params = {}) => api.get('/admin/users', { params }),
  getUsersDetailed: (params = {}) => api.get('/admin/users-detailed', { params }),
  getPlots: (params = {}) => api.get('/admin/plots', { params }),
  getFamilies: (params = {}) => api.get('/admin/families', { params }),
  getUsersWithoutCertificates: () => api.get('/admin/users-without-certificates'),
  grantCertificate: (user_id, send_email = false) => api.post('/admin/grant-certificate', { user_id, send_email }),
  sendUpgradeReminders: (user_ids) => api.post('/admin/send-upgrade-reminders', { user_ids }),
  getNotifications: () => api.get('/admin/notifications'),
  markNotificationRead: (id) => api.post(`/admin/notifications/${id}/read`),
  markAllNotificationsRead: () => api.post('/admin/notifications/read-all'),
};

export default api;
