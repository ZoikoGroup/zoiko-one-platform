import { useState, useEffect, useCallback } from "react";
import {
  Download, RefreshCw, AlertCircle, TrendingUp, PieChart as PieChartIcon,
  BarChart3, DollarSign,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line,
} from "recharts";
import HRPage from "../../../components/HRPage";
import { paymentApi, refundApi, invoiceApi, creditNoteApi, dunningApi, collectionApi } from "../../../service/billingService";
import { formatCurrency } from "../../../utils/locale";
import { useCurrency } from "../utils/CurrencyContext";
import { sumInBaseCurrency, convertToBaseCurrency } from "../../../utils/currency-conversion";
import { extractArray } from "../../../utils/billing-helpers";
import { Spinner, ErrorState, EmptyState } from "../../../components/billing-shared";
import { downloadJSON, downloadCSV } from "../../../utils/export-helpers";

const TABS = [
  { key: "overview", label: "Overview", icon: DollarSign },
  { key: "collection", label: "Collections", icon: TrendingUp },
  { key: "aging", label: "Aging", icon: BarChart3 },
  { key: "outstanding", label: "Outstanding", icon: AlertCircle },
  { key: "credit", label: "Credits & Refunds", icon: PieChartIcon },
  { key: "recovery", label: "Recovery", icon: TrendingUp },
  { key: "cashflow", label: "Cashflow Trends", icon: BarChart3 },
];

