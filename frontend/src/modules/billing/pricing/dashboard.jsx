import { useState, useEffect, useCallback } from "react";
import { DollarSign, RefreshCw, Tag, Layers, Package, TrendingUp, BarChart3, AlertTriangle, Calendar, Users } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList,
} from "recharts";
import { useNavigate } from "react-router-dom";
import HRPage from "../../../components/HRPage";
import { pricingApi, productApi, subscriptionApi } from "../../../service/billingService";
import { extractArray, formatDisplayCurrency } from "../../../utils/billing-helpers";
import { Spinner, ErrorState, EmptyState } from "../../../components/billing-shared";

const COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4898"];

function StatCard({ title, value, icon: Icon, color, subtitle, href, onClick }) {
  const Wrapper = ({ children }) => {
    if (onClick) return <button onClick={onClick} className="text-left w-full">{children}</button>;
    return <>{children}</>;
  };
  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 min-w-0 overflow-hidden ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}>
      <Wrapper>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 whitespace-nowrap" title={typeof value === 'string' ? value : undefined}>{value}</p>
            {subtitle && <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${color || "bg-violet-100"}`}>
            <Icon className="h-5 w-5 text-violet-600" />
          </div>
        </div>
      </Wrapper>
    </div>
  );
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(dateStr) {
  const d = new Date(dateStr);
  const n = new Date();
  return Math.ceil((d - n) / (1000 * 60 * 60 * 24));
}

export default function PricingDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [tierCount, setTierCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [planRes, prodRes, subRes] = await Promise.allSettled([
        pricingApi.list({ per_page: 200 }),
        productApi.list({ per_page: 200 }),
        subscriptionApi.list({ per_page: 100 }),
      ]);
      const plansData = planRes.status === "fulfilled" ? extractArray(planRes.value) : [];
      setPlans(plansData);
      if (prodRes.status === "fulfilled") setProducts(extractArray(prodRes.value));
      if (subRes.status === "fulfilled") setSubscriptions(extractArray(subRes.value));

      let totalTiers = 0;
      const tierResults = await Promise.allSettled(plansData.slice(0, 20).map((p) => pricingApi.listTiers(p.id)));
      tierResults.forEach((r) => {
        if (r.status === "fulfilled") {
          const tiers = extractArray(r.value);
          totalTiers += tiers.length;
        }
      });
      setTierCount(totalTiers);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activePlans = plans.filter((p) => p.status === "active");
  const today = todayStr();
  const expiredPlans = plans.filter((p) => p.effective_to && p.effective_to < today);
  const upcomingExpirations = plans.filter((p) => p.effective_to && p.effective_to >= today && daysFromNow(p.effective_to) <= 30 && daysFromNow(p.effective_to) >= 0);
  const productsWithPlans = new Set(plans.map((p) => p.product_id));
  const productsWithoutPlans = products.filter((p) => !productsWithPlans.has(p.id) || !productsWithPlans.has(String(p.id)));

  const avgPrice = activePlans.length ? activePlans.reduce((s, p) => s + parseFloat(p.price || 0), 0) / activePlans.length : 0;
  const subRevenue = subscriptions.reduce((s, sub) => s + parseFloat(sub.amount || sub.price || 0), 0);
  const revenueCoveragePct = products.length ? ((productsWithPlans.size / products.length) * 100).toFixed(1) : "0.0";

  const statusData = [
    { name: "Active", value: activePlans.length, color: "#10b981" },
    { name: "Inactive", value: plans.filter((p) => p.status === "inactive").length, color: "#6b7280" },
  ].filter((d) => d.value > 0);

  const freqData = [
    { name: "One-Time", value: plans.filter((p) => p.billing_frequency === "one_time").length, color: "#7c3aed" },
    { name: "Monthly", value: plans.filter((p) => p.billing_frequency === "monthly").length, color: "#a78bfa" },
    { name: "Quarterly", value: plans.filter((p) => p.billing_frequency === "quarterly").length, color: "#f59e0b" },
    { name: "Semi-Annual", value: plans.filter((p) => p.billing_frequency === "semi_annual").length, color: "#06b6d4" },
    { name: "Annual", value: plans.filter((p) => p.billing_frequency === "annual").length, color: "#10b981" },
  ].filter((d) => d.value > 0);

  const priceDistribution = plans.filter((p) => p.price != null).map((p) => ({
    name: p.name,
    price: parseFloat(p.price) || 0,
    fill: COLORS[plans.indexOf(p) % COLORS.length],
  })).sort((a, b) => b.price - a.price).slice(0, 10);

  const recentPlans = [...plans].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 5);
  const updatedPlans = [...plans].sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)).slice(0, 5);

  const productPlanCount = products.map((p) => ({
    name: p.name,
    count: plans.filter((pl) => pl.product_id === p.id || pl.product?.id === p.id).length,
    color: COLORS[products.indexOf(p) % COLORS.length],
  })).filter((p) => p.count > 0).sort((a, b) => b.count - a.count).slice(0, 10);

  if (loading) {
    return (
      <HRPage title="Pricing Dashboard" subtitle="Pricing overview and KPIs">
        <Spinner />
      </HRPage>
    );
  }

  if (error && plans.length === 0) {
    return (
      <HRPage title="Pricing Dashboard" subtitle="Pricing overview and KPIs">
        <ErrorState message={error} onRetry={fetchData} />
      </HRPage>
    );
  }

  return (
    <HRPage title="Pricing Dashboard" subtitle="Pricing overview and KPIs">
      <div className="flex items-center justify-end mb-6">
        <button onClick={() => { setRefreshing(true); fetchData(); }} disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Plans" value={activePlans.length} icon={Layers} color="bg-emerald-100"
          subtitle={`${plans.length ? ((activePlans.length / plans.length) * 100).toFixed(1) : 0}% of ${plans.length} total`} />
        <StatCard title="Expired Plans" value={expiredPlans.length} icon={AlertTriangle} color="bg-red-100"
          subtitle={expiredPlans.length > 0 ? "Past effective_to date" : "No expired plans"} />
        <StatCard title="Upcoming Expirations" value={upcomingExpirations.length} icon={Calendar} color="bg-amber-100"
          subtitle={upcomingExpirations.length > 0 ? "Expiring within 30 days" : "No upcoming expirations"} onClick={() => navigate("/billing/pricing")} />
        <StatCard title="Products w/o Plans" value={productsWithoutPlans.length} icon={Package} color="bg-orange-100"
          subtitle={`${products.length ? ((productsWithoutPlans.length / products.length) * 100).toFixed(0) : 0}% of products`} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Plans" value={plans.length} icon={Tag} color="bg-violet-100" subtitle="All pricing plans" />
        <StatCard title="Total Tiers" value={tierCount} icon={BarChart3} color="bg-blue-100" subtitle="Across all tiered plans" />
        <StatCard title="Avg Plan Price" value={formatDisplayCurrency(avgPrice)} icon={DollarSign} color="bg-cyan-100" subtitle="Active plans only" />
        <StatCard title="Revenue Coverage" value={`${revenueCoveragePct}%`} icon={TrendingUp} color="bg-teal-100"
          subtitle={`${productsWithPlans.size} of ${products.length} products have pricing`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans by Status</h3>
          {statusData.length === 0 ? <EmptyState icon={Tag} title="No data" /> : (
            <ResponsiveContainer width="100%" height={300}>
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
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans by Frequency</h3>
          {freqData.length === 0 ? <EmptyState icon={Layers} title="No data" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={freqData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {freqData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {priceDistribution.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top 10 Plans by Price</h3>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={priceDistribution} layout="vertical" margin={{ top: 10, right: 60, left: 140, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatDisplayCurrency(v)} />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={130}
                tickFormatter={(val) => (val && val.length > 18 ? `${val.substring(0, 16)}...` : val)}
              />
              <Tooltip
                formatter={(v) => [formatDisplayCurrency(v), "Price"]}
                labelFormatter={(label) => `Plan: ${label}`}
              />
              <Bar dataKey="price" radius={[0, 4, 4, 0]}>
                {priceDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                <LabelList
                  dataKey="price"
                  position="right"
                  formatter={(v) => formatDisplayCurrency(v)}
                  style={{ fontSize: "11px", fontWeight: "600", fill: "#475569" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {productPlanCount.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans by Product</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={productPlanCount}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {productPlanCount.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recent Plans</h3>
          {recentPlans.length === 0 ? <EmptyState icon={Tag} title="No plans" message="Plans will appear here once created." /> : (
            <div className="space-y-3">
              {recentPlans.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.billing_frequency?.replace(/_/g, " ")}</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">{formatDisplayCurrency(p.price, p.currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Recently Updated Plans</h3>
          {updatedPlans.length === 0 ? <EmptyState icon={Tag} title="No updates" /> : (
            <div className="space-y-3">
              {updatedPlans.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.updated_at ? new Date(p.updated_at).toLocaleDateString() : "—"}</p>
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </HRPage>
  );
}
