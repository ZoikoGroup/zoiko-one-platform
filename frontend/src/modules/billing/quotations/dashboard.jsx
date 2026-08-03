import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileSignature, DollarSign, Clock, Send, CheckCircle, XCircle, RefreshCw,
  TrendingUp, Users, Inbox, AlertCircle, FileText, Ban, ChevronRight,
} from "lucide-react";
import { PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, Line, ComposedChart } from "recharts"
import { quoteApi, customerApi } from "../../../service/billingService";
import { extractArray, formatDisplayCurrency } from "../../../utils/billing-helpers";
import { useCurrency } from "../utils/CurrencyContext";
import { useBillingDateRange } from "../utils/DateRangeContext";
import {
  DashboardHeader, DashboardStatCard, DashboardStatCardSkeleton, DashboardChartCard,
  DashboardChartCardSkeleton, DashboardChartErrorBoundary, DashboardEmptyPanel,
  DASHBOARD_KPI_GRID, DASHBOARD_CHART_GRID,
  exportDashboardToCsv, exportDashboardToJson, ErrorState, StatusBadge,
} from "../../../components/billing-shared";

// Generous single-page fetch for a client-side-aggregated summary view — there
// is no dedicated quotation dashboard-stats/KPI endpoint (unlike invoices or
// customers), so every KPI/chart here is derived from this one list call, the
// same approach customer-dashboard.jsx and products/dashboard.jsx use for
// data that doesn't have its own stats endpoint. "Total Quotations" uses the
// server-reported `total` (accurate even beyond this page); every other
// figure (status mix, revenue, top customers, trend) is computed over the
// quotations actually returned by this page, so orgs with more than
// PAGE_SIZE quotations in the selected range will see those breakdowns
// approximated from the most recent PAGE_SIZE records rather than the exact
// full set.
const PAGE_SIZE = 200;

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft", color: "bg-gray-100 text-gray-600" },
  { value: "sent", label: "Sent", color: "bg-blue-100 text-blue-700" },
  { value: "accepted", label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
  { value: "rejected", label: "Rejected", color: "bg-red-100 text-red-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-amber-100 text-amber-700" },
  { value: "converted", label: "Converted", color: "bg-violet-100 text-violet-700" },
  { value: "expired", label: "Expired", color: "bg-slate-100 text-slate-500" },
];
const STATUS_ICONS = { draft: Clock, sent: Send, accepted: CheckCircle, rejected: XCircle, cancelled: Ban, converted: RefreshCw, expired: Clock };
const STATUS_COLORS = { draft: "#6b7280", sent: "#3b82f6", accepted: "#10b981", rejected: "#ef4444", cancelled: "#f59e0b", converted: "#7c3aed", expired: "#94a3b8" };

