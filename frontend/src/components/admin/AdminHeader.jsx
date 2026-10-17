import { useEffect, useRef } from 'react';
import {
  RefreshCw, LogOut, Bell, CheckCheck, Star, Users,
  BarChart3, TrendingUp,
} from 'lucide-react';

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
};

const NotificationBell = ({
  notifications,
  unreadCount,
  showNotifications,
  setShowNotifications,
  onMarkOne,
  onMarkAll,
}) => {
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [setShowNotifications]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition relative"
        data-testid="notification-bell"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className="p-3 border-b border-gray-700 flex justify-between items-center">
            <span className="font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={onMarkAll} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1">
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">No notifications yet</div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.read && onMarkOne(n.id)}
                  className={`p-3 border-b border-gray-700/50 cursor-pointer transition ${
                    n.read ? 'bg-gray-800/50' : 'bg-gray-700/30 hover:bg-gray-700/50'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      n.type === 'new_upgrade' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {n.type === 'new_upgrade' ? <Star className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className={`text-sm font-medium ${n.read ? 'text-gray-400' : 'text-white'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-xs text-gray-600 mt-1">{formatTimeAgo(n.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const AdminHeader = ({
  refreshing, onRefresh, onMyDashboard, onViewSite, onLogout,
  notifications, unreadCount, showNotifications, setShowNotifications,
  onMarkOne, onMarkAll,
}) => (
  <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
    <div className="max-w-7xl mx-auto flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold" data-testid="admin-header">Luna Admin</h1>
        <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">Admin</span>
      </div>
      <div className="flex items-center gap-3">
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          showNotifications={showNotifications}
          setShowNotifications={setShowNotifications}
          onMarkOne={onMarkOne}
          onMarkAll={onMarkAll}
        />
        <button onClick={onRefresh} disabled={refreshing} className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition" data-testid="refresh-btn">
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
        <button onClick={onMyDashboard} className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm">My Dashboard</button>
        <button onClick={onViewSite} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm">View Site</button>
        <button onClick={onLogout} className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition" data-testid="logout-btn">
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </div>
  </header>
);

export const AdminTabs = ({ activeTab, setActiveTab }) => (
  <div className="bg-gray-800/50 border-b border-gray-700">
    <div className="max-w-7xl mx-auto px-6">
      <nav className="flex gap-1">
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'users', label: 'Users', icon: Users },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 flex items-center gap-2 text-sm font-medium border-b-2 transition ${
              activeTab === tab.id ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-white'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  </div>
);

export default AdminHeader;
