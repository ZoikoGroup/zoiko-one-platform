import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Download, RefreshCw, AlertCircle, FileText, DollarSign, Receipt, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import HRPage from "../../../components/HRPage";
import {
  dashboardApi, invoiceApi, paymentApi, taxApi, subscriptionApi
} from "../../../service/billingService";
import { extractArray } from "../../../utils/billing-helpers";
import { formatCurrency, formatCompactCurrency } from "../../../utils/locale";
import { useCurrency } from "../utils/CurrencyContext";
import { sumInBaseCurrency, convertToBaseCurrency } from "../../../utils/currency-conversion";

const CHART_COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];

class ChartErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.error("Chart Error:", error);
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

function ReportSection({ title, icon: Icon, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white flex items-center justify-center">
          <Icon size={22} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, data }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 bg-slate-50 rounded-xl">
        <p className="text-slate-400 text-sm">No data available</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/70">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.slice(0, 10).map((row, idx) => (
            <tr key={row.id ?? idx} className="hover:bg-slate-50/80 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReportsPage() {
  const { baseCurrency, currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeReport, setActiveReport] = useState("revenue");

  const [revenueData, setRevenueData] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [taxData, setTaxData] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  const fetchReports = useCallback(async () => {
    try {
      setError(null);
      if (!loading) setRefreshing(true);

      const results = await Promise.allSettled([
        dashboardApi.getMonthlyRevenue(12),
        invoiceApi.list({ per_page: 100 }),
        paymentApi.list({ per_page: 100 }),
        taxApi.getSummary(),
        subscriptionApi.list({ per_page: 100 }),
      ]);

      const [revenueResult, invoiceResult, paymentResult, taxResult, subResult] = results;

      const safe = (result, transform) =>
        result.status === "fulfilled" ? (transform ? transform(result.value) : result.value) : null;

      const errors = results.filter((r) => r.status === "rejected");
      if (errors.length > 0) console.warn(`${errors.length} report(s) failed to load`);

      setRevenueData(safe(revenueResult, extractArray) || []);
      setInvoices(safe(invoiceResult, extractArray) || []);
      setPayments(safe(paymentResult, extractArray) || []);
      setTaxData(safe(taxResult, extractArray) || []);
      setSubscriptions(safe(subResult, extractArray) || []);
    } catch (err) {
      console.error("Reports fetch error:", err);
      setError("Failed to load reports data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  useEffect(() => {
    fetchReports();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const handleExport = (section) => {
    const dataMap = { revenue: revenueData, invoice: invoices, payment: payments, tax: taxData, subscription: subscriptions };
    const data = dataMap[section] || [];
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `billing-${section}-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const reportTabs = [
    { id: "revenue", label: "Revenue Report", icon: DollarSign },
    { id: "invoice", label: "Invoice Report", icon: FileText },
    { id: "payment", label: "Payment Report", icon: Receipt },
    { id: "tax", label: "Tax Report", icon: BarChart3 },
    { id: "subscription", label: "Subscription Report", icon: TrendingUp },
  ];

  const renderRevenueReport = () => (
    <ReportSection title="Revenue Report" icon={DollarSign}>
      <div className="mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Revenue</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1 whitespace-nowrap">{formatCurrency(sumInBaseCurrency(revenueData.map(r => ({ amount: r.revenue, currency: r.currency, exchange_rate: r.exchange_rate })), baseCurrency).total, baseCurrency)}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Periods</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{revenueData.length}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Average Monthly</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1 whitespace-nowrap">{revenueData.length > 0 ? formatCurrency(sumInBaseCurrency(revenueData.map(r => ({ amount: r.revenue, currency: r.currency, exchange_rate: r.exchange_rate })), baseCurrency).total / revenueData.length, baseCurrency) : `${currencySymbol}0.00`}</p>
          </div>
        </div>
        <ChartErrorBoundary>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey={revenueData[0]?.month ? "month" : "period"} tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v, baseCurrency)} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(v) => formatCurrency(v, baseCurrency)} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-slate-50/50 rounded-xl border border-slate-100">
              <BarChart3 className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm font-medium">No revenue data recorded</p>
            </div>
          )}
        </ChartErrorBoundary>
      </div>
      <button onClick={() => handleExport("revenue")} className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-xl text-xs font-semibold hover:bg-[#FF5500] transition-colors shadow-sm">
        <Download size={15} /> Export Revenue Report
      </button>
    </ReportSection>
  );

  const renderInvoiceReport = () => {
    const byStatus = invoices.reduce((acc, inv) => {
      const s = inv.status || "unassigned";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    const totalAmount = sumInBaseCurrency(invoices, baseCurrency).total;
    const paidAmount = sumInBaseCurrency(invoices.filter((inv) => inv.status === "paid"), baseCurrency).total;

    const columns = [
      { key: "id", label: "Invoice" },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer?.name || r.customer_display_name || (r.customer_id ? `Customer #${r.customer_id}` : "Unassigned Customer") },
      { key: "total", label: "Amount", render: (r) => <span className="whitespace-nowrap font-medium text-slate-900">{formatCurrency(r.total || r.amount, baseCurrency)}</span> },
      { key: "status", label: "Status", render: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 capitalize">{r.status || "—"}</span> },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
    ];

    return (
      <ReportSection title="Invoice Report" icon={FileText}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invoices</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{invoices.length}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1 whitespace-nowrap">{formatCurrency(totalAmount, baseCurrency)}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Amount</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1 whitespace-nowrap">{formatCurrency(paidAmount, baseCurrency)}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Collection Rate</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{totalAmount > 0 ? `${((paidAmount / totalAmount) * 100).toFixed(1)}%` : "0%"}</p>
          </div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6 mb-6">
          <ChartErrorBoundary>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ percent }) => (percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : "")}
                  >
                    {statusData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, `Invoices (${name})`]} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 bg-slate-50/50 rounded-xl border border-slate-100 p-6 text-center">
                <FileText className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-slate-700 text-sm font-bold">No invoices found</p>
                <p className="text-slate-400 text-xs mt-1">There are no invoices for the selected period.</p>
              </div>
            )}
          </ChartErrorBoundary>
          <DataTable columns={columns} data={invoices.slice(0, 10)} />
        </div>
        <button onClick={() => handleExport("invoice")} className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-xl text-xs font-semibold hover:bg-[#FF5500] transition-colors shadow-sm">
          <Download size={15} /> Export Invoice Report
        </button>
      </ReportSection>
    );
  };

  const renderPaymentReport = () => {
    const totalAmount = sumInBaseCurrency(payments, baseCurrency).total;
    const byMethod = payments.reduce((acc, p) => {
      const m = p.method || p.payment_method || "Other";
      const { convertedAmount } = convertToBaseCurrency(p.amount || 0, p.currency || baseCurrency, baseCurrency, p.exchange_rate);
      acc[m] = (acc[m] || 0) + convertedAmount;
      return acc;
    }, {});
    const methodData = Object.entries(byMethod).map(([name, value]) => ({ name, value }));

    const columns = [
      { key: "id", label: "Payment" },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer?.name || r.customer_display_name || (r.customer_id ? `Customer #${r.customer_id}` : "Unassigned Customer") },
      { key: "amount", label: "Amount", render: (r) => <span className="whitespace-nowrap font-medium text-slate-900">{formatCurrency(r.amount, baseCurrency)}</span> },
      { key: "method", label: "Method" },
      { key: "status", label: "Status", render: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 capitalize">{r.status || "Completed"}</span> },
    ];

    return (
      <ReportSection title="Payment Report" icon={Receipt}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Payments</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{payments.length}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1 whitespace-nowrap">{formatCurrency(totalAmount, baseCurrency)}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Methods</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{methodData.length}</p>
          </div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6 mb-6">
          <ChartErrorBoundary>
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}>
                    {methodData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                    <Tooltip formatter={(v) => [formatCurrency(v, baseCurrency), "Payments"]} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-slate-50/50 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-sm font-medium">No payment method records</p>
              </div>
            )}
          </ChartErrorBoundary>
          <DataTable columns={columns} data={payments.slice(0, 10)} />
        </div>
        <button onClick={() => handleExport("payment")} className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-xl text-xs font-semibold hover:bg-[#FF5500] transition-colors shadow-sm">
          <Download size={15} /> Export Payment Report
        </button>
      </ReportSection>
    );
  };

  const renderTaxReport = () => {
    const columns = [
      { key: "jurisdiction", label: "Jurisdiction" },
      { key: "rate", label: "Rate", render: (r) => r.rate ? `${r.rate}%` : "—" },
      { key: "collected", label: "Collected", render: (r) => <span className="whitespace-nowrap font-medium text-slate-900">{formatCurrency(r.collected || r.amount || 0, baseCurrency)}</span> },
    ];

    return (
      <ReportSection title="Tax Report" icon={BarChart3}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax Rates</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{taxData.length}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Collected</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1 whitespace-nowrap">{formatCurrency(sumInBaseCurrency(taxData.map(t => ({ amount: t.collected || t.amount, currency: t.currency, exchange_rate: t.exchange_rate })), baseCurrency).total, baseCurrency)}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Jurisdictions</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{new Set(taxData.map((t) => t.jurisdiction)).size}</p>
          </div>
        </div>
        <ChartErrorBoundary>
          {taxData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taxData} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="jurisdiction" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tickFormatter={(v) => formatCompactCurrency(v, baseCurrency)} tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(v) => formatCurrency(v, baseCurrency)} />
                <Bar dataKey="collected" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-slate-50/50 rounded-xl border border-slate-100 mb-6">
              <p className="text-slate-400 text-sm font-medium">No tax data available</p>
            </div>
          )}
        </ChartErrorBoundary>
        <div className="mt-6">
          <DataTable columns={columns} data={taxData} />
        </div>
        <button onClick={() => handleExport("tax")} className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-xl text-xs font-semibold hover:bg-[#FF5500] transition-colors shadow-sm">
          <Download size={15} /> Export Tax Report
        </button>
      </ReportSection>
    );
  };

  const renderSubscriptionReport = () => {
    const byPlan = subscriptions.reduce((acc, sub) => {
      const plan = sub.plan_name || sub.plan?.name || sub.plan || (sub.plan_id ? `Plan #${sub.plan_id}` : "No Plan Assigned");
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});
    const planData = Object.entries(byPlan).map(([name, value]) => ({ name, value }));

    const columns = [
      { key: "id", label: "Subscription" },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer?.name || r.customer_display_name || (r.customer_id ? `Customer #${r.customer_id}` : "Unassigned Customer") },
      { key: "plan_name", label: "Plan", render: (r) => r.plan_name || r.plan?.name || r.plan || (r.plan_id ? `Plan #${r.plan_id}` : "Unassigned Plan") },
      { key: "status", label: "Status", render: (r) => <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 capitalize">{r.status || "Active"}</span> },
    ];

    return (
      <ReportSection title="Subscription Report" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Subscriptions</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{subscriptions.length}</p>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unique Plans</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{planData.length}</p>
          </div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6 mb-6">
          <ChartErrorBoundary>
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ percent }) => (percent >= 0.05 ? `${(percent * 100).toFixed(0)}%` : "")}
                  >
                    {planData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, name) => [v, `Subscriptions (${name})`]} />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-slate-600 font-medium">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-slate-50/50 rounded-xl border border-slate-100">
                <p className="text-slate-400 text-sm font-medium">No subscription distribution data</p>
              </div>
            )}
          </ChartErrorBoundary>
          <DataTable columns={columns} data={subscriptions.slice(0, 10)} />
        </div>
        <button onClick={() => handleExport("subscription")} className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-xl text-xs font-semibold hover:bg-[#FF5500] transition-colors shadow-sm">
          <Download size={15} /> Export Subscription Report
        </button>
      </ReportSection>
    );
  };

  if (loading) {
    return (
      <HRPage title="Billing Reports" subtitle="Generate and export billing reports">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-[#FF7A00] animate-spin" />
          </div>
          <p className="mt-4 text-slate-500 text-sm font-medium">Loading reports...</p>
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="Billing Reports" subtitle="Generate and export billing reports">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-14 w-14 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-3">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Unable to load reports</h3>
          <p className="text-slate-500 text-sm mb-6 text-center max-w-md">{error}</p>
          <button onClick={handleRefresh}
            className="px-5 py-2.5 bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white rounded-xl text-xs font-semibold hover:shadow-md transition-all flex items-center gap-2">
            <RefreshCw size={14} /> Try Again
          </button>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Billing Reports" subtitle="Generate and export billing reports">
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            {reportTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  activeReport === tab.id ? "bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}>
                <tab.icon size={15} />
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors disabled:opacity-50" aria-label="Refresh reports">
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>

        {activeReport === "revenue" && renderRevenueReport()}
        {activeReport === "invoice" && renderInvoiceReport()}
        {activeReport === "payment" && renderPaymentReport()}
        {activeReport === "tax" && renderTaxReport()}
        {activeReport === "subscription" && renderSubscriptionReport()}
      </div>
    </HRPage>
  );
}
