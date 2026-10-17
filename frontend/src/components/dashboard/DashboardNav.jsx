import { Globe, BookOpen, LogOut, Shield } from 'lucide-react';

const DashboardNav = ({ isAdmin, onAdminClick, onLearnClick, onLogout }) => (
  <nav className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-800" data-testid="dashboard-nav">
    <div className="flex items-center space-x-2">
      <Globe className="w-8 h-8 text-blue-400" />
      <span className="text-2xl font-bold gradient-text">Lunar Birthright</span>
    </div>
    <div className="flex items-center space-x-4">
      {isAdmin && (
        <button
          onClick={onAdminClick}
          className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition flex items-center"
          data-testid="nav-admin-btn"
        >
          <Shield className="w-5 h-5 mr-2" />
          Admin
        </button>
      )}
      <button
        onClick={onLearnClick}
        className="px-4 py-2 text-white hover:text-blue-400 transition flex items-center"
        data-testid="nav-learn-btn"
      >
        <BookOpen className="w-5 h-5 mr-2" />
        Learn
      </button>
      <button
        onClick={onLogout}
        className="px-4 py-2 text-white hover:text-red-400 transition flex items-center"
        data-testid="nav-logout-btn"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Logout
      </button>
    </div>
  </nav>
);

export default DashboardNav;
