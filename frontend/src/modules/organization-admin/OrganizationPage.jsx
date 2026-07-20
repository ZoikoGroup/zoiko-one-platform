import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { getOrganizationDetails, updateOrganizationDetails } from "../../service/orgAdminService";
import {
  Building2,
  MapPin,
  CreditCard,
  Briefcase,
  ScrollText,
  Pencil,
  Users,
  X,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const statusColors = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved: "bg-blue-50 text-blue-700 border-blue-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  on_hold: "bg-orange-50 text-orange-700 border-orange-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  deactivated: "bg-slate-50 text-slate-700 border-slate-200",
};

function StatusPill({ status }) {
  if (!status) return <span className="text-slate-400 text-xs">—</span>;
  const cls = statusColors[status] || "bg-slate-50 text-slate-700 border-slate-200";
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${cls} pl-2 pr-2.5 py-1 rounded-full border`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function FieldRow({ label, value, mono, muted }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-b-0">
      <span className="text-[13px] text-slate-500">{label}</span>
      <span
        className={`text-[13.5px] font-semibold text-right ${
          muted
            ? "text-slate-300 font-medium"
            : mono
            ? "font-mono text-slate-800 text-[12.5px]"
            : "text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({ icon: Icon, title, subtitle, children, className = "" }) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-3 px-7 py-5 border-b border-slate-100">
        <div className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
          <Icon size={16} strokeWidth={2} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-900 leading-tight">{title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function WorkforceDonut({ total, active, managers, hrAdmins, maxUsers }) {
  const safeTotal = total || 0;
  const safeActive = active || 0;
  const safeManagers = managers || 0;
  const safeHrAdmins = hrAdmins || 0;

  const activePct = safeTotal ? Math.round((safeActive / safeTotal) * 100) : 0;
  const hrPct = safeTotal ? Math.round((safeHrAdmins / safeTotal) * 100) : 0;
  const mgrPct = safeTotal ? Math.round((safeManagers / safeTotal) * 100) : 0;

  const gradient = `conic-gradient(
    #7c3aed 0deg ${activePct * 3.6}deg,
    #10b981 ${activePct * 3.6}deg ${(activePct + hrPct) * 3.6}deg,
    #cbd5e1 ${(activePct + hrPct) * 3.6}deg ${(activePct + hrPct + mgrPct) * 3.6}deg,
    #e2e8f0 ${(activePct + hrPct + mgrPct) * 3.6}deg 360deg
  )`;

  const remaining = maxUsers != null ? maxUsers - safeTotal : null;

  return (
    <div className="flex items-center gap-10 px-7 py-8 flex-wrap">
      <div
        className="w-[168px] h-[168px] rounded-full shrink-0 flex items-center justify-center"
        style={{ background: gradient }}
      >
        <div className="w-[118px] h-[118px] rounded-full bg-white flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-slate-900 leading-none">{safeTotal}</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-widest mt-1.5">Employees</div>
        </div>
      </div>

      <div className="flex-1 min-w-[220px] flex flex-col gap-3.5">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-sm bg-violet-600 shrink-0" />
          <span className="text-[13.5px] text-slate-600 flex-1">Active employees</span>
          <span className="text-sm font-bold text-slate-900 font-mono">{safeActive}</span>
          <span className="text-xs text-slate-300 w-9 text-right">{activePct}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 shrink-0" />
          <span className="text-[13.5px] text-slate-600 flex-1">HR admins</span>
          <span className="text-sm font-bold text-slate-900 font-mono">{safeHrAdmins}</span>
          <span className="text-xs text-slate-300 w-9 text-right">{hrPct}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 shrink-0" />
          <span className="text-[13.5px] text-slate-600 flex-1">Managers</span>
          <span className="text-sm font-bold text-slate-900 font-mono">{safeManagers}</span>
          <span className="text-xs text-slate-300 w-9 text-right">{mgrPct}%</span>
        </div>
        <div className="text-xs text-slate-400 pt-1">
          {safeTotal - safeActive} seat inactive{remaining != null ? ` · ${remaining} seats remaining on the FREE plan` : ""}
        </div>
      </div>
    </div>
  );
}

export default function OrgAdminOrganizationPage() {
  const { user } = useAuth();
  const [org, setOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ msg: null, type: "success" });

  const fetchOrg = () => {
    setLoading(true);
    getOrganizationDetails()
      .then(setOrg)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrg(); }, []);

  const openEdit = () => {
    setEditForm({
      name: org.name || "",
      industry: org.industry || "",
      address: org.address || "",
      city: org.city || "",
      state: org.state || "",
      country: org.country || "",
      timezone: org.timezone || "UTC",
      currency: org.currency || "USD",
      domain: org.domain || "",
    });
    setShowEdit(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateOrganizationDetails(editForm);
      setShowEdit(false);
      setToast({ msg: "Organization updated successfully.", type: "success" });
      fetchOrg();
    } catch (err) {
      setToast({ msg: err.response?.data?.detail || err.message || "Failed to update.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 font-sans">
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <div className="text-sm text-slate-400">Loading organization details...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 font-sans">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const statusLabel = org.status?.charAt(0).toUpperCase() + org.status?.slice(1) || "—";
  const subStatusLabel = org.subscription_status?.charAt(0).toUpperCase() + org.subscription_status?.slice(1) || "Active";
  const regDate = org.created_at ? new Date(org.created_at).toLocaleDateString() : "—";
  const userInitials = (user?.name || "OA")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-0 font-sans">
      {/* Hero */}
      <div className="flex items-end justify-between gap-6 mb-7">
        <div>
          <h1 className="text-[34px] font-extrabold text-slate-900 tracking-tight mb-1.5">
            My Organization
          </h1>
          <p className="text-sm text-slate-400">View your organization details.</p>
        </div>
        <button onClick={openEdit} className="inline-flex items-center gap-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 rounded-xl shadow-lg shadow-violet-900/20 hover:opacity-90 transition-opacity">
          <Pencil size={14} />
          Edit organization
        </button>
      </div>

      {/* Identity card */}
      <div className="flex items-center justify-between gap-6 bg-white border border-slate-200 rounded-2xl shadow-sm px-8 py-7 mb-6 flex-wrap">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-300 flex items-center justify-center shrink-0">
            <Building2 size={28} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-xl font-extrabold text-slate-900 mb-1.5">{org.name}</p>
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-semibold text-violet-700 bg-violet-50 px-2.5 py-1 rounded-md">
                {org.code}
              </span>
              <StatusPill status={org.status} />
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400">
                Admin <b className="text-slate-600 font-semibold">{org.admin_name || "—"}</b>
              </span>
              <span className="text-slate-300 text-xs">·</span>
              <span className="text-xs text-slate-400">{org.admin_email || "—"}</span>
            </div>
          </div>
        </div>
        <button className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:border-slate-300 hover:text-slate-700 transition-colors">
          <ScrollText size={14} />
          View audit log
        </button>
      </div>

      {/* Organization details + Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <SectionCard
          icon={Briefcase}
          title="Organization details"
          subtitle="Core identity information"
        >
          <div className="px-7 pb-2">
            <FieldRow label="Organization Name" value={org.name || "—"} />
            <FieldRow label="Organization Code" value={org.code || "—"} mono />
            <FieldRow label="Organization Admin" value={org.admin_name || "—"} />
            <FieldRow label="Admin Email" value={org.admin_email || "—"} />
            <FieldRow
              label="Organization Status"
              value={<StatusPill status={org.status} />}
            />
          </div>
        </SectionCard>

        <SectionCard
          icon={CreditCard}
          title="Subscription & billing"
          subtitle="Plan, status and account limits"
        >
          <div className="px-7 pb-2">
            <FieldRow label="Subscription Plan" value={org.subscription_plan || "Free"} />
            <FieldRow
              label="Subscription Status"
              value={<StatusPill status={org.subscription_status} />}
            />
            <FieldRow label="Max Users" value={org.max_users ?? "—"} />
            <FieldRow label="Currency" value={org.currency || "USD"} mono />
            <FieldRow label="Registration Date" value={regDate} />
          </div>
        </SectionCard>
      </div>

      {/* Location */}
      <SectionCard
        icon={MapPin}
        title="Location & timezone"
        subtitle="Where this organization is registered — details given while registering"
        className="mb-6"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 px-7 pb-2">
          <div className="sm:pr-7 sm:border-r border-slate-100">
            <FieldRow label="Industry" value={org.industry || "—"} muted />
            <FieldRow label="Address" value={org.address || "—"} muted />
            <FieldRow label="City" value={org.city || "—"} muted />
          </div>
          <div className="sm:pl-7">
            <FieldRow label="State" value={org.state || "—"} muted />
            <FieldRow label="Country" value={org.country || "—"} muted />
            <FieldRow label="Timezone" value={org.timezone || "UTC"} mono />
          </div>
        </div>
      </SectionCard>

      {/* Workforce */}
      <SectionCard
        icon={Users}
        title="Workforce composition"
        subtitle={`${org.total_employees || 0} total employees across your organization`}
      >
        <WorkforceDonut
          total={org.total_employees || 0}
          active={org.active_employees || 0}
          managers={org.managers || 0}
          hrAdmins={org.hr_admins || 0}
          maxUsers={org.max_users}
        />
      </SectionCard>

      {/* Toast */}
      {toast.msg && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl shadow-lg text-white text-sm font-medium flex items-center gap-2.5 ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
          <button onClick={() => setToast({ msg: null })} className="ml-1 p-0.5 hover:bg-white/20 rounded-lg"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowEdit(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Edit Organization</h2>
                <p className="text-xs text-slate-400 mt-0.5">Update your organization details</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl"><X className="w-5 h-5" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <EditField label="Organization Name" value={editForm.name} onChange={(v) => setEditForm({ ...editForm, name: v })} />
              <EditField label="Industry" value={editForm.industry} onChange={(v) => setEditForm({ ...editForm, industry: v })} />
              <EditField label="Address" value={editForm.address} onChange={(v) => setEditForm({ ...editForm, address: v })} textarea />
              <div className="grid grid-cols-2 gap-4">
                <EditField label="City" value={editForm.city} onChange={(v) => setEditForm({ ...editForm, city: v })} />
                <EditField label="State" value={editForm.state} onChange={(v) => setEditForm({ ...editForm, state: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Country" value={editForm.country} onChange={(v) => setEditForm({ ...editForm, country: v })} />
                <EditField label="Timezone" value={editForm.timezone} onChange={(v) => setEditForm({ ...editForm, timezone: v })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <EditField label="Currency" value={editForm.currency} onChange={(v) => setEditForm({ ...editForm, currency: v })} mono />
                <EditField label="Domain" value={editForm.domain} onChange={(v) => setEditForm({ ...editForm, domain: v })} />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setShowEdit(false)} className="px-5 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl shadow-lg shadow-violet-900/20 hover:opacity-90 disabled:opacity-50 transition-all">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditField({ label, value, onChange, textarea, mono }) {
  const Tag = textarea ? "textarea" : "input";
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1.5">{label}</label>
      <Tag
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={textarea ? 3 : undefined}
        className={`w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all ${mono ? "font-mono" : ""}`}
      />
    </div>
  );
}
