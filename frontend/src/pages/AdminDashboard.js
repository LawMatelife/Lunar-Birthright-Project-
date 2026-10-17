import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, adminAPI } from '@/utils/api';
import { Loader2 } from 'lucide-react';
import AdminHeader, { AdminTabs } from '@/components/admin/AdminHeader';
import OverviewTab from '@/components/admin/OverviewTab';
import AnalyticsTab from '@/components/admin/AnalyticsTab';
import UsersTab from '@/components/admin/UsersTab';

const PAGE_SIZE = 20;

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [grantingCert, setGrantingCert] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const checkAdminAuth = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      if (!response.data.is_admin) {
        alert('Admin access required');
        navigate('/dashboard');
        return;
      }
      setUser(response.data);
    } catch {
      navigate('/login?redirect=/admin');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const loadStats = useCallback(async () => {
    try {
      const res = await adminAPI.getStats();
      setStats(res.data);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Stats loading failed:', err?.response?.status || err.message);
      }
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    try {
      const res = await adminAPI.getAnalytics();
      setAnalytics(res.data);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Analytics loading failed:', err?.response?.status || err.message);
      }
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const params = { skip: currentPage * PAGE_SIZE, limit: PAGE_SIZE };
      if (searchQuery) params.search = searchQuery;
      if (statusFilter) params.status = statusFilter;
      const res = await adminAPI.getUsersDetailed(params);
      setUsers(res.data.users);
      setTotalUsers(res.data.total);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Users loading failed:', err?.response?.status || err.message);
      }
    }
  }, [currentPage, searchQuery, statusFilter]);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await adminAPI.getNotifications();
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Notifications loading failed:', err?.response?.status || err.message);
      }
    }
  }, []);

  useEffect(() => { checkAdminAuth(); }, [checkAdminAuth]);
  useEffect(() => { loadStats(); loadAnalytics(); loadNotifications(); }, [loadStats, loadAnalytics, loadNotifications]);
  useEffect(() => { loadUsers(); }, [loadUsers]);

  const markNotificationRead = async (id) => {
    try {
      await adminAPI.markNotificationRead(id);
      loadNotifications();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Mark notification read failed:', err?.message);
      }
    }
  };

  const markAllRead = async () => {
    try {
      await adminAPI.markAllNotificationsRead();
      loadNotifications();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Mark all notifications read failed:', err?.message);
      }
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadStats(), loadAnalytics(), loadUsers(), loadNotifications()]);
    setRefreshing(false);
  };

  const handleGrantCertificate = async (userId, userName) => {
    if (!window.confirm(`Grant free certificate to ${userName}?`)) return;
    setGrantingCert(userId);
    try {
      await adminAPI.grantCertificate(userId, false);
      window.alert(`Certificate granted to ${userName}!`);
      loadUsers();
      loadStats();
    } catch (err) {
      window.alert(err.response?.data?.detail || 'Failed to grant certificate');
    } finally {
      setGrantingCert(null);
    }
  };

  const handleLogout = async () => {
    try { await authAPI.logout(); }
    catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.debug('Admin logout API failed:', err?.response?.status);
      }
    }
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <AdminHeader
        refreshing={refreshing}
        onRefresh={handleRefresh}
        onMyDashboard={() => navigate('/dashboard')}
        onViewSite={() => navigate('/')}
        onLogout={handleLogout}
        notifications={notifications}
        unreadCount={unreadCount}
        showNotifications={showNotifications}
        setShowNotifications={setShowNotifications}
        onMarkOne={markNotificationRead}
        onMarkAll={markAllRead}
      />
      <AdminTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab stats={stats} analytics={analytics} />}
        {activeTab === 'analytics' && <AnalyticsTab analytics={analytics} />}
        {activeTab === 'users' && (
          <UsersTab
            users={users}
            totalUsers={totalUsers}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            grantingCert={grantingCert}
            onGrantCertificate={handleGrantCertificate}
          />
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
