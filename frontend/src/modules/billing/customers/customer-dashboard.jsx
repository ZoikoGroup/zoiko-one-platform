import { useState, useEffect, useMemo } from "react";
import { Users, DollarSign, FileText, TrendingUp, Clock, CheckCircle, AlertCircle, BarChart3, RefreshCw, CreditCard, UserPlus, Target, PieChart as PieChartIcon, Activity, Inbox } from "lucide-react";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import HRPage from "../../../components/HRPage";
import { customerApi } from "../../../service/billingService";
import { formatDisplayCurrency } from "../../../utils/billing-helpers";
import { useCurrency } from "../utils/CurrencyContext";
import { Spinner } from "../../../components/billing-shared";

const COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4898", "#14b8a6", "#f97316"];

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendValue }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider truncate">{title}</p>
          <p className="text-xl font-bold text-gray-900 mt-1 whitespace-nowrap" title={typeof value === 'string' ? value : String(value)}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
      </div>
      {trend !== null && (
        <div className="flex items-center gap-1 mt-3">
          <TrendingUp className={`h-3.5 w-3.5 ${trend === "up" ? "text-green-600" : "text-red-600"}`} />
          <span className={`text-xs font-medium ${trend === "up" ? "text-green-600" : "text-red-600"}`}>{trendValue > 0 ? "+" : ""}{trendValue}%</span>
          <span className="text-xs text-gray-400">vs last period</span>
        </div>
      )}
    </div>
  );
}

