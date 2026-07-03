import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { AlertTriangle, BarChart3, TrendingUp, Users, Building2, CreditCard, Package } from "lucide-react";
import { superAdminService } from "../../service/superAdminService";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const COLORS = ["#FF7A00", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setError(null);
      const data = await superAdminService.getAnalytics();
      setAnalytics(data);
    } catch (e) {
      console.error("Failed to load analytics", e);
      setError(e.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400 font-sans">Loading...</div>;

  return (
    <div className="space-y-6 font-sans">
      <PageHeader title="Analytics" description="Platform-wide analytics and growth metrics." />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadAnalytics} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Organization Growth */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-5 w-5 text-[#FF7A00]" />
            <h3 className="text-lg font-bold text-slate-800">Organization Growth</h3>
          </div>
          {analytics?.organization_growth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.organization_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#FF7A00" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">No data available</div>
          )}
        </div>

        {/* User Growth */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-bold text-slate-800">User Growth</h3>
          </div>
          {analytics?.user_growth?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.user_growth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f6" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">No data available</div>
          )}
        </div>

        {/* Subscription Distribution */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-bold text-slate-800">Subscription Distribution</h3>
          </div>
          {analytics?.subscription_distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={analytics.subscription_distribution} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {analytics.subscription_distribution.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">No data available</div>
          )}
        </div>

        {/* Product Adoption */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-bold text-slate-800">Product Adoption</h3>
          </div>
          {analytics?.product_adoption?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.product_adoption} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f0f6" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400 text-sm">No data available</div>
          )}
        </div>
      </div>
    </div>
  );
}
