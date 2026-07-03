import { useEffect, useMemo, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getDocuments, uploadDocument } from "../../../../service/employee";
import { useAuth } from "../../../../context/AuthContext";

const statusColor = {
  Uploaded: { color: "text-emerald-700", bg: "bg-emerald-50" },
  Pending: { color: "text-amber-700", bg: "bg-amber-50" },
  Rejected: { color: "text-red-700", bg: "bg-red-50" },
};

const docTypeOptions = [
  "Identity Proof",
  "Address Proof",
  "Bank Statement",
  "Medical Certificate",
  "Educational Certificate",
  "Previous Employment Docs",
];

function normalizeStatus(s) {
  const t = String(s || "").toLowerCase();
  if (t.includes("upload") || t.includes("approved") || t.includes("completed")) return "Uploaded";
  if (t.includes("pending") || t.includes("processing") || t.includes("request")) return "Pending";
  if (t.includes("reject") || t.includes("denied") || t.includes("failed")) return "Rejected";
  return "Pending";
}

export default function UploadRequest() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({ docType: "Identity Proof", note: "", file: null });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadDocuments(mounted);
    return () => { mounted = false; };
  }, []);

  async function loadDocuments(mounted = { current: true }) {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocuments({ category: "employee" });
      const raw = res?.data;
      const data = Array.isArray(raw) ? raw : (raw?.items || raw?.data || []);
      if (mounted?.current !== false) setHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      if (mounted?.current === false) return;
      setError(e?.message || "Failed to load upload history");
    } finally {
      if (mounted?.current !== false) setLoading(false);
    }
  }

  const historyItems = useMemo(() => {
    return history.map((d) => {
      const docType = d.title || d.name || d.document_type || d.type || "Document";
      const requestedOn = d.created_at || d.requested_on || d.uploaded_at || "";
      const status = normalizeStatus(d.status || d.document_status);
      const id = d.id || d.document_id || docType;
      const formattedDate = requestedOn
        ? new Date(requestedOn).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-";
      return { id, docType, requestedOn: formattedDate, status };
    });
  }, [history]);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append("document_type", form.docType);
      if (form.note.trim()) fd.append("note", form.note);
      fd.append("category", "employee");
      if (form.file) fd.append("file", form.file);
      if (user?.id) fd.append("employee_id", user.id);
      await uploadDocument(fd);
      setSubmitted(true);
      loadDocuments();
    } catch (e) {
      setSubmitError(e?.message || "Upload failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setSubmitted(false);
    setForm({ docType: "Identity Proof", note: "", file: null });
    setSubmitError(null);
  }

  if (loading) {
    return (
      <HRPage title="Upload Request" subtitle="Request HR to upload or collect a document from you.">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading upload history...</span>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Upload Request" subtitle="Request HR to upload or collect a document from you.">
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      {!error && (
        <>
          {/* Request Form */}
          {!submitted ? (
            <div className="p-6 rounded-xl bg-white border border-gray-200 max-w-lg mb-7">
              <h3 className="text-base font-bold text-gray-900 m-0 mb-4">New Upload Request</h3>
              <div className="flex flex-col gap-3.5">
                {submitError && (
                  <div className="px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{submitError}</div>
                )}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Document Type</label>
                  <select
                    value={form.docType}
                    onChange={(e) => setForm({ ...form, docType: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
                  >
                    {docTypeOptions.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Upload File</label>
                  <input
                    type="file"
                    onChange={(e) => setForm({ ...form, file: e.target.files[0] })}
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-700 file:text-xs file:font-semibold hover:file:bg-indigo-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1.5">Additional Note (optional)</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    rows={3}
                    placeholder="Any specific details for HR..."
                    className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm resize-y box-border"
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white border-none rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Submitting...
                    </span>
                  ) : (
                    "Submit Request"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-300 max-w-lg mb-7 text-center">
              <p className="text-lg font-bold text-emerald-700 m-0 mb-2">&#10003; Request Submitted!</p>
              <p className="text-xs text-emerald-800 m-0 mb-4">HR will process your request and notify you shortly.</p>
              <button
                onClick={resetForm}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white border-none rounded-lg text-xs font-semibold cursor-pointer"
              >
                New Request
              </button>
            </div>
          )}

          {/* History */}
          <div className="p-6 rounded-xl bg-white border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 m-0 mb-4">Upload History</h3>
            {historyItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No upload history found.</div>
            ) : (
              historyItems.map((h) => {
                const sc = statusColor[h.status] || { color: "text-gray-700", bg: "bg-gray-100" };
                return (
                  <div
                    key={h.id}
                    className="flex justify-between items-center py-3 border-t border-gray-100 first:border-t-0"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900 m-0 mb-0.5">{h.docType}</p>
                      <p className="text-xs text-gray-400 m-0">Requested on {h.requestedOn}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sc.color} ${sc.bg}`}>
                      {h.status}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}
    </HRPage>
  );
}
