import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Building2,
  Search,
  RefreshCw,
  Eye,
  Pencil,
  Check,
  X,
  Trash2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  ShieldAlert,
  RotateCcw,
  Mail,
  User,
  CreditCard,
  Package,
  History,
  Info,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

const STATUS_TABS = [
  { key: "pending", label: "Pending", apiStatus: "PENDING" },
  { key: "approved", label: "Approved", apiStatus: "ACTIVE" },
  { key: "rejected", label: "Rejected", apiStatus: "REJECTED" },
  { key: "suspended", label: "Suspended", apiStatus: "SUSPENDED" },
  { key: "deactivated", label: "Deactivated", apiStatus: "DEACTIVATED" },
];

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-amber-600/20",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  rejected: "bg-red-50 text-red-700 ring-red-600/20",
  suspended: "bg-slate-100 text-slate-600 ring-slate-500/20",
  deactivated: "bg-slate-100 text-slate-500 ring-slate-500/20",
};

const PLAN_STYLES = {
  FREE: "bg-slate-100 text-slate-600",
  BASIC: "bg-orange-50 text-orange-600",
  PROFESSIONAL: "bg-blue-50 text-blue-600",
  ENTERPRISE: "bg-indigo-50 text-indigo-700",
  TRIAL: "bg-purple-50 text-purple-700",
};

function mapApiStatus(status) {
  const map = {
    PENDING: "pending",
    ACTIVE: "approved",
    REJECTED: "rejected",
    SUSPENDED: "suspended",
    DEACTIVATED: "deactivated",
  };
  return map[status] ?? "pending";
}

function mapToApiStatus(uiStatus) {
  const tab = STATUS_TABS.find((t) => t.key === uiStatus);
  return tab?.apiStatus ?? "PENDING";
}

