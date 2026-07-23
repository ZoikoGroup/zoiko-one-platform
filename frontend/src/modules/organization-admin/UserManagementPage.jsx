import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import PageHeader from "../../components/PageHeader";
import { importEmployees, getEmployees } from "../../service/employee";
import { createUser, resetPassword, updateUser, deactivateUser, activateUser, archiveUser } from "../../service/userService";
import {
  Users,
  UserCheck,
  UserX,
  Search,
  Plus,
  Mail,
  Pencil,
  Trash2,
  Ban,
  Archive,
  Lock,
  CircleCheck,
  Upload,
  Download,
  FileDown,
  X,
  CircleAlert,
  Loader2,
  ChevronDown,
  Eye,
  EyeOff,
} from "lucide-react";

const COLUMNS = [
  { key: "first_name", label: "First Name", required: true },
  { key: "last_name", label: "Last Name", required: true },
  { key: "email", label: "Email", required: true },
  { key: "password", label: "Password", required: false },
  { key: "phone", label: "Phone", required: false },
  { key: "job_title", label: "Job Title", required: true },
  { key: "department", label: "Department", required: true },
  { key: "designation", label: "Designation", required: false },
  { key: "reporting_manager", label: "Reporting Manager", required: false },
  { key: "employment_type", label: "Employment Type", required: true },
  { key: "status", label: "Status", required: true },
  { key: "date_of_joining", label: "Date of Joining", required: true },
  { key: "date_of_birth", label: "Date of Birth", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "basic_salary", label: "Basic Salary", required: false },
  { key: "ctc", label: "CTC", required: false },
  { key: "work_email", label: "Work Email", required: false },
  { key: "personal_email", label: "Personal Email", required: false },
  { key: "confirmation_date", label: "Confirmation Date", required: false },
  { key: "company", label: "Company", required: false },
  { key: "business_unit", label: "Business Unit", required: false },
  { key: "division", label: "Division", required: false },
  { key: "team", label: "Team", required: false },
  { key: "current_address", label: "Current Address", required: false },
  { key: "permanent_address", label: "Permanent Address", required: false },
  { key: "city", label: "City", required: false },
  { key: "state", label: "State", required: false },
  { key: "country", label: "Country", required: false },
  { key: "pincode", label: "Pincode", required: false },
  { key: "address", label: "Address", required: false },
];

const REQUIRED_COLUMNS = COLUMNS.filter((c) => c.required)
  .map((c) => c.label)
  .join(", ");

function toCSV(rows) {
  const header = COLUMNS.map((c) => c.label).join(",");
  const lines = rows.map((row) =>
    COLUMNS.map((c) => {
      const val = String(row[c.key] ?? "");
      return val.includes(",") || val.includes('"')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(",")
  );
  return [header, ...lines].join("\n");
}

function downloadFile(content, filename, mime = "text/csv;charset=utf-8;") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initials(name) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function RoleBadge({ role }) {
  const styles = {
    Employee: "bg-indigo-50 text-indigo-700",
    Admin: "bg-orange-50 text-orange-700",
    Manager: "bg-blue-50 text-blue-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[role] || "bg-gray-100 text-gray-700"
      }`}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }) {
  const isActive = status === "Active";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
        isActive ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {isActive ? <CircleCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
      {status}
    </span>
  );
}

function ActionButton({ icon: Icon, label, tone, onClick }) {
  const tones = {
    accent: "text-indigo-600 bg-indigo-50 hover:bg-indigo-100",
    danger: "text-red-600 hover:bg-red-50",
    warning: "text-gray-400 hover:bg-amber-50 hover:text-amber-600",
    neutral: "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
  };
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          tones[tone] || tones.neutral
        }`}
        aria-label={label}
      >
        <Icon className="h-4 w-4" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity duration-150 group-hover:opacity-100"
      >
        {label}
        <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </span>
    </div>
  );
}

