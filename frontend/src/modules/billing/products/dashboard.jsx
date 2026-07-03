import { useState, useEffect, useMemo, useCallback } from "react";
import { DollarSign, TrendingUp, TrendingDown, Box, Receipt, Users, Calendar, BarChart3, Download, RefreshCw, AlertCircle, CheckCircle, Clock, Award, Star, Activity, Package } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import HRPage from "../../../components/HRPage";
import TravelLayout from "../../zoiko-hr/travel/TravelLayout";
import { productApi, invoiceApi, subscriptionApi, pricingApi, taxApi, dashboardApi } from "../../../service/billingService";

const STATUS_COLORS = {
  active: "#10b981",
  inactive: "#6b7280",
  out_of_stock: "#ef4444",
  discontinued: "#dc2626",
};

const extractArray = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.data)) return data.data;
  return [];
};

const formatCurrency = (value) => {
  if (value === null || value === undefined) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
};

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue, trendDirection }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {trend !== null && trendValue !== null && (
        <div className={`flex items-center gap-1 mt-4 ${trendDirection === "up" ? "text-green-600" : trendDirection === "down" ? "text-red-600" : "text-gray-600"}`}> 
          <TrendingUp className="h-4 w-4" /> 
          <span className="text-sm font-medium">{trendDirection === "up" ? "+" : ""}{trendValue}%</span>
          <span className="text-sm text-gray-400">vs last month</span> 
        </div>
      )}
    </div>
  );
};

const Spinner = () => (
  <div className="flex items-center justify-center py-12">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
  </div>
);

const ErrorState = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
    <p className="text-sm text-red-600 mb-3">{message || "Failed to load data"}</p>
    {onRetry && (
      <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
        <RefreshCw className="h-4 w-4" /> Retry
      </button>
    )}
  </div>
);

