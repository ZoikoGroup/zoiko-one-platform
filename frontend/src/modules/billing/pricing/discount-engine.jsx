import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Percent, Search, Plus, RefreshCw, CheckCircle, Clock, AlertCircle, Calendar, DollarSign, Users,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { discountApi } from "../../../service/billingService";
import { formatDisplayDate, formatDisplayCurrency } from "../../../utils/billing-helpers";
import { getCurrencySelectOptions } from "../../../utils/currency";
import { Spinner, EmptyState, ErrorState } from "../../../components/billing-shared";

const DISCOUNT_TYPE_OPTIONS = [
  { value: "coupon", label: "Coupon" },
  { value: "promotion", label: "Promotion" },
  { value: "campaign", label: "Campaign" },
  { value: "seasonal", label: "Seasonal" },
  { value: "manual_override", label: "Manual Override" },
  { value: "automatic", label: "Automatic" },
  { value: "loyalty", label: "Loyalty" },
  { value: "referral", label: "Referral" },
  { value: "bulk", label: "Bulk" },
  { value: "early_bird", label: "Early Bird" },
];

function StatusBadge({ status }) {
  const colors = { draft: "bg-gray-100 text-gray-600", active: "bg-green-100 text-green-700", paused: "bg-amber-100 text-amber-700", expired: "bg-red-100 text-red-600", exhausted: "bg-orange-100 text-orange-600", cancelled: "bg-gray-100 text-gray-500", pending_approval: "bg-blue-100 text-blue-600" };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status?.replace("_", " ") || "unknown"}</span>;
}

export default function DiscountEnginePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 20, pages: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: 20 };
      if (searchTerm) params.search_term = searchTerm;
      if (typeFilter) params.discount_type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await discountApi.list(params);
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchTerm, typeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <HRPage title="Discount Engine" icon={Percent}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48" placeholder="Search discounts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="border rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {DISCOUNT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
              <option value="exhausted">Exhausted</option>
            </select>
            <button onClick={() => fetchData()} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw size={16} /></button>
          </div>
          <button onClick={() => navigate("/billing/pricing/discounts/create")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"><Plus size={16} /> Create Discount</button>
        </div>

        {error && <ErrorState message={error} onRetry={() => fetchData()} />}
        {loading ? <Spinner /> : !data.items?.length ? <EmptyState message="No discounts found" /> : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr><th className="text-left px-4 py-3">Name / Code</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Value</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Valid Period</th><th className="text-center px-4 py-3">Used</th><th className="text-right px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-sm">{item.name}</div>{item.code && <div className="text-xs text-gray-400">{item.code}</div>}</td>
                    <td className="px-4 py-3 text-sm capitalize">{item.discount_type?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-sm">{item.value_type === "percentage" ? `${item.discount_value}%` : formatDisplayCurrency(item.discount_value)}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-sm">{formatDisplayDate(item.valid_from)}{item.valid_to ? ` — ${formatDisplayDate(item.valid_to)}` : ""}</td>
                    <td className="px-4 py-3 text-center text-sm">{item.usage_count ?? 0}{item.usage_limit ? `/${item.usage_limit}` : ""}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/billing/pricing/discounts/${item.id}`)} className="text-violet-600 hover:text-violet-800 text-sm mr-3">View</button>
                      <button onClick={async () => { try { await discountApi.deactivate(item.id); fetchData(); } catch (e) { setError(e.message); } }} className="text-red-500 hover:text-red-700 text-sm">Deactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.pages > 1 && (
          <div className="flex justify-center gap-2">
            {Array.from({ length: data.pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => fetchData(p)} className={`px-3 py-1 rounded text-sm ${p === data.page ? "bg-violet-600 text-white" : "border hover:bg-gray-50"}`}>{p}</button>
            ))}
          </div>
        )}
      </div>
    </HRPage>
  );
}
