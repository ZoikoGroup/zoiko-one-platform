import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText as FileTextIcon, Search, Filter, X, ChevronDown, RefreshCw, Plus, AlertCircle, CheckCircle, Clock, FileText, XCircle
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { contractApi } from "../../../service/billingService";

const ITEMS_PER_PAGE = 10;

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "expired", label: "Expired" },
  { value: "terminated", label: "Terminated" },
  { value: "cancelled", label: "Cancelled" },
];

const formatDate = (d) => d ? new Date(d).toLocaleDateString() : "—";
const formatCurrency = (v) => v != null ? `$${Number(v).toLocaleString()}` : "—";

export default function ContractListPage() {
  const navigate = useNavigate();

  const [contracts, setContracts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  const fetchContracts = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);
      const data = await contractApi.list({
        page: safePage,
        per_page: ITEMS_PER_PAGE,
        search_term: debouncedSearch || undefined,
        status: statusFilter || undefined,
      });
      const items = data.items || data.data || data || [];
      setContracts(Array.isArray(items) ? items : []);
      setTotal(data.total || items.length || 0);
    } catch (err) {
      console.error("Failed to load contracts:", err);
      setError(err.message || "Failed to load contracts");
      setContracts([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [safePage, debouncedSearch, statusFilter, loading]);

  useEffect(() => { fetchContracts(); }, [fetchContracts]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const handleRefresh = () => { setRefreshing(true); fetchContracts(); };

  const StatusBadge = ({ status }) => {
    const styles = {
      active: "bg-green-100 text-green-700",
      pending: "bg-amber-100 text-amber-700",
      expired: "bg-gray-100 text-gray-700",
      terminated: "bg-red-100 text-red-700",
      cancelled: "bg-slate-100 text-slate-700",
    };
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-700"}`}>
        {status === "active" ? <CheckCircle size={12} /> : status === "terminated" ? <XCircle size={12} /> : <Clock size={12} />}
        {status || "unknown"}
      </span>
    );
  };

  if (loading) {
    return (
      <HRPage title="Contracts" subtitle="Manage contracts">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center"><RefreshCw size={24} className="text-violet-600" /></div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading contracts...</p>
        </div>
      </HRPage>
    );
  }

  if (error && contracts.length === 0) {
    return (
      <HRPage title="Contracts" subtitle="Manage contracts">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4"><AlertCircle size={32} /></div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
          <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
          <button onClick={handleRefresh} className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg flex items-center gap-2">
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Contracts" subtitle="Manage contracts">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" placeholder="Search contracts..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={16} /></button>
                )}
              </div>
              <button onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-violet-50 border-violet-200 text-violet-600" : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
                <Filter size={18} />
              </button>
              <button onClick={handleRefresh} disabled={refreshing} className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-50">
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-slate-100">
              <div className="relative">
                <select value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="appearance-none px-4 py-2 pr-8 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contract</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <FileTextIcon size={40} className="text-slate-300 mb-3" />
                      <p className="text-slate-500 font-medium">No contracts found</p>
                      <p className="text-slate-400 text-sm mt-1">{search || statusFilter ? "Try adjusting your search or filters" : "No contracts yet"}</p>
                    </div>
                  </td>
                </tr>
              ) : contracts.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <button onClick={() => navigate(`/billing/contracts/${c.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors">
                      {c.contract_number || `#${c.id}`}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{c.customer_name || c.customer?.name || "—"}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(c.total_value || c.value)}</td>
                  <td className="px-4 py-4"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(c.start_date)}</td>
                  <td className="px-4 py-4 text-slate-500">{formatDate(c.end_date)}</td>
                  <td className="px-4 py-4 text-right">
                    <button onClick={() => navigate(`/billing/contracts/${c.id}`)}
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-violet-600 transition-colors" title="View">
                      <FileText size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex justify-between items-center px-6 py-4 border-t border-slate-100">
            <span className="text-xs text-slate-400">{total} total contract(s)</span>
            <div className="flex gap-1">
              <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">Prev</button>
              {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
                const start = Math.max(1, Math.min(safePage - 5, totalPages - 9));
                const page = start + i;
                if (page > totalPages) return null;
                return (
                  <button key={page} onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1.5 text-xs border rounded-lg transition-colors ${page === safePage ? "bg-violet-600 text-white border-violet-600" : "border-slate-200 hover:bg-slate-50"}`}>{page}</button>
                );
              })}
              <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
                className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>
    </HRPage>
  );
}
