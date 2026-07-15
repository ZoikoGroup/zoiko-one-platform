import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUsers, createUser, updateUser, deactivateUser,
  activateUser, resetPassword, suspendUser, archiveUser,
} from "../../service/userService";
import { superAdminService } from "../../service/superAdminService";
import {
  User, Edit, Trash2, Plus, Search, ChevronDown, Eye, EyeOff,
  RefreshCw, Unlock, CheckCircle, X, Building2, AlertTriangle,
  FileText, Download, Clock, Archive, Ban, Mail, Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { ROLE_CREATION_RULES, ROLE_LABELS } from "../../config/roles";

const ALL_ROLE_OPTIONS = [
  { value: "admin", label: "Organization Admin" },
  { value: "hr_admin", label: "HR Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

const ROLE_BADGES = {
  admin: "bg-purple-100 text-purple-800 ring-purple-200",
  hr_admin: "bg-blue-100 text-blue-800 ring-blue-200",
  manager: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  employee: "bg-green-100 text-green-800 ring-green-200",
};

const STATUS_STYLES = {
  active: { class: "bg-green-50 text-green-700 ring-green-200", icon: CheckCircle },
  inactive: { class: "bg-gray-100 text-gray-600 ring-gray-200", icon: X },
  pending: { class: "bg-yellow-50 text-yellow-700 ring-yellow-200", icon: Clock },
  suspended: { class: "bg-red-50 text-red-700 ring-red-200", icon: Ban },
  locked: { class: "bg-orange-50 text-orange-700 ring-orange-200", icon: LockIcon },
  archived: { class: "bg-slate-100 text-slate-600 ring-slate-200", icon: Archive },
  deactivated: { class: "bg-red-50 text-red-700 ring-red-200", icon: X },
};
function LockIcon() { return <Ban className="w-3 h-3" />; }

const ITEMS_PER_PAGE = 10;

const initialForm = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  role: "employee",
  job_title: "",
  organization_id: "",
};

function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? "bg-red-100" : "bg-blue-100"}`}>
            {danger ? <AlertTriangle className="w-5 h-5 text-red-600" /> : <Shield className="w-5 h-5 text-blue-600" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }) {
  if (!message) return null;
  const bg = type === "success" ? "bg-green-600" : type === "error" ? "bg-red-600" : "bg-blue-600";
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [message]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium ${bg} flex items-center gap-2`}>
      {type === "success" ? <CheckCircle className="w-4 h-4" /> : type === "error" ? <AlertTriangle className="w-4 h-4" /> : null}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-80"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function UserManagementPage() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isSuperAdmin = role === "super_admin";
  const allowedRoles = ROLE_CREATION_RULES[role] || [];
  const canCreateUsers = allowedRoles.length > 0;
  const ROLE_OPTIONS = ALL_ROLE_OPTIONS.filter((r) => allowedRoles.includes(r.value));

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ ...initialForm });
  const [formErrors, setFormErrors] = useState({});
  const [createdPassword, setCreatedPassword] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [summaryStats, setSummaryStats] = useState(null);

  const [confirmDialog, setConfirmDialog] = useState({ open: false });
  const [toast, setToast] = useState({ message: null, type: "success" });

  const STATUS_OPTIONS = [
    { value: "", label: "All Statuses" },
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "pending", label: "Pending" },
    { value: "suspended", label: "Suspended" },
    { value: "locked", label: "Locked" },
    { value: "archived", label: "Archived" },
    { value: "deactivated", label: "Deactivated" },
  ];

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isSuperAdmin) {
        const data = await superAdminService.getUsers({
          page: currentPage,
          page_size: ITEMS_PER_PAGE,
          search: search || undefined,
          role: roleFilter || undefined,
          status: statusFilter || undefined,
          organization_id: orgFilter ? parseInt(orgFilter) : undefined,
        });
        setUsers(data.users || []);
        setTotal(data.total || 0);
        setSummaryStats({
          total_organizations: data.total_organizations,
          total_org_admins: data.total_org_admins,
          total_hr_admins: data.total_hr_admins,
          total_managers: data.total_managers,
          total_employees: data.total_employees,
        });
      } else {
        const data = await getUsers({
          page: currentPage,
          per_page: ITEMS_PER_PAGE,
          search,
          role: roleFilter,
          status: statusFilter,
        });
        setUsers(data.items || []);
        setTotal(data.total || 0);
        setSummaryStats(null);
      }
    } catch (err) {
      setError(err.message || "Failed to load users");
      setUsers([]);
      setTotal(0);
      setSummaryStats(null);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, roleFilter, statusFilter, orgFilter, isSuperAdmin]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  useEffect(() => {
    if (isSuperAdmin) {
      superAdminService.getUsers({ page: 1, page_size: 1 }).then(data => {
        setSummaryStats({
          total_organizations: data.total_organizations,
          total_org_admins: data.total_org_admins,
          total_hr_admins: data.total_hr_admins,
          total_managers: data.total_managers,
          total_employees: data.total_employees,
        });
      }).catch(() => {});
    }
  }, [isSuperAdmin]);

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const resetForm = () => {
    setFormData({ ...initialForm });
    setFormErrors({});
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setCreatedPassword(null);
    if (isSuperAdmin) {
      const defaultRole = getDefaultRole();
      if (defaultRole !== "employee") {
        setFormData(prev => ({ ...prev, role: defaultRole }));
      }
    }
    setShowModal(true);
  };

  const openEdit = (user) => {
    setEditId(user.id);
    setCreatedPassword(null);
    setFormData({
      email: user.email || "",
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
      role: user.role || "employee",
      job_title: user.job_title || "",
      organization_id: user.organization_id || "",
    });
    setFormErrors({});
    setShowModal(true);
  };

  const fetchOrganizations = async () => {
    try {
      const data = await superAdminService.getOrganizations();
      return data.organizations || [];
    } catch (err) {
      setToast({ message: "Failed to fetch organizations", type: "error" });
      return [];
    }
  };

  const [organizations, setOrganizations] = useState([]);

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations().then(setOrganizations);
    }
  }, [isSuperAdmin]);

  const getDefaultRole = () => {
    if (allowedRoles.length > 0) {
      const firstAllowed = allowedRoles[0];
      const roleOption = ALL_ROLE_OPTIONS.find(r => r.value === firstAllowed);
      if (roleOption) return roleOption.value;
    }
    return "employee";
  };

  useEffect(() => {
    if (isSuperAdmin && formData.role === "employee") {
      const defaultRole = getDefaultRole();
      if (defaultRole !== "employee") {
        setFormData(prev => ({ ...prev, role: defaultRole }));
      }
    }
  }, [isSuperAdmin, allowedRoles]);

  const validate = () => {
    const errors = {};
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email";
    if (!formData.first_name.trim()) errors.first_name = "First name is required";
    if (!formData.last_name.trim()) errors.last_name = "Last name is required";
    if (!formData.role) errors.role = "Role is required";
    if (isSuperAdmin && !formData.organization_id) errors.organization_id = "Organization is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      const payload = {
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        phone: formData.phone.trim() || null,
        role: formData.role,
        job_title: formData.job_title.trim() || null,
        organization_id: isSuperAdmin ? parseInt(formData.organization_id) : undefined,
      };
      if (editId) {
        await updateUser(editId, payload);
        setToast({ message: "User updated successfully.", type: "success" });
        setShowModal(false);
        resetForm();
      } else {
        const res = await createUser(payload);
        setShowModal(false);
        setCreatedPassword(res.temporary_password || null);
        setToast({ message: "User created successfully.", type: "success" });
        resetForm();
      }
      await fetchUsers();
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.detail || err.message || "Failed to save user" });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmAction = (action, user, options = {}) => {
    setConfirmDialog({
      open: true,
      ...options,
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        try {
          await action(user.id);
          await fetchUsers();
          setToast({ message: options.successMsg || "Action completed.", type: "success" });
        } catch (err) {
          setToast({ message: err.response?.data?.detail || err.message || "Action failed.", type: "error" });
        }
      },
      onCancel: () => setConfirmDialog({ open: false }),
    });
  };

  const handleDeactivate = (user) => confirmAction(deactivateUser, user, {
    title: "Deactivate User", danger: true,
    message: `Are you sure you want to deactivate ${user.first_name} ${user.last_name}? They will not be able to log in.`,
    confirmLabel: "Deactivate",
    successMsg: "User deactivated.",
  });

  const handleActivate = (user) => confirmAction(activateUser, user, {
    title: "Activate User",
    message: `Activate ${user.first_name} ${user.last_name}? They will regain access.`,
    confirmLabel: "Activate",
    successMsg: "User activated.",
  });

  const handleSuspend = (user) => confirmAction(suspendUser, user, {
    title: "Suspend User", danger: true,
    message: `Suspend ${user.first_name} ${user.last_name}? They will be blocked from logging in.`,
    confirmLabel: "Suspend",
    successMsg: "User suspended.",
  });

  const handleArchive = (user) => confirmAction(archiveUser, user, {
    title: "Archive User", danger: true,
    message: `Archive ${user.first_name} ${user.last_name}? Their account will be archived.`,
    confirmLabel: "Archive",
    successMsg: "User archived.",
  });

  const handleResetPassword = async (user) => {
    setConfirmDialog({
      open: true,
      title: "Reset Password",
      message: `Reset password for ${user.first_name} ${user.last_name}? A new temporary password will be generated.`,
      confirmLabel: "Reset",
      onConfirm: async () => {
        setConfirmDialog({ open: false });
        try {
          const res = await resetPassword(user.id);
          setCreatedPassword(res.temporary_password || null);
          setToast({ message: "Password reset successfully.", type: "success" });
        } catch (err) {
          setToast({ message: err.response?.data?.detail || err.message || "Failed to reset password.", type: "error" });
        }
      },
      onCancel: () => setConfirmDialog({ open: false }),
    });
  };

  const stats = isSuperAdmin && summaryStats ? [
    { label: "Organizations", value: summaryStats.total_organizations, color: "text-indigo-600" },
    { label: "Org Admins", value: summaryStats.total_org_admins, color: "text-purple-600" },
    { label: "HR Admins", value: summaryStats.total_hr_admins, color: "text-blue-600" },
    { label: "Managers", value: summaryStats.total_managers, color: "text-yellow-600" },
    { label: "Employees", value: summaryStats.total_employees, color: "text-green-600" },
  ] : [
    { label: "Total", value: users.length, color: "text-gray-800" },
    { label: "Active", value: users.filter((u) => u.is_active !== false).length, color: "text-green-600" },
    { label: "Inactive", value: users.filter((u) => u.is_active === false).length, color: "text-red-600" },
  ];

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl"></div>)}
            </div>
            <div className="h-96 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: null })} />
      <ConfirmDialog {...confirmDialog} />

      <header className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              <p className="mt-1 text-sm text-gray-500">
                {isSuperAdmin ? "Manage all platform users across organizations." : "Manage organization users and their roles."}
              </p>
            </div>
            {canCreateUsers && (
              <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                <Plus className="w-4 h-4" /> Add User
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex justify-between items-center text-sm">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">&times;</button>
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {stats.map((s) => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 transition-shadow hover:shadow-md">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{s.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value ?? "-"}</p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search name, email, code..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 pl-9 transition-shadow"
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              </div>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-white"
                >
                  <option value="">All Roles</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-8 bg-white"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {users.length === 0 && !loading ? (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium text-lg">No users found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters.</p>
              {canCreateUsers && (
                <button onClick={openCreate} className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add a new user
                </button>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">User</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Email</th>
                      {isSuperAdmin && <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Organization</th>}
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Role</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Job Title</th>
                      <th className="text-left px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Status</th>
                      <th className="text-right px-4 py-3.5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.map((u) => {
                      const statusKey = (u.status || (u.is_active ? "active" : "inactive")).toLowerCase();
                      const st = STATUS_STYLES[statusKey] || STATUS_STYLES.inactive;
                      const StatusIcon = st.icon;
                      return (
                        <tr key={u.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                                <span className="text-white font-semibold text-sm">{u.first_name?.charAt(0)}{u.last_name?.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">{u.first_name} {u.last_name}</p>
                                <p className="text-xs text-gray-400">{u.employee_code || ""}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600">{u.email}</td>
                          {isSuperAdmin && (
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                <span className="text-gray-700 truncate max-w-[140px]">{u.organization_name || "-"}</span>
                              </div>
                            </td>
                          )}
                          <td className="px-4 py-3.5">
                            <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ${ROLE_BADGES[u.role] || "bg-gray-100 text-gray-800 ring-gray-200"}`}>
                              {ROLE_LABELS[u.role] || u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-gray-600 max-w-[140px] truncate">{u.job_title || "-"}</td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full ring-1 ${st.class}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex justify-end gap-1">
                              <button onClick={() => openEdit(u)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit user">
                                <Edit className="w-4 h-4" />
                              </button>
                              {u.is_active !== false && u.status !== "suspended" ? (
                                <>
                                  <button onClick={() => handleDeactivate(u)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Deactivate">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleSuspend(u)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Suspend">
                                    <Ban className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button onClick={() => handleActivate(u)} className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Activate">
                                  <RefreshCw className="w-4 h-4" />
                                </button>
                              )}
                              <button onClick={() => handleArchive(u)} className="p-1.5 text-gray-400 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-colors" title="Archive">
                                <Archive className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleResetPassword(u)} className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors" title="Reset password">
                                <Unlock className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex justify-between items-center px-4 py-3.5 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-sm text-gray-500">Page {safePage} of {totalPages} &mdash; {total} total users</p>
                  <div className="flex gap-1">
                    <button
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="px-3.5 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >Previous</button>
                    <button
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3.5 py-1.5 text-sm font-medium border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => { setShowModal(false); resetForm(); }}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  {editId ? <Edit className="w-5 h-5 text-blue-500" /> : <Plus className="w-5 h-5 text-blue-500" />}
                  {editId ? "Edit User" : "Create User"}
                </h2>
                <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {formErrors.submit && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{formErrors.submit}</div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.first_name} onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className={`w-full border ${formErrors.first_name ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="John" />
                    {formErrors.first_name && <p className="text-xs text-red-500 mt-1">{formErrors.first_name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                    <input type="text" value={formData.last_name} onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className={`w-full border ${formErrors.last_name ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      placeholder="Doe" />
                    {formErrors.last_name && <p className="text-xs text-red-500 mt-1">{formErrors.last_name}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={`w-full border ${formErrors.email ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    placeholder="john.doe@company.com" />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
                    <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className={`w-full border ${formErrors.role ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white`}>
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    {formErrors.role && <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+1-555-0100" />
                  </div>
                </div>
                {isSuperAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select value={formData.organization_id} onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}
                        className={`w-full border ${formErrors.organization_id ? "border-red-300 ring-1 ring-red-200" : "border-gray-200"} rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none pr-8`}
                      disabled={!organizations.length}>
                        <option value="">Select an organization</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                      <Building2 className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {formErrors.organization_id && <p className="text-xs text-red-500 mt-1">{formErrors.organization_id}</p>}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input type="text" value={formData.job_title} onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Software Engineer" />
                </div>
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 mt-6">
                  <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
                  <button type="submit" disabled={submitting}
                    className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm">
                    {submitting ? "Saving..." : editId ? "Update User" : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {createdPassword && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCreatedPassword(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">Temporary Password</h2>
                  <p className="text-sm text-gray-500">Share this with the user securely.</p>
                </div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4">
                <div className="flex justify-between items-center">
                  <code className="text-sm font-mono font-bold text-gray-800 select-all">
                    {showPassword ? createdPassword : "••••••••••••"}
                  </code>
                  <button onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-600 p-1">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setCreatedPassword(null)}
                  className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Done</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
