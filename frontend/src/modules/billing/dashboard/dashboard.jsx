import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Users, FileSignature, UserCheck, FileText, Clock,
  BarChart3, RefreshCw, Download, Filter, AlertCircle, CheckCircle, Activity,
  Wallet, ChevronRight
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  dashboardApi, invoiceApi, paymentApi, customerApi, subscriptionApi, contractApi, collectionApi, auditApi
} from "../../../service/billingService";
import { extractArray, formatDisplayCurrency, formatCompactCurrency } from "../../../utils/billing-helpers";
import { getCurrencySymbol } from "../../../utils/currency";
import { useCurrency } from "../utils/CurrencyContext";

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50/50 rounded-xl border border-slate-100 p-6 text-center">
          <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-slate-500 text-sm font-medium">No chart data available</p>
          <p className="text-slate-400 text-xs mt-1">Data will populate automatically when available</p>
        </div>
      );
    }
    return this.props.children;
  }
}

class WidgetErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch() {
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]" role="region">
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Activity className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-slate-600 text-sm font-medium">{this.props.title || "Section"} Summary</p>
            <p className="text-slate-400 text-xs mt-1">No updates recorded for this period</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const formatNumber = (value) => {
  if (value === null || value === undefined) return "0";
  const num = typeof value === "string" ? Number(value) : value;
  if (isNaN(num)) return "0";
  if (Number.isInteger(num)) return num.toLocaleString();
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
};

const CHART_COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];

const CARD_COLORS = [
  "from-violet-500 to-purple-500",
  "from-blue-500 to-cyan-500",
  "from-amber-500 to-orange-500",
  "from-green-500 to-emerald-500",
  "from-red-500 to-rose-500",
  "from-indigo-500 to-blue-500",
  "from-teal-500 to-green-500",
  "from-pink-500 to-rose-500",
  "from-cyan-500 to-teal-500",
  "from-purple-500 to-pink-500",
];

function SkeletonCard({ className }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-5 animate-pulse ${className}`} aria-hidden="true">
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="h-3 bg-slate-200 rounded w-24 mb-2" />
          <div className="h-6 bg-slate-200 rounded w-32 mb-1" />
          <div className="h-3 bg-slate-200 rounded w-20" />
        </div>
        <div className="h-11 w-11 rounded-xl bg-slate-200 shrink-0" />
      </div>
    </div>
  );
}

function SkeletonChart({ className }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-6 animate-pulse ${className}`} aria-hidden="true">
      <div className="h-5 bg-slate-200 rounded w-40 mb-6" />
      <div className="h-64 bg-slate-100 rounded-lg" />
    </div>
  );
}

