import {
  Search, Gift, Loader2, Check, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { StatusBadge } from './AdminPrimitives';

const PAGE_SIZE = 20;

const UsersTab = ({
  users, totalUsers, currentPage, setCurrentPage,
  searchQuery, setSearchQuery, statusFilter, setStatusFilter,
  grantingCert, onGrantCertificate,
}) => {
  const totalPages = Math.ceil(totalUsers / PAGE_SIZE);

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name, email, or citizen number..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(0); }}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
            data-testid="search-input"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(0); }}
          className="px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:outline-none focus:border-blue-500"
          data-testid="status-filter"
        >
          <option value="">All Status</option>
          <option value="paid">Paid Certificates</option>
          <option value="granted">Free Certificates</option>
          <option value="free">Free Claims Only</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="users-table">
            <thead className="bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Citizen #</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Country</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Plot</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{u.full_name}</div>
                    {u.message_to_future && (
                      <div className="text-xs text-gray-500 truncate max-w-[200px]" title={u.message_to_future}>
                        "{u.message_to_future}"
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.email}</td>
                  <td className="px-4 py-3 text-sm text-blue-400 font-mono">{u.certificate_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-400">{u.country || '-'}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.payment_status} label={u.status_label} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {u.lunar_lat && u.lunar_lon
                      ? <span>{u.lunar_lat.toFixed(2)}°, {u.lunar_lon.toFixed(2)}°</span>
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {u.payment_status === 'none' && (
                      <button
                        onClick={() => onGrantCertificate(u.id, u.full_name)}
                        disabled={grantingCert === u.id}
                        className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs font-medium flex items-center gap-1 disabled:opacity-50"
                        data-testid={`grant-btn-${u.id}`}
                      >
                        {grantingCert === u.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Gift className="w-3 h-3" />}
                        Grant Free
                      </button>
                    )}
                    {(u.payment_status === 'paid' || u.payment_status === 'granted') && (
                      <span className="text-green-400 text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" /> Issued
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 bg-gray-700/30 flex items-center justify-between">
          <span className="text-sm text-gray-400">
            Showing {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, totalUsers)} of {totalUsers}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg"
              data-testid="prev-page-btn"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className="p-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg"
              data-testid="next-page-btn"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default UsersTab;
