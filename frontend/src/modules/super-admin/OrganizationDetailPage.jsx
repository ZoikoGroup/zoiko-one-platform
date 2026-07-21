import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import {
  AlertTriangle, Building, Mail, User, Calendar, Clock, Shield,
  Package, CreditCard, Activity, FileText, ChevronLeft,
  CheckCircle, XCircle, RotateCcw, ShieldAlert, Users, HardDrive,
  History, ThumbsUp, ThumbsDown, MessageSquare, Globe, Phone
} from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

export default function OrganizationDetailPage() {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const [org, setOrg] = useState(null);
  const [products, setProducts] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [approvalHistory, setApprovalHistory] = useState([]);
  const [loginActivity, setLoginActivity] = useState([]);
  const [securityEvents, setSecurityEvents] = useState([]);
  const [section, setSection] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [statusModal, setStatusModal] = useState(null);
  const [statusReason, setStatusReason] = useState("");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const [orgData, subData, usersData, auditData, histData, loginData, secData, prodData] = await Promise.all([
        superAdminService.getOrganizationDetail(orgId),
        superAdminService.getOrganizationSubscription(orgId).catch(() => null),
        superAdminService.getUsers({ organization_id: orgId }),
        superAdminService.getAuditLogs({ organization_id: orgId, page_size: 20 }),
        superAdminService.getApprovalHistory(orgId),
        superAdminService.getLoginActivity({ organization_id: orgId, page_size: 10 }),
        superAdminService.getSecurityEvents({ organization_id: orgId, page_size: 10 }),
        superAdminService.getOrganizationProducts(orgId).catch(() => []),
      ]);
      setOrg(orgData);
      setSubscription(subData);
      setUsers(usersData.users || []);
      setAuditLogs(auditData.logs || []);
      setApprovalHistory(histData.history || []);
      setLoginActivity(loginData.activities || []);
      setSecurityEvents(secData.events || []);
      setProducts(prodData);
    } catch (e) {
      console.error("Failed to load org details", e);
      setError(e.message || "Failed to load organization details.");
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleApprove = async () => {
    setActionLoading("approve");
    try { await superAdminService.approveOrganization(orgId); loadAll(); }
    catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    setRejectModal(true);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) return;
    setActionLoading("reject");
    try { await superAdminService.rejectOrganization(orgId, { reason: rejectReason }); setRejectModal(false); loadAll(); }
    catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleSuspend = async () => {
    if (!confirm("Suspend this organization?")) return;
    setActionLoading("suspend");
    try { await superAdminService.suspendOrganization(orgId); loadAll(); }
    catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleReactivate = async () => {
    if (!confirm("Reactivate this organization?")) return;
    setActionLoading("reactivate");
    try { await superAdminService.reactivateOrganization(orgId); loadAll(); }
    catch (e) { setError(e.message); }
    finally { setActionLoading(null); }
  };

  const handleStatusChange = async () => {
    if (!statusModal) return;
    setActionLoading("status");
    try {
      await superAdminService.updateOrganizationStatus(orgId, {
        status: statusModal.status,
        reason: statusReason || null,
      });
      setStatusModal(null);
      setStatusReason("");
      loadAll();
    } catch (e) {
      setError(e.message);
    } finally {
      setActionLoading(null);
    }
  };

   const StatusBadge = ({ status }) => {
     const map = {
       PENDING: "bg-amber-50 text-amber-700 border-amber-200",
       ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
       REJECTED: "bg-red-50 text-red-700 border-red-200",
       SUSPENDED: "bg-slate-50 text-slate-700 border-slate-200",
       DEACTIVATED: "bg-purple-50 text-purple-700 border-purple-200",
     };
     return (
       <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${map[status] || "bg-slate-50 text-slate-600"}`}>
         {status}
       </span>
     );
   };

   const statusOptions = [
     { value: "ACTIVE", label: "Active", color: "text-emerald-700 bg-emerald-50" },
     { value: "SUSPENDED", label: "Suspended", color: "text-slate-700 bg-slate-50" },
     { value: "DEACTIVATED", label: "Deactivated", color: "text-purple-700 bg-purple-50" },
     { value: "REJECTED", label: "Rejected", color: "text-red-700 bg-red-50" },
   ];

  const sections = [
    { key: "profile", label: "Profile", icon: Building },
    { key: "subscription", label: "Subscription", icon: CreditCard },
    { key: "products", label: "Products", icon: Package },
    { key: "users", label: "Users", icon: Users },
    { key: "departments", label: "Departments", icon: Building },
    { key: "audit", label: "Audit History", icon: FileText },
    { key: "approval", label: "Approval Timeline", icon: History },
    { key: "security", label: "Security Events", icon: Shield },
    { key: "activity", label: "Login Activity", icon: Activity },
  ];

  if (loading) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Organization Details" description="Loading..." />
        <div className="flex items-center justify-center py-20 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF7A00] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error && !org) {
    return (
      <div className="space-y-6 font-sans">
        <PageHeader title="Organization Details" description="Error loading" />
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" /><span>{error}</span>
          <button onClick={loadAll} className="ml-auto text-red-600 underline text-xs font-semibold">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/super-admin/organizations")}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition">
          <ChevronLeft className="h-4 w-4 text-slate-500" />
        </button>
        <PageHeader title={org?.name || "Organization"} description={org?.organization_code ? `Code: ${org.organization_code}` : `Code: ${org?.code}`} />
      </div>

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" /><span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 underline text-xs font-semibold">Dismiss</button>
        </div>
      )}

      {org && (
        <>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 bg-[#FF7A00]/10 rounded-2xl flex items-center justify-center">
                  <Building className="h-8 w-8 text-[#FF7A00]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">{org.name}</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-slate-400 font-mono">{org.code}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Created {new Date(org.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {org.user_count} users</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <StatusBadge status={org.status} />
                  <select
                    value=""
                    onChange={(e) => {
                      const target = e.target.value;
                      if (!target) return;
                      const option = statusOptions.find(o => o.value === target);
                      if (!option) return;
                      if (target === "REJECTED") {
                        if (org.status !== "PENDING") return;
                        handleReject();
                        return;
                      }
                      setStatusModal({ status: target, label: option.label });
                      setStatusReason("");
                    }}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 outline-none focus:border-[#FF7A00] cursor-pointer"
                  >
                    <option value="">Change status...</option>
                    {statusOptions.map(o => {
                      const disabled =
                        (o.value === org.status) ||
                        (o.value === "ACTIVE" && org.status !== "PENDING" && org.status !== "SUSPENDED") ||
                        (o.value === "SUSPENDED" && org.status !== "ACTIVE") ||
                        (o.value === "REJECTED" && org.status !== "PENDING") ||
                        (o.value === "DEACTIVATED" && org.status === "DEACTIVATED");
                      return (
                        <option key={o.value} value={o.value} disabled={disabled}>
                          {o.label}
                        </option>
                      );
                    })}
                  </select>
              </div>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            {sections.map((s) => (
              <button key={s.key} onClick={() => setSection(s.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition ${
                  section === s.key ? "bg-[#FF7A00] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}>
                <s.icon className="h-4 w-4" /> {s.label}
              </button>
            ))}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            {section === "profile" && (
              <div className="space-y-4 text-sm">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Organization Profile</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div><span className="text-slate-400 block text-xs">Name</span><span className="font-semibold text-slate-700">{org.name}</span></div>
                  <div><span className="text-slate-400 block text-xs">Display Name</span><span className="font-semibold text-slate-700">{org.display_name || org.name}</span></div>
                  <div><span className="text-slate-400 block text-xs">Organization Code</span><span className="font-mono text-xs font-semibold text-[#FF7A00]">{org.organization_code || "—"}</span></div>
                  <div><span className="text-slate-400 block text-xs">Legacy Code</span><span className="font-mono text-xs font-semibold text-slate-700">{org.code || "—"}</span></div>
                  <div><span className="text-slate-400 block text-xs">UUID</span><span className="font-mono text-xs text-slate-500">{org.uuid || "—"}</span></div>
                  <div><span className="text-slate-400 block text-xs">Status</span><StatusBadge status={org.status} /></div>
                  <div><span className="text-slate-400 block text-xs">Subscription Plan</span><span className="font-semibold text-slate-700 capitalize">{org.subscription_plan}</span></div>
                  <div><span className="text-slate-400 block text-xs">Language</span><span className="font-semibold text-slate-700">{org.language || "en"}</span></div>
                  <div><span className="text-slate-400 block text-xs">Website</span><span className="font-semibold text-slate-700">{org.website || "—"}</span></div>
                  <div><span className="text-slate-400 block text-xs">Logo</span><span className="font-semibold text-slate-700">{org.logo_url ? "Set" : "Not set"}</span></div>
                  <div><span className="text-slate-400 block text-xs">Admin Contact</span><span className="font-semibold text-slate-700">{org.admin_name || "—"}</span></div>
                  <div><span className="text-slate-400 block text-xs">Admin Email</span><span className="font-semibold text-slate-700">{org.admin_email || "—"}</span></div>
                  <div><span className="text-slate-400 block text-xs">User Count</span><span className="font-semibold text-slate-700">{org.user_count}</span></div>
                  <div><span className="text-slate-400 block text-xs">Created</span><span className="font-semibold text-slate-700">{new Date(org.created_at).toLocaleString()}</span></div>
                  {org.approved_by_name && <div><span className="text-slate-400 block text-xs">Approved By</span><span className="font-semibold text-slate-700">{org.approved_by_name}</span></div>}
                  {org.approved_at && <div><span className="text-slate-400 block text-xs">Approved At</span><span className="font-semibold text-slate-700">{new Date(org.approved_at).toLocaleString()}</span></div>}
                  {org.rejection_reason && <div className="col-span-2"><span className="text-slate-400 block text-xs">Rejection Reason</span>
                    <p className="mt-1 text-red-600 bg-red-50 rounded-xl p-3">{org.rejection_reason}</p>
                  </div>}
                  {org.suspended_at && <div><span className="text-slate-400 block text-xs">Suspended At</span><span className="font-semibold text-slate-700">{new Date(org.suspended_at).toLocaleString()}</span></div>}
                  {org.reactivated_at && <div><span className="text-slate-400 block text-xs">Reactivated At</span><span className="font-semibold text-slate-700">{new Date(org.reactivated_at).toLocaleString()}</span></div>}
                </div>
              </div>
            )}

            {section === "subscription" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Subscription Details</h3>
                {subscription ? (
                  <div className="grid grid-cols-2 gap-6 text-sm">
                    <div><span className="text-slate-400 block text-xs">Plan</span><span className="font-semibold text-slate-700 capitalize">{subscription.plan_type}</span></div>
                    <div><span className="text-slate-400 block text-xs">Status</span>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${
                        subscription.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                        "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>{subscription.status}</span>
                    </div>
                    <div><span className="text-slate-400 block text-xs">Max Users</span><span className="font-semibold text-slate-700">{subscription.max_users}</span></div>
                    <div><span className="text-slate-400 block text-xs">Storage</span><span className="font-semibold text-slate-700">{subscription.max_storage_gb} GB</span></div>
                    <div><span className="text-slate-400 block text-xs">Start Date</span><span className="font-semibold text-slate-700">{new Date(subscription.start_date).toLocaleDateString()}</span></div>
                    <div><span className="text-slate-400 block text-xs">End Date</span><span className="font-semibold text-slate-700">{subscription.end_date ? new Date(subscription.end_date).toLocaleDateString() : "—"}</span></div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">No subscription found</div>
                )}
              </div>
            )}

            {section === "products" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Enabled Products</h3>
                {products.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No products enabled</div>
                ) : (
                  <div className="grid gap-3">
                    {products.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-[#FF7A00]" />
                          <div>
                            <div className="font-semibold text-slate-700">{p.product_name}</div>
                            <div className="text-xs text-slate-400">{p.product_code}</div>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await superAdminService.toggleOrganizationProduct(orgId, p.product_id, !p.is_enabled);
                              loadAll();
                            } catch (e) {
                              console.error("Failed to toggle product", e);
                            }
                          }}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                            p.is_enabled
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200"
                          }`}
                        >
                          {p.is_enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === "users" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Organization Users ({users.length})</h3>
                {users.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No users found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase text-slate-500">
                          <th className="py-3 px-4">Name</th>
                          <th className="py-3 px-4">Email</th>
                          <th className="py-3 px-4">Role</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-650">
                        {users.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/50">
                            <td className="py-3 px-4 font-semibold text-slate-700">{u.first_name} {u.last_name}</td>
                            <td className="py-3 px-4 text-slate-500">{u.email}</td>
                            <td className="py-3 px-4">
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-slate-50 text-slate-600 border border-slate-100">
                                {u.role}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                u.is_active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              }`}>{u.is_active ? "Active" : "Inactive"}</span>
                            </td>
                            <td className="py-3 px-4 text-slate-500">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {section === "departments" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Departments</h3>
                {org.departments?.length > 0 ? (
                  <div className="grid gap-3">
                    {org.departments.map((d) => (
                      <div key={d.id} className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                        <div className="flex items-center gap-3">
                          <Building className="h-5 w-5 text-[#FF7A00]" />
                          <div>
                            <div className="font-semibold text-slate-700">{d.name}</div>
                            <div className="text-xs text-slate-400">{d.code} · {d.head || "No head"}</div>
                          </div>
                        </div>
                        <span className="text-xs text-slate-400">{d.employees_count || 0} employees</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">No departments found</div>
                )}
              </div>
            )}

            {section === "audit" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Audit History</h3>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No audit logs</div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          log.action === "approved" || log.action === "activate" ? "bg-emerald-100" :
                          log.action === "rejected" || log.action === "suspend" ? "bg-red-100" :
                          log.action === "create" ? "bg-blue-100" : "bg-slate-100"
                        }`}>
                          {log.action === "approved" || log.action === "activate" ? <CheckCircle className="h-4 w-4 text-emerald-600" /> :
                           log.action === "rejected" || log.action === "suspend" ? <XCircle className="h-4 w-4 text-red-600" /> :
                           <FileText className="h-4 w-4 text-blue-600" />}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-slate-700 capitalize">{log.action}</div>
                          <div className="text-xs text-slate-500">
                            by {log.performed_by_email || "system"} · {new Date(log.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === "approval" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Approval Timeline</h3>
                {approvalHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No approval history</div>
                ) : (
                  <div className="relative pl-8 space-y-6 before:absolute before:left-3.5 before:top-2 before:h-[calc(100%-16px)] before:w-0.5 before:bg-slate-200">
                    {approvalHistory.map((h, i) => (
                      <div key={h.id} className="relative">
                        <div className={`absolute -left-[26px] h-6 w-6 rounded-full flex items-center justify-center border-2 ${
                          h.action === "approved" ? "border-emerald-400 bg-emerald-50" :
                          h.action === "rejected" ? "border-red-400 bg-red-50" :
                          h.action === "suspended" || h.action === "deactivated" ? "border-slate-400 bg-slate-50" :
                          "border-blue-400 bg-blue-50"
                        }`}>
                          {h.action === "approved" ? <CheckCircle className="h-3 w-3 text-emerald-500" /> :
                           h.action === "rejected" ? <XCircle className="h-3 w-3 text-red-500" /> :
                           h.action === "suspended" || h.action === "deactivated" ? <ShieldAlert className="h-3 w-3 text-slate-500" /> :
                           <RotateCcw className="h-3 w-3 text-blue-500" />}
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-slate-700 capitalize">{h.action}</span>
                          {h.previous_status && h.new_status && (
                            <span className="text-slate-500">
                              {' '}<StatusBadge status={h.previous_status} /> → <StatusBadge status={h.new_status} />
                            </span>
                          )}
                          <span className="text-slate-500"> by {h.performed_by_name || "System"}</span>
                          {h.reason && <p className="text-xs text-slate-500 mt-1 italic">{h.reason}</p>}
                          <div className="text-xs text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === "security" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Security Events</h3>
                {securityEvents.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No security events</div>
                ) : (
                  <div className="space-y-3">
                    {securityEvents.map((e) => (
                      <div key={e.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <Shield className={`h-5 w-5 mt-0.5 ${e.severity === "high" ? "text-red-500" : e.severity === "medium" ? "text-amber-500" : "text-slate-400"}`} />
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{e.event_type}</div>
                          <div className="text-xs text-slate-500">{e.description} · {new Date(e.created_at).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {section === "activity" && (
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Login Activity</h3>
                {loginActivity.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">No login activity</div>
                ) : (
                  <div className="space-y-3">
                    {loginActivity.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/50 border border-slate-100">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          a.status === "success" ? "bg-emerald-100" : "bg-red-100"
                        }`}>
                          <Activity className={`h-4 w-4 ${a.status === "success" ? "text-emerald-600" : "text-red-600"}`} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-700">{a.email}</div>
                          <div className="text-xs text-slate-500">
                            {a.status} · {a.failure_reason ? `Reason: ${a.failure_reason} · ` : ""}
                            {a.ip_address ? `IP: ${a.ip_address} · ` : ""}
                            {new Date(a.created_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Status Change Confirmation Modal */}
      {statusModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-[#FF7A00]/10 flex items-center justify-center">
                <ShieldAlert className="h-5 w-5 text-[#FF7A00]" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Change Organization Status</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Change <strong>{org?.name}</strong> status to <span className="font-bold">{statusModal.label}</span>.
              Current status: <StatusBadge status={org?.status} />
            </p>
            <textarea
              value={statusReason}
              onChange={(e) => setStatusReason(e.target.value)}
              placeholder="Optional reason for this status change..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-800 outline-none focus:border-[#FF7A00] min-h-[80px] resize-y"
            />
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setStatusModal(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={handleStatusChange} disabled={actionLoading === "status"}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF7A00] text-white text-sm font-semibold hover:bg-[#E66E00] disabled:opacity-50">
                {actionLoading === "status" ? "Updating..." : `Change to ${statusModal.label}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Reject Organization</h3>
            </div>
            <p className="text-sm text-slate-600 mb-4">
              Reject <strong>{org?.name}</strong> registration. Provide a reason (required):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-800 outline-none focus:border-red-400 min-h-[100px] resize-y"
            />
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setRejectModal(false)}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmReject} disabled={!rejectReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
