import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  DollarSign, TrendingUp, TrendingDown, Receipt, Users, FileSignature, UserCheck, FileText, Clock,
  BarChart3, RefreshCw, Download, AlertCircle, CheckCircle, Activity,
  Wallet, ChevronRight, Settings2
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  dashboardApi, invoiceApi, paymentApi, customerApi, subscriptionApi, contractApi, collectionApi, auditApi, productApi, settingsApi
} from "../../../service/billingService";
import CatalogOnboarding from "../products/catalog-onboarding";
import { extractArray, formatDisplayCurrency, formatCompactCurrency } from "../../../utils/billing-helpers";
import { useCurrency } from "../utils/CurrencyContext";
import { useBillingDateRange } from "../utils/DateRangeContext";
import {
  DashboardStatCard as StatCard, DashboardChartCard as ChartCard, DashboardEmptyPanel as EmptyStateWidget,
  DashboardStatCardSkeleton as SkeletonCard, DashboardChartCardSkeleton as SkeletonChart,
  DashboardChartErrorBoundary as ChartErrorBoundary, DASHBOARD_KPI_GRID, DASHBOARD_CHART_GRID, DASHBOARD_CHART_GRID_3,
  DashboardDateRangeFilter,
  exportDashboardToCsv as exportToCsv, exportDashboardToJson as exportToJson,
} from "../../../components/billing-shared";

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

