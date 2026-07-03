import { useState, useEffect } from "react";
import PageHeader from "../../components/PageHeader";
import { AlertTriangle, CreditCard, Building2, CheckCircle2, Edit3, X, Save } from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

const PLAN_COLORS = {
  TRIAL: "bg-purple-50 text-purple-600 border border-purple-100",
  FREE: "bg-slate-50 text-slate-600 border border-slate-100",
  BASIC: "bg-[#FF7A00]/5 text-[#FF7A00] border border-[#FF7A00]/10",
  PROFESSIONAL: "bg-blue-50 text-blue-600 border border-blue-100",
  ENTERPRISE: "bg-indigo-50 text-indigo-600 border border-indigo-100",
};

const STATUS_COLORS = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  expired: "bg-red-50 text-red-700 border border-red-100",
  cancelled: "bg-amber-50 text-amber-700 border border-amber-100",
  pending: "bg-yellow-50 text-yellow-700 border border-yellow-100",
};

export default function SuperAdminSubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSub, setEditingSub] = useState(null);
  const [editForm, setEditForm] = useState({ plan_type: "", status: "", max_users: 15, max_storage_gb: 5 });

  useEffect(() => { loadSubscriptions(); }, []);

  const loadSubscriptions = async () => {
    try {
      setError(null);
      const data = await superAdminService.getSubscriptions();
      setSubscriptions(data || []);
    } catch (e) {
      console.error("Failed to load subscriptions", e);
      setError(e.message || "Failed to load subscriptions.");
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (sub) => {
    setEditingSub(sub);
    setEditForm({
      plan_type: sub.plan_type,
      status: sub.status,
      max_users: sub.max_users,
      max_storage_gb: sub.max_storage_gb,
    });
  };

  const handleSave = async () => {
    if (!editingSub) return;
    try {
      await superAdminService.updateSubscription(editingSub.organization_id, editForm);
      setEditingSub(null);
      loadSubscriptions();
    } catch (e) {
      console.error("Failed to update subscription", e);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400 font-sans">Loading...</div>;

  return (
    <div className="space-y-6 font-sans">
      <PageHeader title="Subscriptions" description="Manage subscription plans across all organizations." />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadSubscriptions} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <h3 className="text-lg font-bold text-slate-800 mb-6">Organization Subscriptions</h3>

        {subscriptions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No subscriptions found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Organization</th>
                  <th className="py-3 px-4">Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Max Users</th>
                  <th className="py-3 px-4">Storage</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subscriptions.map((s) => (
                  <tr key={s.id} className="text-sm text-slate-650 hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        <span className="font-semibold text-slate-800">{s.organization_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PLAN_COLORS[s.plan_type] || PLAN_COLORS.FREE}`}>
                        {s.plan_type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[s.status] || STATUS_COLORS.pending}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-800">{s.max_users}</td>
                    <td className="py-4 px-4 text-slate-600">{s.max_storage_gb} GB</td>
                    <td className="py-4 px-4 text-slate-500">{new Date(s.start_date).toLocaleDateString()}</td>
                    <td className="py-4 px-4 text-right">
                      <button onClick={() => openEdit(s)} className="p-1.5 hover:text-[#FF7A00] hover:bg-slate-50 rounded-lg transition" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Edit Subscription - {editingSub.organization_name}</h3>
              <button onClick={() => setEditingSub(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="h-5 w-5 text-slate-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Plan Type</label>
                <select value={editForm.plan_type} onChange={(e) => setEditForm(f => ({ ...f, plan_type: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-700 outline-none focus:border-[#FF7A00]">
                  <option value="TRIAL">Trial</option>
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Status</label>
                <select value={editForm.status} onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-700 outline-none focus:border-[#FF7A00]">
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Max Users</label>
                  <input type="number" value={editForm.max_users}
                    onChange={(e) => setEditForm(f => ({ ...f, max_users: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-800 outline-none focus:border-[#FF7A00]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Storage (GB)</label>
                  <input type="number" value={editForm.max_storage_gb}
                    onChange={(e) => setEditForm(f => ({ ...f, max_storage_gb: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-800 outline-none focus:border-[#FF7A00]" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEditingSub(null)} className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF7A00] text-white text-sm font-semibold hover:bg-[#e56e00]"><Save className="h-4 w-4" /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
