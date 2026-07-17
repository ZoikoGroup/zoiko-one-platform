import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import {
  AlertTriangle, Search, Building, CheckCircle, XCircle, ShieldAlert,
  RotateCcw, Eye, ChevronLeft, ChevronRight, Clock, Mail, Phone,
  User, MessageSquare, RefreshCw, FileText, ThumbsUp, ThumbsDown,
  Edit3, Trash2, CreditCard, Package, History, Info, Calendar,
  Shield, Users, ExternalLink
} from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

const PAGE_SIZE = 20;

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

const PlanBadge = ({ plan }) => {
  const p = (plan || "FREE").toUpperCase();
  const map = {
    ENTERPRISE: "bg-indigo-50 text-indigo-600 border-indigo-100",
    PROFESSIONAL: "bg-blue-50 text-blue-600 border-blue-100",
    BASIC: "bg-orange-50 text-orange-600 border-orange-100",
    TRIAL: "bg-purple-50 text-purple-600 border-purple-100",
    FREE: "bg-slate-50 text-slate-600 border-slate-100",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${map[p] || map.FREE}`}>{p}</span>
  );
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(d) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function PendingOrganizationsPage() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [suspended, setSuspended] = useState([]);
  const [deactivated, setDeactivated] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  // Modals
  const [confirmModal, setConfirmModal] = useState(null); // { org, action }
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [detailOrg, setDetailOrg] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [editData, setEditData] = useState({});

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = { page, page_size: PAGE_SIZE };
      const [pendingData, approvedData, rejectedData, suspendedData, deactivatedData] = await Promise.all([
        superAdminService.getPendingOrganizations(params),
        superAdminService.getApprovedOrganizations(params),
        superAdminService.getRejectedOrganizations(params),
        superAdminService.getSuspendedOrganizations(params),
        superAdminService.getDeactivatedOrganizations(params),
      ]);
      setPending(pendingData.organizations || []);
      setApproved(approvedData.organizations || []);
      setRejected(rejectedData.organizations || []);
      setSuspended(suspendedData.organizations || []);
      setDeactivated(deactivatedData.organizations || []);
    } catch (e) {
      console.error("Failed to load", e);
      setError(e.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      loadData(),
      superAdminService.getDashboardStats().catch(() => {}),
    ]);
  }, [loadData]);

  const getList = () => {
    switch (activeTab) {
      case "pending": return pending;
      case "approved": return approved;
      case "rejected": return rejected;
      case "suspended": return suspended;
      case "deactivated": return deactivated;
      default: return pending;
    }
  };

  const filteredList = getList().filter((o) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      (o.name || "").toLowerCase().includes(q) ||
      (o.code || "").toLowerCase().includes(q) ||
      (o.admin_email || "").toLowerCase().includes(q) ||
      (o.admin_name || "").toLowerCase().includes(q) ||
      (o.contact_person || "").toLowerCase().includes(q) ||
      (o.company_email || "").toLowerCase().includes(q)
    );
  });

  // ── Approve ──
  const handleApprove = (org) => setConfirmModal({ org, action: "approve" });

  const confirmApprove = async () => {
    if (!confirmModal) return;
    const { org } = confirmModal;
    setActionLoading(org.id);
    try {
      await superAdminService.approveOrganization(org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject ──
  const handleRejectClick = (org) => {
    setRejectModal(org);
    setRejectReason("");
  };

  const confirmReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setActionLoading(rejectModal.id);
    try {
      await superAdminService.rejectOrganization(rejectModal.id, { reason: rejectReason });
      setRejectModal(null);
      setRejectReason("");
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to reject");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reactivate ──
  const handleReactivate = (org) => setConfirmModal({ org, action: "reactivate" });

  const confirmReactivate = async () => {
    if (!confirmModal) return;
    const { org } = confirmModal;
    setActionLoading(org.id);
    try {
      await superAdminService.reactivateOrganization(org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to reactivate");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Suspend ──
  const handleSuspend = (org) => setConfirmModal({ org, action: "suspend" });

  const confirmSuspend = async () => {
    if (!confirmModal) return;
    const { org } = confirmModal;
    setActionLoading(org.id);
    try {
      await superAdminService.suspendOrganization(org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to suspend");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Delete ──
  const handleDelete = async (org) => {
    setConfirmModal({ org, action: "delete" });
  };

  const confirmDelete = async () => {
    if (!confirmModal) return;
    const { org } = confirmModal;
    setActionLoading(org.id);
    try {
      await superAdminService.deleteOrganization(org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Edit ──
  const handleEditClick = (org) => {
    setEditModal(org);
    setEditData({
      name: org.name || "",
      code: org.code || "",
      subscription_plan: org.subscription_plan || "FREE",
      max_users: 15,
      max_storage_gb: 5,
    });
  };

  const confirmEdit = async () => {
    if (!editModal) return;
    const orgId = editModal.id;
    setActionLoading(orgId);
    try {
      await superAdminService.updateOrganization(orgId, editData);
      setEditModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to update organization");
    } finally {
      setActionLoading(null);
    }
  };

  // ── View Details ──
  const handleViewDetails = async (org) => {
    setDetailOrg(org);
    setDetailData(null);
    setDetailLoading(true);
    try {
      const [detail, products, approvalHistory, auditLogs] = await Promise.all([
        superAdminService.getOrganizationDetail(org.id),
        superAdminService.getOrganizationProducts(org.id).catch(() => []),
        superAdminService.getApprovalHistory(org.id).catch(() => ({ history: [] })),
        superAdminService.getAuditLogs({
          entity_type: "Organization",
          organization_id: org.id,
          page_size: 20,
        }).catch(() => ({ logs: [] })),
      ]);
      setDetailData({ detail, products, approvalHistory: approvalHistory.history || [], auditLogs: auditLogs.logs || [] });
    } catch (e) {
      setError(e.message || "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  };

  const tabs = [
    { key: "pending", label: "Pending", count: pending.length },
    { key: "approved", label: "Approved", count: approved.length },
    { key: "rejected", label: "Rejected", count: rejected.length },
    { key: "suspended", label: "Suspended", count: suspended.length },
    { key: "deactivated", label: "Deactivated", count: deactivated.length },
  ];

  const renderActionButtons = (o) => {
    const common = "p-1.5 rounded-lg transition disabled:opacity-40";
    return (
      <div className="flex justify-end gap-1 text-slate-400">
        <button onClick={() => handleViewDetails(o)} className={`${common} hover:text-blue-500 hover:bg-blue-50`} title="View Details">
          <Eye className="h-4 w-4" />
        </button>
        <button onClick={() => handleEditClick(o)} className={`${common} hover:text-indigo-500 hover:bg-indigo-50`} title="Edit">
          <Edit3 className="h-4 w-4" />
        </button>
        {o.status === "PENDING" && (
          <>
            <button onClick={() => handleApprove(o)} disabled={actionLoading === o.id}
              className={`${common} hover:text-emerald-500 hover:bg-emerald-50`} title="Approve">
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button onClick={() => handleRejectClick(o)} disabled={actionLoading === o.id}
              className={`${common} hover:text-red-500 hover:bg-red-50`} title="Reject">
              <ThumbsDown className="h-4 w-4" />
            </button>
          </>
        )}
        {o.status === "ACTIVE" && (
          <button onClick={() => handleSuspend(o)} disabled={actionLoading === o.id}
            className={`${common} hover:text-orange-500 hover:bg-orange-50`} title="Suspend">
            <ShieldAlert className="h-4 w-4" />
          </button>
        )}
        {o.status === "SUSPENDED" && (
          <button onClick={() => handleReactivate(o)} disabled={actionLoading === o.id}
            className={`${common} hover:text-emerald-500 hover:bg-emerald-50`} title="Reactivate">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button onClick={() => handleDelete(o)} disabled={actionLoading === o.id}
          className={`${common} hover:text-red-600 hover:bg-red-50`} title="Delete">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <PageHeader title="Organization Approvals" description="Review, approve, or reject organization registration requests." />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => { setError(null); refreshAll(); }} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        {/* Tabs + Search */}
        <div className="flex flex-wrap items-center gap-3 mb-6 border-b border-slate-100 pb-3">
          <div className="flex gap-2">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setPage(1); setSearchTerm(""); }}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                  activeTab === t.key
                    ? "bg-[#FF7A00] text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-full border border-slate-200 text-sm outline-none focus:border-[#FF7A00] w-48"
              />
            </div>
            <button onClick={refreshAll} className="p-2 text-slate-400 hover:text-[#FF7A00] hover:bg-slate-50 rounded-lg transition" title="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Building className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No {activeTab} organizations
            {searchTerm && " matching search"}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-3">Organization</th>
                    <th className="py-3 px-3">Code</th>
                    <th className="py-3 px-3">Company Email</th>
                    <th className="py-3 px-3">Contact Person</th>
                    <th className="py-3 px-3">Org Admin</th>
                    <th className="py-3 px-3">Plan</th>
                    <th className="py-3 px-3">Created</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Created By</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((o) => (
                    <tr key={o.id} className="text-sm text-slate-650 hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-550 border border-slate-200/50">
                            <Building className="h-4 w-4" />
                          </div>
                          <span className="font-semibold text-slate-850">{o.name}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 font-mono text-xs text-slate-500">{o.code}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">{o.company_email || o.admin_email || "—"}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">{o.contact_person || o.admin_name || "—"}</td>
                      <td className="py-3.5 px-3 text-xs text-slate-600">
                        {o.admin_name ? (
                          <div>
                            <div className="font-medium text-slate-700">{o.admin_name}</div>
                            <div className="text-slate-400">{o.admin_email}</div>
                          </div>
                        ) : "—"}
                      </td>
                      <td className="py-3.5 px-3"><PlanBadge plan={o.subscription_plan} /></td>
                      <td className="py-3.5 px-3 text-xs text-slate-500">{formatDate(o.created_at)}</td>
                      <td className="py-3.5 px-3"><StatusBadge status={o.status} /></td>
                      <td className="py-3.5 px-3 text-xs text-slate-500">{o.created_by_name || "—"}</td>
                      <td className="py-3.5 px-3">{renderActionButtons(o)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
              <span className="text-sm text-slate-500">{filteredList.length} organization{filteredList.length !== 1 ? "s" : ""}</span>
              <div className="flex gap-2 items-center">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-slate-600">Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={filteredList.length < PAGE_SIZE}
                  className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Confirm Modal (Approve / Reactivate / Suspend / Delete) ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                confirmModal.action === "delete" ? "bg-red-100" :
                confirmModal.action === "suspend" ? "bg-orange-100" :
                "bg-emerald-100"
              }`}>
                {confirmModal.action === "approve" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {confirmModal.action === "reactivate" && <RotateCcw className="h-5 w-5 text-emerald-600" />}
                {confirmModal.action === "suspend" && <ShieldAlert className="h-5 w-5 text-orange-600" />}
                {confirmModal.action === "delete" && <Trash2 className="h-5 w-5 text-red-600" />}
              </div>
              <h3 className="text-lg font-bold text-slate-800 capitalize">{confirmModal.action} Organization</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              {confirmModal.action === "approve" && <>Approve <strong>{confirmModal.org.name}</strong>? The organization admin will be able to log in immediately.</>}
              {confirmModal.action === "reactivate" && <>Reactivate <strong>{confirmModal.org.name}</strong>? All users will regain access.</>}
              {confirmModal.action === "suspend" && <>Suspend <strong>{confirmModal.org.name}</strong>? All users will be blocked from logging in.</>}
              {confirmModal.action === "delete" && <>Delete <strong>{confirmModal.org.name}</strong>? This will permanently remove the organization and all associated data. This cannot be undone.</>}
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={
                  confirmModal.action === "approve" ? confirmApprove :
                  confirmModal.action === "reactivate" ? confirmReactivate :
                  confirmModal.action === "suspend" ? confirmSuspend :
                  confirmDelete
                }
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-semibold ${
                  confirmModal.action === "delete" ? "bg-red-600 hover:bg-red-700" :
                  confirmModal.action === "suspend" ? "bg-orange-600 hover:bg-orange-700" :
                  "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {confirmModal.action === "delete" ? <Trash2 className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                Confirm {confirmModal.action}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Modal ── */}
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
              Reject <strong>{rejectModal.name}</strong> registration. Provide a reason (required):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-sm text-slate-800 outline-none focus:border-red-400 min-h-[100px] resize-y"
            />
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmReject} disabled={!rejectReason.trim()}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                <Edit3 className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Edit Organization</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                <input type="text" value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-4 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Organization Code</label>
                <input type="text" value={editData.code}
                  onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-4 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subscription Plan</label>
                <select value={editData.subscription_plan}
                  onChange={(e) => setEditData({ ...editData, subscription_plan: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 px-4 text-sm outline-none focus:border-indigo-400">
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="TRIAL">Trial</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Users</label>
                  <input type="number" value={editData.max_users}
                    onChange={(e) => setEditData({ ...editData, max_users: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-4 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max Storage (GB)</label>
                  <input type="number" value={editData.max_storage_gb}
                    onChange={(e) => setEditData({ ...editData, max_storage_gb: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-white py-2 px-4 text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button onClick={() => setEditModal(null)}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmEdit}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
                <CheckCircle className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {detailOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-3xl p-6 w-full max-w-3xl shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Building className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{detailOrg.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{detailOrg.code}</span>
                </div>
              </div>
              <button onClick={() => { setDetailOrg(null); setDetailData(null); }} className="p-1 hover:bg-slate-100 rounded-lg">
                <XCircle className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="text-center py-12 text-slate-400">Loading details...</div>
            ) : (
              <div className="space-y-6">
                {/* Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Status</div>
                    <StatusBadge status={detailOrg.status} />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Plan</div>
                    <PlanBadge plan={detailOrg.subscription_plan} />
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Total Users</div>
                    <div className="text-xl font-bold text-slate-800">{detailOrg.user_count || 0}</div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-4">
                    <div className="text-xs text-slate-400 mb-1">Registered</div>
                    <div className="text-sm font-semibold text-slate-700">{formatDate(detailOrg.created_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Organization Information */}
                  <div className="border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Info className="h-4 w-4 text-slate-400" /> Organization Information
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="font-medium text-slate-700">{detailOrg.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Code</dt><dd className="font-mono text-xs text-slate-600">{detailOrg.code}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Company Email</dt><dd className="text-slate-600">{detailData?.detail?.company_email || detailOrg.admin_email || "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Contact Person</dt><dd className="text-slate-600">{detailData?.detail?.contact_person || detailOrg.admin_name || "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Created By</dt><dd className="text-slate-600">{detailData?.detail?.created_by_name || "—"}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Created At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.created_at)}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Updated At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.updated_at)}</dd></div>
                      {detailOrg.approved_by_name && <div className="flex justify-between"><dt className="text-slate-400">Approved By</dt><dd className="text-slate-600">{detailOrg.approved_by_name}</dd></div>}
                      {detailOrg.approved_at && <div className="flex justify-between"><dt className="text-slate-400">Approved At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.approved_at)}</dd></div>}
                      {detailOrg.rejection_reason && (
                        <div className="pt-2 border-t border-slate-100">
                          <dt className="text-slate-400 mb-1">Rejection Reason</dt>
                          <dd className="text-red-600 bg-red-50 rounded-xl p-2.5 text-xs">{detailOrg.rejection_reason}</dd>
                        </div>
                      )}
                      {detailOrg.suspended_at && <div className="flex justify-between"><dt className="text-slate-400">Suspended At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.suspended_at)}</dd></div>}
                      {detailOrg.reactivated_at && <div className="flex justify-between"><dt className="text-slate-400">Reactivated At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.reactivated_at)}</dd></div>}
                    </dl>
                  </div>

                  {/* Organization Admin */}
                  <div className="border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" /> Organization Admin
                    </h4>
                    {detailOrg.admin_name ? (
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="font-medium text-slate-700">{detailOrg.admin_name}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd className="text-slate-600">{detailOrg.admin_email}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">Admin ID</dt><dd className="text-xs font-mono text-slate-500">{detailData?.detail?.admin_id || "—"}</dd></div>
                      </dl>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No admin user assigned yet</p>
                    )}
                  </div>

                  {/* Subscription */}
                  <div className="border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-slate-400" /> Subscription
                    </h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-400">Plan</dt><dd><PlanBadge plan={detailOrg.subscription_plan} /></dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Max Users</dt><dd className="font-medium text-slate-700">{detailData?.detail?.max_users ?? 15}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Storage</dt><dd className="font-medium text-slate-700">{detailData?.detail?.max_storage_gb ?? 5} GB</dd></div>
                    </dl>
                  </div>

                  {/* Products */}
                  <div className="border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-slate-400" /> Products
                    </h4>
                    {detailData?.products && detailData.products.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.products.map((p) => (
                          <div key={p.id} className="flex items-center justify-between py-1.5 px-3 bg-slate-50 rounded-xl text-sm">
                            <span className="text-slate-700">{p.product_name}</span>
                            <button
                              onClick={async () => {
                                try {
                                  const orgId = detailOrg?.id;
                                  if (!orgId) return;
                                  await superAdminService.toggleOrganizationProduct(orgId, p.product_id, !p.is_enabled);
                                  const updated = await superAdminService.getOrganizationDetail(orgId);
                                  setDetailData((prev) => ({ ...prev, detail: updated.detail, products: updated.products || [] }));
                                } catch (e) {
                                  console.error("Failed to toggle product", e);
                                }
                              }}
                              className={`text-xs font-semibold px-2.5 py-1 rounded-full transition cursor-pointer ${
                                p.is_enabled
                                  ? "text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                                  : "text-slate-400 bg-slate-100 border border-slate-200 hover:bg-slate-200"
                              }`}
                            >
                              {p.is_enabled ? "Enabled" : "Disabled"}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No products configured</p>
                    )}
                  </div>

                  {/* Billing / Audit History combined */}
                  <div className="border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" /> Audit History
                    </h4>
                    {detailData?.auditLogs && detailData.auditLogs.length > 0 ? (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {detailData.auditLogs.slice(0, 10).map((log) => (
                          <div key={log.id} className="text-xs flex items-start gap-2 py-1.5 border-b border-slate-50 last:border-0">
                            <div className={`h-2 w-2 rounded-full mt-1 flex-shrink-0 ${
                              log.action === "approved" || log.action === "activate" ? "bg-emerald-400" :
                              log.action === "rejected" || log.action === "suspend" || log.action === "delete" ? "bg-red-400" :
                              log.action === "reactivated" ? "bg-blue-400" : "bg-slate-300"
                            }`} />
                            <div className="flex-1">
                              <span className="font-medium text-slate-600 capitalize">{log.action}</span>
                              <span className="text-slate-400"> by {log.performed_by_email || "system"}</span>
                              <div className="text-slate-300">{formatDateTime(log.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No audit history</p>
                    )}
                  </div>

                  {/* Approval History */}
                  <div className="border border-slate-200 rounded-2xl p-4">
                    <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                      <History className="h-4 w-4 text-slate-400" /> Approval History
                    </h4>
                    {detailData?.approvalHistory && detailData.approvalHistory.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.approvalHistory.map((h) => (
                          <div key={h.id} className="flex items-start gap-3 py-2 border-l-2 pl-3 ml-1 border-slate-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold capitalize ${
                                  h.action === "approved" ? "text-emerald-600" :
                                  h.action === "rejected" ? "text-red-600" :
                                  h.action === "reactivated" ? "text-blue-600" : "text-slate-600"
                                }`}>{h.action}</span>
                                {h.previous_status && h.new_status && (
                                  <span className="text-[10px] text-slate-500">
                                    <StatusBadge status={h.previous_status} /> → <StatusBadge status={h.new_status} />
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">by {h.performed_by_name || "Super Admin"}</span>
                              </div>
                              {h.reason && <p className="text-xs text-slate-500 mt-0.5 italic">"{h.reason}"</p>}
                              <div className="text-[10px] text-slate-300 mt-0.5">{formatDateTime(h.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-400 italic">No approval history</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex mt-6 pt-4 border-t border-slate-100 justify-end gap-2">
              <button onClick={() => { setDetailOrg(null); setDetailData(null); }}
                className="px-4 py-2 rounded-full border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
