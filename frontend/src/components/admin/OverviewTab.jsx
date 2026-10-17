import { Users, Award, Gift, Globe, DollarSign, PieChart } from 'lucide-react';
import {
  ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { StatCard } from './AdminPrimitives';
import {
  CHART_TOOLTIP_STYLE, CHART_ITEM_STYLE, CHART_AXIS_TICK,
  BAR_RADIUS_HORIZONTAL,
} from './chartStyles';

const OverviewTab = ({ stats, analytics }) => (
  <>
    {stats && (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard icon={Users} label="Total Claims" value={stats.total_users} color="blue" />
        <StatCard icon={Award} label="Paid Certs" value={stats.paid_certificates} color="yellow" />
        <StatCard icon={Gift} label="Free Certs" value={stats.granted_certificates} color="green" />
        <StatCard icon={Users} label="Free Only" value={stats.free_claims_only} color="gray" />
        <StatCard icon={Globe} label="Countries" value={stats.total_countries} color="purple" />
        <StatCard icon={DollarSign} label="Revenue" value={`$${stats.total_revenue}`} color="emerald" />
      </div>
    )}


    {stats && (
      <div className="mb-8 p-6 bg-gray-800 rounded-xl border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-gray-400 text-sm">Free → Paid Conversion Rate</span>
            <div className="text-3xl font-bold text-green-400">{stats.conversion_rate}%</div>
          </div>
          <div className="text-right">
            <span className="text-gray-400 text-sm">Founding Goal Progress</span>
            <div className="text-xl font-bold text-blue-400">{((stats.total_users / 1000000) * 100).toFixed(4)}%</div>
            <div className="text-xs text-gray-500">{stats.total_users.toLocaleString()} / 1,000,000</div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
              style={{ width: `${Math.min(stats.conversion_rate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>0%</span>
            <span>Industry avg: 2-5%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    )}

    {analytics && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-400" />
            Conversion Funnel
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={analytics.funnel_data}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  fill="#8884d8" dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {analytics.funnel_data.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={CHART_ITEM_STYLE} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-blue-400" />
            Top Countries
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.top_countries} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9ca3af" />
                <YAxis type="category" dataKey="country" stroke="#9ca3af" width={80} tick={CHART_AXIS_TICK} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} itemStyle={CHART_ITEM_STYLE} />
                <Bar dataKey="count" fill="#3b82f6" radius={BAR_RADIUS_HORIZONTAL} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )}
  </>
);

export default OverviewTab;