function MetricCard({ label, value, valueClass, icon: Icon, iconBg, iconClass }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className={`mt-1 text-2xl font-semibold ${valueClass || "text-gray-900"}`}>
          {value}
        </p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconClass}`} />
      </div>
    </div>
  );
}

export default function OrgAdminUserManagementPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("All roles");
  const [status, setStatus] = useState("All statuses");
  const [users, setUsers] = useState([]);
  const [rawEmployees, setRawEmployees] = useState([]);
  const fileInputRef = useRef(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    role: "employee",
    job_title: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [createdPassword, setCreatedPassword] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [resetting, setResetting] = useState(false);

  const [confirmAction, setConfirmAction] = useState(null);
  const [acting, setActing] = useState(false);

  const [editModal, setEditModal] = useState(null);
  const [editForm, setEditForm] = useState({ first_name: "", last_name: "", phone: "", role: "employee", job_title: "" });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await getEmployees({ per_page: 1000 });
      const items = data.items || [];
      setRawEmployees(items);
      setUsers(items.map((e) => ({
        id: e.id,
        displayId: e.employeeCode || e.employee_code || e.employeeId || e.employee_id || "",
        name: `${e.firstName || e.first_name || ""} ${e.lastName || e.last_name || ""}`.trim(),
        email: e.email || "",
        role: e.role
          ? e.role.charAt(0).toUpperCase() + e.role.slice(1)
          : "Employee",
        title: e.jobTitle || e.job_title || "",
        status: e.status
          ? e.status.charAt(0).toUpperCase() + e.status.slice(1).replace(/_/g, " ")
          : "Active",
      })));
    } catch {
      setRawEmployees([]);
      setUsers([]);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const total = users.length;
  const active = users.filter((u) => u.status === "Active").length;
  const inactive = total - active;

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase());
      const matchesRole = role === "All roles" || u.role === role;
      const matchesStatus = status === "All statuses" || u.status === status;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, role, status]);

  function handleDownloadTemplate() {
    const link = document.createElement("a");
    link.href = "/templates/employee-import-template.xlsx";
    link.download = "employee-import-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExport() {
    if (rawEmployees.length === 0) return;
    const exportRows = rawEmployees.map((e) => ({
      first_name: e.firstName || e.first_name || "",
      last_name: e.lastName || e.last_name || "",
      email: e.email || "",
      password: "",
      phone: e.phone || "",
      job_title: e.jobTitle || e.job_title || "",
      department: e.departmentName || e.department?.name || "",
      designation: e.designationName || e.designation?.title || "",
      reporting_manager: e.reportingManagerName || "",
      employment_type: (e.employmentType || e.employment_type || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      status: (e.status || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      date_of_joining: e.dateOfJoining || e.date_of_joining || "",
      date_of_birth: e.dateOfBirth || e.date_of_birth || "",
      gender: (e.gender || "").replace(/\b\w/g, (c) => c.toUpperCase()),
      basic_salary: e.basicSalary || e.basic_salary || "",
      ctc: e.ctc || "",
      work_email: e.workEmail || e.work_email || "",
      personal_email: e.personalEmail || e.personal_email || "",
      confirmation_date: e.confirmationDate || e.confirmation_date || "",
      company: e.company || "",
      business_unit: e.businessUnit || e.business_unit || "",
      division: e.division || "",
      team: e.team || "",
      current_address: e.currentAddress || e.current_address || "",
      permanent_address: e.permanentAddress || e.permanent_address || "",
      city: e.city || "",
      state: e.state || "",
      country: e.country || "",
      pincode: e.pincode || "",
      address: e.address || "",
    }));
    downloadFile(toCSV(exportRows), `users_export_${Date.now()}.csv`);
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImportResult(null);
    e.target.value = "";
  }

  async function handleConfirmImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importEmployees(selectedFile);
      setImportResult(result);
      if (result.created > 0) {
        await fetchUsers();
      }
    } catch (err) {
      setImportResult({
        total_rows: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [{ row: 0, employee_id: "", email: "", field: "file", error: err.message || "Import failed" }],
      });
    } finally {
      setImporting(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedFile(null);
    setImportResult(null);
  }

  const resetAddForm = () => {
    setFormData({ first_name: "", last_name: "", email: "", phone: "", role: "employee", job_title: "" });
    setFormErrors({});
  };

  const openAddUser = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const validateAddForm = () => {
    const errors = {};
    if (!formData.first_name.trim()) errors.first_name = "First name is required";
    if (!formData.last_name.trim()) errors.last_name = "Last name is required";
    if (!formData.email.trim()) errors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errors.email = "Invalid email";
    if (!formData.role) errors.role = "Role is required";
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!validateAddForm()) return;
    setSubmitting(true);
    try {
      const res = await createUser({
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        role: formData.role,
        job_title: formData.job_title.trim() || null,
      });
      setShowAddModal(false);
      resetAddForm();
      setCreatedPassword(res.temporary_password || null);
      await fetchUsers();
    } catch (err) {
      setFormErrors({ submit: err.response?.data?.detail || err.message || "Failed to create user" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetConfirm) return;
    setResetting(true);
    try {
      const res = await resetPassword(resetConfirm.id);
      setResetConfirm(null);
      setCreatedPassword(res.temporary_password || null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to reset password");
      setResetConfirm(null);
    } finally {
      setResetting(false);
    }
  };

  const openEdit = (u) => {
    setEditForm({
      first_name: u.name.split(" ")[0] || "",
      last_name: u.name.split(" ").slice(1).join(" ") || "",
      phone: u.phone || "",
      role: (u.role || "employee").toLowerCase(),
      job_title: u.title || "",
    });
    setEditErrors({});
    setEditModal(u);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.first_name.trim()) { setEditErrors({ first_name: "Required" }); return; }
    if (!editForm.last_name.trim()) { setEditErrors({ last_name: "Required" }); return; }
    setSaving(true);
    try {
      await updateUser(editModal.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        phone: editForm.phone.trim() || null,
        role: editForm.role,
        job_title: editForm.job_title.trim() || null,
      });
      setEditModal(null);
      await fetchUsers();
    } catch (err) {
      setEditErrors({ submit: err.response?.data?.detail || err.message || "Failed to update user" });
    } finally {
      setSaving(false);
    }
  };

  const runConfirmAction = async () => {
    if (!confirmAction) return;
    setActing(true);
    try {
      await confirmAction.fn(confirmAction.user.id);
      setConfirmAction(null);
      await fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Action failed");
      setConfirmAction(null);
    } finally {
      setActing(false);
    }
  };

  const handleDeactivate = (u) => setConfirmAction({
    user: u,
    title: "Deactivate User",
    message: `Deactivate ${u.name}? They will not be able to log in.`,
    confirmLabel: "Deactivate",
    fn: deactivateUser,
  });

  const handleActivate = (u) => setConfirmAction({
    user: u,
    title: "Activate User",
    message: `Activate ${u.name}? They will regain access.`,
    confirmLabel: "Activate",
    fn: activateUser,
  });

  const handleArchive = (u) => setConfirmAction({
    user: u,
    title: "Archive User",
    message: `Archive ${u.name}? Their account will be archived.`,
    confirmLabel: "Archive",
    fn: archiveUser,
  });

  const handleDelete = (u) => setConfirmAction({
    user: u,
    title: "Delete User",
    message: `Permanently remove ${u.name}? This action cannot be undone.`,
    confirmLabel: "Delete",
    fn: deactivateUser,
  });

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="User Management"
        description="Manage organization users and their roles."
        action={
          <button
            onClick={openAddUser}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Add user
          </button>
        }
      />

      {/* Bulk actions */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleDownloadTemplate}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <FileDown className="h-4 w-4 text-gray-400" />
          Download template
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Upload className="h-4 w-4 text-gray-400" />
          Import users
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4 text-gray-400" />
          Export CSV
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard
          label="Total users"
          value={total}
          icon={Users}
          iconBg="bg-indigo-50"
          iconClass="text-indigo-600"
        />
        <MetricCard
          label="Active"
          value={active}
          valueClass="text-emerald-600"
          icon={UserCheck}
          iconBg="bg-emerald-50"
          iconClass="text-emerald-600"
        />
        <MetricCard
          label="Inactive"
          value={inactive}
          valueClass="text-red-600"
          icon={UserX}
          iconBg="bg-red-50"
          iconClass="text-red-600"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email..."
            className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-40"
        >
          <option>All roles</option>
          <option>Employee</option>
          <option>Admin</option>
          <option>Manager</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-40"
        >
          <option>All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                User
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Role
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Job title
              </th>
              <th className="px-3 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr
                key={u.id}
                className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                      {initials(u.name)}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{u.name}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    {u.email}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <RoleBadge role={u.role} />
                </td>
                <td className="px-3 py-3 text-gray-600">{u.title}</td>
                <td className="px-3 py-3">
                  <StatusBadge status={u.status} />
                </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <ActionButton icon={Pencil} label="Edit user" tone="accent" onClick={() => openEdit(u)} />
                      <ActionButton icon={Ban} label="Deactivate user" tone="warning" onClick={() => handleDeactivate(u)} />
                      <ActionButton icon={Archive} label="Archive user" tone="neutral" onClick={() => handleArchive(u)} />
                      <ActionButton icon={Lock} label="Reset password" tone="neutral" onClick={() => setResetConfirm(u)} />
                      <ActionButton icon={Trash2} label="Delete user" tone="danger" onClick={() => handleDelete(u)} />
                    </div>
                  </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                  No users match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">
                Import users
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-5">
              <p className="mb-4 text-sm text-gray-500">
                Upload an Excel or CSV file matching the{" "}
                <button
                  onClick={handleDownloadTemplate}
                  className="font-medium text-indigo-600 hover:underline"
                >
                  import template
                </button>
                . Required columns: {REQUIRED_COLUMNS}. If Password is left blank, a
                temporary password is auto-generated.
              </p>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={handleFileSelected}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 py-6 text-sm text-gray-500 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                {selectedFile ? selectedFile.name : "Choose an Excel or CSV file"}
              </button>

              {selectedFile && !importResult && !importing && (
                <div className="mt-4 rounded-lg border border-indigo-100 bg-indigo-50 p-3 text-sm text-indigo-700">
                  <span className="font-medium">{selectedFile.name}</span> selected
                </div>
              )}

              {importing && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing employees...
                </div>
              )}

              {importResult && (
                <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
                  {importResult.errors.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-emerald-700">
                      <CircleCheck className="h-4 w-4" />
                      {importResult.created} employee{importResult.created !== 1 ? "s" : ""}{" "}
                      created successfully.
                    </div>
                  ) : (
                    <div>
                      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-700">
                        <CircleAlert className="h-4 w-4" />
                        {importResult.created > 0 && (
                          <span className="text-emerald-700">
                            {importResult.created} created.{" "}
                          </span>
                        )}
                        {importResult.errors.length} issue
                        {importResult.errors.length !== 1 ? "s" : ""} found
                      </div>
                      <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs text-red-600">
                        {importResult.errors.slice(0, 20).map((err, i) => (
                          <li key={i}>
                            {err.row ? `Row ${err.row}: ` : ""}
                            {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={closeModal}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {importResult ? "Close" : "Cancel"}
              </button>
              {!importResult && (
                <button
                  onClick={handleConfirmImport}
                  disabled={!selectedFile || importing}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {importing ? "Importing..." : "Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Add User</h3>
              <button onClick={() => { setShowAddModal(false); resetAddForm(); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="px-5 py-5 space-y-4">
              {formErrors.submit && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formErrors.submit}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                      formErrors.first_name ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"
                    }`}
                    placeholder="John"
                  />
                  {formErrors.first_name && <p className="mt-1 text-xs text-red-500">{formErrors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                      formErrors.last_name ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"
                    }`}
                    placeholder="Doe"
                  />
                  {formErrors.last_name && <p className="mt-1 text-xs text-red-500">{formErrors.last_name}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                    formErrors.email ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"
                  }`}
                  placeholder="john.doe@company.com"
                />
                {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className={`w-full appearance-none rounded-lg border px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${
                        formErrors.role ? "border-red-300 focus:border-red-400" : "border-gray-200 focus:border-indigo-400"
                      }`}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                  {formErrors.role && <p className="mt-1 text-xs text-red-500">{formErrors.role}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                    placeholder="+1-555-0100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={formData.job_title}
                  onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                  placeholder="Software Engineer"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); resetAddForm(); }}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {submitting ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Temporary Password</h3>
              <button onClick={() => { setCreatedPassword(null); setShowPassword(false); }} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="mb-4 text-sm text-gray-500">
                Share this temporary password with the new user securely.
              </p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono font-bold text-gray-800 select-all">
                    {showPassword ? createdPassword : "••••••••••••"}
                  </code>
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="ml-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => { setCreatedPassword(null); setShowPassword(false); }}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {resetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="px-5 py-5">
              <h3 className="text-base font-semibold text-gray-900">Reset Password</h3>
              <p className="mt-2 text-sm text-gray-500">
                Generate a new temporary password for <span className="font-medium text-gray-700">{resetConfirm.name}</span>?
                Their current password will stop working immediately.
              </p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setResetConfirm(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
            <div className="px-5 py-5">
              <h3 className="text-base font-semibold text-gray-900">{confirmAction.title}</h3>
              <p className="mt-2 text-sm text-gray-500">{confirmAction.message}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-4">
              <button
                onClick={() => setConfirmAction(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={runConfirmAction}
                disabled={acting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {acting ? "Processing..." : confirmAction.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h3 className="text-base font-semibold text-gray-900">Edit User</h3>
              <button onClick={() => setEditModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-5 py-5 space-y-4">
              {editErrors.submit && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{editErrors.submit}</div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                  <input type="text" value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${editErrors.first_name ? "border-red-300" : "border-gray-200 focus:border-indigo-400"}`} />
                  {editErrors.first_name && <p className="mt-1 text-xs text-red-500">{editErrors.first_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                  <input type="text" value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 ${editErrors.last_name ? "border-red-300" : "border-gray-200 focus:border-indigo-400"}`} />
                  {editErrors.last_name && <p className="mt-1 text-xs text-red-500">{editErrors.last_name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <div className="relative">
                    <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      className="w-full appearance-none rounded-lg border border-gray-200 px-3 py-2.5 pr-10 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="hr_admin">HR Admin</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="text" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="+1-555-0100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input type="text" value={editForm.job_title} onChange={(e) => setEditForm({ ...editForm, job_title: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Software Engineer" />
              </div>
              <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setEditModal(null)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
