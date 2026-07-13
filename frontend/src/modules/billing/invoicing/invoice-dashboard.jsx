import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Receipt, TrendingUp, TrendingDown, FileText, Clock, AlertCircle,
  CheckCircle, RefreshCw, Download, Filter, DollarSign, Activity,
  BarChart3, Wallet, ChevronRight, Send, Eye, Ban, Plus, Calendar
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { invoiceApi } from "../../../service/billingService";
import { extractArray, formatDisplayCurrency, formatDisplayDate } from "../../../utils/billing-helpers";

const CHART_COLORS = ["#7c3aed", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#8b5cf6", "#06b6d4"];
const CARD_GRADIENTS = [
  "from-violet-500 to-purple-500",
  "from-emerald-500 to-green-500",
  "from-amber-500 to-orange-500",
  "from-blue-500 to-cyan-500",
  "from-red-500 to-rose-500",
  "from-pink-500 to-rose-500",
  "from-indigo-500 to-blue-500",
  "from-teal-500 to-green-500",
];

class ChartErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200" role="alert">
          <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
          <div className="text-red-500 text-sm font-medium">Unable to render chart</div>
        </div>
      );
    }
    return this.props.children;
  }
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 animate-pulse" aria-hidden="true">
      <div className="flex justify-between items-center">
        <div className="flex-1">
          <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
          <div className="h-7 bg-slate-200 rounded w-32 mb-2" />
          <div className="h-3 bg-slate-200 rounded w-20" />
        </div>
        <div className="h-14 w-14 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 animate-pulse" aria-hidden="true">
      <div className="h-5 bg-slate-200 rounded w-40 mb-6" />
      <div className="h-64 bg-slate-100 rounded-lg" />
    </div>
  );
}

