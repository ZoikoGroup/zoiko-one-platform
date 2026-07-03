import React from "react";
import PageHeader from "../../components/PageHeader";
import { ClipboardCheck, ShieldCheck, AlertCircle, FileCheck, RefreshCw, Calendar, ArrowRight } from "lucide-react";

export default function CompliancePage() {
  const frameworks = [
    { title: "GDPR Compliance", score: "100%", desc: "Data processing & DPA rules set.", status: "Compliant", color: "border-emerald-200 text-emerald-700 bg-emerald-50/50" },
    { title: "SOC 2 Type II", score: "94%", desc: "Audit readiness checklists active.", status: "Reviewing", color: "border-amber-200 text-amber-700 bg-amber-50/50" },
    { title: "ISO/IEC 27001", score: "88%", desc: "Annex A controls verification.", status: "Audit Prep", color: "border-indigo-200 text-indigo-700 bg-indigo-50/50" },
    { title: "PCI-DSS v4.0", score: "75%", desc: "Payment network tokens & logs.", status: "Action Required", color: "border-red-200 text-red-700 bg-red-50/50" },
  ];

  const upcomingAudits = [
    { name: "SOC 2 Type II Annual Audit", date: "June 28, 2026", auditor: "EY Compliance Services" },
    { name: "Internal HIPAA Security Review", date: "July 12, 2026", auditor: "Internal Security Board" },
    { name: "ISO 27001 Surveillance Audit", date: "August 04, 2026", auditor: "BSI Group Auditors" },
  ];

  const complianceTasks = [
    { task: "Rotate data encryption keys for PostgreSQL production instance", priority: "High", done: false },
    { task: "Update supplier third-party risk assessment NDAs", priority: "Medium", done: true },
    { task: "Enforce employee quarterly compliance training modules", priority: "Low", done: true },
    { task: "Review billing API audit logging exceptions", priority: "High", done: false },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader 
        title="Compliance Center" 
        description="Monitor system-wide regulatory statuses, audit preparation timelines, policy checks, and outstanding compliance actions."
      />

      {/* Frameworks Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {frameworks.map((f, idx) => (
          <div key={idx} className={`rounded-3xl border ${f.color} p-6 shadow-sm flex flex-col justify-between hover:scale-[1.02] transition duration-200`}>
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-800">{f.title}</h3>
                <span className="text-lg font-extrabold text-slate-900">{f.score}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
              <span className="text-xs font-bold">{f.status}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Compliance Tasks */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-[#FF7A00]" /> Governance Actions & Checklist
            </h3>
            <span className="text-xs text-slate-400">Active Tasks</span>
          </div>

          <div className="space-y-3">
            {complianceTasks.map((t, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                <div className="flex items-start gap-3 min-w-0">
                  <input 
                    type="checkbox" 
                    checked={t.done}
                    readOnly
                    className="mt-1 h-4 w-4 rounded border-slate-200 bg-white text-[#FF7A00] focus:ring-[#FF7A00]"
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold leading-snug ${t.done ? "text-slate-400 line-through" : "text-slate-800"}`}>{t.task}</p>
                    <span className={`mt-1 inline-flex items-center text-[10px] font-bold uppercase ${
                      t.priority === "High" ? "text-red-500" :
                      t.priority === "Medium" ? "text-amber-600" :
                      "text-slate-400"
                    }`}>{t.priority} Priority</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Timelines */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Audit Calendar</h3>
            <div className="space-y-4">
              {upcomingAudits.map((a, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#FF7A00]/10 text-[#FF7A00]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate">{a.name}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{a.date}</p>
                    <p className="text-[9px] text-slate-400 italic mt-0.5">{a.auditor}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-1 rounded-full border border-[#FF7A00] hover:bg-[#FF7A00] hover:text-white px-4 py-2.5 text-xs font-semibold text-[#FF7A00] transition">
            Launch Audit Portal <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
