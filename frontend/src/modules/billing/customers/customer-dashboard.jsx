import { useState, useEffect, useMemo } from "react";
import { Users, DollarSign, FileText, TrendingUp, Clock, CheckCircle, AlertCircle, Calendar, Building2, BarChart3, Download, RefreshCw } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import HRPage from "../../../components/HRPage";
import { customerApi, invoiceApi, paymentApi, dashboardApi } from "../../../service/billingService";

const STATUS_COLORS = {
  active: "#10b981",
  inactive: "#6b7280",
  suspended: "#f59e0b",
  pending: "#3b82f6",
};

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
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(num);
};

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendValue }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      {trend !== null && (
        <div className="flex items-center gap-1 mt-4">
          <TrendingUp className={`h-4 w-4 ${trend === "up" ? "text-green-600" : "text-red-600"}`} />
          <span className={`text-sm font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>{trendValue > 0 ? "+" : ""}{trendValue}%</span>
          <span className="text-sm text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
      <p className="text-sm text-red-600 mb-3">{message || "Failed to load data"}</p>
      {onRetry && (
        <button onClick={onRetry} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
          <RefreshCw className="h-4 w-4" /> Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-10 w-10 text-gray-300 mb-3" />
      <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
      {message && <p className="text-xs text-gray-400">{message}</p>}
    </div>
  );
}

export default function CustomerDashboard() {
  const [refreshing, setRefreshing] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [errorCustomers, setErrorCustomers] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [errorInvoices, setErrorInvoices] = useState(null);

  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [errorPayments, setErrorPayments] = useState(null);

  const [dashboardFull, setDashboardFull] = useState(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [errorRevenue, setErrorRevenue] = useState(null);
  const [errorDashboard, setErrorDashboard] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      setErrorCustomers(null);
      setErrorInvoices(null);
      setErrorPayments(null);
      setErrorRevenue(null);
      setErrorDashboard(null);

      const [dashboardData, customersData, invoicesData, paymentsData] = await Promise.allSettled([
        dashboardApi.getFull(),
        customerApi.list({ per_page: 100 }),
        invoiceApi.list({ per_page: 100 }),
        paymentApi.list({ per_page: 100 }),
      ]);

      setDashboardFull(dashboardData.status === "fulfilled" ? dashboardData.value : null);
      setCustomers(extractArray(customersData.status === "fulfilled" ? customersData.value : { items: [] }));
      setInvoices(extractArray(invoicesData.status === "fulfilled" ? invoicesData.value : { items: [] }));
      setPayments(extractArray(paymentsData.status === "fulfilled" ? paymentsData.value : { items: [] }));

      if (dashboardData.status === "rejected") setErrorDashboard(dashboardData.reason?.message || "Failed to load dashboard data");
      if (customersData.status === "rejected") setErrorCustomers(customersData.reason?.message || "Failed to load customers");
      if (invoicesData.status === "rejected") setErrorInvoices(invoicesData.reason?.message || "Failed to load invoices");
      if (paymentsData.status === "rejected") setErrorPayments(paymentsData.reason?.message || "Failed to load payments");
    } catch (err) {
      setErrorDashboard(`Dashboard error: ${err?.message || "Unknown"}`);
    } finally {
      setLoadingCustomers(false);
      setLoadingInvoices(false);
      setLoadingPayments(false);
      setLoadingRevenue(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const statusCounts = useMemo(() => ({
    active: customers.filter(c => c.status === "active").length,
    inactive: customers.filter(c => c.status === "inactive").length,
    suspended: customers.filter(c => c.status === "suspended").length,
    pending: customers.filter(c => c.status === "pending").length,
  }), [customers]);

  const paidInvoices = useMemo(() => invoices.filter(i => i.status === "paid"), [invoices]);
  const unpaidInvoices = useMemo(() => invoices.filter(i => i.status === "unpaid" || i.status === "pending"), [invoices]);
  const overdueInvoices = useMemo(() => invoices.filter(i => i.status === "overdue"), [invoices]);

  const totalRevenue = useMemo(() => paidInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0), [paidInvoices]);
  const totalOutstanding = useMemo(() => unpaidInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0) +
    overdueInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0), [unpaidInvoices, overdueInvoices]);

  const customerGrowthData = useMemo(() => {
    const months = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      let count = 0;
      customers.forEach(c => {
        const created = new Date(c.created_at || c.createdAt);
        if (created.toLocaleString('en-US', { month: 'short', year: 'numeric' }) === monthStr) count++;
      });
      months.push({ month: monthStr, customers: count, cumulative: count });
    }
    for (let i = 1; i < months.length; i++) months[i].cumulative = months[i].cumulative + months[i - 1].cumulative;
    return months;
  }, [customers]);

  const backendMonthlyRevenueData = useMemo(() => {
    const backendRevenue = dashboardFull?.monthly_revenue?.monthly_revenue;
    if (!Array.isArray(backendRevenue)) return [];
    return backendRevenue.map((item) => ({
      month: `${item.month} ${item.year}`,
      revenue: Number(item.revenue) || 0,
    }));
  }, [dashboardFull]);

  const monthlyRevenueData = useMemo(() => {
    if (backendMonthlyRevenueData.length > 0) return backendMonthlyRevenueData;
    const revenueByMonth = {};
    invoices.forEach(inv => {
      if (inv.status !== "paid") return;
      const month = new Date(inv.issue_date || inv.date || inv.created_at).toLocaleString('en-US', { month: 'short', year: 'numeric' });
      revenueByMonth[month] = (revenueByMonth[month] || 0) + (parseFloat(inv.total) || 0);
    });
    const existingMonths = customerGrowthData.map(m => m.month);
    return existingMonths.map(month => ({
      month,
      revenue: revenueByMonth[month] || 0,
    }));
  }, [invoices, customerGrowthData, backendMonthlyRevenueData]);

  const topCustomersByRevenue = useMemo(() => {
    const revenueByCustomer = {};
    invoices.forEach(inv => {
      if (inv.status !== "paid") return;
      const cid = inv.customer_id;
      const cname = inv.customer_name || inv.customer?.name || `Customer #${cid}`;
      if (!cid) return;
      revenueByCustomer[cname] = (revenueByCustomer[cname] || 0) + (parseFloat(inv.total) || 0);
    });
    return Object.entries(revenueByCustomer)
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [invoices]);

  const statusChartData = useMemo(() =>
    Object.entries(statusCounts)
      .filter(([_, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] || "#gray" })),
    [statusCounts]
  );

  const revenueTrendValue = useMemo(() => {
    if (monthlyRevenueData.length < 2) return null;
    const last = monthlyRevenueData[monthlyRevenueData.length - 1].revenue || 0;
    const previous = monthlyRevenueData[monthlyRevenueData.length - 2].revenue || 0;
    if (previous === 0) return null;
    return Math.round(((last - previous) / previous) * 100);
  }, [monthlyRevenueData]);

  const StatCards = useMemo(() => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      <StatCard
        title="Total Customers"
        value={customers.length}
        subtitle={dashboardFull?.customer_summary?.by_status ? `Active: ${dashboardFull.customer_summary.by_status.active || 0}, Inactive: ${dashboardFull.customer_summary.by_status.inactive || 0}` : "Customer total from backend data"}
        icon={Users}
        color="bg-violet-500"
      />
      <StatCard
        title="Active Customers"
        value={dashboardFull?.customer_summary?.total_active_customers ?? statusCounts.active}
        subtitle={Math.round(((dashboardFull?.customer_summary?.total_active_customers ?? statusCounts.active) / Math.max(customers.length, 1)) * 100) + "% of total"}
        icon={Users}
        color="bg-green-500"
      />
      <StatCard
        title="Total Revenue"
        value={formatCurrency(dashboardFull?.kpis?.total_revenue ?? totalRevenue)}
        subtitle="From backend invoice data"
        icon={DollarSign}
        color="bg-blue-500"
        trend={revenueTrendValue !== null ? (revenueTrendValue >= 0 ? "up" : "down") : null}
        trendValue={revenueTrendValue !== null ? Math.abs(revenueTrendValue) : 0}
      />
      <StatCard
        title="Outstanding"
        value={formatCurrency(dashboardFull?.kpis?.outstanding_amount ?? totalOutstanding)}
        subtitle="Unpaid + overdue"
        icon={DollarSign}
        color="bg-amber-500"
      />
      <StatCard
        title="Invoices Issued"
        value={dashboardFull?.kpis?.total_invoices ?? invoices.length}
        subtitle="Total invoices generated"
        icon={FileText}
        color="bg-purple-500"
      />
      <StatCard
        title="Pending Payments"
        value={unpaidInvoices.length}
        subtitle="Awaiting payment"
        icon={Clock}
        color="bg-orange-500"
      />
    </div>
  ), [customers, statusCounts, totalRevenue, totalOutstanding, invoices, unpaidInvoices, dashboardFull, revenueTrendValue]);

  const ChartsSection = useMemo(() => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Status Distribution</h3>
          {statusChartData.length === 0 ? (
            <EmptyState icon={Users} title="No status data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={100} innerRadius={60} paddingAngle={3} dataKey="value" label={function(d) { return d.name + ": " + d.value; }}>
                  {statusChartData.map(function(entry, i) { return <Cell key={i} fill={entry.color} />; })}
                </Pie>
                <Tooltip formatter={function(value) { return [value + " customers", "Customers"]; }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Customer Growth Trend</h3>
          {customerGrowthData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No growth data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={customerGrowthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="cumulative" stroke="#7c3aed" fill="#c4b5fd" strokeWidth={2} name="Total Customers" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          {monthlyRevenueData.length === 0 ? (
            <EmptyState icon={DollarSign} title="No revenue data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={function(v) { return "$" + (v / 1000).toFixed(0) + "k"; }} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Customers by Revenue</h3>
          {topCustomersByRevenue.length === 0 ? (
            <EmptyState icon={Users} title="No customer revenue data" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={topCustomersByRevenue} layout="vertical" margin={{ left: 120 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={function(v) { return "$" + (v / 1000).toFixed(0) + "k"; }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  ), [statusChartData, customerGrowthData, monthlyRevenueData, topCustomersByRevenue]);

  if (loadingCustomers && invoices.length === 0) {
    return (
      <HRPage title="Customer Dashboard" subtitle="Customer analytics, KPIs, and performance metrics">
        <Spinner />
      </HRPage>
    );
  }

  return (
    <HRPage title="Customer Dashboard" subtitle="Customer analytics, KPIs, and performance metrics">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Real-time customer metrics, analytics, and performance insights.</p>
          </div>
          <button onClick={fetchDashboardData} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {(errorDashboard || errorCustomers || errorInvoices || errorPayments || errorRevenue) && (
          <div className="mb-4 p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {errorDashboard || errorCustomers || errorInvoices || errorPayments || errorRevenue}
          </div>
        )}

        {StatCards}

        {ChartsSection}

        {(loadingInvoices || loadingPayments || loadingRevenue) && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
            <span className="ml-3 text-sm text-gray-500">Updating metrics...</span>
          </div>
        )}
      </div>
    </HRPage>
  );
}