function formatDate(iso) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}, ${d.getUTCHours() % 12 || 12}:${pad(d.getUTCMinutes())} ${d.getUTCHours() >= 12 ? "PM" : "AM"} UTC`;
}

const PAGE_SIZE = 20;

export default function PendingOrganizationsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [openMenuId, setOpenMenuId] = useState(null);
  const [page, setPage] = useState(1);

  const [pending, setPending] = useState([]);
  const [approved, setApproved] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [suspended, setSuspended] = useState([]);
  const [deactivated, setDeactivated] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [confirmModal, setConfirmModal] = useState(null);
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
      const [p, a, r, s, d] = await Promise.all([
        superAdminService.getPendingOrganizations(params),
        superAdminService.getApprovedOrganizations(params),
        superAdminService.getRejectedOrganizations(params),
        superAdminService.getSuspendedOrganizations(params),
        superAdminService.getDeactivatedOrganizations(params),
      ]);
      setPending(p.organizations || []);
      setApproved(a.organizations || []);
      setRejected(r.organizations || []);
      setSuspended(s.organizations || []);
      setDeactivated(d.organizations || []);
    } catch (e) {
      console.error("Failed to load", e);
      setError(e.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { loadData(); }, [loadData]);

  const refreshAll = useCallback(async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
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

  const counts = useMemo(() => ({
    pending: pending.length,
    approved: approved.length,
    rejected: rejected.length,
    suspended: suspended.length,
    deactivated: deactivated.length,
  }), [pending, approved, rejected, suspended, deactivated]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return getList().filter((o) =>
      !q
        ? true
        : [o.name, o.code, o.admin_email, o.admin_name, o.contact_person, o.company_email]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(q)
    );
  }, [query, activeTab, pending, approved, rejected, suspended, deactivated]);

  const allSelected = filtered.length > 0 && filtered.every((o) => selected.has(o.id));

  function toggleAll() {
    setSelected((prev) => {
      if (allSelected) return new Set();
      return new Set(filtered.map((o) => o.id));
    });
  }

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function bulkUpdateStatus(status) {
    setActionLoading("bulk");
    try {
      await Promise.all([...selected].map((id) => superAdminService.updateOrganizationStatus(id, { status })));
      setSelected(new Set());
      await refreshAll();
    } catch (e) {
      setError(e.message || "Bulk action failed");
    } finally {
      setActionLoading(null);
    }
  }

  function handleApprove(org) { setConfirmModal({ org, action: "approve" }); }

  async function confirmApprove() {
    if (!confirmModal) return;
    setActionLoading(confirmModal.org.id);
    try {
      await superAdminService.approveOrganization(confirmModal.org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to approve");
    } finally {
      setActionLoading(null);
    }
  }

  function handleRejectClick(org) { setRejectModal(org); setRejectReason(""); }

  async function confirmReject() {
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
  }

  function handleReactivate(org) { setConfirmModal({ org, action: "reactivate" }); }

  async function confirmReactivate() {
    if (!confirmModal) return;
    setActionLoading(confirmModal.org.id);
    try {
      await superAdminService.reactivateOrganization(confirmModal.org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to reactivate");
    } finally {
      setActionLoading(null);
    }
  }

  function handleSuspend(org) { setConfirmModal({ org, action: "suspend" }); }

  async function confirmSuspend() {
    if (!confirmModal) return;
    setActionLoading(confirmModal.org.id);
    try {
      await superAdminService.suspendOrganization(confirmModal.org.id);
      setConfirmModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to suspend");
    } finally {
      setActionLoading(null);
    }
  }

  function handleDelete(org) { setConfirmModal({ org, action: "delete" }); }

  async function confirmDelete() {
    if (!confirmModal) return;
    setActionLoading(confirmModal.org.id);
    try {
      await superAdminService.deleteOrganization(confirmModal.org.id);
      setConfirmModal(null);
      setOpenMenuId(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to delete");
    } finally {
      setActionLoading(null);
    }
  }

  function handleEditClick(org) {
    setEditModal(org);
    setEditData({
      name: org.name || "",
      code: org.code || "",
      subscription_plan: org.subscription_plan || "FREE",
      max_users: 15,
      max_storage_gb: 5,
    });
    setOpenMenuId(null);
  }

  async function confirmEdit() {
    if (!editModal) return;
    setActionLoading(editModal.id);
    try {
      await superAdminService.updateOrganization(editModal.id, editData);
      setEditModal(null);
      await refreshAll();
    } catch (e) {
      setError(e.message || "Failed to update organization");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleViewDetails(org) {
    setDetailOrg(org);
    setDetailData(null);
    setDetailLoading(true);
    setOpenMenuId(null);
    try {
      const [detail, products, approvalHistory, auditLogs] = await Promise.all([
        superAdminService.getOrganizationDetail(org.id),
        superAdminService.getOrganizationProducts(org.id).catch(() => []),
        superAdminService.getApprovalHistory(org.id).catch(() => ({ history: [] })),
        superAdminService.getAuditLogs({ entity_type: "Organization", organization_id: org.id, page_size: 20 }).catch(() => ({ logs: [] })),
      ]);
      setDetailData({ detail, products, approvalHistory: approvalHistory.history || [], auditLogs: auditLogs.logs || [] });
    } catch (e) {
      setError(e.message || "Failed to load details");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <div className="min-h-full bg-slate-50/60 p-6 sm:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Page header */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-7 shadow-sm sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Organization approvals</h1>
          <p className="mt-1.5 text-sm text-slate-500">Review, approve, or reject organization registration requests.</p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => { setError(null); refreshAll(); }} className="ml-auto text-xs font-semibold text-red-600 underline hover:text-red-800">Retry</button>
          </div>
        )}

        {/* Card */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          {/* Tabs + search */}
          <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-1.5">
              {STATUS_TABS.map((tab) => {
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => { setActiveTab(tab.key); setSelected(new Set()); setPage(1); setQuery(""); }}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20"
                        : "text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {tab.label}
                    <span className={`rounded-full px-1.5 py-0.5 text-xs tabular-nums ${active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {counts[tab.key] ?? 0}
                    </span>
                  </button>
                );
              })}
            </nav>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search organizations..."
                  className="w-64 rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-100"
                />
              </div>
              <button onClick={refreshAll} aria-label="Refresh" className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50">
                <RefreshCw size={16} className={loading || isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {/* Bulk actions */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between bg-indigo-50/70 px-6 py-3">
              <span className="text-sm font-medium text-indigo-900">{selected.size} organization{selected.size > 1 ? "s" : ""} selected</span>
              <div className="flex gap-2">
                {activeTab === "pending" && (
                  <>
                    <button onClick={() => bulkUpdateStatus("ACTIVE")} disabled={!!actionLoading}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                      <Check size={14} /> Approve selected
                    </button>
                    <button onClick={() => { setRejectModal({ _bulk: true, name: "selected organizations" }); setRejectReason(""); }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50">
                      <X size={14} /> Reject selected
                    </button>
                  </>
                )}
                <button onClick={() => setSelected(new Set())} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100">Clear</button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-16 text-center text-sm text-slate-400">Loading organizations...</div>
            ) : (
              <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="w-10 px-6 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Select all"
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                    </th>
                    <th className="px-3 py-3">Organization</th>
                    <th className="px-3 py-3">Org admin</th>
                    <th className="px-3 py-3">Plan</th>
                    <th className="px-3 py-3">Created</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <p className="text-sm font-medium text-slate-500">No {activeTab} organizations</p>
                        <p className="mt-1 text-xs text-slate-400">{query ? "Try a different search term." : "New requests will show up here."}</p>
                      </td>
                    </tr>
                  )}

                  {filtered.map((org) => (
                    <tr key={org.id} className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/60">
                      <td className="px-6 py-4 align-top">
                        <input type="checkbox" checked={selected.has(org.id)} onChange={() => toggleOne(org.id)}
                          aria-label={`Select ${org.name}`} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex items-start gap-3">
                          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                            <Building2 size={16} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{org.name}</span>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">{org.code}</span>
                            </div>
                            <div className="mt-0.5 text-xs text-slate-500">{org.company_email || org.admin_email || "\u2014"}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4 align-top">
                        <div className="text-slate-700">{org.admin_name || org.contact_person || "\u2014"}</div>
                        <div className="text-xs text-slate-400">{org.admin_email || "\u2014"}</div>
                      </td>

                      <td className="px-3 py-4 align-top">
                        <span className={`rounded-md px-2 py-1 text-xs font-medium ${PLAN_STYLES[org.subscription_plan] ?? PLAN_STYLES.FREE}`}>
                          {org.subscription_plan || "FREE"}
                        </span>
                      </td>

                      <td className="px-3 py-4 align-top">
                          <div className="text-slate-700">{formatDateTime(org.created_at)}</div>
                      </td>

                      <td className="px-3 py-4 align-top">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[mapApiStatus(org.status)] ?? STATUS_STYLES.pending}`}>
                          {mapApiStatus(org.status).charAt(0).toUpperCase() + mapApiStatus(org.status).slice(1)}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {mapApiStatus(org.status) === "pending" ? (
                            <>
                              <button onClick={() => handleApprove(org)} disabled={actionLoading === org.id}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50">
                                <Check size={13} /> Approve
                              </button>
                              <button onClick={() => handleRejectClick(org)} disabled={actionLoading === org.id}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50">
                                <X size={13} /> Reject
                              </button>
                            </>
                          ) : mapApiStatus(org.status) === "approved" ? (
                            <button onClick={() => handleSuspend(org)} disabled={actionLoading === org.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50">
                              <ShieldAlert size={13} /> Suspend
                            </button>
                          ) : mapApiStatus(org.status) === "suspended" ? (
                            <button onClick={() => handleReactivate(org)} disabled={actionLoading === org.id}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-medium text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50">
                              <RotateCcw size={13} /> Reactivate
                            </button>
                          ) : (
                            <button onClick={() => handleViewDetails(org)}
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                              <Eye size={15} />
                            </button>
                          )}

                          <div className="relative">
                            <button onClick={() => setOpenMenuId(openMenuId === org.id ? null : org.id)} aria-label="More actions"
                              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
                              <MoreVertical size={15} />
                            </button>
                            {openMenuId === org.id && (
                              <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                                <button onClick={() => handleViewDetails(org)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">
                                  <Eye size={13} /> View details
                                </button>
                                <button onClick={() => handleEditClick(org)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-600 hover:bg-slate-50">
                                  <Pencil size={13} /> Edit
                                </button>
                                <button onClick={() => handleDelete(org)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
                                  <Trash2 size={13} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <span className="text-xs text-slate-500">{filtered.length} organization{filtered.length !== 1 ? "s" : ""}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <span className="px-2 text-xs font-medium text-slate-600">Page {page}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={filtered.length < PAGE_SIZE}
                className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:text-slate-300 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm Modal ── */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                confirmModal.action === "delete" ? "bg-red-100" : confirmModal.action === "suspend" ? "bg-orange-100" : "bg-emerald-100"
              }`}>
                {confirmModal.action === "approve" && <CheckCircle className="h-5 w-5 text-emerald-600" />}
                {confirmModal.action === "reactivate" && <RotateCcw className="h-5 w-5 text-emerald-600" />}
                {confirmModal.action === "suspend" && <ShieldAlert className="h-5 w-5 text-orange-600" />}
                {confirmModal.action === "delete" && <Trash2 className="h-5 w-5 text-red-600" />}
              </div>
              <h3 className="text-lg font-bold capitalize text-slate-800">{confirmModal.action} Organization</h3>
            </div>
            <p className="mb-6 text-sm text-slate-600">
              {confirmModal.action === "approve" && <>Approve <strong>{confirmModal.org.name}</strong>? The organization admin will be able to log in immediately.</>}
              {confirmModal.action === "reactivate" && <>Reactivate <strong>{confirmModal.org.name}</strong>? All users will regain access.</>}
              {confirmModal.action === "suspend" && <>Suspend <strong>{confirmModal.org.name}</strong>? All users will be blocked from logging in.</>}
              {confirmModal.action === "delete" && <>Delete <strong>{confirmModal.org.name}</strong>? This will permanently remove the organization and all associated data. This cannot be undone.</>}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={
                  confirmModal.action === "approve" ? confirmApprove :
                  confirmModal.action === "reactivate" ? confirmReactivate :
                  confirmModal.action === "suspend" ? confirmSuspend : confirmDelete
                }
                disabled={!!actionLoading}
                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
                  confirmModal.action === "delete" ? "bg-red-600 hover:bg-red-700" :
                  confirmModal.action === "suspend" ? "bg-orange-600 hover:bg-orange-700" : "bg-emerald-600 hover:bg-emerald-700"
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
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Reject Organization</h3>
            </div>
            <p className="mb-4 text-sm text-slate-600">
              Reject <strong>{rejectModal.name}</strong> registration. Provide a reason (required):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="min-h-[100px] w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 outline-none focus:border-red-400"
            />
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setRejectModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button
                onClick={async () => {
                  if (rejectModal._bulk) {
                    setActionLoading("bulk");
                    try {
                      await Promise.all([...selected].map((id) => superAdminService.rejectOrganization(id, { reason: rejectReason })));
                      setRejectModal(null);
                      setRejectReason("");
                      setSelected(new Set());
                      await refreshAll();
                    } catch (e) {
                      setError(e.message || "Failed to reject");
                    } finally {
                      setActionLoading(null);
                    }
                  } else {
                    await confirmReject();
                  }
                }}
                disabled={!rejectReason.trim() || !!actionLoading}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
                <Pencil className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Edit Organization</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Organization Name</label>
                <input type="text" value={editData.name} onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Organization Code</label>
                <input type="text" value={editData.code} onChange={(e) => setEditData({ ...editData, code: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Subscription Plan</label>
                <select value={editData.subscription_plan} onChange={(e) => setEditData({ ...editData, subscription_plan: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400">
                  <option value="FREE">Free</option>
                  <option value="BASIC">Basic</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="TRIAL">Trial</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Max Users</label>
                  <input type="number" value={editData.max_users} onChange={(e) => setEditData({ ...editData, max_users: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Max Storage (GB)</label>
                  <input type="number" value={editData.max_storage_gb} onChange={(e) => setEditData({ ...editData, max_storage_gb: parseInt(e.target.value) || 0 })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:border-indigo-400" />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setEditModal(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmEdit} disabled={!!actionLoading}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
                <CheckCircle className="h-4 w-4" /> Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {detailOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{detailOrg.name}</h3>
                  <span className="font-mono text-xs text-slate-400">{detailOrg.code}</span>
                </div>
              </div>
              <button onClick={() => { setDetailOrg(null); setDetailData(null); }} className="rounded-lg p-1 hover:bg-slate-100">
                <XCircle className="h-5 w-5 text-slate-400" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-12 text-center text-sm text-slate-400">Loading details...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-1 text-xs text-slate-400">Status</div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[mapApiStatus(detailOrg.status)]}`}>
                      {mapApiStatus(detailOrg.status).charAt(0).toUpperCase() + mapApiStatus(detailOrg.status).slice(1)}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-1 text-xs text-slate-400">Plan</div>
                    <span className={`rounded-md px-2 py-1 text-xs font-medium ${PLAN_STYLES[detailOrg.subscription_plan] ?? PLAN_STYLES.FREE}`}>
                      {detailOrg.subscription_plan || "FREE"}
                    </span>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-1 text-xs text-slate-400">Total Users</div>
                    <div className="text-xl font-bold text-slate-800">{detailOrg.user_count || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="mb-1 text-xs text-slate-400">Registered</div>
                    <div className="text-sm font-semibold text-slate-700">{formatDate(detailOrg.created_at)}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Info className="h-4 w-4 text-slate-400" /> Organization Information</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="font-medium text-slate-700">{detailOrg.name}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Code</dt><dd className="font-mono text-xs text-slate-600">{detailOrg.code}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Company Email</dt><dd className="text-slate-600">{detailData?.detail?.company_email || detailOrg.admin_email || "\u2014"}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Contact Person</dt><dd className="text-slate-600">{detailData?.detail?.contact_person || detailOrg.admin_name || "\u2014"}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Created By</dt><dd className="text-slate-600">{detailData?.detail?.created_by_name || "\u2014"}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Created At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.created_at)}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Updated At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.updated_at)}</dd></div>
                      {detailOrg.approved_by_name && <div className="flex justify-between"><dt className="text-slate-400">Approved By</dt><dd className="text-slate-600">{detailOrg.approved_by_name}</dd></div>}
                      {detailOrg.approved_at && <div className="flex justify-between"><dt className="text-slate-400">Approved At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.approved_at)}</dd></div>}
                      {detailOrg.rejection_reason && (
                        <div className="border-t border-slate-100 pt-2">
                          <dt className="mb-1 text-slate-400">Rejection Reason</dt>
                          <dd className="rounded-xl bg-red-50 p-2.5 text-xs text-red-600">{detailOrg.rejection_reason}</dd>
                        </div>
                      )}
                      {detailOrg.suspended_at && <div className="flex justify-between"><dt className="text-slate-400">Suspended At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.suspended_at)}</dd></div>}
                      {detailOrg.reactivated_at && <div className="flex justify-between"><dt className="text-slate-400">Reactivated At</dt><dd className="text-slate-600">{formatDateTime(detailOrg.reactivated_at)}</dd></div>}
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><User className="h-4 w-4 text-slate-400" /> Organization Admin</h4>
                    {detailOrg.admin_name ? (
                      <dl className="space-y-2 text-sm">
                        <div className="flex justify-between"><dt className="text-slate-400">Name</dt><dd className="font-medium text-slate-700">{detailOrg.admin_name}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">Email</dt><dd className="text-slate-600">{detailOrg.admin_email}</dd></div>
                        <div className="flex justify-between"><dt className="text-slate-400">Admin ID</dt><dd className="font-mono text-xs text-slate-500">{detailData?.detail?.admin_id || "\u2014"}</dd></div>
                      </dl>
                    ) : (
                      <p className="text-sm italic text-slate-400">No admin user assigned yet</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><CreditCard className="h-4 w-4 text-slate-400" /> Subscription</h4>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between"><dt className="text-slate-400">Plan</dt><dd><span className={`rounded-md px-2 py-1 text-xs font-medium ${PLAN_STYLES[detailOrg.subscription_plan] ?? PLAN_STYLES.FREE}`}>{detailOrg.subscription_plan || "FREE"}</span></dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Max Users</dt><dd className="font-medium text-slate-700">{detailData?.detail?.max_users ?? 15}</dd></div>
                      <div className="flex justify-between"><dt className="text-slate-400">Storage</dt><dd className="font-medium text-slate-700">{detailData?.detail?.max_storage_gb ?? 5} GB</dd></div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><Package className="h-4 w-4 text-slate-400" /> Products</h4>
                    {detailData?.products && detailData.products.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.products.map((p) => (
                          <div key={p.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-1.5 text-sm">
                            <span className="text-slate-700">{p.product_name}</span>
                            <span className={`text-xs font-semibold ${p.is_enabled ? "text-emerald-600" : "text-slate-400"}`}>{p.is_enabled ? "Enabled" : "Disabled"}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-400">No products configured</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><FileText className="h-4 w-4 text-slate-400" /> Audit History</h4>
                    {detailData?.auditLogs && detailData.auditLogs.length > 0 ? (
                      <div className="max-h-48 space-y-1.5 overflow-y-auto">
                        {detailData.auditLogs.slice(0, 10).map((log) => (
                          <div key={log.id} className="flex items-start gap-2 border-b border-slate-50 py-1.5 text-xs last:border-0">
                            <div className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                              log.action === "approved" || log.action === "activate" ? "bg-emerald-400" :
                              log.action === "rejected" || log.action === "suspend" || log.action === "delete" ? "bg-red-400" :
                              log.action === "reactivated" ? "bg-blue-400" : "bg-slate-300"
                            }`} />
                            <div className="flex-1">
                              <span className="font-medium capitalize text-slate-600">{log.action}</span>
                              <span className="text-slate-400"> by {log.performed_by_email || "system"}</span>
                              <div className="text-slate-300">{formatDateTime(log.created_at)}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-400">No audit history</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-700"><History className="h-4 w-4 text-slate-400" /> Approval History</h4>
                    {detailData?.approvalHistory && detailData.approvalHistory.length > 0 ? (
                      <div className="space-y-2">
                        {detailData.approvalHistory.map((h) => (
                          <div key={h.id} className="ml-1 border-l-2 border-slate-200 py-2 pl-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-bold capitalize ${
                                h.action === "approved" ? "text-emerald-600" :
                                h.action === "rejected" ? "text-red-600" :
                                h.action === "reactivated" ? "text-blue-600" : "text-slate-600"
                              }`}>{h.action}</span>
                              {h.previous_status && h.new_status && (
                                <span className="text-[10px] text-slate-500">{h.previous_status} &rarr; {h.new_status}</span>
                              )}
                              <span className="text-[10px] text-slate-400">by {h.performed_by_name || "Super Admin"}</span>
                            </div>
                            {h.reason && <p className="mt-0.5 text-xs italic text-slate-500">"{h.reason}"</p>}
                            <div className="mt-0.5 text-[10px] text-slate-300">{formatDateTime(h.created_at)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm italic text-slate-400">No approval history</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
              <button onClick={() => { setDetailOrg(null); setDetailData(null); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
