import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, TrendingUp, Package, Box, Receipt, Users, AlertCircle, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts";
import HRPage from "../../../components/HRPage";
import { productApi, invoiceApi, subscriptionApi, pricingApi, taxApi, dashboardApi } from "../../../service/billingService";
import { Spinner, ErrorState, EmptyState } from "../../../components/billing-shared";
import { extractArray } from "../../../utils/billing-helpers";
import { useCurrency } from "../utils/CurrencyContext";

const STATUS_COLORS = {
  active: "#10b981",
  inactive: "#6b7280",
  archived: "#94a3b8",
};

const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
  <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-md transition-shadow min-w-0">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider truncate">{title}</p>
        <p className="text-xl font-bold text-slate-800 mt-2 whitespace-nowrap" title={typeof value === 'string' ? value : String(value ?? "—")}>{value ?? "—"}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-1 truncate">{subtitle}</p>}
      </div>
      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${color} shrink-0`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
    </div>
  </div>
);

export default function ProductsDashboard() {
  const { formatCurrency, baseCurrency } = useCurrency();
  const [refreshing, setRefreshing] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(null);

  const [categories, setCategories] = useState([]);
  const [errorCategories, setErrorCategories] = useState(null);

  const [pricingPlans, setPricingPlans] = useState([]);
  const [errorPricing, setErrorPricing] = useState(null);

  const [taxRates, setTaxRates] = useState([]);
  const [errorTax, setErrorTax] = useState(null);

  const [revenueData, setRevenueData] = useState([]);
  const [errorRevenue, setErrorRevenue] = useState(null);

  const [subscriptionStats, setSubscriptionStats] = useState({
    total: 0, active: 0, paused: 0, past_due: 0, cancelled: 0, expired: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    try {
      setRefreshing(true);
      setErrorProducts(null); setErrorCategories(null); setErrorPricing(null); setErrorTax(null); setErrorRevenue(null);

      const [productsData, categoriesData, pricingData, taxData, subscriptionsData, invoicesData, revenueData] = await Promise.allSettled([
        productApi.list({ per_page: 100, status: "active" }),
        productApi.listCategories({ per_page: 100 }),
        pricingApi.list({ per_page: 100 }),
        taxApi.list({ per_page: 100, tax_type: "both" }),
        subscriptionApi.list({ per_page: 100 }),
        invoiceApi.list({ per_page: 100, status: "paid" }),
        dashboardApi.getMonthlyRevenue(12),
      ]);

      setProducts(extractArray(productsData.status === "fulfilled" ? productsData.value : { items: [] }));
      setCategories(extractArray(categoriesData.status === "fulfilled" ? categoriesData.value : { items: [] }));
      setPricingPlans(extractArray(pricingData.status === "fulfilled" ? pricingData.value : { items: [] }));
      setTaxRates(extractArray(taxData.status === "fulfilled" ? taxData.value : { items: [] }));

      if (revenueData.status === "fulfilled" && revenueData.value) {
        const raw = Array.isArray(revenueData.value) ? revenueData.value : revenueData.value?.monthly_revenue || revenueData.value?.data || revenueData.value?.items || [];
        const mapped = raw.map((r) => ({
          month: r.month || r.label || "",
          revenue: parseFloat(r.revenue || r.amount || r.total || 0),
        })).filter((r) => r.month);
        if (mapped.length > 0) {
          setRevenueData(mapped);
        }
      }

      if (subscriptionsData.status === "fulfilled" && subscriptionsData.value) {
        const subs = extractArray(subscriptionsData.value);
        setSubscriptionStats({
          total: subs.length,
          active: subs.filter(s => s.status === "active").length,
          paused: subs.filter(s => s.status === "paused").length,
          past_due: subs.filter(s => s.status === "past_due").length,
          cancelled: subs.filter(s => s.status === "cancelled").length,
          expired: subs.filter(s => s.status === "expired").length,
        });
      }

      if (productsData.status === "rejected") setErrorProducts(productsData.reason?.message || "Failed to load products");
      if (categoriesData.status === "rejected") setErrorCategories(categoriesData.reason?.message || "Failed to load categories");
      if (pricingData.status === "rejected") setErrorPricing(pricingData.reason?.message || "Failed to load pricing plans");
      if (taxData.status === "rejected") setErrorTax(taxData.reason?.message || "Failed to load tax rates");
      if (revenueData.status === "rejected") setErrorRevenue(revenueData.reason?.message || "Failed to load revenue data");
    } catch (err) {
      setErrorProducts(`Dashboard error: ${err?.message || "Unknown"}`);
    } finally {
      setRefreshing(false);
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const statusCounts = useMemo(() => ({
    active: products.filter(p => p.status === "active").length,
    inactive: products.filter(p => p.status === "inactive").length,
    archived: products.filter(p => p.status === "archived").length,
  }), [products]);

  const categoryChartData = useMemo(() =>
    categories.map((cat, i) => ({
      name: cat.name || cat.category_name || `Category ${i + 1}`,
      value: cat.product_count ?? cat.products_count ?? 0,
      color: `hsl(${(i * 360) / Math.max(categories.length, 1)}, 70%, 50%)`,
    })).filter((c) => c.value > 0),
    [categories]
  );

  const pricingChartData = useMemo(() =>
    pricingPlans.slice(0, 5).map((plan, i) => ({
      name: plan.name || plan.plan_name || `Plan ${i + 1}`,
      price: parseFloat(plan.price || plan.amount || 0),
      color: `hsl(${(i * 360) / Math.max(pricingPlans.length, 1)}, 70%, 50%)`,
    })),
    [pricingPlans]
  );

  const totalRevenue = useMemo(() =>
    revenueData.reduce((sum, r) => sum + r.revenue, 0),
    [revenueData]
  );

  const computedRevenueData = useMemo(() => {
    if (revenueData.length > 0) return revenueData;
    return [];
  }, [revenueData]);

  if (loadingProducts && products.length === 0) {
    return (
      <HRPage title="Products Dashboard" subtitle="Product catalog, categories, pricing plans, and revenue analytics">
        <Spinner />
      </HRPage>
    );
  }

  return (
    <HRPage title="Products Dashboard" subtitle="Product catalog, categories, pricing plans, and revenue analytics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div />
          <button onClick={fetchDashboardData} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Key Metrics</h2>
          <p className="text-sm text-slate-500 mt-1">Overview of products, pricing, and revenue performance.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Total Products" value={products.length} subtitle="Active inventory items" icon={Package} color="bg-violet-500" />
          <StatCard title="Categories" value={categories.length} subtitle="Product categories" icon={Box} color="bg-green-500" />
          <StatCard title="Pricing Plans" value={pricingPlans.length} subtitle="Active pricing models" icon={DollarSign} color="bg-blue-500" />
          <StatCard title="Total Revenue" value={totalRevenue > 0 ? formatCurrency(totalRevenue, baseCurrency) : "—"} subtitle="From subscriptions & invoices" icon={TrendingUp} color="bg-purple-500" />
          <StatCard title="Tax Rates" value={taxRates.length} subtitle="Configured tax rates" icon={Receipt} color="bg-orange-500" />
          <StatCard title="Subscriptions" value={subscriptionStats.total} subtitle={`${subscriptionStats.active} active`} icon={Users} color="bg-emerald-500" />
        </div>

        {errorProducts && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" /> {errorProducts}
            <button onClick={fetchDashboardData} className="ml-auto inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200">
              <RefreshCw className="h-3 w-3" /> Retry
            </button>
          </div>
        )}

        <div>
          <h2 className="text-lg font-semibold text-slate-800">Analytics & Charts</h2>
          <p className="text-sm text-slate-500 mt-1">Product category distribution, pricing analysis, and revenue trends.</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Products by Category</h3>
            {categoryChartData.length === 0 ? (
              <EmptyState icon={Box} title={errorCategories || "No category data"} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryChartData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
                    {categoryChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} products`, "Products"]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Pricing Plan Distribution</h3>
            {pricingChartData.length === 0 ? (
              <EmptyState icon={DollarSign} title={errorPricing || "No pricing data"} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pricingChartData} layout="vertical" margin={{ left: 120 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                  <Tooltip formatter={(v) => formatCurrency(v, baseCurrency)} />
                  <Bar dataKey="price" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Revenue Trend (12 months)</h3>
            {computedRevenueData.length === 0 ? (
              <EmptyState icon={TrendingUp} title={errorRevenue || "No revenue data"} message="Configure products with pricing to see revenue trends." />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={computedRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(v, baseCurrency)} />
                  <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="#c4b5fd" strokeWidth={2} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
            <h3 className="text-sm font-semibold text-slate-800 mb-4">Tax Revenue Summary</h3>
            {taxRates.length === 0 ? (
              <EmptyState icon={Receipt} title={errorTax || "No tax data"} message="Configure tax rates to see summary." />
            ) : (
              <div className="space-y-4">
                {taxRates.slice(0, 5).map((tax, i) => (
                  <div key={tax.id || i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-slate-800">{tax.name || tax.rate_name || `Rate ${i + 1}`}</span>
                      <p className="text-xs text-slate-500">{tax.jurisdiction || tax.jurisdiction_name || "—"}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{tax.rate ? `${(parseFloat(tax.rate) * 100).toFixed(1)}%` : "—"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </HRPage>
  );
}
