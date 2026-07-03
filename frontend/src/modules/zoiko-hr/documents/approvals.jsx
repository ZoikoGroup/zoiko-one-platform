import { useState, useEffect, useCallback } from "react";
import {
  Check, X, Clock, RefreshCw, AlertCircle, Eye, ThumbsUp, ThumbsDown,
  MessageSquare, Loader2, Search, Filter
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getDocuments, updateDocumentStatus } from "../../../service/hrService";
import { API_BASE_URL } from "../../../service/api";

const STATUS_META = {
  pending:  { label: "Pending",  bg: "bg-amber-50",   text: "text-amber-700",  border: "border-amber-200",  dot: "bg-amber-500"  },
  approved: { label: "Approved", bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  rejected: { label: "Rejected", bg: "bg-rose-50",    text: "text-rose-700",   border: "border-rose-200",   dot: "bg-rose-500"   },
  expired:  { label: "Expired",  bg: "bg-slate-100",  text: "text-slate-500",  border: "border-slate-200",  dot: "bg-slate-400"  },
};
const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.bg} ${m.text} ${m.border}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
};
const CAT_COLORS = {
  company:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  employee: "bg-violet-50 text-violet-700 border-violet-200",
  contract: "bg-cyan-50 text-cyan-700 border-cyan-200",
  policy:   "bg-teal-50 text-teal-700 border-teal-200",
};
const CategoryPill = ({ category }) => {
  const cls = CAT_COLORS[category?.toLowerCase()] || "bg-slate-100 text-slate-600 border-slate-200";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize ${cls}`}>
      {category || "other"}
    </span>
  );
};
const fmtDate = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d) ? iso : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "expired"];

export default function Approvals() {
  const [docs, setDocs]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast]           = useState(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionModal, setActionModal] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDocuments();
      const raw = res?.data;
      setDocs(Array.isArray(raw) ? raw : (raw?.items || raw?.data || []));
    } catch (err) {
      showToast("error", err?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleApproveReject = async () => {
    if (!actionModal) return;
    const { id, newStatus, feedback } = actionModal;
    if (newStatus === "rejected" && !feedback.trim()) {
      setActionModal({ ...actionModal, feedbackError: true });
      return;
    }
    setProcessingId(id);
    try {
      await updateDocumentStatus(id, newStatus, feedback.trim() || undefined);
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: newStatus, admin_feedback: feedback.trim(), rejection_reason: feedback.trim() } : d));
      showToast("success", `Document ${newStatus === "approved" ? "approved" : "rejected"} successfully.${feedback.trim() ? ` Feedback sent.` : ""}`);
      setActionModal(null);
    } catch (err) {
      showToast("error", err?.message || `Failed to ${newStatus} document.`);
    } finally {
      setProcessingId(null);
    }
  };

  const getDownloadUrl = (d) => {
    if (d.file_url) return d.file_url;
    if (d.file_path) return `${API_BASE_URL}/${d.file_path.replace(/\\/g, "/")}`;
    return null;
  };

  const filtered = docs
    .filter(d => statusFilter === "all" || d.status === statusFilter)
    .filter(d => !search.trim() || d.title?.toLowerCase().includes(search.trim().toLowerCase()));

  const pending  = docs.filter(d => d.status === "pending");
  const approved = docs.filter(d => d.status === "approved");
  const rejected = docs.filter(d => d.status === "rejected");

  return (
    <HRPage title="Document Approvals">
      <div className="space-y-6 pb-10">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Document Approvals</h2>
            <p className="text-sm text-slate-500 mt-0.5">Review, approve or reject document submissions with feedback.</p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 text-sm font-medium text-slate-600 border border-gray-200 bg-white px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors self-start sm:self-center"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Awaiting Review", value: pending.length, bg: "bg-amber-50", text: "text-amber-700", Icon: Clock },
            { label: "Approved", value: approved.length, bg: "bg-emerald-50", text: "text-emerald-700", Icon: Check },
            { label: "Rejected", value: rejected.length, bg: "bg-rose-50", text: "text-rose-700", Icon: X },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-4 ${s.bg} flex items-center gap-3`}>
              <s.Icon className={`w-5 h-5 ${s.text} shrink-0`} />
              <div>
                <p className={`text-2xl font-bold ${s.text}`}>{s.value}</p>
                <p className={`text-xs font-medium ${s.text} opacity-80`}>{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search documents…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                  statusFilter === s ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-gray-200 text-slate-600 hover:bg-gray-50"
                }`}
              >
                {s === "all" ? "All" : s}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm font-medium">Loading documents…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-5xl mb-4">📄</span>
            <p className="text-base font-semibold text-slate-700 mb-1">No documents found</p>
            <p className="text-sm text-slate-400">No documents match your search or filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => {
              const url = getDownloadUrl(d);
              const isProcessing = processingId === d.id;
              return (
                <div key={d.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 min-w-0 flex-1">
                    <div className={`p-3 rounded-lg shrink-0 ${
                      d.status === "pending" ? "bg-amber-50" :
                      d.status === "approved" ? "bg-emerald-50" :
                      d.status === "rejected" ? "bg-rose-50" : "bg-slate-50"
                    }`}>
                      {d.status === "pending" ? <AlertCircle className="w-5 h-5 text-amber-600" /> :
                       d.status === "approved" ? <Check className="w-5 h-5 text-emerald-600" /> :
                       d.status === "rejected" ? <X className="w-5 h-5 text-rose-600" /> :
                       <Clock className="w-5 h-5 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900 truncate">{d.title}</p>
                        {d.status === "pending" && (
                          <span className="px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full animate-pulse">
                            Needs Review
                          </span>
                        )}
                      </div>

                      {(d.employee_name || d.uploader_name) && (
                        <p className="text-xs text-slate-600 mt-1">
                          <strong>Employee:</strong> {d.employee_name || d.uploader_name}
                          {(d.designation || d.designation_name || d.designationName) && <span className="ml-2 text-slate-400">({d.designation || d.designation_name || d.designationName})</span>}
                        </p>
                      )}

                      {(d.file_name || d.file_size) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {d.file_name && <span className="mr-2 font-medium">{d.file_name}</span>}
                          {d.file_size && <span>({(d.file_size / 1024).toFixed(1)} KB)</span>}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <CategoryPill category={d.category} />
                        <StatusBadge status={d.status} />
                        <span className="text-xs text-slate-400">Uploaded {fmtDate(d.created_at)}</span>
                      </div>

                      {d.description && (
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">{d.description}</p>
                      )}

                      {(d.admin_feedback || d.rejection_reason) && (
                        <div className="mt-2 flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                          <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <p className="text-xs text-slate-600"><strong>Admin feedback:</strong> {d.admin_feedback || d.rejection_reason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                      >
                        <Eye className="w-4 h-4" /> View
                      </a>
                    )}

                    {d.status === "pending" && (
                      <>
                        <button
                          onClick={() => setActionModal({ id: d.id, name: d.title, newStatus: "rejected", feedback: "", feedbackError: false })}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-rose-600 border border-rose-200 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                          Reject
                        </button>
                        <button
                          onClick={() => setActionModal({ id: d.id, name: d.title, newStatus: "approved", feedback: "", feedbackError: false })}
                          disabled={isProcessing}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-emerald-700 border border-emerald-200 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4" />}
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
            <p className="text-xs text-slate-400 text-center pt-2">{filtered.length} document{filtered.length !== 1 ? "s" : ""} total</p>
          </div>
        )}
      </div>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  {actionModal.newStatus === "approved" ? "Approve Document" : "Reject Document"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">&ldquo;{actionModal.name}&rdquo;</p>
              </div>
              <button onClick={() => setActionModal(null)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className={`p-4 rounded-xl ${actionModal.newStatus === "approved" ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"}`}>
                <div className="flex items-start gap-3">
                  {actionModal.newStatus === "approved" ? (
                    <ThumbsUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <ThumbsDown className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={`text-sm font-bold ${actionModal.newStatus === "approved" ? "text-emerald-800" : "text-rose-800"}`}>
                      {actionModal.newStatus === "approved" ? "You are approving this document" : "You are rejecting this document"}
                    </p>
                    <p className={`text-xs mt-1 ${actionModal.newStatus === "approved" ? "text-emerald-600" : "text-rose-600"}`}>
                      This will update the document status and notify the employee.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Feedback to Employee
                  {actionModal.newStatus === "rejected" && <span className="text-rose-500 text-sm ml-0.5">*</span>}
                </label>
                <textarea
                  rows={3}
                  value={actionModal.feedback}
                  onChange={e => setActionModal({ ...actionModal, feedback: e.target.value, feedbackError: false })}
                  placeholder={actionModal.newStatus === "approved" ? "Optional: Add a note for the employee (e.g., Document verified and approved)..." : "Provide a reason for rejection (this will be shared with the employee)..."}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm text-slate-800 outline-none focus:ring-2 focus:border-indigo-400 focus:bg-white transition resize-none ${
                    actionModal.feedbackError
                      ? "border-rose-400 bg-rose-50 focus:ring-rose-300"
                      : "border-gray-200 bg-slate-50 focus:ring-indigo-300"
                  }`}
                />
                {actionModal.feedbackError && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Feedback is required when rejecting a document.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setActionModal(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button
                onClick={handleApproveReject}
                disabled={processingId === actionModal.id}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition shadow-sm flex items-center justify-center gap-2 ${
                  actionModal.newStatus === "approved"
                    ? "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400"
                    : "bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400"
                }`}
              >
                {processingId === actionModal.id ? (
                  <><Loader2 size={14} className="animate-spin" /> Processing...</>
                ) : (
                  <>{actionModal.newStatus === "approved" ? "Approve" : "Reject"} Document</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 ${toast.type === "success" ? "bg-emerald-600" : "bg-rose-600"} text-white`}>
          {toast.type === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {toast.message}
        </div>
      )}
    </HRPage>
  );
}