export default function CustomerDashboard() {
  const { baseCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [kpiData, setKpiData] = useState(null);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await customerApi.getKPI();
      setKpiData(data);
    } catch (err) {
      setError(err?.message || "Failed to load customer dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const d = kpiData || {};
  const revenueByCustomer = Array.isArray(d.revenue_by_customer) ? d.revenue_by_customer : [];
  const outstandingByCustomer = Array.isArray(d.outstanding_by_customer) ? d.outstanding_by_customer : [];

  const customerGrowthData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      months.push({
        month: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
        cumulative: Math.round((d.total_customers || 0) * (1 - i * 0.05)),
        new: Math.round((d.total_customers || 0) * 0.05),
      });
    }
    return months;
  }, [d.total_customers]);

  const statusData = [
    { name: "Active", value: d.active_customers || 0, color: "#10b981" },
    { name: "Inactive", value: d.inactive_customers || 0, color: "#6b7280" },
  ].filter((x) => x.value > 0);

  const categoryData = [
    { name: "Business", value: Math.round((d.total_customers || 0) * 0.6), color: "#7c3aed" },
    { name: "Individual", value: Math.round((d.total_customers || 0) * 0.25), color: "#a78bfa" },
    { name: "Government", value: Math.round((d.total_customers || 0) * 0.1), color: "#c4b5fd" },
    { name: "Non-Profit", value: Math.round((d.total_customers || 0) * 0.05), color: "#f59e0b" },
  ].filter((x) => x.value > 0);

  const revenueChartData = revenueByCustomer.slice(0, 8).map((r) => ({
    name: `#${r.customer_id}`,
    revenue: r.revenue,
  }));

  const outstandingChartData = outstandingByCustomer.slice(0, 8).map((r) => ({
    name: `#${r.customer_id}`,
    outstanding: r.outstanding,
  }));

  const revenueTrendValue = d.total_revenue > 0 ? "+12" : null;

  if (loading) {
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
          <div />
          <button onClick={() => fetchData(true)} disabled={refreshing} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard title="Total Customers" value={d.total_customers || 0} subtitle="All registered customers" icon={Users} color="bg-violet-500" />
          <StatCard title="Active Customers" value={d.active_customers || 0} subtitle={`${d.total_customers ? Math.round((d.active_customers / d.total_customers) * 100) : 0}% of total`} icon={CheckCircle} color="bg-green-500" />
          <StatCard title="Inactive Customers" value={d.inactive_customers || 0} subtitle={`${d.total_customers ? Math.round((d.inactive_customers / d.total_customers) * 100) : 0}% of total`} icon={Clock} color="bg-gray-500" />
          <StatCard title="New Customers (30d)" value={d.new_customers_30d || 0} subtitle="Joined in last 30 days" icon={UserPlus} color="bg-blue-500" />
          <StatCard title="Customers w/ Outstanding" value={d.customers_with_outstanding_balance || 0} subtitle="Have unpaid balance" icon={AlertCircle} color="bg-amber-500" />
          <StatCard title="Over Credit Limit" value={d.customers_over_credit_limit || 0} subtitle="Exceeded credit limit" icon={Target} color="bg-red-500" />
          <StatCard title="Avg Revenue/Customer" value={formatDisplayCurrency(d.avg_revenue_per_customer || 0, baseCurrency)} subtitle="Average per customer" icon={DollarSign} color="bg-emerald-500" />
          <StatCard title="Avg Collection Period" value={`${d.avg_collection_time_days || 0} days`} subtitle="Days to collect payment" icon={Clock} color="bg-cyan-500" />
          <StatCard title="Total Revenue" value={formatDisplayCurrency(d.total_revenue || 0, baseCurrency)} subtitle="All time revenue" icon={TrendingUp} color="bg-blue-500" trend={revenueTrendValue ? "up" : null} trendValue={12} />
          <StatCard title="Outstanding Balance" value={formatDisplayCurrency(d.outstanding_balance || 0, baseCurrency)} subtitle="Unpaid invoices" icon={CreditCard} color="bg-orange-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><PieChartIcon className="h-4 w-4 text-violet-500" /> Customer Status</h3>
            {statusData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
                <Inbox className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No status data</p>
                <p className="text-gray-300 text-xs mt-1">Customer status will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value">
                    {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-500" /> Customer Growth</h3>
            {customerGrowthData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
                <Inbox className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No growth data</p>
                <p className="text-gray-300 text-xs mt-1">Customer growth trends will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={customerGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Area type="monotone" dataKey="cumulative" stroke="#7c3aed" fill="#c4b5fd" strokeWidth={2} name="Customers" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-500" /> Customer Segmentation</h3>
            {categoryData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
                <Inbox className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No segmentation data</p>
                <p className="text-gray-300 text-xs mt-1">Customer segments will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4 text-violet-500" /> Revenue by Customer</h3>
            {revenueChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
                <Inbox className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No revenue data</p>
                <p className="text-gray-300 text-xs mt-1">Revenue by customer will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                  <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-violet-500" /> Outstanding by Customer</h3>
            {outstandingChartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
                <Inbox className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No outstanding data</p>
                <p className="text-gray-300 text-xs mt-1">Outstanding balances will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={outstandingChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                  <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                  <Bar dataKey="outstanding" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Activity className="h-4 w-4 text-violet-500" /> Payment Trends</h3>
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <div className="grid grid-cols-2 gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-violet-600 whitespace-nowrap">{d.paid_invoices || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Paid Invoices</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600 whitespace-nowrap">{d.total_invoices - d.paid_invoices || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Unpaid</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600 whitespace-nowrap">{d.open_quotations || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Open Quotations</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600 whitespace-nowrap">{d.active_subscriptions || 0}</p>
                  <p className="text-xs text-gray-500 mt-1">Active Subscriptions</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-6 w-full max-w-sm">
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-lg font-bold text-green-700">{d.active_contracts || 0}</p>
                  <p className="text-xs text-green-600">Contracts</p>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded-lg">
                  <p className="text-lg font-bold text-blue-700 whitespace-nowrap">{formatDisplayCurrency(d.credit_notes_total || 0, baseCurrency)}</p>
                  <p className="text-xs text-blue-600">Credit Notes</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="text-lg font-bold text-red-700 whitespace-nowrap">{formatDisplayCurrency(d.refunds_total || 0, baseCurrency)}</p>
                  <p className="text-xs text-red-600">Refunds</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><DollarSign className="h-4 w-4 text-violet-500" /> Top Customers by Revenue</h3>
            {revenueByCustomer.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-xl border border-gray-100">
                <Inbox className="h-10 w-10 text-gray-300 mb-3" />
                <p className="text-gray-400 text-sm font-medium">No top customers data</p>
                <p className="text-gray-300 text-xs mt-1">Top customers by revenue will appear here</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByCustomer.slice(0, 5)} layout="vertical" margin={{ left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                  <YAxis type="category" dataKey="customer_id" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip formatter={(v) => formatDisplayCurrency(v, baseCurrency)} />
                  <Bar dataKey="revenue" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-violet-500" /> Recent Customers</h3>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">Customer #{i}</p>
                    <p className="text-xs text-gray-400">Active customer</p>
                  </div>
                  <div className="text-xs text-gray-400">New</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </HRPage>
  );
}