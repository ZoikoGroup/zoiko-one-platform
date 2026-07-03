import { useState, useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { Loader2, AlertCircle, CheckCircle, Calendar, FileText, Check, X } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getLeaveRequests, createLeaveRequest } from "../../../service/hrService";
import { useAuth } from "../../../context/AuthContext";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/zoiko-hr/ess" },
  { label: "Profile", href: "/zoiko-hr/ess/profile" },
  { label: "Leave Management", href: "/zoiko-hr/ess/leave" },
  { label: "Attendance", href: "/zoiko-hr/ess/attendance" },
  { label: "My Documents", href: "/zoiko-hr/ess/my-documents" },
  { label: "Learning", href: "/zoiko-hr/ess/requests" },
  { label: "Settings", href: "/zoiko-hr/ess/settings" },
];

function SubNav() {
  return (
    <div className="flex gap-1 overflow-x-auto pb-1 mb-6 border-b border-gray-100">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === "/zoiko-hr/ess"}
          className={({ isActive }) =>
            `whitespace-nowrap px-3 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              isActive
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50"
                : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`
          }
        >
          {item.label}
        </NavLink>
      ))}
    </div>
  );
}

const LEAVE_TYPES = [
  { value: "annual", label: "Annual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "casual", label: "Casual Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
];

const STATUS_META = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", icon: null },
  approved: { label: "Approved", bg: "bg-green-100", text: "text-green-800", icon: Check },
  rejected: { label: "Rejected", bg: "bg-red-100", text: "text-red-700", icon: X },
};

export default function EssLeaveManagement() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
  const [formError, setFormError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    loadRequests();
    return () => { mounted.current = false; };
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getLeaveRequests();
      const data = Array.isArray(res) ? res : res?.data || res?.items || [];
      if (mounted.current) setRequests(data);
    } catch (err) {
      if (mounted.current) setError(err?.message || "Failed to load leave requests");
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  const balanceCards = balance
    ? [
        { title: "Annual Leave", value: `${balance.annual.remaining}/${balance.annual.total}`, icon: "📅", change: null, trend: null },
        { title: "Sick Leave", value: `${balance.sick.remaining}/${balance.sick.total}`, icon: "🤒", change: null, trend: null },
        { title: "Personal Leave", value: `${balance.personal.remaining}/${balance.personal.total}`, icon: "🏠", change: null, trend: null },
        { title: "Unpaid Leave", value: `${balance.unpaid.remaining}/${balance.unpaid.total}`, icon: "💼", change: null, trend: null },
      ]
    : [];

  const filtered = requests.filter((r) => {
    const type = r.leave_type || r.type || "";
    const reason = r.reason || "";
    if (search && !type.toLowerCase().includes(search.toLowerCase()) && !reason.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter && r.status !== statusFilter) return false;
    if (typeFilter && (r.leave_type || r.type) !== typeFilter) return false;
    return true;
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.start_date || !form.end_date) {
      setFormError("Start and end dates are required");
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createLeaveRequest(form);
      setShowModal(false);
      setForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      setSuccess("Leave request submitted successfully");
      setTimeout(() => setSuccess(null), 3000);
      loadRequests();
    } catch (err) {
      setFormError(err.message || "Failed to create leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const getStatusBadge = (status) => {
    const m = STATUS_META[status] || { label: status, bg: "bg-gray-50", text: "text-gray-700", icon: null };
    const Icon = m.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {m.label}
      </span>
    );
  };

  return (
    <HRPage title="Employee Self Service" subtitle="Manage your leave requests and view balance">
      <SubNav />

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
            <p className="text-sm text-gray-500 mt-1">Manage your leave requests and view balance</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Apply Leave
          </button>
        </div>

        {success && (
          <div className="flex items-center gap-2 bg-green-100 border border-green-200 rounded-xl px-4 py-3 text-green-800 text-sm font-semibold">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        {/* Leave Requests */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Leave Requests</h2>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-40"
              />
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">All Types</option>
                {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <span className="text-sm font-medium">Loading leave requests...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm font-semibold">
              <AlertCircle size={16} /> {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-base font-semibold text-gray-700 mb-1">
                {search || statusFilter || typeFilter ? "No matching requests" : "No leave requests yet"}
              </p>
              <p className="text-sm text-gray-400">
                {search || statusFilter || typeFilter ? "Try different filters." : "Click 'Apply Leave' to submit your first request."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Start</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">End</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Days</th>
                    <th className="text-left py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="text-center py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applied</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-2 font-semibold text-gray-900 capitalize">{r.leave_type || r.type}</td>
                      <td className="py-3 px-2 text-gray-700">{formatDate(r.start_date || r.startDate)}</td>
                      <td className="py-3 px-2 text-gray-700">{formatDate(r.end_date || r.endDate)}</td>
                      <td className="py-3 px-2 text-center font-semibold text-gray-900">{r.days || "-"}</td>
                      <td className="py-3 px-2 text-gray-500 max-w-[200px] truncate">{r.reason || "-"}</td>
                      <td className="py-3 px-2 text-center">{getStatusBadge(r.status)}</td>
                      <td className="py-3 px-2 text-right text-xs text-gray-400">{formatDate(r.created_at || r.appliedOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-800">Apply for Leave</h2>
                <button onClick={() => { setShowModal(false); setFormError(null); }} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                {formError && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Leave Type</label>
                  <select
                    value={form.leave_type}
                    onChange={(e) => setForm({ ...form, leave_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {LEAVE_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea
                    rows={3}
                    value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); setFormError(null); }}
                    className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium transition-colors"
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin inline mr-1" />}
                    {submitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </HRPage>
  );
}
