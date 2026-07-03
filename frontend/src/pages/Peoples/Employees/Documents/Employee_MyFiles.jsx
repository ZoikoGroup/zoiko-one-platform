import { useEffect, useMemo, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getDocuments } from "../../../../service/employee";
import { API_BASE_URL } from "../../../../service/api";
import {
  Download, FileText, Check, X, Clock, AlertCircle, MessageSquare
} from "lucide-react";

const typeColor = {
  Identity: "#4F46E5",
  Education: "#059669",
  Employment: "#0EA5E9",
  Financial: "#D97706",
  Medical: "#DC2626",
};

const STATUS_META = {
  pending:  { label: "Pending",  bg: "bg-amber-50",   text: "text-amber-700",  Icon: Clock },
  approved: { label: "Approved", bg: "bg-emerald-50",  text: "text-emerald-700", Icon: Check },
  rejected: { label: "Rejected", bg: "bg-rose-50",    text: "text-rose-700",   Icon: X },
  expired:  { label: "Expired",  bg: "bg-slate-100",  text: "text-slate-500",  Icon: AlertCircle },
};

export default function MyFiles() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [docs, setDocs] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch only employee-related documents.
        // API supports: { category, status, employee_id, search }
        const res = await getDocuments({ category: "employee" });
        const data = res?.data || res?.items || res?.data?.items || [];
        if (mounted) setDocs(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load documents");
        setDocs([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return docs;

    return docs.filter((d) => {
      const title = String(d.title || d.name || "").toLowerCase();
      const docType = String(d.document_type || d.type || "").toLowerCase();
      const category = String(d.category || "").toLowerCase();
      return title.includes(q) || docType.includes(q) || category.includes(q);
    });
  }, [docs, search]);

  if (loading) {
    return (
      <HRPage title="My Files" subtitle="All your personal documents in one place.">
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading documents...</span>
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="My Files" subtitle="All your personal documents in one place.">
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="mb-6 flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
          <p className="text-sm text-gray-500">Search and view your documents.</p>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search files..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((f) => {
          const displayName = f.title || f.name || f.document_type || f.id || "Untitled";
          const docTypeLabel = f.category || f.document_type || "Other";
          const colorKey =
            docTypeLabel === "employee" || docTypeLabel === "Identity"
              ? "Identity"
              : docTypeLabel;

          const color = typeColor[colorKey] || "#4F46E5";
          const bg = `${color}15`;

          const uploaded = f.expiry_date
            ? f.expiry_date
            : f.created_at
              ? f.created_at
              : f.updated_at
                ? f.updated_at
                : "";

          return (
            <div
              key={f.id || displayName}
              className="p-5 rounded-xl bg-white border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: bg, color }}
                >
                  <FileText size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                  <p className="text-xs text-gray-500">{f.size || ""}</p>
                </div>

                {(() => {
                  const meta = f.status && STATUS_META[f.status];
                  if (!meta) return null;
                  const Icon = meta.Icon;
                  return (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meta.bg} ${meta.text}`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>
                  );
                })()}
              </div>

              <div className="flex justify-between items-center mb-3">
                <span
                  className="text-xs font-semibold px-2 py-1 rounded-full"
                  style={{ color, background: bg }}
                >
                  {docTypeLabel}
                </span>
                <span className="text-xs text-gray-500">{uploaded || "-"}</span>
              </div>

              {(f.admin_feedback || f.rejection_reason) && (
                <div className="mb-3 flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600"><strong>Admin feedback:</strong> {f.admin_feedback || f.rejection_reason}</p>
                </div>
              )}

              {(f.file_url || f.url || f.file_path) ? (
                <a
                  href={f.file_url || f.url || `${API_BASE_URL}/${(f.file_path || "").replace(/\\/g, "/")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  <Download size={13} /> Download
                </a>
              ) : null}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No documents found.
        </div>
      )}
    </HRPage>
  );
}

