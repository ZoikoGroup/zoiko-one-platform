import { useState, useEffect, useCallback } from "react";
import { Download, RefreshCw, AlertCircle, DollarSign, TrendingUp, PieChart as PieChartIcon, BarChart3, Box } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import HRPage from "../../../components/HRPage";
import { productApi, invoiceApi, subscriptionApi, dashboardApi } from "../../../service/billingService";
import { formatCurrency } from "../../../utils/locale";
import { extractArray } from "../../../utils/billing-helpers";
import { Spinner, ErrorState, EmptyState } from "../../../components/billing-shared";
import { downloadJSON } from "../../../utils/export-helpers";

const COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4898", "#14b8a6", "#f97316"];

const TABS = [
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "performance", label: "Performance", icon: TrendingUp },
  { key: "utilization", label: "Utilization", icon: BarChart3 },
  { key: "category", label: "Category", icon: PieChartIcon },
  { key: "usage", label: "Usage", icon: Box },
];

export default function ProductReportsPage() {
  const [activeTab, setActiveTab] = useState("revenue");
  const [refreshing, setRefreshing] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [errorInvoices, setErrorInvoices] = useState(null);

  const [subscriptions, setSubscriptions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [errorSubs, setErrorSubs] = useState(null);

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(false);
  const [errorCats, setErrorCats] = useState(null);

  const [usageProducts, setUsageProducts] = useState([]);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [errorUsage, setErrorUsage] = useState(null);

  const [revenueData, setRevenueData] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [errorRevenue, setErrorRevenue] = useState(null);

  const fetchProducts = useCallback(async () => {
    try { setLoadingProducts(true); setErrorProducts(null); const data = await productApi.list({ per_page: 100 }); setProducts(extractArray(data)); }
    catch (err) { setErrorProducts(err.message || "Failed to load products"); }
    finally { setLoadingProducts(false); }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try { setLoadingInvoices(true); setErrorInvoices(null); const data = await invoiceApi.list({ per_page: 100 }); setInvoices(extractArray(data)); }
    catch (err) { setErrorInvoices(err.message || "Failed to load invoices"); }
    finally { setLoadingInvoices(false); }
  }, []);

  const fetchSubscriptions = useCallback(async () => {
    try { setLoadingSubs(true); setErrorSubs(null); const data = await subscriptionApi.list({ per_page: 100 }); setSubscriptions(extractArray(data)); }
    catch (err) { setErrorSubs(err.message || "Failed to load subscriptions"); }
    finally { setLoadingSubs(false); }
  }, []);

  const fetchCategories = useCallback(async () => {
    try { setLoadingCats(true); setErrorCats(null); const data = await productApi.listCategories({ per_page: 100 }); setCategories(extractArray(data)); }
    catch (err) { setErrorCats(err.message || "Failed to load categories"); }
    finally { setLoadingCats(false); }
  }, []);

  const fetchUsage = useCallback(async () => {
    try { setLoadingUsage(true); setErrorUsage(null); const data = await productApi.listUsageBillable(); setUsageProducts(extractArray(data)); }
    catch (err) { setErrorUsage(err.message || "Failed to load usage products"); }
    finally { setLoadingUsage(false); }
  }, []);

  const fetchRevenue = useCallback(async () => {
    try { setLoadingRevenue(true); setErrorRevenue(null); const data = await dashboardApi.getMonthlyRevenue(12);
      const raw = Array.isArray(data) ? data : data?.data || data?.items || [];
      const mapped = raw.map((r) => ({
        month: r.month || r.label || "",
        revenue: parseFloat(r.revenue || r.amount || r.total || 0),
      })).filter((r) => r.month);
      setRevenueData(mapped);
    }
    catch (err) { setErrorRevenue(err.message || "Failed to load revenue data"); }
    finally { setLoadingRevenue(false); }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([fetchProducts(), fetchInvoices(), fetchSubscriptions(), fetchCategories(), fetchUsage(), fetchRevenue()]);
    setRefreshing(false);
  }, [fetchProducts, fetchInvoices, fetchSubscriptions, fetchCategories, fetchUsage, fetchRevenue]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => { if (activeTab === "revenue") { Promise.allSettled([fetchInvoices(), fetchRevenue()]); } }, [activeTab, fetchInvoices, fetchRevenue]);
  useEffect(() => { if (activeTab === "performance") { fetchInvoices(); } }, [activeTab, fetchInvoices]);
  useEffect(() => { if (activeTab === "utilization") { Promise.allSettled([fetchSubscriptions(), fetchInvoices()]); } }, [activeTab, fetchSubscriptions, fetchInvoices]);
  useEffect(() => { if (activeTab === "category") { Promise.allSettled([fetchCategories(), fetchProducts()]); } }, [activeTab, fetchCategories]);
  useEffect(() => { if (activeTab === "usage") { fetchUsage(); } }, [activeTab, fetchUsage]);

  const productRevenue = invoices.reduce((acc, inv) => {
    const pid = inv.product_id || inv.productId || inv.item_id;
    const pname = inv.product_name || inv.productName || `Product #${pid}`;
    if (!pid) return acc;
    if (!acc[pid]) acc[pid] = { name: pname, revenue: 0, count: 0 };
    acc[pid].revenue += parseFloat(inv.total || inv.amount || 0);
    acc[pid].count += 1;
    return acc;
  }, {});
  const topRevenue = Object.values(productRevenue).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  const statusData = [
    { name: "Active", value: products.filter((p) => p.status === "active").length, color: "#10b981" },
    { name: "Inactive", value: products.filter((p) => p.status === "inactive").length, color: "#6b7280" },
    { name: "Archived", value: products.filter((p) => p.status === "archived").length, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const typeData = [
    { name: "One-Time", value: products.filter((p) => p.type === "one_time").length, color: "#7c3aed" },
    { name: "Service", value: products.filter((p) => p.type === "service").length, color: "#a78bfa" },
    { name: "Usage", value: products.filter((p) => p.type === "usage").length, color: "#f59e0b" },
    { name: "Subscription", value: products.filter((p) => p.type === "subscription").length, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const categoryProductCount = categories.map((c) => ({
    name: c.name,
    count: c.product_count || c.products_count || 0,
    color: COLORS[categories.indexOf(c) % COLORS.length],
  })).filter((c) => c.count > 0);

  const productTypeInvoiceCount = invoices.reduce((acc, inv) => {
    const type = inv.product_type || inv.type || "unknown";
    if (!acc[type]) acc[type] = { name: type, count: 0, revenue: 0 };
    acc[type].count += 1;
    acc[type].revenue += parseFloat(inv.total || inv.amount || 0);
    return acc;
  }, {});

  const renderTabNav = () => (
    <nav className="flex gap-0 border-b border-gray-200 overflow-x-auto">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.key ? "border-violet-600 text-violet-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}>
            <Icon className="h-4 w-4" /> {tab.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <HRPage title="Product Reports" subtitle="Product analytics and reporting">

      <div className="flex items-center justify-between mb-6">
        {renderTabNav()}
        <button onClick={refreshAll} disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {activeTab === "revenue" && (
        <div className="space-y-6">
          {loadingInvoices && loadingRevenue ? <Spinner /> : (errorInvoices || errorRevenue) && topRevenue.length === 0 && revenueData.length === 0 ? (
            <ErrorState message={errorInvoices || errorRevenue} onRetry={() => { fetchInvoices(); fetchRevenue(); }} />
          ) : topRevenue.length === 0 && revenueData.length === 0 ? (
            <EmptyState icon={DollarSign} title="No revenue data" message="Invoice and dashboard data will appear here once available." />
          ) : (
            <>
              {revenueData.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Trend (12 months)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={revenueData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v) => formatCurrency(v, "USD")} />
                      <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="#c4b5fd" strokeWidth={2} name="Revenue" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
              {topRevenue.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Revenue by Product</h3>
                    <button onClick={() => downloadJSON(topRevenue, "product-revenue.json")}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                      <Download className="h-3.5 w-3.5" /> Export
                    </button>
                  </div>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={topRevenue} layout="vertical" margin={{ left: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip formatter={(v) => formatCurrency(v, "USD")} />
                      <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {topRevenue.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Revenue Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Product</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Revenue</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Invoices</th>
                          <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Avg Invoice</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topRevenue.map((p, i) => (
                          <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                            <td className="py-3 px-3 font-medium text-gray-900">{p.name}</td>
                            <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(p.revenue, "USD")}</td>
                            <td className="py-3 px-3 text-right text-gray-500">{p.count}</td>
                            <td className="py-3 px-3 text-right text-gray-500">{p.count ? formatCurrency(p.revenue / p.count, "USD") : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "performance" && (
        <div className="space-y-6">
          {loadingProducts ? <Spinner /> : errorProducts ? <ErrorState message={errorProducts} onRetry={fetchProducts} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{products.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{products.filter((p) => p.status === "active").length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Invoiced Products</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{Object.keys(productRevenue).length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Revenue/Product</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(Object.keys(productRevenue).length ? topRevenue.reduce((s, p) => s + p.revenue, 0) / Math.max(Object.keys(productRevenue).length, 1) : 0, "USD")}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Status Distribution</h3>
                  {statusData.length === 0 ? <EmptyState icon={TrendingUp} title="No data" /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Product Type Breakdown</h3>
                  {typeData.length === 0 ? <EmptyState icon={PieChartIcon} title="No data" /> : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={typeData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "utilization" && (
        <div className="space-y-6">
          {loadingInvoices && loadingSubs ? <Spinner /> : errorInvoices ? <ErrorState message={errorInvoices} onRetry={() => { fetchInvoices(); fetchSubscriptions(); }} /> : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{subscriptions.length}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Invoices</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{invoices.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoice Volume by Product Type</h3>
                {Object.keys(productTypeInvoiceCount).length === 0 ? (
                  <EmptyState icon={BarChart3} title="No invoice data" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={Object.values(productTypeInvoiceCount)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Invoices" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Subscription Status Breakdown</h3>
                {subscriptions.length === 0 ? (
                  <EmptyState icon={Box} title="No subscriptions" />
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={[
                        { name: "Active", value: subscriptions.filter((s) => s.status === "active").length, color: "#10b981" },
                        { name: "Paused", value: subscriptions.filter((s) => s.status === "paused").length, color: "#f59e0b" },
                        { name: "Cancelled", value: subscriptions.filter((s) => s.status === "cancelled").length, color: "#ef4444" },
                      ].filter((d) => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {[{ name: "Active", color: "#10b981" }, { name: "Paused", color: "#f59e0b" }, { name: "Cancelled", color: "#ef4444" }].filter((_, i) => [subscriptions.filter((s) => s.status === "active").length, subscriptions.filter((s) => s.status === "paused").length, subscriptions.filter((s) => s.status === "cancelled").length][i] > 0).map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "category" && (
        <div className="space-y-6">
          {loadingCats ? <Spinner /> : errorCats ? <ErrorState message={errorCats} onRetry={fetchCategories} /> : categoryProductCount.length === 0 ? (
            <EmptyState icon={PieChartIcon} title="No category data" message="Categories with products will appear here." />
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Products by Category</h3>
                  <button onClick={() => downloadJSON(categoryProductCount, "products-by-category.json")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={categoryProductCount}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {categoryProductCount.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Category Details</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Category</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Products</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryProductCount.map((c, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium text-gray-900">{c.name}</td>
                          <td className="py-3 px-3 text-right text-gray-500">{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "usage" && (
        <div className="space-y-6">
          {loadingUsage ? <Spinner /> : errorUsage ? <ErrorState message={errorUsage} onRetry={fetchUsage} /> : usageProducts.length === 0 ? (
            <EmptyState icon={Box} title="No usage products" message="Usage-based products will appear here once created." />
          ) : (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">Usage-Based Products</h3>
                  <button onClick={() => downloadJSON(usageProducts, "usage-products.json")}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Product</th>
                        <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Unit</th>
                        <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Price</th>
                        <th className="text-center py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageProducts.map((p) => (
                        <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-3 px-3 font-medium text-gray-900">{p.name}</td>
                          <td className="py-3 px-3 text-gray-500">{p.unit || p.meter_unit || "—"}</td>
                          <td className="py-3 px-3 text-right font-medium text-gray-900">{formatCurrency(p.price || 0, "USD")}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                            }`}>{p.status}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </HRPage>
  );
}
