import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { FileText, RefreshCw } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { Spinner, ErrorState, EmptyState } from "../../../components/billing-shared";
import { pricingApi, productApi } from "../../../service/billingService";
import { extractArray } from "../../../utils/billing-helpers";
import { formatCurrency } from "../../../utils/locale";




const COLORS = ["#7c3aed", "#a78bfa", "#c4b5fd", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4898", "#14b8a6", "#f97316"];
const TABS = [
  { key: "summary", label: "Pricing Summary" },
  { key: "revenue", label: "Revenue by Plan" },
  { key: "adoption", label: "Plan Adoption" },
  { key: "utilization", label: "Tier Utilization" },
  { key: "product", label: "Product Pricing" },
];

function StatBox({ label, value }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

export default function PricingReportsPage() {
  const [activeTab, setActiveTab] = useState("summary");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [planTiers, setPlanTiers] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [planRes, prodRes] = await Promise.allSettled([
        pricingApi.list({ per_page: 100 }),
        productApi.list({ per_page: 100 }),
      ]);
      const plansData = planRes.status === "fulfilled" ? extractArray(planRes.value) : [];
      setPlans(plansData);
      if (prodRes.status === "fulfilled") setProducts(extractArray(prodRes.value));

      const tierResults = await Promise.allSettled(plansData.slice(0, 30).map((p) => pricingApi.listTiers(p.id)));
      const tierMap = {};
      plansData.slice(0, 30).forEach((p, i) => {
        if (tierResults[i]?.status === "fulfilled") {
          tierMap[p.id] = extractArray(tierResults[i].value);
        }
      });
      setPlanTiers(tierMap);
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activePlans = plans.filter((p) => p.status === "active");
  const totalTiers = Object.values(planTiers).reduce((s, t) => s + t.length, 0);
  const avgTiersPerPlan = plans.length ? (totalTiers / plans.length).toFixed(1) : 0;

  const revenueData = activePlans
    .map((p) => ({ name: p.name, revenue: parseFloat(p.price || 0), fill: COLORS[activePlans.indexOf(p) % COLORS.length] }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  const productPlanData = products.map((p) => ({
    name: p.name,
    count: plans.filter((pl) => pl.product_id === p.id || pl.product?.id === p.id).length,
    fill: COLORS[products.indexOf(p) % COLORS.length],
  })).filter((p) => p.count > 0).sort((a, b) => b.count - a.count);

  const freqData = [
    { name: "One-Time", value: plans.filter((p) => p.billing_frequency === "one_time").length },
    { name: "Monthly", value: plans.filter((p) => p.billing_frequency === "monthly").length },
    { name: "Quarterly", value: plans.filter((p) => p.billing_frequency === "quarterly").length },
    { name: "Annual", value: plans.filter((p) => p.billing_frequency === "annual").length },
  ].filter((d) => d.value > 0);

  const tierTypeCount = {};
  Object.values(planTiers).forEach((tiers) => {
    tiers.forEach((t) => {
      const type = t.type || "flat";
      tierTypeCount[type] = (tierTypeCount[type] || 0) + 1;
    });
  });
  const tierTypeData = Object.entries(tierTypeCount).map(([name, value], i) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    fill: COLORS[i % COLORS.length],
  }));

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatBox label="Total Plans" value={plans.length} />
              <StatBox label="Active Plans" value={activePlans.length} />
              <StatBox label="Total Tiers" value={totalTiers} />
              <StatBox label="Avg Tiers/Plan" value={avgTiersPerPlan} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans by Frequency</h3>
                {freqData.length === 0 ? <EmptyState icon={FileText} title="No data" /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={freqData} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {freqData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-4">Tier Types</h3>
                {tierTypeData.length === 0 ? <EmptyState icon={FileText} title="No tier data" /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={tierTypeData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {tierTypeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Pricing Plans Overview</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Frequency</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Tiers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {plans.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">No plans found</td></tr>
                    ) : plans.slice(0, 20).map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>{p.status}</span></td>
                        <td className="px-4 py-3 text-right font-medium">{formatCurrency(p.price, p.currency)}</td>
                        <td className="px-4 py-3 text-slate-600 capitalize">{p.billing_frequency?.replace(/_/g, " ") || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{p.product_name || p.product?.name || "—"}</td>
                        <td className="px-4 py-3 text-right text-slate-600">{(planTiers[p.id] || []).length}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );

      case "revenue":
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Revenue by Plan (Active Plans Price)</h3>
            {revenueData.length === 0 ? <EmptyState icon={FileText} title="No active plans with pricing" /> : (
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={revenueData} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {revenueData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case "adoption":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans by Frequency</h3>
              {freqData.length === 0 ? <EmptyState icon={FileText} title="No data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={freqData} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {freqData.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans by Status</h3>
              {plans.length === 0 ? <EmptyState icon={FileText} title="No data" /> : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={[
                      { name: "Active", value: activePlans.length, fill: "#10b981" },
                      { name: "Inactive", value: plans.filter((p) => p.status !== "active").length, fill: "#6b7280" },
                    ].filter((d) => d.value > 0)} cx="50%" cy="50%" outerRadius={100} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {[{ name: "Active", value: activePlans.length, fill: "#10b981" }, { name: "Inactive", value: plans.filter((p) => p.status !== "active").length, fill: "#6b7280" }].filter((d) => d.value > 0).map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        );

      case "utilization":
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Tier Types Distribution</h3>
            {tierTypeData.length === 0 ? <EmptyState icon={FileText} title="No tier data" /> : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={tierTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {tierTypeData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case "product":
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Plans per Product</h3>
            {productPlanData.length === 0 ? <EmptyState icon={FileText} title="No product-plan associations" /> : (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={productPlanData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {productPlanData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <HRPage title="Pricing Reports" subtitle="Analytics and insights for pricing plans">
        <Spinner />
      </HRPage>
    );
  }

  if (error && plans.length === 0) {
    return (
      <HRPage title="Pricing Reports" subtitle="Analytics and insights for pricing plans">
        <ErrorState message={error} onRetry={fetchData} />
      </HRPage>
    );
  }

  return (
    <HRPage title="Pricing Reports" subtitle="Analytics and insights for pricing plans">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === tab.key ? "bg-white text-violet-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => { setLoading(true); fetchData(); }}
          className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
          <RefreshCw size={18} />
        </button>
      </div>
      {renderTabContent()}
    </HRPage>
  );
}
