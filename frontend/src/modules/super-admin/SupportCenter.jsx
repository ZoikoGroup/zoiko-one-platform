import { useState, useEffect, useCallback } from "react";
import PageHeader from "../../components/PageHeader";
import { AlertTriangle, MessageSquare, Search, ChevronLeft, ChevronRight, RefreshCw, UserCheck, Eye } from "lucide-react";
import { superAdminService } from "../../service/superAdminService";

export default function SupportCenter() {
  const [tickets, setTickets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [viewingTicket, setViewingTicket] = useState(null);
  const [updateForm, setUpdateForm] = useState({ status: "", assigned_to: "", priority: "", resolution_notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      const params = { page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await superAdminService.getSupportTickets(params);
      setTickets(data.tickets || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to load tickets", e);
      setError(e.message || "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, priorityFilter]);

  useEffect(() => { load(); }, [load]);

  const openView = (ticket) => {
    setViewingTicket(ticket);
    setUpdateForm({ status: ticket.status, assigned_to: ticket.assigned_to || "", priority: ticket.priority, resolution_notes: ticket.resolution_notes || "" });
  };

  const handleUpdate = async () => {
    if (!viewingTicket) return;
    try {
      await superAdminService.updateSupportTicket(viewingTicket.id, {
        status: updateForm.status,
        assigned_to: updateForm.assigned_to ? parseInt(updateForm.assigned_to) : null,
        priority: updateForm.priority,
        resolution_notes: updateForm.resolution_notes,
      });
      setViewingTicket(null);
      load();
    } catch (e) { console.error(e); }
  };

  const totalPages = Math.ceil(total / pageSize);

  const statusColors = {
    open: "bg-blue-100 text-blue-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
    closed: "bg-slate-100 text-slate-600",
  };

  const priorityColors = {
    low: "bg-slate-100 text-slate-600",
    normal: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    critical: "bg-red-100 text-red-700",
  };

  return (
    <div>
      <PageHeader
        title="Support Center"
        description="Manage support tickets from all organizations"
        icon={MessageSquare}
      />

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={load} className="ml-auto text-red-600 underline hover:text-red-800 text-xs font-semibold">Retry</button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-[#FF7A00] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm focus:border-[#FF7A00] focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="low">Low</option>
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#FF7A00] border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <MessageSquare className="mb-3 h-12 w-12" />
            <p className="text-lg font-medium">No support tickets</p>
            <p className="text-sm">Tickets raised by organizations will appear here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-6 py-4">Subject</th>
                  <th className="px-6 py-4">Organization</th>
                  <th className="px-6 py-4">Raised By</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Priority</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Assigned To</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {tickets.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-800 max-w-[200px] truncate">{t.subject}</td>
                    <td className="px-6 py-4 text-slate-600">{t.organization_name || "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{t.raised_by_name || `User #${t.raised_by}`}</td>
                    <td className="px-6 py-4 text-slate-600">{t.category}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${priorityColors[t.priority] || "bg-slate-100 text-slate-600"}`}>{t.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[t.status] || "bg-slate-100 text-slate-600"}`}>{t.status.replace("_", " ")}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{t.assigned_to_name || "-"}</td>
                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(t.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <button onClick={() => openView(t)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-[#FF7A00] transition">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 transition">
              <ChevronLeft className="h-4 w-4" /> Prev
            </button>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)} className="flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-slate-50 transition">
              Next <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}

      {viewingTicket ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4" onClick={() => setViewingTicket(null)}>
          <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800">{viewingTicket.subject}</h3>
              <button onClick={() => setViewingTicket(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition">X</button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
              <div><span className="font-medium text-slate-500">Organization:</span> <span className="text-slate-800">{viewingTicket.organization_name || "-"}</span></div>
              <div><span className="font-medium text-slate-500">Raised By:</span> <span className="text-slate-800">{viewingTicket.raised_by_name || `User #${viewingTicket.raised_by}`}</span></div>
              <div><span className="font-medium text-slate-500">Category:</span> <span className="text-slate-800">{viewingTicket.category}</span></div>
              <div><span className="font-medium text-slate-500">Created:</span> <span className="text-slate-800">{new Date(viewingTicket.created_at).toLocaleString()}</span></div>
            </div>
            <div className="mb-4 rounded-xl bg-slate-50 p-4">
              <p className="text-sm text-slate-700">{viewingTicket.description}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                <select value={updateForm.status} onChange={(e) => setUpdateForm({ ...updateForm, status: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FF7A00] focus:outline-none">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
                <select value={updateForm.priority} onChange={(e) => setUpdateForm({ ...updateForm, priority: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FF7A00] focus:outline-none">
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign To (Employee ID)</label>
                <input value={updateForm.assigned_to} onChange={(e) => setUpdateForm({ ...updateForm, assigned_to: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FF7A00] focus:outline-none" placeholder="Employee ID" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700">Resolution Notes</label>
                <textarea rows={3} value={updateForm.resolution_notes} onChange={(e) => setUpdateForm({ ...updateForm, resolution_notes: e.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-[#FF7A00] focus:outline-none" placeholder="Add resolution notes..." />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleUpdate} className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-6 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition">
                <RefreshCw className="h-4 w-4" /> Update Ticket
              </button>
              <button onClick={() => setViewingTicket(null)} className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}