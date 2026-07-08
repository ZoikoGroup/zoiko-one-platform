import { useRef, useState, useEffect, useCallback } from "react";
import { UploadCloud, FileText, Trash2, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import {
  uploadComplianceDocument,
  deleteComplianceDocument,
  fetchComplianceDocuments,
  normalizeComplianceDocument,
} from "../../../service/payrollService";

// Status → badge styling. "unavailable" only shows up now if the backend is
// genuinely unreachable (network/auth error) — a normal upload always gets
// a real "processing" → "parsed"/"failed" status from the server.
const statusConfig = {
  processing:  { label: "Extracting…", color: "bg-amber-100 text-amber-700", icon: Loader2, spin: true },
  parsed:      { label: "Parsed", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  failed:      { label: "Extraction failed", color: "bg-red-100 text-red-700", icon: AlertTriangle },
  unavailable: { label: "Couldn't reach the server", color: "bg-slate-100 text-slate-500", icon: AlertTriangle },
};

// How often to re-poll while any document is still "processing". Extraction
// runs as a backend background task, so the upload response comes back
// before parsing finishes — polling is how the UI finds out it's done.
const POLL_INTERVAL_MS = 3000;

export default function ComplianceDocumentUpload({ country, addToast, documents = [], setDocuments = () => {} }) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    const docs = await fetchComplianceDocuments(country);
    setDocuments((prev) => {
      const localOnly = prev.filter((d) => String(d.id).startsWith("local-"));
      const serverDocs = docs.map((d) =>
        normalizeComplianceDocument({ ...d, sizeLabel: formatBytes(d.fileSize) }, country)
      );
      return [...localOnly, ...serverDocs];
    });
  }, [country, setDocuments]);

  // Load documents from backend only once on initial mount if list is empty
  useEffect(() => {
    if (documents.length === 0) {
      loadDocuments().catch(() => {});
    }
  }, []);

  // While anything is still extracting, poll for status updates.
  useEffect(() => {
    const stillProcessing = documents.some((d) => d.status === "processing");
    if (!stillProcessing) return;
    const id = setInterval(loadDocuments, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [documents, loadDocuments]);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    for (const file of files) {
      const localId = `local-${Date.now()}-${file.name}`;
      const draft = {
        id: localId,
        fileName: file.name,
        sizeLabel: formatBytes(file.size),
        uploadedAt: new Date().toISOString(),
        status: "processing",
        extracted: null,
        error: null,
      };
      setDocuments((prev) => [draft, ...prev]);

      try {
        const result = await uploadComplianceDocument(file, country);
        // Server now has the row; swap the local draft for it, then start
        // polling (handled by the effect above once state includes it).
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === localId
              ? normalizeComplianceDocument(
                  { ...result, sizeLabel: formatBytes(result?.fileSize) || draft.sizeLabel },
                  country
                )
              : d
          )
        );
      } catch (err) {
        // Genuine network/auth failure — the endpoint itself exists now, so
        // this means the server was unreachable, not that it's unbuilt.
        setDocuments((prev) =>
          prev.map((d) =>
            d.id === localId
              ? {
                  ...d,
                  status: "unavailable",
                  error: "Couldn't reach the server to upload this document. Check your connection and try again.",
                }
              : d
          )
        );
      }
    }
  };

  const handleDelete = async (doc) => {
    setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
    if (!String(doc.id).startsWith("local-")) {
      try {
        await deleteComplianceDocument(doc.id);
      } catch {
        addToast?.("Removed locally, but couldn't sync the deletion to the server.", "error");
      }
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
          dragOver ? "border-violet-400 bg-violet-50" : "border-slate-200 bg-white hover:border-violet-300"
        }`}
      >
        <UploadCloud size={28} className="mx-auto mb-3 text-violet-500" />
        <p className="text-sm font-semibold text-slate-700">
          Drop a compliance or tax document here, or click to upload
        </p>
        <p className="text-xs text-slate-400 mt-1">
          PDF, image, or scanned notice — we'll pull out contribution rates, tax slabs, and requirements for this jurisdiction.
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {documents.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-sm text-slate-400">
          No documents uploaded yet for this jurisdiction.
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const sc = statusConfig[doc.status] || statusConfig.processing;
            const Icon = sc.icon;
            return (
              <div key={doc.id} className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      <FileText size={16} className="text-slate-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{doc.fileName}</p>
                      <p className="text-xs text-slate-400">{doc.sizeLabel} · {new Date(doc.uploadedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${sc.color}`}>
                      <Icon size={12} className={sc.spin ? "animate-spin" : ""} /> {sc.label}
                    </span>
                    <button
                      onClick={() => handleDelete(doc)}
                      className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {doc.error && (
                  <p className="text-xs text-slate-400 mt-3 bg-slate-50 rounded-xl px-3 py-2">{doc.error}</p>
                )}

                {(doc.status === "parsed" || doc.status === "failed") && doc.extracted && (
                  <ExtractedPreview extracted={doc.extracted} source={doc.extractionSource} errorMessage={doc.extractionError} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ExtractedPreview({ extracted, source, errorMessage }) {
  const { contributionRates, taxSlabs, requirements, registeredEntityDetails } = extracted || {};
  const isFallback = source === "policy";
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {isFallback ? "Policy-based preview" : "Extracted from this document"} — reference only, nothing is auto-applied
      </p>
      {isFallback && (
        <div className="text-xs bg-amber-50 rounded-lg px-3 py-2 space-y-1">
          <p className="text-amber-600 font-medium">The document parser did not return structured values, so the current company policy defaults are being shown for reference.</p>
          {errorMessage && (
            <p className="text-amber-500 font-mono text-[11px]">Reason: {errorMessage}</p>
          )}
        </div>
      )}

      {registeredEntityDetails && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Registered Entity Details</p>
          <div className="space-y-1">
            {registeredEntityDetails.name && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>Company Name</span>
                <span className="font-mono text-right">{registeredEntityDetails.name}</span>
              </div>
            )}
            {registeredEntityDetails.registrationNumber && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>Registration Number</span>
                <span className="font-mono">{registeredEntityDetails.registrationNumber}</span>
              </div>
            )}
            {registeredEntityDetails.vatNumber && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>VAT Number</span>
                <span className="font-mono">{registeredEntityDetails.vatNumber}</span>
              </div>
            )}
            {registeredEntityDetails.payeReference && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>PAYE Reference</span>
                <span className="font-mono">{registeredEntityDetails.payeReference}</span>
              </div>
            )}
            {registeredEntityDetails.utr && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>UTR</span>
                <span className="font-mono">{registeredEntityDetails.utr}</span>
              </div>
            )}
            {registeredEntityDetails.accountsReferenceDate && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>Accounts Reference Date</span>
                <span className="font-mono">{registeredEntityDetails.accountsReferenceDate}</span>
              </div>
            )}
            {registeredEntityDetails.pan && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>PAN</span>
                <span className="font-mono uppercase">{registeredEntityDetails.pan}</span>
              </div>
            )}
            {registeredEntityDetails.tan && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>TAN</span>
                <span className="font-mono uppercase">{registeredEntityDetails.tan}</span>
              </div>
            )}
            {registeredEntityDetails.gst && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>GST</span>
                <span className="font-mono uppercase">{registeredEntityDetails.gst}</span>
              </div>
            )}
            {registeredEntityDetails.pfCode && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>PF Code</span>
                <span className="font-mono">{registeredEntityDetails.pfCode}</span>
              </div>
            )}
            {registeredEntityDetails.esiCode && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>ESI Code</span>
                <span className="font-mono">{registeredEntityDetails.esiCode}</span>
              </div>
            )}
            {registeredEntityDetails.ein && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>EIN</span>
                <span className="font-mono">{registeredEntityDetails.ein}</span>
              </div>
            )}
            {registeredEntityDetails.stateId && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>State ID</span>
                <span className="font-mono">{registeredEntityDetails.stateId}</span>
              </div>
            )}
            {registeredEntityDetails.naicsCode && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>NAICS Code</span>
                <span className="font-mono">{registeredEntityDetails.naicsCode}</span>
              </div>
            )}
            {registeredEntityDetails.address && (
              <div className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>Registered Address</span>
                <span className="font-mono text-right max-w-[60%]">{registeredEntityDetails.address}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {contributionRates?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Contribution Rates</p>
          <div className="space-y-1">
            {contributionRates.map((r, i) => (
              <div key={r.id ?? i} className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>{r.label}</span>
                <span className="font-mono">{r.employee} / {r.employer}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {taxSlabs?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Tax Slabs</p>
          <div className="space-y-1">
            {taxSlabs.map((s, i) => (
              <div key={s.id ?? i} className="flex justify-between text-xs text-slate-600 bg-slate-50 rounded-lg px-3 py-1.5">
                <span>{s.min} – {s.max}</span>
                <span className="font-mono">{s.rate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {requirements?.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-1.5">Requirements Noted</p>
          <ul className="space-y-1 list-disc list-inside">
            {requirements.map((r, i) => (
              <li key={i} className="text-xs text-slate-600">{r.label}{r.note ? ` — ${r.note}` : ""}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}