export default function QuotationDashboardPage() {
  const navigate = useNavigate();
  const { baseCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [quotes, setQuotes] = useState([]);
  const [total, setTotal] = useState(0);
  const [customers, setCustomers] = useState([]);
  const {
    range: dateRangeValue, setRange: setDateRangeValue,
    customStart, customEnd, applyCustomRange, reset: resetDateRange,
    dateRange,
  } = useBillingDateRange();

  const hasLoadedOnce = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const [quotesResp, customersResp] = await Promise.all([
        quoteApi.list({
          per_page: PAGE_SIZE,
          sort_by: "created_at", sort_order: "desc",
          date_from: dateRange.date_from || undefined,
          date_to: dateRange.date_to || undefined,
        }),
        customerApi.list({ per_page: 300 }).catch(() => null),
      ]);
      const items = extractArray(quotesResp);
      setQuotes(items);
      setTotal(Number(quotesResp?.total ?? items.length));
      if (customersResp) setCustomers(extractArray(customersResp));
      setLastUpdated(new Date());
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load quotation dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
      hasLoadedOnce.current = true;
    }
  }, [dateRange.date_from, dateRange.date_to]);

  useEffect(() => { fetchData(hasLoadedOnce.current); }, [fetchData]);

  const customerMap = useMemo(() => {
    const map = {};
    customers.forEach((c) => {
      map[c.id] = c.display_name || [c.first_name, c.last_name].filter(Boolean).join(" ") || c.company_name || `Customer #${c.id}`;
    });
    return map;
  }, [customers]);

  const getCustomerName = useCallback((q) => q.customer_name || q.customer?.name || customerMap[q.customer_id] || `Customer #${q.customer_id}`, [customerMap]);

  const byStatus = useMemo(() => {
    const groups = {};
    quotes.forEach((q) => {
      const s = q.status || "draft";
      (groups[s] = groups[s] || []).push(q);
    });
    return groups;
  }, [quotes]);

  const countOf = (status) => (byStatus[status] || []).length;
  const draftCount = countOf("draft");
  const sentCount = countOf("sent");
  const acceptedCount = countOf("accepted");
  const rejectedCount = countOf("rejected");
  const convertedCount = countOf("converted");
  const cancelledCount = countOf("cancelled") + countOf("expired");

  const revenue = useMemo(() => (
    [...(byStatus.accepted || []), ...(byStatus.converted || [])]
      .reduce((s, q) => s + parseFloat(q.total_amount || q.total || 0), 0)
  ), [byStatus]);

  const wonForRate = acceptedCount + convertedCount;
  const decidedForRate = wonForRate + rejectedCount + sentCount;
  const conversionRate = decidedForRate > 0 ? (wonForRate / decidedForRate) * 100 : 0;

  const statusChartData = useMemo(() => (
    STATUS_OPTIONS.filter((o) => o.value !== "expired")
      .map((o) => ({ name: o.label, value: o.value === "cancelled" ? cancelledCount : countOf(o.value), color: STATUS_COLORS[o.value] }))
      .filter((d) => d.value > 0)
  ), [byStatus, cancelledCount]);

  // Last 6 calendar months of quotation volume/value, read straight from the
  // fetched sample's created_at (same derivation pattern customer-dashboard.jsx
  // uses for customer growth, since there's no monthly-trend endpoint here).
  const monthlyTrend = useMemo(() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, month: d.toLocaleString("en-US", { month: "short", year: "numeric" }), count: 0, value: 0 });
    }
    const byKey = Object.fromEntries(months.map((m) => [m.key, m]));
    quotes.forEach((q) => {
      if (!q.created_at) return;
      const created = new Date(q.created_at);
      const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
      if (byKey[key]) {
        byKey[key].count += 1;
        byKey[key].value += parseFloat(q.total_amount || q.total || 0);
      }
    });
    return months;
  }, [quotes]);

  const topCustomers = useMemo(() => {
    const totals = {};
    quotes.forEach((q) => {
      if (!q.customer_id) return;
      const key = q.customer_id;
      if (!totals[key]) totals[key] = { customer_id: key, name: getCustomerName(q), value: 0, count: 0 };
      totals[key].value += parseFloat(q.total_amount || q.total || 0);
      totals[key].count += 1;
    });
    return Object.values(totals).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [quotes, getCustomerName]);

  const recentQuotations = useMemo(() => (
    [...quotes].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)).slice(0, 8)
  ), [quotes]);

  const handleExport = useCallback((format) => {
    const payload = {
      summary: {
        total_quotations: total, draft: draftCount, sent: sentCount, accepted: acceptedCount,
        rejected: rejectedCount, converted: convertedCount, cancelled_or_expired: cancelledCount,
        revenue, conversion_rate: conversionRate,
      },
      monthly_trend: monthlyTrend,
      top_customers: topCustomers,
      recent_quotations: recentQuotations,
    };
    if (format === "csv") exportDashboardToCsv(payload, "quotation-dashboard");
    else exportDashboardToJson(payload, "quotation-dashboard");
  }, [total, draftCount, sentCount, acceptedCount, rejectedCount, convertedCount, cancelledCount, revenue, conversionRate, monthlyTrend, topCustomers, recentQuotations]);

  const headerProps = {
    title: "Quotations Dashboard",
    subtitle: "Quotation pipeline, conversion, and revenue analytics",
    icon: FileSignature,
    iconGradient: "from-violet-600 to-purple-600",
    lastUpdated,
    onRefresh: () => fetchData(true),
    refreshing,
    onExportCSV: () => handleExport("csv"),
    onExportJSON: () => handleExport("json"),
    dateRange: dateRangeValue,
    onDateRangeChange: setDateRangeValue,
    customStart,
    customEnd,
    onApplyCustomRange: applyCustomRange,
    onResetDateRange: resetDateRange,
  };

  if (loading) {
    return (
      <div className="space-y-8" aria-label="Loading quotations dashboard">
        <DashboardHeader {...headerProps} />
        <div className={DASHBOARD_KPI_GRID}>
          {Array.from({ length: 4 }).map((_, i) => <DashboardStatCardSkeleton key={i} />)}
        </div>
        <div className={DASHBOARD_KPI_GRID}>
          {Array.from({ length: 4 }).map((_, i) => <DashboardStatCardSkeleton key={i} />)}
        </div>
        <div className={DASHBOARD_CHART_GRID}>
          <DashboardChartCardSkeleton />
          <DashboardChartCardSkeleton />
        </div>
        <div className={DASHBOARD_CHART_GRID}>
          <DashboardChartCardSkeleton />
          <DashboardChartCardSkeleton />
        </div>
      </div>
    );
  }

  if (error && quotes.length === 0 && total === 0) {
    return (
      <div className="space-y-8">
        <DashboardHeader {...headerProps} />
        <ErrorState message={error} onRetry={() => fetchData(true)} title="Something went wrong" />
      </div>
    );
  }

  const hasAnyData = total > 0 || quotes.length > 0;

  return (
    <div className="space-y-8">
      <DashboardHeader {...headerProps} />

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3" role="alert">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}</span>
          <button onClick={() => fetchData(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold transition-colors shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      )}

      {!hasAnyData ? (
        <DashboardEmptyPanel
          title="No quotations yet"
          message="Create your first quotation to start seeing pipeline and revenue analytics here."
          icon={FileSignature}
          ctaText="New Quotation"
          onCtaClick={() => navigate("/billing/quotations/create")}
        />
      ) : (
        <>
          <div className={DASHBOARD_KPI_GRID}>
            <DashboardStatCard title="Total Quotations" value={total} subtitle="In selected period" icon={FileSignature} color="from-slate-500 to-slate-600" href="/billing/quotations" />
            <DashboardStatCard title="Draft" value={draftCount} subtitle={total > 0 ? `${((draftCount / total) * 100).toFixed(0)}% of total` : "—"} icon={Clock} color="from-gray-500 to-slate-600" href="/billing/quotations?status=draft" />
            <DashboardStatCard title="Sent" value={sentCount} subtitle={total > 0 ? `${((sentCount / total) * 100).toFixed(0)}% of total` : "—"} icon={Send} color="from-blue-500 to-blue-600" href="/billing/quotations?status=sent" />
            <DashboardStatCard title="Accepted" value={acceptedCount} subtitle={total > 0 ? `${((acceptedCount / total) * 100).toFixed(0)}% of total` : "—"} icon={CheckCircle} color="from-emerald-500 to-emerald-600" href="/billing/quotations?status=accepted" />
          </div>

          <div className={DASHBOARD_KPI_GRID}>
            <DashboardStatCard title="Rejected" value={rejectedCount} subtitle={total > 0 ? `${((rejectedCount / total) * 100).toFixed(0)}% of total` : "—"} icon={XCircle} color="from-red-500 to-rose-500" href="/billing/quotations?status=rejected" />
            <DashboardStatCard title="Converted" value={convertedCount} subtitle={total > 0 ? `${((convertedCount / total) * 100).toFixed(0)}% of total` : "—"} icon={RefreshCw} color="from-violet-500 to-purple-500" href="/billing/quotations?status=converted" />
            <DashboardStatCard title="Revenue" value={formatDisplayCurrency(revenue, baseCurrency)} subtitle="Accepted + converted quotations" icon={DollarSign} color="from-green-500 to-emerald-600" href="/billing/quotations/reports" />
            <DashboardStatCard title="Conversion Rate" value={`${conversionRate.toFixed(1)}%`} subtitle="Accepted + converted vs. decided" icon={TrendingUp} color="from-cyan-500 to-cyan-600" href="/billing/quotations/reports" />
          </div>

          <div className={DASHBOARD_CHART_GRID}>
            <DashboardChartCard title="Monthly Trend">
              <DashboardChartErrorBoundary>
                {monthlyTrend.every((m) => m.count === 0) ? (
                  <DashboardEmptyPanel title="No trend data" message="Quotation volume and value over time will appear here" icon={Inbox} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyTrend}>
                      <defs>
                        <linearGradient id="quoteTrendValue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip formatter={(v, name) => name === "value" || name === "Value" ? [formatDisplayCurrency(v, baseCurrency), "Value"] : [v, "Count"]} />
                      <Area yAxisId="left" type="monotone" dataKey="value" name="Value" stroke="#7c3aed" fill="url(#quoteTrendValue)" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" dataKey="count" name="Count" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </DashboardChartErrorBoundary>
            </DashboardChartCard>

            <DashboardChartCard title="Status Distribution">
              <DashboardChartErrorBoundary>
                {statusChartData.length === 0 ? (
                  <DashboardEmptyPanel title="No status data" message="Quotation status breakdown will appear here" icon={Inbox} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                        label={({ percent }) => (percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : "")}>
                        {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, name) => [v, name]} />
                      <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </DashboardChartErrorBoundary>
            </DashboardChartCard>
          </div>

          <div className={DASHBOARD_CHART_GRID}>
            <DashboardChartCard title="Top Customers by Quotation Value" action={<button onClick={() => navigate("/billing/customers")} className="text-sm font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50 rounded">View All <ChevronRight size={14} /></button>}>
              <DashboardChartErrorBoundary>
                {topCustomers.length === 0 ? (
                  <DashboardEmptyPanel title="No customer data" message="Top customers by quotation value will appear here" icon={Users} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="bg-slate-50">
                          <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                          <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quotations</th>
                          <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topCustomers.map((c) => (
                          <tr key={c.customer_id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-700">
                              <button onClick={() => navigate(`/billing/customers/${c.customer_id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded">
                                {c.name}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600 text-right">{c.count}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800 text-right whitespace-nowrap">{formatDisplayCurrency(c.value, baseCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardChartErrorBoundary>
            </DashboardChartCard>

            <DashboardChartCard title="Recent Quotations" action={<button onClick={() => navigate("/billing/quotations")} className="text-sm font-medium text-[#FF7A00] hover:text-[#FF5500] flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50 rounded">View All <ChevronRight size={14} /></button>}>
              <DashboardChartErrorBoundary>
                {recentQuotations.length === 0 ? (
                  <DashboardEmptyPanel title="No quotations yet" message="Recently created quotations will appear here" icon={FileText} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" role="table">
                      <thead>
                        <tr className="bg-slate-50">
                          <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Quotation</th>
                          <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                          <th scope="col" className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                          <th scope="col" className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentQuotations.map((q) => (
                          <tr key={q.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm">
                              <button onClick={() => navigate(`/billing/quotations/${q.id}`)} className="font-medium text-slate-800 hover:text-violet-600 transition-colors whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 rounded">
                                {q.quote_number || `#${q.id}`}
                              </button>
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{getCustomerName(q)}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800 text-right whitespace-nowrap">{formatDisplayCurrency(q.total_amount || q.total, q.currency || baseCurrency)}</td>
                            <td className="px-4 py-3 text-sm"><StatusBadge status={q.status} options={STATUS_OPTIONS} icon={STATUS_ICONS[q.status] || Clock} /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </DashboardChartErrorBoundary>
            </DashboardChartCard>
          </div>
        </>
      )}
    </div>
  );
}
