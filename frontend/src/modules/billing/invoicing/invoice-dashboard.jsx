import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Clock, AlertCircle,
  CheckCircle, RefreshCw, DollarSign, Activity,
  BarChart3, Wallet, ChevronRight, Send, Ban, Calendar, TrendingUp, TrendingDown,
  PieChart as PieChartIcon
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts";
import { invoiceApi } from "../../../service/billingService";
import { extractArray, formatDisplayCurrency, formatDisplayDate, formatCompactCurrency } from "../../../utils/billing-helpers";
import { useCurrency } from "../utils/CurrencyContext";
import { useBillingDateRange } from "../utils/DateRangeContext";
import {
  DashboardHeader, DashboardStatCard as EnterpriseStatCard, DashboardChartCard as ChartCard,
  DashboardEmptyPanel as EmptyStateWidget, DashboardStatCardSkeleton as SkeletonCard,
  DashboardChartCardSkeleton as SkeletonChart, DashboardChartErrorBoundary as ChartErrorBoundary,
  DASHBOARD_KPI_GRID, DASHBOARD_CHART_GRID, exportDashboardToCsv, exportDashboardToJson,
} from "../../../components/billing-shared";

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

export default function InvoiceDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const {
    range: dateRangeValue, setRange: setDateRangeValue,
    customStart, customEnd, applyCustomRange, reset: resetDateRange,
    dateRange,
  } = useBillingDateRange();
  const { baseCurrency, currencySymbol } = useCurrency();
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
        invoiceApi.getEnterpriseDashboard(dateRange),
        invoiceApi.getInvoiceTrend(12),
        invoiceApi.getRevenueTrend(12),
        invoiceApi.getPaymentCollectionTrend(12),
        invoiceApi.getStatusDistribution(),
        invoiceApi.getMonthlyRevenue(12),
        invoiceApi.getRecentActivity(10),
        invoiceApi.list({ per_page: 5, status: "overdue", date_from: dateRange.date_from, date_to: dateRange.date_to }),
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
  }, [dateRange.date_from, dateRange.date_to]);

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
      exportDashboardToCsv({ ...(dashboard.stats || {}), date_from: dateRange.date_from, date_to: dateRange.date_to }, prefix);
    } else if (format === "json") {
      exportDashboardToJson({ ...dashboard, dateRange }, prefix);
    } else if (format === "pdf") {
      window.print();
    }
  }, [dashboard, dateRange]);

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
        <DashboardHeader title="Invoice Dashboard" subtitle="Enterprise invoicing overview" />
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
        <div className={DASHBOARD_CHART_GRID}>
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error && !d.stats) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Invoice Dashboard" subtitle="Enterprise invoicing overview" />
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
      <DashboardHeader
        title="Invoice Dashboard"
        subtitle="Track invoices, payments, and collections in real-time."
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onExportCSV={() => handleExport("csv")}
        onExportJSON={() => handleExport("json")}
        onExportExcel={() => handleExport("pdf")}
        dateRange={dateRangeValue}
        onDateRangeChange={setDateRangeValue}
        customStart={customStart}
        customEnd={customEnd}
        onApplyCustomRange={applyCustomRange}
        onResetDateRange={resetDateRange}
      />

      <div className={DASHBOARD_KPI_GRID}>
        <EnterpriseStatCard title="Total Invoices" value={kpis.totalInvoices.toLocaleString()} icon={FileText} color={CARD_GRADIENTS[0]} href="/billing/invoices" />
        <EnterpriseStatCard title="Draft" value={kpis.draft.toLocaleString()} icon={Clock} color={CARD_GRADIENTS[7]} href="/billing/invoices?status=draft" />
        <EnterpriseStatCard title="Sent" value={kpis.sent.toLocaleString()} icon={Send} color={CARD_GRADIENTS[3]} href="/billing/invoices?status=sent" />
        <EnterpriseStatCard title="Paid" value={kpis.paid.toLocaleString()} icon={CheckCircle} color={CARD_GRADIENTS[1]} href="/billing/invoices?status=paid" />
      </div>

      <div className={DASHBOARD_KPI_GRID}>
        <EnterpriseStatCard title="Overdue" value={kpis.overdue.toLocaleString()} icon={AlertCircle} color={CARD_GRADIENTS[4]} href="/billing/invoices?status=overdue" />
        <EnterpriseStatCard title="Cancelled" value={kpis.cancelled.toLocaleString()} icon={Ban} color={CARD_GRADIENTS[5]} />
        <EnterpriseStatCard title="Partially Paid" value={kpis.partiallyPaid.toLocaleString()} icon={Activity} color={CARD_GRADIENTS[6]} />
        <EnterpriseStatCard title="Refunded" value={kpis.refunded.toLocaleString()} icon={TrendingDown} color={CARD_GRADIENTS[2]} />
      </div>

      <div className={DASHBOARD_KPI_GRID}>
        <EnterpriseStatCard title="Outstanding Amount" value={formatDisplayCurrency(kpis.outstandingAmount, "\u2014", baseCurrency)} icon={Wallet} color={CARD_GRADIENTS[4]} href="/billing/invoices" />
        <EnterpriseStatCard title="Collected Amount" value={formatDisplayCurrency(kpis.collectedAmount, "\u2014", baseCurrency)} icon={DollarSign} color={CARD_GRADIENTS[1]} />
        <EnterpriseStatCard title="This Month Revenue" value={formatDisplayCurrency(kpis.thisMonthRevenue, "\u2014", baseCurrency)} icon={TrendingUp} color={CARD_GRADIENTS[0]} />
        <EnterpriseStatCard title="Avg Payment Days" value={`${kpis.avgPaymentDays} days`} icon={Calendar} color={CARD_GRADIENTS[3]} />
      </div>

      <div className={DASHBOARD_KPI_GRID}>
        <EnterpriseStatCard title="Collection Rate" value={`${kpis.collectionRate}%`} icon={Activity} color={CARD_GRADIENTS[1]} />
        <EnterpriseStatCard title="Tax Collected" value={formatDisplayCurrency(kpis.totalTaxCollected, "\u2014", baseCurrency)} icon={DollarSign} color={CARD_GRADIENTS[2]} />
      </div>

      <div className={DASHBOARD_CHART_GRID}>
        <ChartCard title="Invoice Trend">
          <ChartErrorBoundary aria-live="polite">
            {d.invoiceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={d.invoiceTrend}>
                  <defs>
                    <linearGradient id="invTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
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
          <ChartErrorBoundary aria-live="polite">
            {d.revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={d.revenueTrend}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v) => `${currencySymbol}${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => formatDisplayCurrency(v, "\u2014", baseCurrency)} />
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

      <div className={DASHBOARD_CHART_GRID}>
        <ChartCard title="Status Distribution">
          <ChartErrorBoundary aria-live="polite">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                    {statusData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color || CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                    <Tooltip formatter={(v) => [v, "Invoices"]} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No status data" icon={PieChartIcon} />
            )}
          </ChartErrorBoundary>
        </ChartCard>

        <ChartCard title="Payment Collection Trend">
          <ChartErrorBoundary aria-live="polite">
            {d.collectionTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={d.collectionTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11 }} />
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
        <ChartErrorBoundary aria-live="polite">
          {d.monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={d.monthlyRevenue} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v, baseCurrency)} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatDisplayCurrency(v, "\u2014", baseCurrency)} />
                <Bar dataKey="total" name="Invoiced" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyStateWidget message="No monthly revenue data" icon={DollarSign} />
          )}
        </ChartErrorBoundary>
      </ChartCard>

      <div className={DASHBOARD_CHART_GRID}>
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
                  <span className="text-sm font-bold text-red-600 shrink-0 whitespace-nowrap">{formatDisplayCurrency(inv.total_amount || inv.balance_due, "—", inv.currency)}</span>
                </button>
              ))}
            </div>
          ) : (
            <EmptyStateWidget message="No overdue invoices" icon={CheckCircle} />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