function SkeletonTable({ className }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-6 animate-pulse ${className}`} aria-hidden="true">
      <div className="h-5 bg-slate-200 rounded w-40 mb-6" />
      <div className="space-y-3">
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
        <div className="h-8 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend, trendValue, href, onClick }) {
  const navigate = useNavigate();
  const handleClick = onClick || (href ? () => navigate(href) : undefined);
  return (
    <div
      className={`bg-white border border-slate-200 rounded-3xl p-6 h-full transition-all shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${href || onClick ? "cursor-pointer hover:border-[#FF7A00]/40 hover:shadow-lg" : ""}`}
      onClick={handleClick}
      role={href || onClick ? "button" : undefined}
      tabIndex={href || onClick ? 0 : undefined}
      onKeyDown={handleClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
      aria-label={title}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider truncate">{title}</p>
          <h2 className="text-xl lg:text-2xl font-extrabold text-slate-800 mt-2 leading-tight whitespace-nowrap dark:text-white">
            <span className="whitespace-nowrap inline-block overflow-hidden text-ellipsis">{value}</span>
          </h2>
          {trend && (
            <div className={`flex items-center mt-2 text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>
              {trend === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="ml-1 truncate">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`h-11 w-11 rounded-xl bg-gradient-to-r ${color} text-white flex items-center justify-center shrink-0 ml-3`}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, progress, color, href, onClick }) {
  const navigate = useNavigate();
  const handleClick = onClick || (href ? () => navigate(href) : undefined);
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-6 h-full transition-all ${href || onClick ? "cursor-pointer hover:shadow-lg hover:border-[#FF7A00]/40" : ""}`}
      onClick={handleClick}
      role={href || onClick ? "button" : undefined}
      tabIndex={href || onClick ? 0 : undefined}
      onKeyDown={handleClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } } : undefined}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-slate-500 text-sm font-medium truncate">{title}</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1 leading-tight whitespace-nowrap dark:text-white">
            <span className="whitespace-nowrap inline-block overflow-hidden text-ellipsis">{value}</span>
          </h3>
          <p className="text-slate-400 text-xs mt-1 truncate">{subtitle}</p>
        </div>
        <div className={`h-10 w-10 rounded-xl bg-gradient-to-r ${color} text-white flex items-center justify-center shrink-0 ml-3`}>
          <Activity size={20} />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-1000`} style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartCard({ title, children, className, action }) {
  return (
    <div className={`bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">{title}</h2>
        {action && <div className="text-sm text-[#FF7A00] hover:text-[#FF5500] cursor-pointer font-medium">{action}</div>}
      </div>
      {children}
    </div>
  );
}

function EmptyStateWidget({ title, message, icon: Icon, ctaText, ctaHref, onCtaClick }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-[260px] py-8 px-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 text-center">
      <div className="h-12 w-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 shadow-xs">
        {Icon ? <Icon className="h-6 w-6 text-slate-400" /> : <FileText className="h-6 w-6 text-slate-400" />}
      </div>
      <p className="text-slate-800 text-base font-bold mb-1">{title || "No invoices found"}</p>
      <p className="text-slate-500 text-xs font-normal max-w-xs leading-relaxed mb-4">
        {message || "There are no invoices for the selected period."}
      </p>
      {(ctaText || ctaHref || onCtaClick) && (
        <button
          onClick={onCtaClick || (() => navigate(ctaHref || "/billing/invoices/new"))}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#FF7A00] hover:bg-[#FF5500] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
        >
          {ctaText || "Create Invoice"}
        </button>
      )}
    </div>
  );
}

function DataTable({ columns, data, emptyMessage, maxRows }) {
  const rows = maxRows ? data.slice(0, maxRows) : data;
  return (
    <div className="overflow-x-auto">
      {rows.length > 0 ? (
        <table className="w-full" role="table">
          <thead>
            <tr className="bg-slate-50">
              {columns.map((col) => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id ?? idx} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-700">{col.render ? col.render(row) : row[col.key] ?? "—"}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-xl">
          <FileText className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-slate-400 text-sm">{emptyMessage || "No data available"}</p>
        </div>
      )}
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

function exportToJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function ZoikoBillingModule() {
  const navigate = useNavigate();
  const { baseCurrency, currencySymbol, formatCurrency: ctxFormatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [timeRange, setTimeRange] = useState("month");
  const [showFilters, setShowFilters] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(true);
  const timeRangeRef = useRef(timeRange);
  const requestIdRef = useRef(0);

  const RANGE_TO_MONTHS = { week: 1, month: 3, quarter: 3, year: 12 };

  useEffect(() => { timeRangeRef.current = timeRange; }, [timeRange]);

  const [dashboardData, setDashboardData] = useState({
    full: null,
    kpis: null,
    revenue: [],
    invoices: [],
    payments: [],
    customers: [],
    activeSubscriptions: [],
    activeContracts: [],
    expiringContracts: [],
    agingBuckets: [],
    auditLogs: [],
    invoiceStats: null,
    outstandingTotal: null,
    totalCollected: null,
    paymentTrend: [],
  });

  const fetchDashboardData = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    try {
      setError(null);
      if (!loadingRef.current) setRefreshing(true);

      const period = timeRangeRef.current;
      const results = await Promise.allSettled([
        dashboardApi.getFull(period),
        dashboardApi.getKPIs(period),
        dashboardApi.getMonthlyRevenue(RANGE_TO_MONTHS[period] || 12, period),
        dashboardApi.getPaymentTrend(period),
        invoiceApi.list({ per_page: 5 }),
        paymentApi.list({ per_page: 5 }),
        customerApi.list({ per_page: 5 }),
        subscriptionApi.listActive(),
        contractApi.listActive(),
        invoiceApi.getDashboardStats(period),
        invoiceApi.getOutstandingTotal(),
        paymentApi.getTotalCollected(),
        collectionApi.getAgingBuckets(),
        contractApi.listExpiring(30),
        auditApi.list({ per_page: 10 }),
      ]);

      if (currentRequestId !== requestIdRef.current) return;

      const [fullResult, kpisResult, revenueResult, paymentTrendResult, invoicesResult, paymentsResult, customersResult,
        subscriptionsResult, contractsResult, invoiceStatsResult, outstandingResult,
        totalCollectedResult, agingResult, expiringResult, auditResult] = results;

      const safeValue = (result, transform = (v) => v) =>
        result.status === "fulfilled" ? transform(result.value) : null;

      const kpisData = safeValue(kpisResult);
      const revData = safeValue(revenueResult, extractArray) || [];
      const ptData = safeValue(paymentTrendResult, v => v?.payment_trend) || [];
      if (mountedRef.current) {
        setDashboardData({
          full: safeValue(fullResult),
          kpis: kpisData,
          revenue: revData,
          paymentTrend: ptData,
          invoices: safeValue(invoicesResult, extractArray) || [],
          payments: safeValue(paymentsResult, extractArray) || [],
          customers: safeValue(customersResult, extractArray) || [],
          activeSubscriptions: safeValue(subscriptionsResult, extractArray) || [],
          activeContracts: safeValue(contractsResult, extractArray) || [],
          invoiceStats: safeValue(invoiceStatsResult),
          outstandingTotal: safeValue(outstandingResult),
          totalCollected: safeValue(totalCollectedResult),
          agingBuckets: safeValue(agingResult, extractArray) || [],
          expiringContracts: safeValue(expiringResult, extractArray) || [],
          auditLogs: safeValue(auditResult, extractArray) || [],
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) setError("Failed to load dashboard data. Please try again.");
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
    fetchDashboardData();
    const interval = setInterval(() => { fetchDashboardData(); }, 60000);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchDashboardData]);

  useEffect(() => {
    if (!loadingRef.current) {
      setRefreshing(true);
      fetchDashboardData();
    }
  }, [timeRange, fetchDashboardData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleExport = useCallback((format) => {
    const prefix = `billing-dashboard-${new Date().toISOString().split("T")[0]}`;
    if (format === "csv") {
      exportToCsv({
        kpis: dashboardData.kpis,
        invoiceStats: dashboardData.invoiceStats,
        outstandingTotal: dashboardData.outstandingTotal,
        totalCollected: dashboardData.totalCollected,
      }, prefix);
    } else if (format === "json") {
      exportToJson(dashboardData, prefix);
    } else if (format === "pdf") {
      window.print();
    }
    setShowExportMenu(false);
  }, [dashboardData]);

  const d = dashboardData;

  const customerMap = useMemo(() => {
    const map = {};
    d.customers.forEach((c) => {
      const name = c.display_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || `Customer #${c.id}`;
      map[c.id] = name;
    });
    return map;
  }, [d.customers]);

  const getCustomerName = useCallback((customerId) => {
    return customerMap[customerId] || `Customer #${customerId}`;
  }, [customerMap]);

  const kpis = useMemo(() => {
    const full = d.full || {};
    const kpi = d.kpis || {};
    const stats = d.invoiceStats || {};
    const totalRev = kpi.total_revenue ?? full.total_revenue ?? 0;
    const totalInv = kpi.total_invoices ?? stats.total_invoices ?? full.total_invoices ?? d.invoices.length;
    const collections = kpi.collections ?? 0;
    const revData = d.revenue;
    let monthlyGrowth = kpi.monthly_growth ?? full.monthly_growth ?? 0;
    if (monthlyGrowth === 0 && revData.length >= 2) {
      const last = revData[revData.length - 1]?.revenue ?? 0;
      const prev = revData[revData.length - 2]?.revenue ?? 0;
      if (prev > 0) monthlyGrowth = ((last - prev) / prev) * 100;
    }
    return {
      totalRevenue: totalRev,
      monthlyRevenue: kpi.monthly_revenue ?? full.monthly_revenue ?? 0,
      outstandingAmount: kpi.outstanding_amount ?? d.outstandingTotal?.total_outstanding ?? full.outstanding_amount ?? 0,
      paidAmount: kpi.paid_amount ?? stats.paid_amount ?? full.paid_amount ?? 0,
      overdueAmount: kpi.overdue_amount ?? stats.overdue_amount ?? full.overdue_amount ?? 0,
      activeCustomers: kpi.active_customers ?? full.total_customers ?? d.customers.length,
      activeContracts: d.activeContracts.length,
      activeSubscriptions: kpi.active_subscriptions ?? full.active_subscriptions ?? d.activeSubscriptions.length,
      totalInvoices: totalInv,
      pendingPayments: kpi.pending_payments ?? 0,
      avgInvoiceValue: totalInv > 0 ? totalRev / totalInv : 0,
      collectionRate: totalRev > 0 ? Math.min(100, (collections / totalRev) * 100) : totalRev === 0 && collections > 0 ? 100 : 0,
      monthlyGrowth: monthlyGrowth,
      revenueRecognition: kpi.revenue_recognition ?? totalRev,
    };
  }, [d]);

  const renderSkeletonLoading = () => (
    <div className="space-y-8" aria-label="Loading dashboard">
      <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 animate-pulse">
        <div className="h-10 bg-slate-200 rounded-lg w-48" />
        <div className="h-10 bg-slate-200 rounded-lg w-64" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className="grid xl:grid-cols-2 gap-6">
        <SkeletonTable />
        <SkeletonTable />
      </div>
      <div className="grid xl:grid-cols-3 gap-6">
        <SkeletonTable />
        <SkeletonTable />
        <SkeletonTable />
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
        <AlertCircle size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
      <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
      <button onClick={handleRefresh}
        className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2">
        <RefreshCw size={18} />
        Try Again
      </button>
    </div>
  );

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="h-16 w-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
        <FileText size={32} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2">No data available</h3>
      <p className="text-slate-600 mb-6 text-center max-w-md">The billing data is currently unavailable. Please check back later.</p>
      <button onClick={handleRefresh}
        className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2">
        <RefreshCw size={18} />
        Refresh Data
      </button>
    </div>
  );

  const revenueChartData = useMemo(() => {
    const raw = d.revenue.length > 0 ? d.revenue : [];
    if (d.full?.revenue_trend && d.full.revenue_trend.length > 0) return d.full.revenue_trend;
    return raw;
  }, [d]);

  const invoiceStatusData = useMemo(() => {
    const stats = d.invoiceStats || {};
    const summary = d.full?.invoice_summary || {};
    const totalPaid = summary.paid_count ?? stats.paid_count ?? stats.paid ?? 0;
    const totalSent = summary.sent_count ?? stats.sent_count ?? 0;
    const totalOverdue = summary.overdue_count ?? stats.overdue_count ?? stats.overdue ?? 0;
    const totalDraft = summary.draft_count ?? stats.draft_count ?? stats.draft ?? 0;
    return [
      { name: "Paid", value: totalPaid, color: "#10b981" },
      { name: "Sent", value: totalSent, color: "#f59e0b" },
      { name: "Overdue", value: totalOverdue, color: "#ef4444" },
      { name: "Draft", value: totalDraft, color: "#6b7280" },
    ].filter((d) => d.value > 0);
  }, [d]);

  const subscriptionChartData = useMemo(() => {
    const data = d.activeSubscriptions.length > 0 ? d.activeSubscriptions : [];
    const grouped = data.reduce((acc, sub) => {
      const key = sub.plan_name || `Plan #${sub.plan_id}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [d]);

  const agingData = useMemo(() => {
    const data = d.agingBuckets.length > 0 ? d.agingBuckets : [];
    if (d.full?.aging_summary) return d.full.aging_summary;
    return data;
  }, [d]);

  const quickOverviewItems = useMemo(() => [
    { label: "Total Revenue", value: formatCompactCurrency(kpis.totalRevenue, baseCurrency), icon: DollarSign, color: "bg-violet-100 text-violet-600", href: "/billing" },
    { label: "Active Subscriptions", value: formatNumber(kpis.activeSubscriptions), icon: UserCheck, color: "bg-green-100 text-green-600", href: "/billing/subscriptions" },
    { label: "Collection Rate", value: `${kpis.collectionRate.toFixed(2)}%`, icon: Activity, color: "bg-blue-100 text-blue-600" },
    { label: "Pending Payments", value: formatNumber(kpis.pendingPayments), icon: Clock, color: "bg-amber-100 text-amber-600", href: "/billing/payments" },
  ], [kpis, baseCurrency]);

  const invoiceColumns = useMemo(() => [
    { key: "id", label: "Invoice", render: (r) => r.invoice_number || `#${r.id}` },
    { key: "customer_name", label: "Customer", render: (r) => getCustomerName(r.customer_id) },
    { key: "total", label: "Amount", render: (r) => formatDisplayCurrency(r.total_amount || r.total || r.amount, baseCurrency) },
    { key: "status", label: "Status", render: (r) => (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        r.status === "paid" || r.status === "cleared" ? "bg-green-100 text-green-700" :
        r.status === "overdue" ? "bg-red-100 text-red-700" :
        r.status === "pending" || r.status === "draft" ? "bg-amber-100 text-amber-700" :
        "bg-slate-100 text-slate-700"
      }`}>{r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "\u2014"}</span>
    )},
  ], [baseCurrency, getCustomerName]);

  const paymentColumns = useMemo(() => [
    { key: "id", label: "Transaction", render: (r) => r.payment_number || `#${r.id}` },
    { key: "customer_name", label: "Customer", render: (r) => getCustomerName(r.customer_id) },
    { key: "amount", label: "Amount", render: (r) => formatDisplayCurrency(r.amount, baseCurrency) },
    { key: "method", label: "Method", render: (r) => r.method || r.payment_method || "—" },
    { key: "status", label: "Status", render: (r) => (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        r.status === "completed" || r.status === "cleared" ? "bg-green-100 text-green-700" :
        r.status === "pending" ? "bg-amber-100 text-amber-700" :
        r.status === "failed" ? "bg-red-100 text-red-700" :
        "bg-slate-100 text-slate-700"
      }`}>{r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "\u2014"}</span>
    )},
  ], [baseCurrency, getCustomerName]);

  const customerColumns = useMemo(() => [
    { key: "name", label: "Name", render: (r) => r.display_name || [r.first_name, r.last_name].filter(Boolean).join(" ") || r.company_name || "—" },
    { key: "email", label: "Email", render: (r) => r.email || "—" },
    { key: "status", label: "Status", render: (r) => {
      const s = r.status || "active";
      return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        s === "active" ? "bg-green-100 text-green-700" :
        s === "suspended" ? "bg-amber-100 text-amber-700" :
        "bg-slate-100 text-slate-700"
      }`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
    ); }},
  ], []);

  const activityColumns = useMemo(() => [
    { key: "action", label: "Activity", render: (r) => {
      const raw = r.action || r.event || r.description || "\u2014";
      if (raw === "\u2014") return raw;
      const entity = (r.entity_type || r.resource_type || "").replace(/BillingConfiguration/i, "Billing Configuration");
      const entityId = r.entity_id || r.resource_id || "";
      let text = raw.replace(/_/g, " ");

      if (/^(approve|create|send|update|cancel|delete|pay|void)\s+/i.test(text)) {
        const parts = text.split(/\s+/);
        const verb = parts[0].toLowerCase();
        let pastVerb = verb + "d";
        if (verb === "approve") pastVerb = "Approved";
        else if (verb === "create") pastVerb = "Created";
        else if (verb === "send") pastVerb = "Sent";
        else if (verb === "update") pastVerb = "Updated";
        else if (verb === "cancel") pastVerb = "Cancelled";
        else if (verb === "delete") pastVerb = "Deleted";
        else if (verb === "pay") pastVerb = "Paid";
        else if (verb === "void") pastVerb = "Voided";

        const targetEntity = entity ? entity : parts.slice(1).join(" ");
        const idStr = entityId ? ` #${entityId}` : "";
        return (
          <span className="font-medium text-slate-800">
            {targetEntity}{idStr} <span className="text-slate-500 font-normal">{pastVerb}</span>
          </span>
        );
      }

      return <span className="font-medium text-slate-800">{text.charAt(0).toUpperCase() + text.slice(1)}</span>;
    }},
    { key: "user", label: "Actor", render: (r) => {
      const name = r.changed_by || r.user || r.actor || "System";
      return <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">{name}</span>;
    }},
    { key: "created_at", label: "Time", render: (r) => {
      if (!r.created_at) return <span className="text-slate-400 text-xs">Today</span>;
      const date = new Date(r.created_at);
      if (isNaN(date.getTime())) return <span className="text-slate-400 text-xs">Today</span>;
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHrs = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      let relative;
      if (diffMins < 1) relative = "Just now";
      else if (diffMins < 60) relative = `${diffMins} min ago`;
      else if (diffHrs < 24) relative = `${diffHrs}h ago`;
      else if (diffDays === 1) relative = "Yesterday";
      else if (diffDays < 7) relative = `${diffDays} days ago`;
      else relative = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return <span title={date.toLocaleString()} className="text-slate-500 text-xs font-medium whitespace-nowrap">{relative}</span>;
    }},
  ], []);

  const renewalColumns = useMemo(() => [
    { key: "customer_name", label: "Customer", render: (r) => getCustomerName(r.customer_id) },
    { key: "end_date", label: "Expires", render: (r) => r.end_date ? new Date(r.end_date).toLocaleDateString() : "—" },
    { key: "value", label: "Value", render: (r) => formatDisplayCurrency(r.value || r.amount || r.total, baseCurrency) },
  ], [baseCurrency]);

  if (loading) {
    return (
      <div className="bg-transparent text-slate-800 p-6 font-sans min-h-screen">
        <div className="mb-6">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] animate-pulse">
            <div className="h-8 bg-slate-200 rounded w-48 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-80" />
          </div>
        </div>
        {renderSkeletonLoading()}
      </div>
    );
  }

  if (error && !d.full && !d.kpis) {
    return (
      <div className="bg-transparent text-slate-800 p-6 font-sans min-h-screen">
        <div className="mb-6">
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
            <h1 className="text-2xl font-extrabold text-slate-900">Billing Dashboard</h1>
          </div>
        </div>
        {renderErrorState()}
      </div>
    );
  }

  const hasData = d.full || d.kpis || d.invoices.length > 0 || d.payments.length > 0;

  return (
    <div className="bg-transparent text-slate-800 p-6 font-sans min-h-screen">
      <style>{`@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }`}</style>

      <div className="mb-6">
        <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white flex items-center justify-center shadow-sm">
                  <BarChart3 size={22} />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight dark:text-white">Billing Dashboard</h1>
                  <p className="text-slate-500 text-sm mt-0.5 dark:text-slate-400">
                    Monitor invoices, revenue, payments and subscriptions in real-time.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 no-print">
              <div className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
                {["week", "month", "quarter", "year"].map((range) => (
                  <button key={range} onClick={() => setTimeRange(range)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      timeRange === range ? "bg-white text-[#FF7A00] shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}>
                    {range === "week" ? "Week" : range === "month" ? "Month" : range === "quarter" ? "Quarter" : "Year"}
                  </button>
                ))}
              </div>

              <div className="h-6 w-px bg-slate-200 hidden sm:block" />

              <div className="flex items-center gap-2">
                <button onClick={handleRefresh} disabled={refreshing}
                  className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                  aria-label="Refresh dashboard">
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>

                <div className="relative">
                  <button onClick={() => setShowExportMenu(!showExportMenu)}
                    className="px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors flex items-center gap-1.5 shadow-sm"
                    aria-label="Export data">
                    <Download size={14} />
                    <span>Export</span>
                  </button>
                  {showExportMenu && (
                    <div className="absolute top-11 right-0 bg-white border border-slate-200 rounded-2xl p-3 shadow-xl z-50 w-44">
                      <p className="text-xs font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Export Format</p>
                      <div className="space-y-1 mt-1">
                        <button onClick={() => handleExport("json")} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700">Export as JSON</button>
                        <button onClick={() => handleExport("csv")} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700">Export as CSV</button>
                        <button onClick={() => handleExport("pdf")} className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-xs font-medium text-slate-700">Print / PDF Report</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-6 w-px bg-slate-200 hidden md:block" />

              <div className="text-xs text-slate-400 whitespace-nowrap pl-1">
                <span className="font-medium text-slate-500">Updated:</span> {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 no-print">
          <div className="flex flex-wrap items-center gap-4">
            <Filter size={18} className="text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Data Period:</span>
            <select value={timeRange} onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#FF7A00]/20 focus:border-[#FF7A00]">
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
              <option value="quarter">Last 90 Days</option>
              <option value="year">Last 12 Months</option>
            </select>
          </div>
        </div>
      )}

      {!hasData ? renderEmptyState() : (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-5 gap-5 min-w-0">
            <div className="h-full min-w-0"><StatCard title="Total Revenue" value={formatDisplayCurrency(kpis.totalRevenue, baseCurrency)} icon={DollarSign} color={CARD_COLORS[0]} trend={kpis.monthlyGrowth >= 0 ? "up" : "down"} trendValue={`${Math.abs(kpis.monthlyGrowth).toFixed(1)}%`} href="/billing" /></div>
            <div className="h-full min-w-0"><StatCard title="Monthly Revenue" value={formatDisplayCurrency(kpis.monthlyRevenue, baseCurrency)} icon={TrendingUp} color={CARD_COLORS[1]} href="/billing/reports" /></div>
            <div className="h-full min-w-0"><StatCard title="Outstanding" value={formatDisplayCurrency(kpis.outstandingAmount, baseCurrency)} icon={Wallet} color={CARD_COLORS[2]} href="/billing/invoices" /></div>
            <div className="h-full min-w-0"><StatCard title="Paid Amount" value={formatDisplayCurrency(kpis.paidAmount, baseCurrency)} icon={CheckCircle} color={CARD_COLORS[3]} href="/billing/payments" /></div>
            <div className="h-full min-w-0"><StatCard title="Overdue" value={formatDisplayCurrency(kpis.overdueAmount, baseCurrency)} icon={AlertCircle} color={CARD_COLORS[4]} href="/billing/invoices" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5 min-w-0">
            <div className="h-full min-w-0"><StatCard title="Active Customers" value={formatNumber(kpis.activeCustomers)} icon={Users} color={CARD_COLORS[5]} href="/billing/customers" /></div>
            <div className="h-full min-w-0"><StatCard title="Active Contracts" value={formatNumber(kpis.activeContracts)} icon={FileSignature} color={CARD_COLORS[6]} href="/billing/contracts" /></div>
            <div className="h-full min-w-0"><StatCard title="Active Subscriptions" value={formatNumber(kpis.activeSubscriptions)} icon={UserCheck} color={CARD_COLORS[7]} href="/billing/subscriptions" /></div>
            <div className="h-full min-w-0"><StatCard title="Total Invoices" value={formatNumber(kpis.totalInvoices)} icon={FileText} color={CARD_COLORS[8]} href="/billing/invoices" /></div>
            <div className="h-full min-w-0"><StatCard title="Pending Payments" value={formatNumber(kpis.pendingPayments)} icon={Clock} color={CARD_COLORS[9]} href="/billing/payments" /></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 min-w-0">
            <div className="h-full min-w-0"><KPICard title="Avg Invoice Value" value={formatDisplayCurrency(kpis.avgInvoiceValue, baseCurrency)} subtitle="Per invoice average" color="from-violet-500 to-purple-500" href="/billing/invoices" /></div>
            <div className="h-full min-w-0"><KPICard title="Collection Rate" value={`${kpis.collectionRate.toFixed(2)}%`} subtitle="Payment success rate" color="from-green-500 to-emerald-500" progress={kpis.collectionRate} href="/billing/payments" /></div>
            <div className="h-full min-w-0"><KPICard title="Monthly Growth" value={`${kpis.monthlyGrowth >= 0 ? "+" : ""}${kpis.monthlyGrowth.toFixed(1)}%`} subtitle="Revenue growth rate" color={kpis.monthlyGrowth >= 0 ? "from-blue-500 to-cyan-500" : "from-red-500 to-rose-500"} progress={Math.min(100, Math.abs(kpis.monthlyGrowth) * 10)} /></div>
            <div className="h-full min-w-0"><KPICard title="Revenue Recognition" value={formatDisplayCurrency(kpis.revenueRecognition, baseCurrency)} subtitle="Recognized revenue" color="from-amber-500 to-orange-500" progress={kpis.totalRevenue > 0 ? Math.min(100, (kpis.revenueRecognition / kpis.totalRevenue) * 100) : 0} href="/billing/reports" /></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <WidgetErrorBoundary title="Revenue Trend">
              <ChartCard title="Revenue Trend">
                <ChartErrorBoundary>
                  {revenueChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueChartData}>
                        <defs>
                          <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={revenueChartData[0]?.month ? "month" : "period"} tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                        <Area type="monotone" dataKey="revenue" stroke="#7c3aed" strokeWidth={3} fill="url(#revenueGrad)" dot={{ fill: "#7c3aed", strokeWidth: 2, r: 4 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyStateWidget message="No revenue data available" icon={BarChart3} />
                  )}
                </ChartErrorBoundary>
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Payment Trend">
              <ChartCard title="Payment Trend">
                <ChartErrorBoundary>
                  {d.paymentTrend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={d.paymentTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={d.paymentTrend[0]?.month ? "month" : "period"} tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : d.payments.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={d.payments.slice(0, 12).reverse()}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="payment_number" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                        <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyStateWidget message="No payment data available" icon={Receipt} />
                  )}
                </ChartErrorBoundary>
              </ChartCard>
            </WidgetErrorBoundary>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-w-0">
            <WidgetErrorBoundary title="Invoice Status">
              <ChartCard title="Invoice Status">
                <ChartErrorBoundary>
                  {invoiceStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={invoiceStatusData}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={4}
                          dataKey="value"
                          label={({ percent }) => (percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : "")}
                        >
                          {invoiceStatusData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [v, `Invoices (${name})`]} />
                        <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyStateWidget
                      title="No invoices found"
                      message="There are no invoices for the selected period."
                      icon={FileText}
                      ctaText="Create Invoice"
                      ctaHref="/billing/invoices/new"
                    />
                  )}
                </ChartErrorBoundary>
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Subscription Distribution">
              <ChartCard title="Subscription Distribution">
                <ChartErrorBoundary>
                  {subscriptionChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={subscriptionChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {subscriptionChartData.map((_, idx) => (
                            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyStateWidget message="No subscription data available" icon={UserCheck} />
                  )}
                </ChartErrorBoundary>
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Outstanding Aging">
              <ChartCard title="Outstanding Aging">
                <ChartErrorBoundary>
                  {agingData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={agingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey={agingData[0]?.bucket ? "bucket" : "name"} tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                        <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                          {agingData.map((_, idx) => (
                            <Cell key={idx} fill={idx === 0 ? "#10b981" : idx === 1 ? "#f59e0b" : idx === 2 ? "#ef4444" : "#7c3aed"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyStateWidget message="No aging data available" icon={Clock} />
                  )}
                </ChartErrorBoundary>
              </ChartCard>
            </WidgetErrorBoundary>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-w-0">
            <WidgetErrorBoundary title="Quick Overview">
              <ChartCard title="Quick Overview">
                <div className="space-y-4">
                  {quickOverviewItems.map((item, idx) => (
                    <div key={idx}
                      className={`flex items-center justify-between p-4 bg-slate-50 rounded-xl ${item.href ? "cursor-pointer hover:bg-slate-100 transition-colors" : ""}`}
                      onClick={item.href ? () => navigate(item.href) : undefined}
                      role={item.href ? "button" : undefined}
                      tabIndex={item.href ? 0 : undefined}
                      onKeyDown={item.href ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); navigate(item.href); } } : undefined}>
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg ${item.color} flex items-center justify-center`}>
                          <item.icon size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{item.label}</p>
                        </div>
                      </div>
                      <span className="text-2xl font-bold text-slate-800">{item.value}</span>
                    </div>
                  ))}
                </div>
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Recent Invoices">
              <ChartCard title="Recent Invoices" action={<span onClick={() => navigate("/billing/invoices")} className="flex items-center gap-1">View All <ChevronRight size={14} /></span>}>
                <DataTable columns={invoiceColumns} data={d.invoices} emptyMessage="No invoices yet" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 min-w-0">
            <WidgetErrorBoundary title="Recent Payments">
              <ChartCard title="Recent Payments" action={<span onClick={() => navigate("/billing/payments")} className="flex items-center gap-1">View All <ChevronRight size={14} /></span>}>
                <DataTable columns={paymentColumns} data={d.payments} emptyMessage="No payments yet" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Recent Customers">
              <ChartCard title="Recent Customers" action={<span onClick={() => navigate("/billing/customers")} className="flex items-center gap-1">View All <ChevronRight size={14} /></span>}>
                <DataTable columns={customerColumns} data={d.customers} emptyMessage="No customers yet" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Upcoming Renewals">
              <ChartCard title="Upcoming Renewals" action={<span onClick={() => navigate("/billing/contracts")} className="flex items-center gap-1">View All <ChevronRight size={14} /></span>}>
                <DataTable columns={renewalColumns} data={d.expiringContracts} emptyMessage="No upcoming renewals" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>
          </div>

          <WidgetErrorBoundary title="Recent Activities">
            <ChartCard title="Recent Activities">
              <DataTable columns={activityColumns} data={d.auditLogs} emptyMessage="No recent activity" maxRows={10} />
            </ChartCard>
          </WidgetErrorBoundary>
        </div>
      )}
    </div>
  );
}