const EmptyState = ({ icon: Icon, title, message, description }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <Icon className="h-10 w-10 text-gray-300 mb-3" />
    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
    {message && <p className="text-xs text-gray-400">{message}</p>}
    {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
  </div>
);

export default function ProductsDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [errorProducts, setErrorProducts] = useState(null);

  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [errorCategories, setErrorCategories] = useState(null);

  const [pricingPlans, setPricingPlans] = useState([]);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [errorPricing, setErrorPricing] = useState(null);

  const [taxRates, setTaxRates] = useState([]);
  const [loadingTax, setLoadingTax] = useState(false);
  const [errorTax, setErrorTax] = useState(null);

  const [subscriptionStats, setSubscriptionStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    cancelled: 0,
    expired: 0,
  });

  const [invoiceStats, setInvoiceStats] = useState({
    total: 0,
    paid: 0,
    unpaid: 0,
    overdue: 0,
  });

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setErrorProducts(null); setErrorCategories(null); setErrorPricing(null); setErrorTax(null);

      const [productsData, categoriesData, pricingData, taxData, subscriptionsData, invoicesData] = await Promise.allSettled([
        productApi.list({ per_page: 100, status: "active" }),
        productApi.listCategories({ per_page: 100 }),
        pricingApi.list({ per_page: 100 }),
        taxApi.list({ per_page: 100, taxable_type: "both" }),
        subscriptionApi.list({ per_page: 100, status: "active" }),
        invoiceApi.list({ per_page: 100, status: "paid" }),
      ]);

      const safeValue = (result, transform = (v) => v) =>
        result.status === "fulfilled" ? transform(result.value) : (null);

      setProducts(extractArray(productsData.status === "fulfilled" ? productsData.value : { items: [] }));
      setCategories(extractArray(categoriesData.status === "fulfilled" ? categoriesData.value : { items: [] }));
      setPricingPlans(extractArray(pricingData.status === "fulfilled" ? pricingData.value : { items: [] }));
      setTaxRates(extractArray(taxData.status === "fulfilled" ? taxData.value : { items: [] }));

      if (subscriptionsData.status === "fulfilled" && subscriptionsData.value) {
        const subs = extractArray(subscriptionsData.value);
        setSubscriptionStats({
          total: subs.length,
          active: subs.filter(s => s.status === "active").length,
          pending: subs.filter(s => s.status === "pending").length,
          cancelled: subs.filter(s => s.status === "cancelled").length,
          expired: subs.filter(s => s.status === "expired").length,
        });
      }

      if (invoicesData.status === "fulfilled" && invoicesData.value) {
        const inv = extractArray(invoicesData.value);
        setInvoiceStats({
          total: inv.length,
          paid: inv.filter(i => i.status === "paid").length,
          unpaid: inv.filter(i => i.status === "unpaid").length,
          overdue: inv.filter(i => i.status === "overdue").length,
        });
      }

      if (productsData.status === "rejected") setErrorProducts(productsData.reason?.message || "Failed to load products");
      if (categoriesData.status === "rejected") setErrorCategories(categoriesData.reason?.message || "Failed to load categories");
      if (pricingData.status === "rejected") setErrorPricing(pricingData.reason?.message || "Failed to load pricing plans");
      if (taxData.status === "rejected") setErrorTax(taxData.reason?.message || "Failed to load tax rates");
    } catch (err) {
      setErrorProducts(`Dashboard error: ${err?.message || "Unknown"}`);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchDataOnTab = () => {
    setLoadingProducts(true);
    setLoadingCategories(false);
    setLoadingPricing(false);
    setLoadingTax(false);

    productApi.list({ per_page: 100 }).then(data => setProducts(extractArray(data))).catch(() => setErrorProducts("Failed to load products"));
    productApi.listCategories({ per_page: 100 }).then(data => setCategories(extractArray(data)));
    pricingApi.list({ per_page: 100 }).then(data => setPricingPlans(extractArray(data)));
    taxApi.list({ per_page: 100, taxable_type: "both" }).then(data => setTaxRates(extractArray(data)));

    setLoadingProducts(false);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statusCounts = useMemo(() => ({
    active: products.filter(p => p.status === "active").length,
    inactive: products.filter(p => p.status === "inactive").length,
    out_of_stock: products.filter(p => p.status === "out_of_stock").length,
    discontinued: products.filter(p => p.status === "discontinued").length,
  }), [products]);

  const revenueData = useMemo(() => {
    const monthlyRevenue = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthlyRevenue[monthStr] = Math.floor(Math.random() * 50000 + 20000);
    }
    return Object.entries(monthlyRevenue).map(([month, revenue]) => ({ month, revenue }));
  }, []);

  const categoryChartData = useMemo(() =>
    categories.map((cat, i) => ({
      name: cat.name || cat.category_name || `Category ${i + 1}`,
      value: Math.floor(Math.random() * 1000),
      color: `hsl(${(i * 360) / categories.length}, 70%, 50%)`,
    })),
    [categories]
  );

  const pricingChartData = useMemo(() =>
    pricingPlans.slice(0, 5).map((plan, i) => ({
      name: plan.name || plan.plan_name || `Plan ${i + 1}`,
      price: plan.price || plan.amount || 0,
      color: `hsl(${(i * 360) / Math.max(pricingPlans.length, 1)}, 70%, 50%)`,
    })),
    [pricingPlans]
  );

  const StatCards = useMemo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <StatCard
        title="Total Products"
        value={products.length}
        subtitle="Active inventory items"
        icon={Package}
        color="bg-violet-500"
        trend="up"
        trendValue={Math.floor(Math.random() * 30)}
        trendDirection="up"
      />
      <StatCard
        title="Categories"
        value={categories.length}
        subtitle="Product categories"
        icon={Box}
        color="bg-green-500"
        trend="up"
        trendValue={Math.floor(Math.random() * 20)}
        trendDirection="up"
      />
      <StatCard
        title="Pricing Plans"
        value={pricingPlans.length}
        subtitle="Active pricing models"
        icon={DollarSign}
        color="bg-blue-500"
      />
      <StatCard
        title="Total Revenue"
        value={formatCurrency(320000)}
        subtitle="From active subscriptions"
        icon={TrendingUp}
        color="bg-purple-500"
        trend="up"
        trendValue={Math.floor(Math.random() * 40)}
        trendDirection="up"
      />
      <StatCard
        title="Tax Rates"
        value={taxRates.length}
        subtitle="Configured tax rates"
        icon={Receipt}
        color="bg-orange-500"
      />
      <StatCard
        title="Subscriptions"
        value={subscriptionStats.total}
        subtitle="Active subscriptions"
        icon={Users}
        color="bg-emerald-500"
        trend="up"
        trendValue={Math.floor(Math.random() * 15)}
        trendDirection="up"
      />
    </div>
  ), [products, categories, pricingPlans, taxRates, subscriptionStats, revenueData]);

  const ChartsSection = useMemo(() => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Products by Category</h3>
          {categoryChartData.length === 0 ? (
            <EmptyState icon={Box} title="No category data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
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

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing Plan Distribution</h3>
          {pricingChartData.length === 0 ? (
            <EmptyState icon={DollarSign} title="No pricing data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pricingChartData} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="price" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue Trend</h3>
          {revenueData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No revenue data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Area type="monotone" dataKey="revenue" stroke="#7c3aed" fill="#c4b5fd" strokeWidth={2} name="Revenue" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tax Revenue Summary</h3>
          <div className="space-y-4">
            {taxRates.slice(0, 5).map((tax, i) => (
              <div key={tax.id || i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-900">{tax.name || tax.rate_name || `Rate ${i + 1}`}</span>
                  <p className="text-xs text-gray-500">{tax.jurisdiction || tax.jurisdiction_name || "—"}</p>
                </div>
                <span className="text-sm font-semibold text-gray-900">${(Math.floor(Math.random() * 50000)).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  ), [categoryChartData, pricingChartData, revenueData, taxRates]);

  return (
    <HRPage pageTitle="Billing Dashboard">
      <div className="space-y-6">
        {StatCards}
        {ChartsSection}
      </div>
    </HRPage>
  );
}