function EnterpriseStatCard({ title, value, icon: Icon, color, trend, trendValue, href, onClick }) {
  const navigate = useNavigate();
  const handleClick = onClick || (href ? () => navigate(href) : undefined);
  return (
    <div
      className={`bg-white border border-slate-200 rounded-3xl p-5 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${href || onClick ? "cursor-pointer hover:border-violet-400/40 hover:shadow-lg" : ""}`}
      onClick={handleClick}
      role={href || onClick ? "button" : undefined}
      tabIndex={href || onClick ? 0 : undefined}
      onKeyDown={handleClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
      aria-label={title}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-extrabold text-slate-800 mt-1.5 truncate">{value}</h3>
          {trend && (
            <div className={`flex items-center mt-1.5 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
              {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="ml-1">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-r ${color} text-white flex items-center justify-center shrink-0`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className, action }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${className || ""}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function EmptyStateWidget({ message, icon: Icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-xl border border-slate-200">
      {Icon && <Icon className="h-10 w-10 text-slate-300 mb-3" />}
      <p className="text-slate-400 text-sm font-medium">{message || "No data available"}</p>
    </div>
  );
}

function exportToCsv(data, filename) {
  const flatten = (obj, prefix = "") => {
    let result = {};
    for (const [key, val] of Object.entries(obj)) {
      const k = prefix ? `${prefix}_${key}` : key;
      if (val !== null && typeof val === "object" && !Array.isArray(val)) {
        Object.assign(result, flatten(val, k));
      } else {
        result[k] = Array.isArray(val) ? JSON.stringify(val) : val;
      }
    }
    return result;
  };
  const items = Array.isArray(data) ? data : [data];
  const flat = items.map(flatten);
  if (flat.length === 0) return;
  const headers = [...new Set(flat.flatMap(Object.keys))];
  const csv = [headers.join(","), ...flat.map((row) => headers.map((h) => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function InvoiceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeRange, setTimeRange] = useState("month");
  const mountedRef = useRef(true);
  const loadingRef = useRef(true);

  const [dashboard, setDashboard] = useState({
    stats: null,
    invoiceTrend: [],
    revenueTrend: [],
    collectionTrend: [],
    statusDist: [],
    monthlyRevenue: [],
    recentActivity: [],
    overdueInvoices: [],
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      if (!loadingRef.current) setRefreshing(true);

      const results = await Promise.allSettled([
        invoiceApi.getEnterpriseDashboard(),
        invoiceApi.getInvoiceTrend(12),
        invoiceApi.getRevenueTrend(12),
        invoiceApi.getPaymentCollectionTrend(12),
        invoiceApi.getStatusDistribution(),
        invoiceApi.getMonthlyRevenue(12),
        invoiceApi.getRecentActivity(10),
        invoiceApi.list({ per_page: 5, status: "overdue" }),
      ]);

      const [statsRes, trendRes, revRes, collRes, distRes, monthlyRes, activityRes, overdueRes] = results;
      const safeVal = (r, transform) => r.status === "fulfilled" ? (transform ? transform(r.value) : r.value) : null;

      if (mountedRef.current) {
        setDashboard({
          stats: safeVal(statsRes),
          invoiceTrend: safeVal(trendRes, extractArray) || [],
          revenueTrend: safeVal(revRes, extractArray) || [],
          collectionTrend: safeVal(collRes, extractArray) || [],
          statusDist: safeVal(distRes, extractArray) || [],
          monthlyRevenue: safeVal(monthlyRes, extractArray) || [],
          recentActivity: safeVal(activityRes, extractArray) || [],
          overdueInvoices: safeVal(overdueRes, (v) => v?.items || extractArray(v)) || [],
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) setError("Failed to load invoice dashboard data.");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    loadingRef.current = true;
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => { mountedRef.current = false; clearInterval(interval); };
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleExport = useCallback((format) => {
    const prefix = `invoice-dashboard-${new Date().toISOString().split("T")[0]}`;
    if (format === "csv") {
      exportToCsv(dashboard.stats || {}, prefix);
    } else if (format === "json") {
      const blob = new Blob([JSON.stringify(dashboard, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${prefix}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
    } else if (format === "pdf") {
      window.print();
    }
  }, [dashboard]);

  const d = dashboard;
  const stats = d.stats || {};

  const kpis = useMemo(() => ({
    totalInvoices: stats.total_invoices || 0,
    draft: stats.status_counts?.draft || 0,
    sent: stats.status_counts?.sent || 0,
    paid: stats.status_counts?.paid || 0,
    overdue: stats.status_counts?.overdue || 0,
    cancelled: stats.status_counts?.cancelled || 0,
    partiallyPaid: stats.status_counts?.partially_paid || 0,
    refunded: stats.status_counts?.refunded || 0,
    outstandingAmount: stats.outstanding_amount || 0,
    collectedAmount: stats.collected_amount || 0,
    thisMonthRevenue: stats.this_month_revenue || 0,
    avgPaymentDays: stats.average_payment_days || 0,
    collectionRate: stats.collection_rate || 0,
    totalTaxCollected: stats.total_tax_collected || 0,
  }), [stats]);

  if (loading) {
    return (
      <div className="space-y-8" aria-label="Loading invoice dashboard">
        <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-100 p-8">
          <h1 className="text-4xl font-extrabold text-slate-800">Invoice Dashboard</h1>
          <p className="mt-2 text-slate-600 text-lg">Enterprise invoicing overview</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className="grid xl:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
        <div className="grid xl:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error && !d.stats) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-100 p-8">
          <h1 className="text-4xl font-extrabold text-slate-800">Invoice Dashboard</h1>
          <p className="mt-2 text-slate-600 text-lg">Enterprise invoicing overview</p>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
          <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
          <button onClick={handleRefresh}
            className="px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2">
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const statusData = d.statusDist.length > 0 ? d.statusDist : [
    { name: "Draft", value: kpis.draft, color: "#6b7280" },
    { name: "Sent", value: kpis.sent, color: "#3b82f6" },
    { name: "Paid", value: kpis.paid, color: "#10b981" },
    { name: "Overdue", value: kpis.overdue, color: "#ef4444" },
  ].filter((s) => s.value > 0);

  return (
    <div className="space-y-8">
      <div className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-100 p-8 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800">Invoice Dashboard</h1>
            <p className="mt-2 text-slate-600 text-lg max-w-3xl">
              Track invoices, payments, and collections in real-time.
            </p>
          </div>
          <div className="text-right text-sm text-slate-500 no-print">
            <p>Last Updated</p>
            <p className="font-medium text-slate-700">{lastUpdated.toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50" aria-label="Refresh">
            <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
          </button>
          <div className="relative">
            <button onClick={() => handleExport("csv")}
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 transition-colors" aria-label="Export CSV">
              <Download size={18} />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["week", "month", "quarter", "year"].map((range) => (
            <button key={range} onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                timeRange === range ? "bg-violet-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}>
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <EnterpriseStatCard title="Total Invoices" value={kpis.totalInvoices.toLocaleString()} icon={FileText} color={CARD_GRADIENTS[0]} href="/billing/invoices" />
        <EnterpriseStatCard title="Draft" value={kpis.draft.toLocaleString()} icon={Clock} color={CARD_GRADIENTS[7]} href="/billing/invoices?status=draft" />
        <EnterpriseStatCard title="Sent" value={kpis.sent.toLocaleString()} icon={Send} color={CARD_GRADIENTS[3]} href="/billing/invoices?status=sent" />
        <EnterpriseStatCard title="Paid" value={kpis.paid.toLocaleString()} icon={CheckCircle} color={CARD_GRADIENTS[1]} href="/billing/invoices?status=paid" />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <EnterpriseStatCard title="Overdue" value={kpis.overdue.toLocaleString()} icon={AlertCircle} color={CARD_GRADIENTS[4]} href="/billing/invoices?status=overdue" />
        <EnterpriseStatCard title="Cancelled" value={kpis.cancelled.toLocaleString()} icon={Ban} color={CARD_GRADIENTS[5]} />
        <EnterpriseStatCard title="Partially Paid" value={kpis.partiallyPaid.toLocaleString()} icon={Activity} color={CARD_GRADIENTS[6]} />
        <EnterpriseStatCard title="Refunded" value={kpis.refunded.toLocaleString()} icon={TrendingDown} color={CARD_GRADIENTS[2]} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <EnterpriseStatCard title="Outstanding Amount" value={formatDisplayCurrency(kpis.outstandingAmount)} icon={Wallet} color={CARD_GRADIENTS[4]} href="/billing/invoices" />
        <EnterpriseStatCard title="Collected Amount" value={formatDisplayCurrency(kpis.collectedAmount)} icon={DollarSign} color={CARD_GRADIENTS[1]} />
        <EnterpriseStatCard title="This Month Revenue" value={formatDisplayCurrency(kpis.thisMonthRevenue)} icon={TrendingUp} color={CARD_GRADIENTS[0]} />
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <EnterpriseStatCard title="Avg Payment Days" value={`${kpis.avgPaymentDays} days`} icon={Calendar} color={CARD_GRADIENTS[3]} />
        <EnterpriseStatCard title="Collection Rate" value={`${kpis.collectionRate}%`} icon={Activity} color={CARD_GRADIENTS[1]} />
        <EnterpriseStatCard title="Tax Collected" value={formatDisplayCurrency(kpis.totalTaxCollected)} icon={DollarSign} color={CARD_GRADIENTS[2]} />
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <ChartCard title="Invoice Trend">
          <ChartErrorBoundary>
            {d.invoiceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={d.invoiceTrend}>
                  <defs>
                    <linearGradient id="invTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" name="Invoices" stroke="#7c3aed" strokeWidth={2} fill="url(#invTrendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No invoice trend data" icon={BarChart3} />
            )}
          </ChartErrorBoundary>
        </ChartCard>

        <ChartCard title="Revenue Trend">
          <ChartErrorBoundary>
            {d.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={d.revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatDisplayCurrency(v)} />
                  <Area type="monotone" dataKey="revenue" name="Collected" stroke="#10b981" strokeWidth={2} fill="url(#revGrad)" />
                  <Line type="monotone" dataKey="invoiced" name="Invoiced" stroke="#7c3aed" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No revenue trend data" icon={TrendingUp} />
            )}
          </ChartErrorBoundary>
        </ChartCard>
      </div>

      <div className="grid xl:grid-cols-2 gap-6">
        <ChartCard title="Status Distribution">
          <ChartErrorBoundary>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                    <Tooltip />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No status data" icon={PieChart} />
            )}
          </ChartErrorBoundary>
        </ChartCard>

        <ChartCard title="Payment Collection Trend">
          <ChartErrorBoundary>
            {d.collectionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={d.collectionTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `${v}%`} />
                  <Line type="monotone" dataKey="rate" name="Collection Rate" stroke="#10b981" strokeWidth={3} dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No collection data" icon={Activity} />
            )}
          </ChartErrorBoundary>
        </ChartCard>
      </div>

      <ChartCard title="Monthly Revenue">
        <ChartErrorBoundary>
          {d.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={d.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatDisplayCurrency(v)} />
                <Bar dataKey="total" name="Invoiced" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyStateWidget message="No monthly revenue data" icon={DollarSign} />
          )}
        </ChartErrorBoundary>
      </ChartCard>

      <div className="grid xl:grid-cols-2 gap-6">
        <ChartCard title="Recent Activity" action={
          <button onClick={() => navigate("/billing/invoicing/reports")} className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
            View All <ChevronRight size={14} />
          </button>
        }>
          {d.recentActivity.length > 0 ? (
            <div className="space-y-3">
              {d.recentActivity.map((act) => (
                <div key={act.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                    act.to_status === "paid" ? "bg-green-100 text-green-600" :
                    act.to_status === "sent" ? "bg-blue-100 text-blue-600" :
                    act.to_status === "overdue" ? "bg-red-100 text-red-600" :
                    "bg-slate-100 text-slate-600"
                  }`}>
                    {act.to_status === "paid" ? <CheckCircle size={16} /> :
                     act.to_status === "sent" ? <Send size={16} /> :
                     <Clock size={16} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{act.action}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Invoice #{act.invoice_id} &middot; {act.created_at ? new Date(act.created_at).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyStateWidget message="No recent activity" icon={Activity} />
          )}
        </ChartCard>

        <ChartCard title="Overdue Invoices" action={
          <button onClick={() => navigate("/billing/invoices?status=overdue")} className="text-sm font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1">
            View All <ChevronRight size={14} />
          </button>
        }>
          {d.overdueInvoices.length > 0 ? (
            <div className="space-y-3">
              {d.overdueInvoices.map((inv) => (
                <button key={inv.id} onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                  className="w-full flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors text-left">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{inv.invoice_number || `#${inv.id}`}</p>
                    <p className="text-xs text-slate-500 mt-0.5">Due {formatDisplayDate(inv.due_date)}</p>
                  </div>
                  <span className="text-sm font-bold text-red-600 shrink-0">{formatDisplayCurrency(inv.total_amount || inv.balance_due)}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <CheckCircle className="h-10 w-10 text-green-300 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No overdue invoices</p>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
