import { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, FileText, Download, User, Briefcase, Hash
} from "lucide-react";
import HRPage from "../../../components/HRPage";
import { getDocuments } from "../../../service/hrService";
import { API_BASE_URL } from "../../../service/api";

const fileTypeIcon = (filename = "") => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map = { pdf: "📄", doc: "📝", docx: "📝", xls: "📊", xlsx: "📊", png: "🖼️", jpg: "🖼️", jpeg: "🖼️", pptx: "📑" };
  return map[ext] || "📎";
};

export default function EmployeeDocuments() {
  const [docs, setDocs]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [search, setSearch]       = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDocuments({ category: "employee" });
      const raw = res?.data;
      setDocs(Array.isArray(raw) ? raw : (raw?.items || raw?.data || []));
    } catch (e) {
      setError(e?.message || "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const getDownloadUrl = (d) => {
    if (d.file_url) return d.file_url;
    if (d.file_path) return `${API_BASE_URL}/${d.file_path.replace(/\\/g, "/")}`;
    return null;
  };

  const filtered = docs
    .filter(d => !search.trim() || (d.title || d.name || "").toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <HRPage title="Employee Documents">
      <div className="space-y-6 pb-10">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Employee Documents</h2>
            <p className="text-sm text-slate-500 mt-0.5">View all documents uploaded by employees. Download and manage files.</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button onClick={load} className="p-2 rounded-lg border border-gray-200 bg-white text-slate-400 hover:text-slate-600 hover:bg-gray-50" title="Refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by document name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-sm font-medium">Loading employee documents…</span>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center px-4">
                <span className="text-5xl mb-4">📄</span>
                <p className="text-base font-semibold text-slate-700 mb-1">
                  {search ? "No results found" : "No employee documents yet"}
                </p>
                <p className="text-sm text-slate-400">
                  {search ? "Try a different search term." : "Documents will appear here once employees upload them."}
                </p>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-400">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold"><Hash className="w-3 h-3 inline mr-1" />ID</th>
                      <th className="text-left px-6 py-3 font-semibold"><User className="w-3 h-3 inline mr-1" />Employee Name</th>
                      <th className="text-left px-6 py-3 font-semibold"><Briefcase className="w-3 h-3 inline mr-1" />Designation</th>
                      <th className="text-left px-6 py-3 font-semibold"><FileText className="w-3 h-3 inline mr-1" />Document Name</th>
                      <th className="text-center px-6 py-3 font-semibold"><Download className="w-3 h-3 inline mr-1" />Download</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((d, idx) => (
                      <tr key={d.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-6 py-3 text-xs font-mono text-slate-400">{d.id || idx + 1}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                              {(d.employee_name || d.uploader_name || "?").charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-800">{d.employee_name || d.uploader_name || "—"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-slate-600">{d.designation || d.designation_name || d.designationName || "—"}</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg shrink-0">{fileTypeIcon(d.file_name || d.title)}</span>
                            <div>
                              <p className="font-medium text-slate-800 truncate max-w-[200px]">{d.title}</p>
                              {d.file_name && <p className="text-xs text-slate-400">{d.file_name}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          {getDownloadUrl(d) ? (
                            <a
                              href={getDownloadUrl(d)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" /> Download
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">No file</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-6 py-3 border-t border-gray-100 text-xs text-slate-400">
                  {filtered.length} document{filtered.length !== 1 ? "s" : ""}
                </div>
              </>
            )}
          </div>
        )}
      </div>

    </HRPage>
  );
}