function DataTable({ columns, data, emptyMessage, maxRows }) {
  const rows = maxRows ? data.slice(0, maxRows) : data;
  return (
    <div className="overflow-x-auto">
      {rows.length > 0 ? (
        <table className="w-full" role="table">
<thead>
             <tr className="bg-slate-50">
               {columns.map((col) => (
                 <th key={col.key} scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
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

export default function ZoikoBillingModule() {
  const navigate = useNavigate();
  const { baseCurrency, currencySymbol, formatCurrency: ctxFormatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const {
    range: dateRangeValue, setRange: setDateRangeValue,
    customStart, customEnd, applyCustomRange, reset: resetDateRange,
    dateRange,
  } = useBillingDateRange();
  const [showExportMenu, setShowExportMenu] = useState(false);
  const mountedRef = useRef(true);
  const loadingRef = useRef(true);
  const dateRangeRef = useRef(dateRange);
  const dateRangeValueRef = useRef(dateRangeValue);
  const requestIdRef = useRef(0);

  const isCustomRangeReady = dateRangeValue !== "custom" || (!!dateRange.date_from && !!dateRange.date_to);

  useEffect(() => { dateRangeRef.current = dateRange; }, [dateRange]);
  useEffect(() => { dateRangeValueRef.current = dateRangeValue; }, [dateRangeValue]);

  const [productCount, setProductCount] = useState(null);
  const [subscriptionReporting, setSubscriptionReporting] = useState(null);
  const [healthSummary, setHealthSummary] = useState(null);

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

      const range = dateRangeRef.current;
      if (dateRangeValueRef.current === "custom" && (!range.date_from || !range.date_to)) {
        // Custom Date Range selected but not fully chosen yet — hold the
        // previous data on screen instead of silently falling back to all-time.
        setLoading(false);
        setRefreshing(false);
        loadingRef.current = false;
        return;
      }

      const results = await Promise.allSettled([
        dashboardApi.getFull(undefined, range),
        dashboardApi.getKPIs(undefined, range),
        dashboardApi.getMonthlyRevenue(12, undefined, range),
        dashboardApi.getPaymentTrend(undefined, range),
        invoiceApi.list({ per_page: 5, date_from: range.date_from, date_to: range.date_to }),
        paymentApi.list({ per_page: 5, date_from: range.date_from, date_to: range.date_to }),
        customerApi.list({ per_page: 5, date_from: range.date_from, date_to: range.date_to }),
        subscriptionApi.listActive(),
        contractApi.listActive(),
        invoiceApi.getDashboardStats(undefined),
        invoiceApi.getOutstandingTotal(),
        paymentApi.getTotalCollected(),
        collectionApi.getAgingBuckets(),
        contractApi.listExpiring(30),
        auditApi.list({ per_page: 10 }),
        productApi.list({ per_page: 1 }),
        subscriptionApi.getReporting(),
        settingsApi.getHealth(),
      ]);

      if (currentRequestId !== requestIdRef.current) return;

      const [fullResult, kpisResult, revenueResult, paymentTrendResult, invoicesResult, paymentsResult, customersResult,
        subscriptionsResult, contractsResult, invoiceStatsResult, outstandingResult,
        totalCollectedResult, agingResult, expiringResult, auditResult, productResult, reportingResult, healthResult] = results;

      const safeValue = (result, transform = (v) => v) =>
        result.status === "fulfilled" ? transform(result.value) : null;

      const prodData = safeValue(productResult);
      if (prodData) {
        const count = prodData.total ?? prodData.items?.length ?? 0;
        setProductCount(count);
      }

      setSubscriptionReporting(safeValue(reportingResult));
      setHealthSummary(safeValue(healthResult));

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
  }, [dateRangeValue, dateRange.date_from, dateRange.date_to, fetchDashboardData]);

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
        date_from: dateRange.date_from,
        date_to: dateRange.date_to,
      }, prefix);
    } else if (format === "json") {
      exportToJson({ ...dashboardData, dateRange }, prefix);
    } else if (format === "pdf") {
      window.print();
    }
    setShowExportMenu(false);
  }, [dashboardData, dateRange]);

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
      <div className={DASHBOARD_KPI_GRID}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className={DASHBOARD_KPI_GRID}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className={DASHBOARD_KPI_GRID}>
        {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className={DASHBOARD_CHART_GRID}>
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className={DASHBOARD_CHART_GRID_3}>
        <SkeletonChart />
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className={DASHBOARD_CHART_GRID}>
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <div className={DASHBOARD_CHART_GRID}>
        <SkeletonTable />
        <SkeletonTable />
      </div>
      <div className={DASHBOARD_CHART_GRID_3}>
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

      {productCount === 0 && (
        <CatalogOnboarding
          onAddManually={() => navigate("/billing/products")}
          onImported={() => {
            fetchDashboardData();
          }}
        />
      )}

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
              <DashboardDateRangeFilter
                range={dateRangeValue}
                onRangeChange={setDateRangeValue}
                customStart={customStart}
                customEnd={customEnd}
                onApplyCustom={applyCustomRange}
                onResetCustom={resetDateRange}
              />

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

      {dateRangeValue === "custom" && !isCustomRangeReady && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-6 no-print text-xs text-amber-700">
          Pick a start and end date above, then click Apply to load the custom range.
        </div>
      )}

      {!hasData ? renderEmptyState() : (
        <div className="space-y-8">
          <div className={DASHBOARD_KPI_GRID}>
            <div className="h-full min-w-0"><StatCard title="Total Revenue" value={formatDisplayCurrency(kpis.totalRevenue, baseCurrency)} icon={DollarSign} color={CARD_COLORS[0]} trend={kpis.monthlyGrowth >= 0 ? "up" : "down"} trendValue={`${Math.abs(kpis.monthlyGrowth).toFixed(1)}%`} href="/billing/reports" /></div>
            <div className="h-full min-w-0"><StatCard title="Monthly Revenue" value={formatDisplayCurrency(kpis.monthlyRevenue, baseCurrency)} icon={TrendingUp} color={CARD_COLORS[1]} href="/billing/reports" /></div>
            <div className="h-full min-w-0"><StatCard title="Outstanding" value={formatDisplayCurrency(kpis.outstandingAmount, baseCurrency)} icon={Wallet} color={CARD_COLORS[2]} href="/billing/invoices" /></div>
            <div className="h-full min-w-0"><StatCard title="Paid Amount" value={formatDisplayCurrency(kpis.paidAmount, baseCurrency)} icon={CheckCircle} color={CARD_COLORS[3]} href="/billing/payments" /></div>
            <div className="h-full min-w-0"><StatCard title="Overdue" value={formatDisplayCurrency(kpis.overdueAmount, baseCurrency)} icon={AlertCircle} color={CARD_COLORS[4]} href="/billing/invoices?status=overdue" /></div>
          </div>

          {/* System Health Summary */}
          {healthSummary && (
            <div className="bg-white border border-slate-200 rounded-2xl px-5 py-3 flex flex-wrap items-center gap-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-slate-400" />
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">System Health</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                  healthSummary.overall_status === "healthy" ? "bg-green-100 text-green-700" :
                  healthSummary.overall_status === "warning" ? "bg-amber-100 text-amber-700" :
                  "bg-red-100 text-red-700"
                }`}>
                  {healthSummary.overall_status === "healthy" ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                  {healthSummary.overall_status ? healthSummary.overall_status.charAt(0).toUpperCase() + healthSummary.overall_status.slice(1) : "Unknown"}
                </span>
              </div>
              {healthSummary.readiness_score !== undefined && (
                <>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="text-xs text-slate-500">
                    Readiness: <span className="font-semibold text-slate-700">{healthSummary.readiness_score}%</span>
                  </span>
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      healthSummary.readiness_score >= 80 ? "bg-green-500" :
                      healthSummary.readiness_score >= 50 ? "bg-amber-500" : "bg-red-500"
                    }`} style={{ width: `${healthSummary.readiness_score}%` }} />
                  </div>
                </>
              )}
              {healthSummary.components && (
                <>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="text-xs text-slate-500">
                    {healthSummary.components.filter((c) => c.status === "healthy").length}/{healthSummary.components.length} components healthy
                  </span>
                </>
              )}
              <div className="ml-auto">
                <button onClick={() => navigate("/billing/settings")}
                  className="text-xs font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1 transition-colors">
                  <Settings2 size={12} /> Configure
                </button>
              </div>
            </div>
          )}

          <div className={DASHBOARD_KPI_GRID}>
            <div className="h-full min-w-0">
              <StatCard title="MRR (Monthly Recurring Revenue)"
                value={subscriptionReporting ? formatDisplayCurrency(subscriptionReporting.mrr, subscriptionReporting.reporting_currency || baseCurrency) : "—"}
                icon={RefreshCw} color={CARD_COLORS[5]} href="/billing/subscriptions/reports"
                trend={subscriptionReporting?.mrr_trend != null ? (subscriptionReporting.mrr_trend >= 0 ? "up" : "down") : kpis.monthlyGrowth >= 0 ? "up" : "down"}
                trendValue={subscriptionReporting?.mrr_trend != null ? `${Math.abs(subscriptionReporting.mrr_trend).toFixed(1)}%` : `${Math.abs(kpis.monthlyGrowth).toFixed(1)}%`} />
            </div>
            <div className="h-full min-w-0">
              <StatCard title="ARR (Annual Recurring Revenue)"
                value={subscriptionReporting ? formatDisplayCurrency(subscriptionReporting.arr, subscriptionReporting.reporting_currency || baseCurrency) : "—"}
                icon={TrendingUp} color={CARD_COLORS[6]} href="/billing/subscriptions/reports"
                trend={subscriptionReporting?.arr_trend != null ? (subscriptionReporting.arr_trend >= 0 ? "up" : "down") : kpis.monthlyGrowth >= 0 ? "up" : "down"}
                trendValue={subscriptionReporting?.arr_trend != null ? `${Math.abs(subscriptionReporting.arr_trend).toFixed(1)}%` : `${Math.abs(kpis.monthlyGrowth * 12).toFixed(1)}%`} />
            </div>
          </div>

          <div className={DASHBOARD_KPI_GRID}>
            <div className="h-full min-w-0"><StatCard title="Active Customers" value={formatNumber(kpis.activeCustomers)} icon={Users} color={CARD_COLORS[5]} href="/billing/customers" /></div>
            <div className="h-full min-w-0"><StatCard title="Active Contracts" value={formatNumber(kpis.activeContracts)} icon={FileSignature} color={CARD_COLORS[6]} href="/billing/contracts" /></div>
            <div className="h-full min-w-0"><StatCard title="Active Subscriptions" value={formatNumber(kpis.activeSubscriptions)} icon={UserCheck} color={CARD_COLORS[7]} href="/billing/subscriptions" /></div>
            <div className="h-full min-w-0"><StatCard title="Total Invoices" value={formatNumber(kpis.totalInvoices)} icon={FileText} color={CARD_COLORS[8]} href="/billing/invoices" /></div>
            <div className="h-full min-w-0"><StatCard title="Pending Payments" value={formatNumber(kpis.pendingPayments)} icon={Clock} color={CARD_COLORS[9]} href="/billing/payments" /></div>
          </div>

          <div className={DASHBOARD_KPI_GRID}>
            <div className="h-full min-w-0"><KPICard title="Avg Invoice Value" value={formatDisplayCurrency(kpis.avgInvoiceValue, baseCurrency)} subtitle="Per invoice average" color="from-violet-500 to-purple-500" href="/billing/invoices" /></div>
            <div className="h-full min-w-0"><KPICard title="Collection Rate" value={`${kpis.collectionRate.toFixed(2)}%`} subtitle="Payment success rate" color="from-green-500 to-emerald-500" progress={kpis.collectionRate} href="/billing/payments" /></div>
            <div className="h-full min-w-0"><KPICard title="Monthly Growth" value={`${kpis.monthlyGrowth >= 0 ? "+" : ""}${kpis.monthlyGrowth.toFixed(1)}%`} subtitle="Revenue growth rate" color={kpis.monthlyGrowth >= 0 ? "from-blue-500 to-cyan-500" : "from-red-500 to-rose-500"} progress={Math.min(100, Math.abs(kpis.monthlyGrowth) * 10)} /></div>
            <div className="h-full min-w-0"><KPICard title="Revenue Recognition" value={formatDisplayCurrency(kpis.revenueRecognition, baseCurrency)} subtitle="Recognized revenue" color="from-amber-500 to-orange-500" progress={kpis.totalRevenue > 0 ? Math.min(100, (kpis.revenueRecognition / kpis.totalRevenue) * 100) : 0} href="/billing/reports" /></div>
          </div>

          <div className={DASHBOARD_CHART_GRID}>
            <WidgetErrorBoundary title="Revenue Trend">
              <ChartCard title="Revenue Trend">
                <ChartErrorBoundary aria-live="polite">
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
                <ChartErrorBoundary aria-live="polite">
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

          <div className={DASHBOARD_CHART_GRID_3}>
            <WidgetErrorBoundary title="Invoice Status">
              <ChartCard title="Invoice Status">
                <ChartErrorBoundary aria-live="polite">
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
                <ChartErrorBoundary aria-live="polite">
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
                <ChartErrorBoundary aria-live="polite">
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

          <div className={DASHBOARD_CHART_GRID}>
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
              <ChartCard title="Recent Invoices" action={<button onClick={() => navigate("/billing/invoices")} className="text-sm font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1">View All <ChevronRight size={14} /></button>}>
                <DataTable columns={invoiceColumns} data={d.invoices} emptyMessage="No invoices yet" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>
          </div>

          <div className={DASHBOARD_CHART_GRID_3}>
            <WidgetErrorBoundary title="Recent Payments">
              <ChartCard title="Recent Payments" action={<button onClick={() => navigate("/billing/payments")} className="text-sm font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1">View All <ChevronRight size={14} /></button>}>
                <DataTable columns={paymentColumns} data={d.payments} emptyMessage="No payments yet" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Recent Customers">
              <ChartCard title="Recent Customers" action={<button onClick={() => navigate("/billing/customers")} className="text-sm font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1">View All <ChevronRight size={14} /></button>}>
                <DataTable columns={customerColumns} data={d.customers} emptyMessage="No customers yet" maxRows={5} />
              </ChartCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary title="Upcoming Renewals">
              <ChartCard title="Upcoming Renewals" action={<button onClick={() => navigate("/billing/contracts")} className="text-sm font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1">View All <ChevronRight size={14} /></button>}>
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
