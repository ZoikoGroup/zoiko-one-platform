import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/PageHeader";
import {
  Users, ShieldCheck, UserX, Search, ChevronLeft, ChevronRight,
  MoreVertical, Pencil, Ban, CheckCircle, Trash2, KeyRound,
  AlertTriangle, Loader2, Building, Eye, ThumbsUp, ThumbsDown,
  PauseCircle, RotateCcw,
} from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

const ORG_STATUS_BADGES = {
  pending: "bg-amber-50 text-amber-700 border border-amber-100",
  approved: "bg-blue-50 text-blue-700 border border-blue-100",
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  on_hold: "bg-purple-50 text-purple-700 border border-purple-100",
  rejected: "bg-red-50 text-red-700 border border-red-100",
  suspended: "bg-orange-50 text-orange-700 border border-orange-100",
  deactivated: "bg-slate-50 text-slate-600 border border-slate-200",
};

const USER_STATUS_BADGES = {
  active: "bg-emerald-50 text-emerald-700 border border-emerald-100",
  invited: "bg-blue-50 text-blue-700 border border-blue-100",
  disabled: "bg-red-50 text-red-700 border border-red-100",
  inactive: "bg-slate-50 text-slate-600 border border-slate-200",
};

export default function UserManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("organizations");

  // ── Organizations state ──
  const [orgs, setOrgs] = useState([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgPage, setOrgPage] = useState(1);
  const [orgPageSize] = useState(20);
  const [orgSearch, setOrgSearch] = useState("");
  const [orgStatusFilter, setOrgStatusFilter] = useState("");
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgError, setOrgError] = useState(null);
  const [orgActionLoading, setOrgActionLoading] = useState(null);
  const [orgOpenDropdown, setOrgOpenDropdown] = useState(null);
  const [orgConfirmAction, setOrgConfirmAction] = useState(null);

  // ── Users state ──
  const [users, setUsers] = useState([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userPageSize] = useState(20);
  const [userSearch, setUserSearch] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("");
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);
  const [userActionLoading, setUserActionLoading] = useState(null);
  const [userOpenDropdown, setUserOpenDropdown] = useState(null);
  const [userConfirmAction, setUserConfirmAction] = useState(null);
  const [userStats, setUserStats] = useState({ total_org_admins: 0, total_hr_admins: 0, total_employees: 0 });

  // ── Load Organizations ──
  const loadOrgs = useCallback(async () => {
    setOrgLoading(true);
    try {
      setOrgError(null);
      const params = { page: orgPage, page_size: orgPageSize };
      if (orgSearch) params.search = orgSearch;
      if (orgStatusFilter) params.status = orgStatusFilter;
      const data = await superAdminService.getOrganizations(params);
      setOrgs(data.organizations || []);
      setOrgTotal(data.total || 0);
    } catch (e) {
      setOrgError(e.message || "Failed to load organizations.");
    } finally {
      setOrgLoading(false);
    }
  }, [orgPage, orgPageSize, orgSearch, orgStatusFilter]);

  useEffect(() => { if (activeTab === "organizations") loadOrgs(); }, [activeTab, loadOrgs]);

  // ── Load Users ──
  const loadUsers = useCallback(async () => {
    setUserLoading(true);
    try {
      setUserError(null);
      const params = { page: userPage, page_size: userPageSize };
      if (userSearch) params.search = userSearch;
      if (userStatusFilter) params.status = userStatusFilter;
      if (userRoleFilter) params.role = userRoleFilter;
      const data = await superAdminService.getUsers(params);
      setUsers(data.users || []);
      setUserTotal(data.total || 0);
      setUserStats({
        total_org_admins: data.total_org_admins || 0,
        total_hr_admins: data.total_hr_admins || 0,
        total_employees: data.total_employees || 0,
      });
    } catch (e) {
      setUserError(e.message || "Failed to load users.");
    } finally {
      setUserLoading(false);
    }
  }, [userPage, userPageSize, userSearch, userStatusFilter, userRoleFilter]);

  useEffect(() => { if (activeTab === "users") loadUsers(); }, [activeTab, loadUsers]);

  // ── Org actions ──
  const execOrgAction = async (orgId, label, fn) => {
    setOrgActionLoading(orgId);
    setOrgOpenDropdown(null);
    setOrgConfirmAction(null);
    try {
      await fn();
      await loadOrgs();
    } catch (e) {
      setOrgError(`${label} failed: ${e.message}`);
    } finally {
      setOrgActionLoading(null);
    }
  };

  const orgActionsFor = (org) => {
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
    if (["on_hold", "suspended", "deactivated"].includes(status)) {
      actions.push({ label: "Reactivate", icon: RotateCcw, action: () => superAdminService.reactivateOrganization(org.id) });
    }
    actions.push({ label: "View Details", icon: Eye, action: () => navigate(`/super-admin/organizations/${org.id}`) });
    return actions;
  };

  // ── User actions ──
  const execUserAction = async (userId, label, fn) => {
    setUserActionLoading(userId);
    setUserOpenDropdown(null);
    setUserConfirmAction(null);
    try {
      await fn();
      await loadUsers();
    } catch (e) {
      setUserError(`${label} failed: ${e.message}`);
    } finally {
      setUserActionLoading(null);
    }
  };

  const generateTempPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    return pwd;
  };

  const orgTotalPages = Math.ceil(orgTotal / orgPageSize);
  const userTotalPages = Math.ceil(userTotal / userPageSize);

  const tabs = [
    { key: "organizations", label: "Organizations", icon: Building },
    { key: "users", label: "Users", icon: Users },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader title="User Management" description="Manage platform users and organizations." />

      {/* Org error */}
      {activeTab === "organizations" && orgError && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{orgError}</span>
          <button onClick={loadOrgs} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      {/* User error */}
      {activeTab === "users" && userError && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{userError}</span>
          <button onClick={loadUsers} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              activeTab === t.key
                ? "bg-white text-[#FF7A00] shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════ ORGANIZATIONS TAB ════════════ */}
      {activeTab === "organizations" && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-800">All Organizations ({orgTotal})</h3>
            <div className="flex gap-3 items-center">
              <select
                value={orgStatusFilter}
                onChange={(e) => { setOrgStatusFilter(e.target.value); setOrgPage(1); }}
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
                  value={orgSearch}
                  onChange={(e) => { setOrgSearch(e.target.value); setOrgPage(1); }}
                  className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#FF7A00]"
                />
              </div>
            </div>
          </div>

          {orgLoading ? (
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
                      const actions = orgActionsFor(org);
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
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ORG_STATUS_BADGES[org.status] || ORG_STATUS_BADGES.pending}`}>
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
                                  onClick={() => setOrgOpenDropdown(orgOpenDropdown === org.id ? null : org.id)}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                                  disabled={orgActionLoading === org.id}
                                >
                                  {orgActionLoading === org.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                                </button>
                                {orgOpenDropdown === org.id && (
                                  <>
                                    <div className="fixed inset-0 z-10" onClick={() => setOrgOpenDropdown(null)} />
                                    <div className="absolute right-0 mt-1 z-20 w-48 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                                      {actions.map((a, i) => (
                                        <button
                                          key={i}
                                          onClick={() => {
                                            const msg = a.label === "Put On Hold" ? `Put organization "${org.name}" on hold?` :
                                              a.label === "Suspend" ? `Suspend organization "${org.name}"?` :
                                              a.label === "Reactivate" ? `Reactivate organization "${org.name}"?` : null;
                                            if (msg) {
                                              setOrgConfirmAction({ msg, fn: () => execOrgAction(org.id, a.label, a.action) });
                                            } else {
                                              a.action();
                                            }
                                            setOrgOpenDropdown(null);
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

              {orgTotalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                  <span className="text-sm text-slate-500">{orgTotal} total organizations</span>
                  <div className="flex gap-2 items-center">
                    <button onClick={() => setOrgPage(p => Math.max(1, p - 1))} disabled={orgPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                    <span className="text-sm text-slate-600">Page {orgPage} of {orgTotalPages}</span>
                    <button onClick={() => setOrgPage(p => Math.min(orgTotalPages, p + 1))} disabled={orgPage === orgTotalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ════════════ USERS TAB ════════════ */}
      {activeTab === "users" && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="h-12 w-12 rounded-xl bg-orange-50 text-[#FF7A00] flex items-center justify-center">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Org Admins</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.total_org_admins}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">HR Admins</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.total_hr_admins}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="h-12 w-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <UserX className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Employees</p>
                <p className="text-2xl font-bold text-slate-800">{userStats.total_employees}</p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">All Users ({userTotal})</h3>
              <div className="flex gap-3 items-center flex-wrap">
                <select
                  value={userRoleFilter}
                  onChange={(e) => { setUserRoleFilter(e.target.value); setUserPage(1); }}
                  className="rounded-full border border-slate-200 bg-slate-50 py-2 px-4 text-sm text-slate-700 outline-none focus:border-[#FF7A00]"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Org Admin</option>
                  <option value="hr_admin">HR Admin</option>
                  <option value="billing_admin">Billing Admin</option>
                  <option value="employee">Employee</option>
                </select>
                <select
                  value={userStatusFilter}
                  onChange={(e) => { setUserStatusFilter(e.target.value); setUserPage(1); }}
                  className="rounded-full border border-slate-200 bg-slate-50 py-2 px-4 text-sm text-slate-700 outline-none focus:border-[#FF7A00]"
                >
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="invited">Invited</option>
                  <option value="disabled">Disabled</option>
                  <option value="inactive">Inactive</option>
                </select>
                <div className="relative max-w-sm w-full">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:bg-white focus:border-[#FF7A00]"
                  />
                </div>
              </div>
            </div>

            {userLoading ? (
              <div className="text-center py-12 text-slate-400">Loading...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No users found
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-3 px-4">User</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Organization</th>
                        <th className="py-3 px-4">Job Title</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {users.map((user) => (
                        <tr key={user.id} className="text-sm text-slate-650 hover:bg-slate-50/50 transition">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-[#FF7A00]/10 flex items-center justify-center text-[#FF7A00] text-xs font-bold">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </div>
                              <span className="font-semibold text-slate-800">{user.first_name} {user.last_name}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-slate-600">{user.email}</td>
                          <td className="py-4 px-4 text-slate-600">{user.organization_name}</td>
                          <td className="py-4 px-4 text-slate-600">{user.job_title || "—"}</td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${USER_STATUS_BADGES[user.status] || (user.is_active ? USER_STATUS_BADGES.active : USER_STATUS_BADGES.disabled)}`}>
                              {user.status || (user.is_active ? "active" : "disabled")}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right relative">
                            <div className="relative inline-block">
                              <button
                                onClick={() => setUserOpenDropdown(userOpenDropdown === user.id ? null : user.id)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                                disabled={userActionLoading === user.id}
                              >
                                {userActionLoading === user.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MoreVertical className="h-3.5 w-3.5" />}
                              </button>
                              {userOpenDropdown === user.id && (
                                <>
                                  <div className="fixed inset-0 z-10" onClick={() => setUserOpenDropdown(null)} />
                                  <div className="absolute right-0 mt-1 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-lg py-1">
                                    <button
                                      onClick={() => { setUserOpenDropdown(null); }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        const label = user.is_active ? "Disable" : "Enable";
                                        setUserConfirmAction({
                                          msg: `${label} user "${user.first_name} ${user.last_name}" (${user.email})?`,
                                          fn: () => execUserAction(
                                            user.id, label,
                                            () => user.is_active
                                              ? superAdminService.disableUser(user.id)
                                              : superAdminService.enableUser(user.id),
                                          ),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                                    >
                                      {user.is_active ? <Ban className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                      {user.is_active ? "Disable" : "Enable"}
                                    </button>
                                    <button
                                      onClick={() => {
                                        const tempPwd = generateTempPassword();
                                        setUserConfirmAction({
                                          msg: `Reset password for "${user.first_name} ${user.last_name}" (${user.email})? New temporary password: ${tempPwd}`,
                                          fn: () => execUserAction(user.id, "Reset Password", () => superAdminService.resetPassword(user.id, { new_password: tempPwd })),
                                        });
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
                                    >
                                      <KeyRound className="h-3.5 w-3.5" />
                                      Reset Password
                                    </button>
                                    <hr className="my-1 border-slate-100" />
                                    <button
                                      onClick={() => {
                                        setUserConfirmAction({
                                          msg: `Delete user "${user.first_name} ${user.last_name}" (${user.email})? This action cannot be undone.`,
                                          fn: () => execUserAction(user.id, "Delete", () => superAdminService.deleteUser(user.id)),
                                        });
                                        setUserOpenDropdown(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                      Delete
                                    </button>
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {userTotalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100">
                    <span className="text-sm text-slate-500">{userTotal} total users</span>
                    <div className="flex gap-2 items-center">
                      <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <span className="text-sm text-slate-600">Page {userPage} of {userTotalPages}</span>
                      <button onClick={() => setUserPage(p => Math.min(userTotalPages, p + 1))} disabled={userPage === userTotalPages} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Confirm dialog — org */}
      {orgConfirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Action</h3>
            <p className="text-sm text-slate-600 mb-6">{orgConfirmAction.msg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setOrgConfirmAction(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={orgConfirmAction.fn} className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-sm hover:bg-[#e06e00]">Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialog — user */}
      {userConfirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Confirm Action</h3>
            <p className="text-sm text-slate-600 mb-6">{userConfirmAction.msg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setUserConfirmAction(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
              <button onClick={userConfirmAction.fn} className="px-4 py-2 rounded-xl bg-[#FF7A00] text-white text-sm hover:bg-[#e06e00]">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