export default function PaymentReportsPage() {
  const { baseCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);

  const [payments, setPayments] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [credits, setCredits] = useState([]);
  const [dunningCases, setDunningCases] = useState([]);
  const [collectionsCases, setCollectionsCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [payData, invData, refData, credData, dunData, colData] = await Promise.all([
        paymentApi.list({ per_page: 200 }).catch(() => ({ items: [] })),
        invoiceApi.list({ per_page: 200 }).catch(() => ({ items: [] })),
        refundApi.list({ per_page: 200 }).catch(() => ({ items: [] })),
        creditNoteApi.list({ per_page: 200 }).catch(() => ({ items: [] })),
        dunningApi.listCases({ per_page: 200 }).catch(() => ({ items: [] })),
        collectionApi.listCases({ per_page: 200 }).catch(() => ({ items: [] })),
      ]);
      setPayments(extractArray(payData));
      setInvoices(extractArray(invData));
      setRefunds(extractArray(refData));
      setCredits(extractArray(credData));
      setDunningCases(extractArray(dunData));
      setCollectionsCases(extractArray(colData));
    } catch (err) {
      setError(err.message || "Failed to load report data");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const completed = payments.filter((p) => p.status === "completed");
  const failed = payments.filter((p) => p.status === "failed");
  const pending = payments.filter((p) => p.status === "pending");
  const refundedPayments = payments.filter((p) => p.status === "refunded");

  const totalCollected = sumInBaseCurrency(completed, baseCurrency).total;
  const totalRefunded = sumInBaseCurrency(refunds, baseCurrency).total;
  const totalOutstanding = sumInBaseCurrency(invoices, baseCurrency).total;
  const totalCredits = sumInBaseCurrency(credits, baseCurrency).total;
  const netCashflow = totalCollected - totalRefunded;

  const paymentStatusData = [
    { name: "Completed", value: completed.length, color: "#10b981" },
    { name: "Pending", value: pending.length, color: "#f59e0b" },
    { name: "Failed", value: failed.length, color: "#ef4444" },
    { name: "Refunded", value: refundedPayments.length, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  const paymentValueByStatus = [
    { name: "Completed", value: sumInBaseCurrency(completed, baseCurrency).total, color: "#10b981" },
    { name: "Pending", value: sumInBaseCurrency(pending, baseCurrency).total, color: "#f59e0b" },
    { name: "Failed", value: sumInBaseCurrency(failed, baseCurrency).total, color: "#ef4444" },
    { name: "Refunded", value: sumInBaseCurrency(refundedPayments, baseCurrency).total, color: "#3b82f6" },
  ].filter((d) => d.value > 0);

  const monthlyPayments = payments.reduce((acc, p) => {
    const date = new Date(p.payment_date || p.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!acc[key]) acc[key] = { month: key, count: 0, value: 0, refunds: 0, net: 0 };
    acc[key].count += 1;
    if (p.status === "completed") acc[key].value += convertToBaseCurrency(parseFloat(p.amount || 0), p.currency || baseCurrency, baseCurrency, p.exchange_rate).convertedAmount;
    return acc;
  }, {});
  refunds.forEach((r) => {
    const date = new Date(r.refund_date || r.completed_at || r.created_at);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!monthlyPayments[key]) monthlyPayments[key] = { month: key, count: 0, value: 0, refunds: 0, net: 0 };
    monthlyPayments[key].refunds += convertToBaseCurrency(parseFloat(r.amount || 0), r.currency || baseCurrency, baseCurrency, r.exchange_rate).convertedAmount;
  });
  Object.values(monthlyPayments).forEach((m) => { m.net = m.value - m.refunds; });
  const monthlyChartData = Object.values(monthlyPayments).sort((a, b) => a.month.localeCompare(b.month));

  const agingInvoices = invoices.filter((inv) => inv.status === "sent" || inv.status === "overdue");
  const agingBuckets = { current: 0, "1-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  const now = new Date();
  agingInvoices.forEach((inv) => {
    const dueDate = inv.due_date ? new Date(inv.due_date) : null;
    const convertedAmount = convertToBaseCurrency(parseFloat(inv.total_amount || inv.amount || 0), inv.currency || baseCurrency, baseCurrency, inv.exchange_rate).convertedAmount;
    if (!dueDate) { agingBuckets.current += convertedAmount; return; }
    const diffDays = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) agingBuckets.current += convertedAmount;
    else if (diffDays <= 30) agingBuckets["1-30"] += convertedAmount;
    else if (diffDays <= 60) agingBuckets["31-60"] += convertedAmount;
    else if (diffDays <= 90) agingBuckets["61-90"] += convertedAmount;
    else agingBuckets["90+"] += convertedAmount;
  });
  const agingChartData = [
    { name: "Current", value: agingBuckets.current, color: "#10b981" },
    { name: "1-30 Days", value: agingBuckets["1-30"], color: "#eab308" },
    { name: "31-60 Days", value: agingBuckets["31-60"], color: "#f59e0b" },
    { name: "61-90 Days", value: agingBuckets["61-90"], color: "#f97316" },
    { name: "90+ Days", value: agingBuckets["90+"], color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const colStatuses = ["open", "in_progress", "resolved", "closed", "escalated"];
  const colStatusData = colStatuses.map((s) => ({
    name: s.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    value: collectionsCases.filter((c) => c.status === s).length,
  })).filter((d) => d.value > 0);

  const dunStatuses = ["active", "resolved", "closed"];
  const dunStatusData = dunStatuses.map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: dunningCases.filter((c) => c.status === s).length,
  })).filter((d) => d.value > 0);

  const CREDIT_STATUS_COLORS = { draft: "#6b7280", issued: "#3b82f6", applied: "#10b981", voided: "#ef4444" };
  const creditStatusData = ["draft", "issued", "applied", "voided"].map((s) => ({
    name: s.charAt(0).toUpperCase() + s.slice(1),
    value: credits.filter((c) => c.status === s).length,
    color: CREDIT_STATUS_COLORS[s] || "#6b7280",
  })).filter((d) => d.value > 0);

  const recoveryRate = collectionsCases.length > 0
    ? Math.round((collectionsCases.filter((c) => c.status === "resolved" || c.status === "closed").length / collectionsCases.length) * 100)
    : 0;

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

  if (loading) {
    return (
      <HRPage title="Payment Reports" subtitle="Payment analytics and reporting">
        <Spinner />
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="Payment Reports" subtitle="Error loading data">
        <ErrorState message={error} onRetry={fetchAll} />
      </HRPage>
    );
  }

  return (
    <HRPage title="Payment Reports" subtitle="Comprehensive payment and receivables analytics">
      <div className="flex items-center justify-between mb-6">
        {renderTabNav()}
        <button onClick={refreshAll} disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 whitespace-nowrap">{formatCurrency(totalCollected, baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">{completed.length} completed payments</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Refunded</p>
              <p className="text-2xl font-bold text-red-600 mt-1 whitespace-nowrap">{formatCurrency(totalRefunded, baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">{refunds.length} refunds</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Cash Flow</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 whitespace-nowrap">{formatCurrency(netCashflow, baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">Collected minus refunds</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Outstanding</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 whitespace-nowrap">{formatCurrency(totalOutstanding, baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">{invoices.length} invoices</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Payment Status Distribution</h3>
                <button onClick={() => downloadJSON(paymentStatusData, "payment-status-distribution.json")}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Export"><Download size={15} /></button>
              </div>
              {paymentStatusData.length === 0 ? <EmptyState icon={PieChartIcon} title="No payment data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={paymentStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {paymentStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Payment Value by Status</h3>
                <button onClick={() => downloadJSON(paymentValueByStatus, "payment-value-by-status.json")}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Export"><Download size={15} /></button>
              </div>
              {paymentValueByStatus.length === 0 ? <EmptyState icon={BarChart3} title="No value data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={paymentValueByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, baseCurrency)} />
                    <Tooltip formatter={(v) => [formatCurrency(v, baseCurrency)]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {paymentValueByStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {monthlyChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Monthly Cash Flow</h3>
                <button onClick={() => downloadCSV(monthlyChartData.map((d) => [d.month, d.value.toFixed(2), d.refunds.toFixed(2), d.net.toFixed(2)]), ["Month", "Collected", "Refunds", "Net"], "monthly-cashflow.csv")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"><Download className="h-3.5 w-3.5" /> CSV</button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} /><stop offset="95%" stopColor="#7c3aed" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, baseCurrency)} />
                  <Tooltip formatter={(v) => [formatCurrency(v, baseCurrency)]} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" fill="url(#colorCollected)" strokeWidth={2} name="Collected" />
                  <Area type="monotone" dataKey="net" stroke="#7c3aed" fill="url(#colorNet)" strokeWidth={2} name="Net" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {activeTab === "collection" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cases</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{collectionsCases.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Cases</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{collectionsCases.filter((c) => c.status === "open" || c.status === "in_progress").length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Escalated</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{collectionsCases.filter((c) => c.status === "escalated").length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Collections Case Status</h3>
              {colStatusData.length === 0 ? <EmptyState icon={BarChart3} title="No case data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={colStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Cases" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Dunning Case Status</h3>
              {dunStatusData.length === 0 ? <EmptyState icon={BarChart3} title="No dunning data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dunStatusData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cases" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "aging" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Aging Distribution</h3>
              <button onClick={() => downloadJSON(agingChartData, "aging-distribution.json")}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600" title="Export"><Download size={15} /></button>
            </div>
            {agingChartData.length === 0 ? <EmptyState icon={PieChartIcon} title="No aging data" /> : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={agingChartData} cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {agingChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [formatCurrency(v, baseCurrency)]} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {agingChartData.map((a) => (
              <div key={a.name} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <div className="w-3 h-3 rounded-full mx-auto mb-1.5" style={{ backgroundColor: a.color }} />
                <p className="text-lg font-bold text-gray-900">{formatCurrency(a.value, baseCurrency)}</p>
                <p className="text-xs text-gray-500">{a.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "outstanding" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Outstanding</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 whitespace-nowrap">{formatCurrency(totalOutstanding, baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">{invoices.length} invoices</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Available Credits</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 whitespace-nowrap">{formatCurrency(totalCredits, baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">{credits.filter((c) => c.status === "issued").length} issued</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Receivable</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 whitespace-nowrap">{formatCurrency(Math.max(0, totalOutstanding - totalCredits), baseCurrency)}</p>
              <p className="text-xs text-gray-400 mt-1">Outstanding minus credits</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Outstanding Over Time</h3>
            {monthlyChartData.length === 0 ? <EmptyState icon={BarChart3} title="No trend data" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, baseCurrency)} />
                  <Tooltip formatter={(v) => [formatCurrency(v, baseCurrency)]} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Collected" />
                  <Bar dataKey="refunds" fill="#ef4444" radius={[4, 4, 0, 0]} name="Refunds" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {activeTab === "credit" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Credits</p>
              <p className="text-2xl font-bold text-gray-900 mt-1 whitespace-nowrap">{credits.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Credit Value</p>
              <p className="text-2xl font-bold text-blue-600 mt-1 whitespace-nowrap">{formatCurrency(sumInBaseCurrency(credits, baseCurrency).total, baseCurrency)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Refunds</p>
              <p className="text-2xl font-bold text-red-600 mt-1 whitespace-nowrap">{refunds.length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Refund Value</p>
              <p className="text-2xl font-bold text-red-600 mt-1 whitespace-nowrap">{formatCurrency(totalRefunded, baseCurrency)}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Credit Status</h3>
              {creditStatusData.length === 0 ? <EmptyState icon={PieChartIcon} title="No credit data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={creditStatusData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {creditStatusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, "Count"]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Refund Summary</h3>
              <div className="space-y-4">
                {[
                  { label: "Completed Refunds", value: refunds.filter((r) => r.status === "completed").length, total: refunds.length, color: "bg-emerald-400" },
                  { label: "Pending Refunds", value: refunds.filter((r) => r.status === "pending").length, total: refunds.length, color: "bg-amber-400" },
                  { label: "Failed Refunds", value: refunds.filter((r) => r.status === "failed").length, total: refunds.length, color: "bg-red-400" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{m.label}</span>
                      <span className="font-semibold text-gray-900">{m.value}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`rounded-full h-2 transition-all ${m.color}`} style={{ width: `${m.total > 0 ? (m.value / m.total) * 100 : 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "recovery" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recovery Rate</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{recoveryRate}%</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved Cases</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{collectionsCases.filter((c) => c.status === "resolved" || c.status === "closed").length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Dunning</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">{dunningCases.filter((c) => c.status === "active").length}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Resolved Dunning</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{dunningCases.filter((c) => c.status === "resolved").length}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Case Resolution Overview</h3>
              <p className="text-xs text-gray-400 mb-4">Collections and dunning case resolution metrics</p>
              <div className="space-y-4">
                {[
                  { label: "Collection Resolved", pct: collectionsCases.length > 0 ? (collectionsCases.filter((c) => c.status === "resolved").length / collectionsCases.length) * 100 : 0, color: "bg-emerald-400" },
                  { label: "Collection Open", pct: collectionsCases.length > 0 ? (collectionsCases.filter((c) => c.status === "open" || c.status === "in_progress").length / collectionsCases.length) * 100 : 0, color: "bg-amber-400" },
                  { label: "Dunning Resolved", pct: dunningCases.length > 0 ? (dunningCases.filter((c) => c.status === "resolved").length / dunningCases.length) * 100 : 0, color: "bg-emerald-400" },
                  { label: "Dunning Active", pct: dunningCases.length > 0 ? (dunningCases.filter((c) => c.status === "active").length / dunningCases.length) * 100 : 0, color: "bg-blue-400" },
                ].map((m) => (
                  <div key={m.label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">{m.label}</span>
                      <span className="font-semibold text-gray-900">{m.pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`rounded-full h-2 transition-all ${m.color}`} style={{ width: `${Math.min(m.pct, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Dunning Level Distribution</h3>
              {dunningCases.length === 0 ? <EmptyState icon={BarChart3} title="No dunning data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={[1, 2, 3, 4, 5].map((l) => ({
                    level: `Level ${l}`,
                    count: dunningCases.filter((c) => c.current_level === l).length,
                  })).filter((d) => d.count > 0)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="level" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Cases" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "cashflow" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Collected</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 whitespace-nowrap">{formatCurrency(totalCollected, baseCurrency)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Refunded</p>
              <p className="text-2xl font-bold text-red-600 mt-1 whitespace-nowrap">{formatCurrency(totalRefunded, baseCurrency)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Net Cash Flow</p>
              <p className="text-2xl font-bold text-violet-600 mt-1 whitespace-nowrap">{formatCurrency(netCashflow, baseCurrency)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Count</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{payments.length}</p>
            </div>
          </div>
          {monthlyChartData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-900">Monthly Trend</h3>
                <button onClick={() => downloadCSV(monthlyChartData.map((d) => [d.month, d.count, d.value.toFixed(2)]), ["Month", "Count", "Value"], "monthly-payments.csv")}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"><Download className="h-3.5 w-3.5" /> CSV</button>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, baseCurrency)} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, name) => [name === "count" ? v : formatCurrency(v, baseCurrency)]} />
                  <Line yAxisId="left" type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} name="Collected" />
                  <Line yAxisId="right" type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} name="Count" />
                  <Line yAxisId="left" type="monotone" dataKey="net" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Net" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Payment Summary</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Month</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Payments</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Collected</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Refunds</th>
                    <th className="text-right py-3 px-3 font-medium text-gray-500 text-xs uppercase tracking-wider">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyChartData.slice(-12).reverse().map((m) => (
                    <tr key={m.month} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-3 px-3 font-medium text-gray-900">{m.month}</td>
                      <td className="py-3 px-3 text-right text-gray-600">{m.count}</td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600">{formatCurrency(m.value, baseCurrency)}</td>
                      <td className="py-3 px-3 text-right font-medium text-red-600">{formatCurrency(m.refunds, baseCurrency)}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">{formatCurrency(m.net, baseCurrency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </HRPage>
  );
}
