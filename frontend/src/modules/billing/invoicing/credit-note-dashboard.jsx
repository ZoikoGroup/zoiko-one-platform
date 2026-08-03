import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Receipt, FileText, CheckCircle, AlertCircle, RefreshCw, Wallet,
  BarChart3, PieChart as PieChartIcon, Ban, Clock,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { creditNoteApi } from "../../../service/billingService";
import { extractArray, formatDisplayCurrency } from "../../../utils/billing-helpers";
import { useCurrency } from "../utils/CurrencyContext";
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
  "from-indigo-500 to-blue-500",
];

const STATUS_COLORS = {
  draft: "#6b7280",
  approved: "#6366f1",
  issued: "#3b82f6",
  partially_applied: "#f59e0b",
  fully_applied: "#10b981",
  voided: "#ef4444",
};

export default function CreditNoteDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const { baseCurrency } = useCurrency();
  const mountedRef = useRef(true);
  const loadingRef = useRef(true);

  const [dashboard, setDashboard] = useState({
    stats: null,
    statusDist: [],
    typeDist: [],
    monthlyTrend: [],
  });

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      if (!loadingRef.current) setRefreshing(true);

      const results = await Promise.allSettled([
        creditNoteApi.getDashboardStats(),
        creditNoteApi.getStatusDistribution(),
        creditNoteApi.getTypeDistribution(),
        creditNoteApi.getMonthlyTrend(12),
      ]);
      const [statsRes, statusRes, typeRes, trendRes] = results;
      const safeVal = (r, transform) => (r.status === "fulfilled" ? (transform ? transform(r.value) : r.value) : null);

      if (mountedRef.current) {
        setDashboard({
          stats: safeVal(statsRes),
          statusDist: safeVal(statusRes, extractArray) || [],
          typeDist: safeVal(typeRes, extractArray) || [],
          monthlyTrend: safeVal(trendRes, extractArray) || [],
        });
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) setError("Failed to load credit note dashboard data.");
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
    const prefix = `credit-note-dashboard-${new Date().toISOString().split("T")[0]}`;
    if (format === "csv") {
      exportDashboardToCsv({ ...(dashboard.stats || {}) }, prefix);
    } else if (format === "json") {
      exportDashboardToJson(dashboard, prefix);
    }
  }, [dashboard]);

  const stats = dashboard.stats || {};
  const kpis = useMemo(() => ({
    totalCount: stats.total_count || 0,
    totalValue: stats.total_value || 0,
    outstandingCredits: stats.outstanding_credits || 0,
    draftCount: stats.draft_count || 0,
    issuedCount: stats.issued_count || 0,
    fullyAppliedCount: stats.fully_applied_count || 0,
    voidedCount: stats.voided_count || 0,
  }), [stats]);

  if (loading) {
    return (
      <div className="space-y-8" aria-label="Loading credit note dashboard">
        <DashboardHeader title="Credit Note Dashboard" subtitle="Credit note issuance, application, and outstanding balances" icon={Receipt} iconGradient="from-[#FF7A00] to-[#FF5500]" />
        <div className={DASHBOARD_KPI_GRID}>
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
        <div className={DASHBOARD_CHART_GRID}>
          <SkeletonChart />
          <SkeletonChart />
        </div>
      </div>
    );
  }

  if (error && !dashboard.stats) {
    return (
      <div className="space-y-6">
        <DashboardHeader title="Credit Note Dashboard" subtitle="Credit note issuance, application, and outstanding balances" icon={Receipt} iconGradient="from-[#FF7A00] to-[#FF5500]" />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-16 w-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">Something went wrong</h3>
          <p className="text-slate-600 mb-6 text-center max-w-md">{error}</p>
          <button onClick={handleRefresh}
            className="px-6 py-3 bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white rounded-xl font-medium hover:shadow-lg transition-all flex items-center gap-2">
            <RefreshCw size={18} /> Try Again
          </button>
        </div>
      </div>
    );
  }

  const statusData = (dashboard.statusDist.length > 0
    ? dashboard.statusDist.map((s) => ({ name: (s.status || "").replace(/_/g, " "), value: s.count, color: STATUS_COLORS[s.status] || "#7c3aed" }))
    : []
  ).filter((s) => s.value > 0);

  const typeData = dashboard.typeDist.map((t) => ({
    name: (t.credit_note_type || "").replace(/_/g, " "),
    count: t.count,
    value: t.total_amount,
  }));

  return (
    <div className="space-y-8">
      <DashboardHeader
        title="Credit Note Dashboard"
        subtitle="Credit note issuance, application, and outstanding balances."
        icon={Receipt}
        iconGradient="from-[#FF7A00] to-[#FF5500]"
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onExportCSV={() => handleExport("csv")}
        onExportJSON={() => handleExport("json")}
      />

      <div className={DASHBOARD_KPI_GRID}>
        <EnterpriseStatCard title="Total Credit Notes" value={kpis.totalCount.toLocaleString()} icon={Receipt} color={CARD_GRADIENTS[0]} href="/billing/credit-notes" />
        <EnterpriseStatCard title="Draft" value={kpis.draftCount.toLocaleString()} icon={Clock} color={CARD_GRADIENTS[2]} href="/billing/credit-notes?status=draft" />
        <EnterpriseStatCard title="Issued / Outstanding" value={kpis.issuedCount.toLocaleString()} icon={FileText} color={CARD_GRADIENTS[3]} href="/billing/credit-notes?status=issued" />
        <EnterpriseStatCard title="Fully Applied" value={kpis.fullyAppliedCount.toLocaleString()} icon={CheckCircle} color={CARD_GRADIENTS[1]} href="/billing/credit-notes?status=fully_applied" />
      </div>

      <div className={DASHBOARD_KPI_GRID}>
        <EnterpriseStatCard title="Total Value" value={formatDisplayCurrency(kpis.totalValue, "—", baseCurrency)} icon={Wallet} color={CARD_GRADIENTS[0]} />
        <EnterpriseStatCard title="Outstanding Credits" value={formatDisplayCurrency(kpis.outstandingCredits, "—", baseCurrency)} icon={Wallet} color={CARD_GRADIENTS[4]} />
        <EnterpriseStatCard title="Voided" value={kpis.voidedCount.toLocaleString()} icon={Ban} color={CARD_GRADIENTS[5]} href="/billing/credit-notes?status=voided" />
      </div>

      <div className={DASHBOARD_CHART_GRID}>
        <ChartCard title="Status Distribution">
          <ChartErrorBoundary aria-live="polite">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color || CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No status distribution data" icon={PieChartIcon} />
            )}
          </ChartErrorBoundary>
        </ChartCard>

        <ChartCard title="Type Distribution">
          <ChartErrorBoundary aria-live="polite">
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No type distribution data" icon={BarChart3} />
            )}
          </ChartErrorBoundary>
        </ChartCard>
      </div>

      <div className={DASHBOARD_CHART_GRID}>
        <ChartCard title="Monthly Trend">
          <ChartErrorBoundary aria-live="polite">
            {dashboard.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={dashboard.monthlyTrend}>
                  <defs>
                    <linearGradient id="cnTrendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#DC2626" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#DC2626" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="total_amount" name="Total Amount" stroke="#DC2626" strokeWidth={2} fill="url(#cnTrendGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyStateWidget message="No monthly trend data" icon={BarChart3} />
            )}
          </ChartErrorBoundary>
        </ChartCard>
      </div>
    </div>
  );
}
