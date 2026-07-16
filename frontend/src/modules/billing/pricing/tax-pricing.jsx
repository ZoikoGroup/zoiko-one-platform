import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, Search, Plus, RefreshCw, CheckCircle, Clock, AlertCircle, Globe, Layers,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { taxPricingApi } from "../../../service/billingService";
import { formatDisplayDate } from "../../../utils/billing-helpers";
import { Spinner, EmptyState, ErrorState } from "../../../components/billing-shared";

const TAX_TYPE_OPTIONS = [
  { value: "vat", label: "VAT" },
  { value: "gst", label: "GST" },
  { value: "sales_tax", label: "Sales Tax" },
  { value: "withholding", label: "Withholding" },
  { value: "service_tax", label: "Service Tax" },
  { value: "customs", label: "Customs" },
  { value: "excise", label: "Excise" },
  { value: "other", label: "Other" },
];

export default function TaxPricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 20, pages: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [taxTypeFilter, setTaxTypeFilter] = useState("");
  const [countryFilter, setCountryFilter] = useState("");

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: 20 };
      if (searchTerm) params.search_term = searchTerm;
      if (taxTypeFilter) params.tax_type = taxTypeFilter;
      if (countryFilter) params.country = countryFilter;
      const res = await taxPricingApi.list(params);
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchTerm, taxTypeFilter, countryFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <HRPage title="Tax Pricing" icon={DollarSign}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48" placeholder="Search tax pricing..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="border rounded-lg px-3 py-2 text-sm" value={taxTypeFilter} onChange={e => setTaxTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TAX_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="border rounded-lg px-3 py-2 text-sm w-32" placeholder="Country" value={countryFilter} onChange={e => setCountryFilter(e.target.value)} />
            <button onClick={() => fetchData()} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw size={16} /></button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate("/billing/pricing/tax-groups")} className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"><Layers size={16} /> Tax Groups</button>
            <button onClick={() => navigate("/billing/pricing/tax/create")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"><Plus size={16} /> Create Tax</button>
          </div>
        </div>

        {error && <ErrorState message={error} onRetry={() => fetchData()} />}
        {loading ? <Spinner /> : !data.items?.length ? <EmptyState message="No tax pricing found" /> : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr><th className="text-left px-4 py-3">Name / Code</th><th className="text-left px-4 py-3">Type</th><th className="text-right px-4 py-3">Rate</th><th className="text-left px-4 py-3">Jurisdiction</th><th className="text-left px-4 py-3">Pricing</th><th className="text-left px-4 py-3">Effective</th><th className="text-center px-4 py-3">Default</th><th className="text-right px-4 py-3">Actions</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3"><div className="font-medium text-sm">{item.name}</div><div className="text-xs text-gray-400">{item.code}</div></td>
                    <td className="px-4 py-3 text-sm capitalize">{item.tax_type}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.rate}%</td>
                    <td className="px-4 py-3 text-sm">{item.country || "—"}{item.region ? ` / ${item.region}` : ""}</td>
                    <td className="px-4 py-3 text-sm capitalize">{item.pricing_type}</td>
                    <td className="px-4 py-3 text-sm">{formatDisplayDate(item.effective_from)}{item.effective_to ? ` — ${formatDisplayDate(item.effective_to)}` : ""}</td>
                    <td className="px-4 py-3 text-center">{item.is_default ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => navigate(`/billing/pricing/tax/${item.id}`)} className="text-violet-600 hover:text-violet-800 text-sm mr-3">View</button>
                      <button onClick={async () => { try { await taxPricingApi.deactivate(item.id); fetchData(); } catch (e) { setError(e.message); } }} className="text-red-500 hover:text-red-700 text-sm">Deactivate</button>
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
