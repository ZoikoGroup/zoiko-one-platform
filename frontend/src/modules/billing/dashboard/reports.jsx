import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Download, RefreshCw, AlertCircle, FileText, Calendar, DollarSign, Receipt, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import HRPage from "../../../components/HRPage";
import {
  dashboardApi, invoiceApi, paymentApi, taxApi, subscriptionApi
} from "../../../service/billingService";





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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(num);
};

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
        <div className="flex flex-col items-center justify-center h-64 bg-red-50 rounded-lg border border-red-200">
          <div className="text-red-500 text-lg font-medium mb-2">Chart Error</div>
          <div className="text-red-400 text-sm">Unable to render chart data</div>
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
      <div className="flex flex-col items-center justify-center py-8 bg-gray-50 rounded-xl">
        <p className="text-gray-400 text-sm">No data available</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(0, 10).map((row, idx) => (
            <tr key={row.id ?? idx} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
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
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(revenueData.reduce((sum, r) => sum + (r.revenue || 0), 0))}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Periods</p>
            <p className="text-2xl font-bold text-slate-800">{revenueData.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Average Monthly</p>
            <p className="text-2xl font-bold text-slate-800">{revenueData.length > 0 ? formatCurrency(revenueData.reduce((sum, r) => sum + (r.revenue || 0), 0) / revenueData.length) : "$0.00"}</p>
          </div>
        </div>
        <ChartErrorBoundary>
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey={revenueData[0]?.month ? "month" : "period"} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl">
              <p className="text-gray-400">No revenue data available</p>
            </div>
          )}
        </ChartErrorBoundary>
      </div>
      <button onClick={() => handleExport("revenue")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
        <Download size={16} /> Export Revenue Report
      </button>
    </ReportSection>
  );

  const renderInvoiceReport = () => {
    const byStatus = invoices.reduce((acc, inv) => {
      const s = inv.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
    const paidAmount = invoices.filter((inv) => inv.status === "paid").reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);

    const columns = [
      { key: "id", label: "Invoice" },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer?.name || "—" },
      { key: "total", label: "Amount", render: (r) => formatCurrency(r.total || r.amount) },
      { key: "status", label: "Status" },
      { key: "created_at", label: "Date", render: (r) => r.created_at ? new Date(r.created_at).toLocaleDateString() : "—" },
    ];

    return (
      <ReportSection title="Invoice Report" icon={FileText}>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Invoices</p>
            <p className="text-2xl font-bold text-slate-800">{invoices.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Paid Amount</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(paidAmount)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Collection Rate</p>
            <p className="text-2xl font-bold text-slate-800">{totalAmount > 0 ? `${((paidAmount / totalAmount) * 100).toFixed(1)}%` : "0%"}</p>
          </div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6 mb-6">
          <ChartErrorBoundary>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {statusData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                    <Tooltip />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                <p className="text-gray-400">No invoice data</p>
              </div>
            )}
          </ChartErrorBoundary>
          <DataTable columns={columns} data={invoices.slice(0, 10)} />
        </div>
        <button onClick={() => handleExport("invoice")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Download size={16} /> Export Invoice Report
        </button>
      </ReportSection>
    );
  };

  const renderPaymentReport = () => {
    const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const byMethod = payments.reduce((acc, p) => {
      const m = p.method || p.payment_method || "Other";
      acc[m] = (acc[m] || 0) + (p.amount || 0);
      return acc;
    }, {});
    const methodData = Object.entries(byMethod).map(([name, value]) => ({ name, value }));

    const columns = [
      { key: "id", label: "Payment" },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer?.name || "—" },
      { key: "amount", label: "Amount", render: (r) => formatCurrency(r.amount) },
      { key: "method", label: "Method" },
      { key: "status", label: "Status" },
    ];

    return (
      <ReportSection title="Payment Report" icon={Receipt}>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Payments</p>
            <p className="text-2xl font-bold text-slate-800">{payments.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Amount</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(totalAmount)}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Payment Methods</p>
            <p className="text-2xl font-bold text-slate-800">{methodData.length}</p>
          </div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6 mb-6">
          <ChartErrorBoundary>
            {methodData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={methodData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {methodData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                    <Tooltip formatter={(v) => formatCurrency(v)} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                <p className="text-gray-400">No payment data</p>
              </div>
            )}
          </ChartErrorBoundary>
          <DataTable columns={columns} data={payments.slice(0, 10)} />
        </div>
        <button onClick={() => handleExport("payment")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Download size={16} /> Export Payment Report
        </button>
      </ReportSection>
    );
  };

  const renderTaxReport = () => {
    const columns = [
      { key: "jurisdiction", label: "Jurisdiction" },
      { key: "rate", label: "Rate", render: (r) => r.rate ? `${r.rate}%` : "—" },
      { key: "collected", label: "Collected", render: (r) => formatCurrency(r.collected || r.amount || 0) },
    ];

    return (
      <ReportSection title="Tax Report" icon={BarChart3}>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Tax Rates</p>
            <p className="text-2xl font-bold text-slate-800">{taxData.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Collected</p>
            <p className="text-2xl font-bold text-slate-800">{formatCurrency(taxData.reduce((sum, t) => sum + (t.collected || t.amount || 0), 0))}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Jurisdictions</p>
            <p className="text-2xl font-bold text-slate-800">{new Set(taxData.map((t) => t.jurisdiction)).size}</p>
          </div>
        </div>
        <ChartErrorBoundary>
          {taxData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taxData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="jurisdiction" />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="collected" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl mb-6">
              <p className="text-gray-400">No tax data available</p>
            </div>
          )}
        </ChartErrorBoundary>
        <div className="mt-6">
          <DataTable columns={columns} data={taxData} />
        </div>
        <button onClick={() => handleExport("tax")} className="mt-4 flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Download size={16} /> Export Tax Report
        </button>
      </ReportSection>
    );
  };

  const renderSubscriptionReport = () => {
    const byPlan = subscriptions.reduce((acc, sub) => {
      const plan = sub.plan_name || sub.plan || "Unknown";
      acc[plan] = (acc[plan] || 0) + 1;
      return acc;
    }, {});
    const planData = Object.entries(byPlan).map(([name, value]) => ({ name, value }));
    const byStatus = subscriptions.reduce((acc, sub) => {
      const s = sub.status || "unknown";
      acc[s] = (acc[s] || 0) + 1;
      return acc;
    }, {});
    const statusData = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

    const columns = [
      { key: "id", label: "Subscription" },
      { key: "customer_name", label: "Customer", render: (r) => r.customer_name || r.customer?.name || "—" },
      { key: "plan_name", label: "Plan", render: (r) => r.plan_name || r.plan || "—" },
      { key: "status", label: "Status" },
    ];

    return (
      <ReportSection title="Subscription Report" icon={TrendingUp}>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Total Subscriptions</p>
            <p className="text-2xl font-bold text-slate-800">{subscriptions.length}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">Unique Plans</p>
            <p className="text-2xl font-bold text-slate-800">{planData.length}</p>
          </div>
        </div>
        <div className="grid xl:grid-cols-2 gap-6 mb-6">
          <ChartErrorBoundary>
            {planData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={planData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {planData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                    <Tooltip />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 bg-gray-50 rounded-xl">
                <p className="text-gray-400">No subscription data</p>
              </div>
            )}
          </ChartErrorBoundary>
          <DataTable columns={columns} data={subscriptions.slice(0, 10)} />
        </div>
        <button onClick={() => handleExport("subscription")} className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 transition-colors">
          <Download size={16} /> Export Subscription Report
        </button>
      </ReportSection>
    );
  };

  if (loading) {
    return (
      <HRPage title="Billing Reports" subtitle="Generate and export billing reports">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <div className="h-16 w-16 rounded-full border-4 border-slate-200 border-t-violet-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <RefreshCw size={24} className="text-violet-600" />
            </div>
          </div>
          <p className="mt-4 text-slate-600 font-medium">Loading reports...</p>
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="Billing Reports" subtitle="Generate and export billing reports">
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
      </HRPage>
    );
  }

  return (
    <HRPage title="Billing Reports" subtitle="Generate and export billing reports">
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-white border border-slate-200 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            {reportTabs.map((tab) => (
              <button key={tab.id} onClick={() => setActiveReport(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeReport === tab.id ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}>
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
          <button onClick={handleRefresh} disabled={refreshing}
            className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors disabled:opacity-50">
            <RefreshCw size={20} className={`${refreshing ? "animate-spin" : ""}`} />
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
