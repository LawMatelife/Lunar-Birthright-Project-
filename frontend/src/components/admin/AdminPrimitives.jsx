const STAT_COLORS = {
  blue: 'text-blue-400 bg-blue-500/10',
  yellow: 'text-yellow-400 bg-yellow-500/10',
  green: 'text-green-400 bg-green-500/10',
  gray: 'text-gray-400 bg-gray-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
};

export const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${STAT_COLORS[color]}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

const STATUS_STYLES = {
  paid: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  granted: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  none: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const StatusBadge = ({ status, label }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_STYLES[status] || STATUS_STYLES.none}`}>
    {label}
  </span>
);
