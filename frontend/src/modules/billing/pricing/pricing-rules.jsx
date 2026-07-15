import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ListFilter, Search, Plus, RefreshCw, CheckCircle, Clock, AlertCircle, Calendar, DollarSign, Percent, Layers,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { pricingRuleApi } from "../../../service/billingService";
import { formatDisplayDate } from "../../../utils/billing-helpers";
import { Spinner, EmptyState, ErrorState } from "../../../components/billing-shared";

const RULE_TYPE_OPTIONS = [
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "fixed_discount", label: "Fixed Discount" },
  { value: "tier_pricing", label: "Tier Pricing" },
  { value: "volume_pricing", label: "Volume Pricing" },
  { value: "quantity_break", label: "Quantity Break" },
  { value: "customer_pricing", label: "Customer Pricing" },
  { value: "regional_pricing", label: "Regional Pricing" },
  { value: "date_based_pricing", label: "Date Based" },
  { value: "buy_get", label: "Buy X Get Y" },
  { value: "bundle_pricing", label: "Bundle Pricing" },
  { value: "loyalty_pricing", label: "Loyalty" },
];

const SCOPE_OPTIONS = [
  { value: "global", label: "Global" },
  { value: "product", label: "Product" },
  { value: "product_category", label: "Category" },
  { value: "customer", label: "Customer" },
  { value: "customer_group", label: "Customer Group" },
  { value: "region", label: "Region" },
  { value: "organization", label: "Organization" },
];

function StatusBadge({ status }) {
  const colors = { draft: "bg-gray-100 text-gray-600", active: "bg-green-100 text-green-700", inactive: "bg-gray-100 text-gray-700", expired: "bg-red-100 text-red-600", scheduled: "bg-blue-100 text-blue-600" };
  return <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${colors[status] || "bg-gray-100 text-gray-700"}`}>{status || "unknown"}</span>;
}

export default function PricingRulesPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 20, pages: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [ruleTypeFilter, setRuleTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: 20 };
      if (searchTerm) params.search_term = searchTerm;
      if (ruleTypeFilter) params.rule_type = ruleTypeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await pricingRuleApi.list(params);
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchTerm, ruleTypeFilter, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <HRPage title="Pricing Rules" icon={ListFilter}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48" placeholder="Search rules..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="border rounded-lg px-3 py-2 text-sm" value={ruleTypeFilter} onChange={e => setRuleTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {RULE_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select className="border rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
              <option value="scheduled">Scheduled</option>
            </select>
            <button onClick={() => fetchData()} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw size={16} /></button>
          </div>
          <button onClick={() => navigate("/billing/pricing/rules/create")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"><Plus size={16} /> Create Rule</button>
        </div>

        {error && <ErrorState message={error} onRetry={() => fetchData()} />}
        {loading ? <Spinner /> : !data.items?.length ? <EmptyState message="No pricing rules found" /> : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr><th className="text-left px-4 py-3">Name / Code</th><th className="text-left px-4 py-3">Type</th><th className="text-left px-4 py-3">Scope</th><th className="text-center px-4 py-3">Priority</th><th className="text-left px-4 py-3">Status</th><th className="text-left px-4 py-3">Effective</th><th className="text-right px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-sm">{item.name}</div><div className="text-xs text-gray-400">{item.code}</div></td>
                    <td className="px-4 py-3 text-sm capitalize">{item.rule_type?.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-sm capitalize">{item.scope}</td>
                    <td className="px-4 py-3 text-center text-sm">{item.priority}</td>
                    <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                    <td className="px-4 py-3 text-sm">{formatDisplayDate(item.effective_from)}{item.effective_to ? ` — ${formatDisplayDate(item.effective_to)}` : ""}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/billing/pricing/rules/${item.id}`)} className="text-violet-600 hover:text-violet-800 text-sm mr-3">View</button>
                      <button onClick={async () => { try { await pricingRuleApi.deactivate(item.id); fetchData(); } catch (e) { setError(e.message); } }} className="text-red-500 hover:text-red-700 text-sm">Deactivate</button>
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
