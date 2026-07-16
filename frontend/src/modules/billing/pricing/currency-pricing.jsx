import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, Search, Plus, RefreshCw, CheckCircle, Clock, AlertCircle,
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { currencyPricingApi, productApi } from "../../../service/billingService";
import { formatDisplayCurrency } from "../../../utils/billing-helpers";
import { getCurrencySelectOptions } from "../../../utils/currency";
import { Spinner, EmptyState, ErrorState } from "../../../components/billing-shared";

const CURRENCY_OPTIONS = getCurrencySelectOptions();

export default function CurrencyPricingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ items: [], total: 0, page: 1, per_page: 20, pages: 0 });
  const [searchTerm, setSearchTerm] = useState("");
  const [currencyFilter, setCurrencyFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ product_id: "", currency: "USD", price: "", cost_price: "", conversion_type: "manual", exchange_rate: "", exchange_rate_date: "", is_active: true });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (page = 1) => {
    setLoading(true); setError(null);
    try {
      const params = { page, per_page: 20 };
      if (searchTerm) params.search_term = searchTerm;
      if (currencyFilter) params.currency = currencyFilter;
      const res = await currencyPricingApi.list(params);
      setData(res);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [searchTerm, currencyFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await currencyPricingApi.create({ ...form, product_id: Number(form.product_id), price: Number(form.price), cost_price: form.cost_price ? Number(form.cost_price) : null, exchange_rate: form.exchange_rate ? Number(form.exchange_rate) : null });
      setShowCreate(false);
      setForm({ product_id: "", currency: "USD", price: "", cost_price: "", conversion_type: "manual", exchange_rate: "", exchange_rate_date: "", is_active: true });
      fetchData();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <HRPage title="Currency Pricing" icon={DollarSign}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input className="pl-9 pr-3 py-2 border rounded-lg text-sm w-48" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="border rounded-lg px-3 py-2 text-sm" value={currencyFilter} onChange={e => setCurrencyFilter(e.target.value)}>
              <option value="">All Currencies</option>
              {CURRENCY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <button onClick={() => fetchData()} className="p-2 border rounded-lg hover:bg-gray-50"><RefreshCw size={16} /></button>
          </div>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"><Plus size={16} /> Add Currency Price</button>
        </div>

        {showCreate && (
          <div className="bg-white border rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold">Add Currency Pricing</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Product ID</label><input type="number" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.product_id} onChange={e => setForm(p => ({ ...p, product_id: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Currency</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>{CURRENCY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Price</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Cost Price</label><input type="number" step="0.01" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.cost_price} onChange={e => setForm(p => ({ ...p, cost_price: e.target.value }))} /></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Conversion Type</label><select className="w-full border rounded-lg px-3 py-2 text-sm" value={form.conversion_type} onChange={e => setForm(p => ({ ...p, conversion_type: e.target.value }))}><option value="manual">Manual</option><option value="live">Live</option><option value="historical">Historical</option></select></div>
              <div><label className="block text-xs font-medium text-gray-500 mb-1">Exchange Rate</label><input type="number" step="0.0001" className="w-full border rounded-lg px-3 py-2 text-sm" value={form.exchange_rate} onChange={e => setForm(p => ({ ...p, exchange_rate: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 border rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm hover:bg-violet-700">{saving ? "Saving..." : "Save"}</button>
            </div>
          </div>
        )}

        {error && <ErrorState message={error} onRetry={() => fetchData()} />}
        {loading ? <Spinner /> : !data.items?.length ? <EmptyState message="No currency pricing found" /> : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                <tr><th className="text-left px-4 py-3">Product ID</th><th className="text-left px-4 py-3">Currency</th><th className="text-right px-4 py-3">Price</th><th className="text-right px-4 py-3">Cost Price</th><th className="text-left px-4 py-3">Conversion</th><th className="text-right px-4 py-3">Rate</th><th className="text-center px-4 py-3">Active</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{item.product_id}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.currency}</td>
                    <td className="px-4 py-3 text-sm text-right">{formatDisplayCurrency(item.price)}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.cost_price ? formatDisplayCurrency(item.cost_price) : "—"}</td>
                    <td className="px-4 py-3 text-sm capitalize">{item.conversion_type}</td>
                    <td className="px-4 py-3 text-sm text-right">{item.exchange_rate ?? "—"}</td>
                    <td className="px-4 py-3 text-center">{item.is_active ? <CheckCircle size={16} className="text-green-500 mx-auto" /> : <Clock size={16} className="text-gray-400 mx-auto" />}</td>
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
