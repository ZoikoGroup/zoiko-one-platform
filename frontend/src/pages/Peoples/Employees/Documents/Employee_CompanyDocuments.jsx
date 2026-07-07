import { useEffect, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getMyAssignedDocuments } from "../../../../service/hrService";
import { FileText, Eye, Search } from "lucide-react";

export default function CompanyDocuments() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setLoading(true);
    getMyAssignedDocuments()
      .then(res => {
        const raw = res?.data;
        setDocs(Array.isArray(raw) ? raw : []);
      })
      .catch(() => setDocs([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(d =>
    !search.trim() || d.document_title?.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <HRPage>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Company Documents</h2>
            <p className="text-sm text-slate-500 mt-1">Documents shared with you by the company</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto text-slate-300 mb-3" size={48} />
            <p className="text-slate-500 font-medium">No company documents yet</p>
            <p className="text-slate-400 text-sm mt-1">Documents assigned to you will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => (
              <div key={d.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{d.document_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">{d.assigned_at ? new Date(d.assigned_at).toLocaleDateString() : ""}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {d.file_url && (
                    <a
                      href={d.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
                    >
                      <Eye size={18} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </HRPage>
  );
}