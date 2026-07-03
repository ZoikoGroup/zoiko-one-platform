import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import {
  AlertTriangle, Search, Building, ChevronLeft, ChevronRight,
  Eye, MoreVertical, CheckCircle, XCircle, RotateCcw,
  PauseCircle, Ban, PlayCircle, ThumbsUp, ThumbsDown,
  Loader2,
} from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

const STATUS_BADGES = {
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  approved: "bg-blue-50 text-blue-700 border border-blue-100",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  on_hold: "bg-purple-50 text-purple-700 border border-purple-100",
  rejected: "bg-red-50 text-red-700 border border-red-100",
  suspended: "bg-orange-50 text-orange-700 border border-orange-100",
  deactivated: "bg-slate-50 text-slate-600 border border-slate-200",
};

export default function PlatformUsersPage() {
  const navigate = useNavigate();
  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const loadOrgs = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await superAdminService.getOrganizations(params);
      setOrgs(data.organizations || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message || "Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter]);

  useEffect(() => { loadOrgs(); }, [loadOrgs]);

  const execAction = async (orgId, label, fn) => {
    setActionLoading(orgId);
    setOpenDropdown(null);
    setConfirmAction(null);
    try {
      await fn();
      await loadOrgs();
    } catch (e) {
      setError(`${label} failed: ${e.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const actionsForOrg = (org) => {
    const actions = [];
    const status = (org.status || "").toLowerCase();
    if (status === "pending") {
      actions.push({ label: "Approve", icon: ThumbsUp, action: () => superAdminService.approveOrganization(org.id) });
      actions.push({ label: "Reject", icon: ThumbsDown, action: () => navigate(`/super-admin/organizations/${org.id}`) });
    }
    if (status === "approved" || status === "active") {
      actions.push({ label: "Put On Hold", icon: PauseCircle, action: () => superAdminService.putOnHold(org.id) });
      actions.push({ label: "Suspend", icon: Ban, action: () => superAdminService.suspendOrganization(org.id) });
    }
    if (status === "on_hold") {
      actions.push({ label: "Reactivate", icon: RotateCcw, action: () => superAdminService.reactivateOrganization(org.id) });
    }
    if (status === "suspended") {
      actions.push({ label: "Reactivate", icon: RotateCcw, action: () => superAdminService.reactivateOrganization(org.id) });
    }
    if (status === "deactivated") {
      actions.push({ label: "Reactivate", icon: RotateCcw, action: () => superAdminService.reactivateOrganization(org.id) });
    }
    actions.push({ label: "View Details", icon: Eye, action: () => navigate(`/super-admin/organizations/${org.id}`) });
    return actions;
  };

  const handleDropdown = (orgId) => {
    setOpenDropdown(openDropdown === orgId ? null : orgId);
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6 font-sans">
      <PageHeader title="Organizations" description="Manage organizations across the platform. Super Admin manages Organizations, not individual employees." />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={loadOrgs} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-800">All Organizations ({total})</h3>
          <div className="flex gap-3 items-center">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-full border border-slate-200 bg-slate-50 py-2 px-4 text-sm text-slate-700 outline-none focus:border-[#FF7A00]"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="active">Active</option>
              <option value="on_hold">On Hold</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="relative max-w-sm w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search organizations..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#FF7A00]"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Building className="h-10 w-10 mx-auto mb-3 opacity-40" />
            No organizations found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="py-3 px-4">Organization</th>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Users</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orgs.map((org) => {
                    const actions = actionsForOrg(org);
                    return (
                      <tr key={org.id} className="text-sm text-slate-650 hover:bg-slate-50/50 transition">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-full bg-[#FF7A00]/10 flex items-center justify-center text-[#FF7A00] text-xs font-bold">
                              <Building className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-slate-800">{org.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-mono">{org.code}</td>
                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGES[org.status] || STATUS_BADGES.pending}`}>
                            {org.status?.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">{org.user_count}</td>
                        <td className="py-4 px-4 text-slate-600">{org.subscription_plan}</td>
                        <td className="py-4 px-4 relative">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigate(`/super-admin/organizations/${org.id}`)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <div className="relative">
                              <button
                                onClick={() => handleDropdown(org.id)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                                title="More Actions"
                                disabled={actionLoading === org.id}
                              >
                                {actionLoading === org.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                              </button>
                              {openDropdown === org.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setOpenDropdown(null)} />
                                  <div className="absolute right-0 mt-1 z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                                    {actions.map((a, i) => (
                                      <button
                                        key={i}
                                        onClick={() => {
                                          const msg = a.label === "Put On Hold" ? `Put organization "${org.name}" on hold?` :
                                            a.label === "Suspend" ? `Suspend organization "${org.name}"?` :
                                            a.label === "Reactivate" ? `Reactivate organization "${org.name}"?` : null;
                                          if (msg) {
                                            setConfirmAction({ msg, fn: () => execAction(org.id, a.label, a.action) });
                                          } else {
                                            a.action();
                                          }
                                          setOpenDropdown(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                                      >
                                        <a.icon className="h-3.5 w-3.5" />
                                        {a.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">{total} total organizations</span>
                <div className="flex gap-2 items-center">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Action</h3>
            <p className="text-sm text-slate-600 mb-6">{confirmAction.msg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmAction.fn} className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-sm hover:bg-[#e06e00]">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
