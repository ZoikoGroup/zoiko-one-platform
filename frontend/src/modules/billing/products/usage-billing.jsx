import { useState, useEffect, useCallback } from "react";
import { BarChart3, RefreshCw, AlertCircle, Zap, DollarSign, Activity } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { productApi } from "../../../service/billingService";





const formatCurrency = (v) => v == null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(v);

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
      <p className="text-sm text-red-600 mb-3">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  );
}

export default function UsageBillingPage() {
  const [usageProducts, setUsageProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [usageRes, allRes] = await Promise.allSettled([
        productApi.listUsageBillable(),
        productApi.list({ per_page: 100, type: "usage" }),
      ]);
      if (usageRes.status === "fulfilled") {
        const items = Array.isArray(usageRes.value) ? usageRes.value : usageRes.value?.items || usageRes.value?.data || [];
        setUsageProducts(items);
      }
      if (allRes.status === "fulfilled") {
        const items = Array.isArray(allRes.value) ? allRes.value : allRes.value?.items || allRes.value?.data || [];
        setAllProducts(items);
      }
    } catch (err) {
      setError(err.message || "Failed to load usage data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const mergedProducts = [...new Map(
    [...usageProducts, ...allProducts].map((p) => [p.id, p])
  ).values()];

  const activeUsageProducts = mergedProducts.filter((p) => p.status === "active");
  const totalPotentialRevenue = activeUsageProducts.reduce((s, p) => s + parseFloat(p.price || 0), 0);

  if (loading) {
    return (
      <HRPage title="Usage Billing" subtitle="Manage usage-based billing products">
        <Spinner />
      </HRPage>
    );
  }

  if (error && mergedProducts.length === 0) {
    return (
      <HRPage title="Usage Billing" subtitle="Manage usage-based billing products">
        <ErrorState message={error} onRetry={fetchData} />
      </HRPage>
    );
  }

  return (
    <HRPage title="Usage Billing" subtitle="Manage usage-based billing products">

      <div className="flex items-center justify-end mb-6">
        <button onClick={() => { setRefreshing(true); fetchData(); }} disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Usage Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{mergedProducts.length}</p>
              <p className="text-xs text-gray-400 mt-1">{activeUsageProducts.length} active</p>
            </div>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-amber-100">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Products</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{activeUsageProducts.length}</p>
              <p className="text-xs text-gray-400 mt-1">{mergedProducts.length ? ((activeUsageProducts.length / mergedProducts.length) * 100).toFixed(0) : 0}% of total</p>
            </div>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-emerald-100">
              <Zap className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Base Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalPotentialRevenue)}</p>
              <p className="text-xs text-gray-400 mt-1">Sum of active product prices</p>
            </div>
            <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-blue-100">
              <DollarSign className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-base font-semibold text-slate-800">Usage-Based Products</h3>
        </div>

        {mergedProducts.length === 0 ? (
          <div className="p-6">
            <EmptyState icon={BarChart3} title="No usage-based products" message="Usage-based products will appear here once created." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit / Meter</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Unit Price</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mergedProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                          <Activity className="h-4 w-4 text-amber-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{product.name || "Unnamed"}</p>
                          {product.description && <p className="text-xs text-slate-400 line-clamp-1">{product.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-mono">{product.sku || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {product.unit || product.meter_unit || product.measurement_unit || "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-800">{formatCurrency(product.price)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        product.status === "active" ? "bg-emerald-100 text-emerald-700" :
                        product.status === "inactive" ? "bg-gray-100 text-gray-600" : "bg-slate-100 text-slate-600"
                      }`}>
                        {product.status || "unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Zap size={12} /> {product.is_subscribable ? "Subscribable" : "Pay-as-you-go"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-slate-400">{mergedProducts.length} usage-based product(s)</p>
        </div>
      </div>
    </HRPage>
  );
}
