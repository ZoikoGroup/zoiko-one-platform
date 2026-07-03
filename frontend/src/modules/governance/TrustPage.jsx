import React from "react";
import PageHeader from "../../components/PageHeader";
import { Award, CheckCircle2, Shield, Heart, FileText, Download, Activity, ExternalLink } from "lucide-react";

export default function TrustPage() {
  const certifications = [
    { title: "SOC 2 Type II", body: "Operational security controls audited annually by AICPA guidelines.", status: "Verified 2025", icon: Shield, pct: "100%" },
    { title: "ISO/IEC 27001", body: "Information security management framework fully certified.", status: "Certified 2026", icon: Award, pct: "100%" },
    { title: "GDPR Compliant", body: "Data processing agreements align with European standards.", status: "Audited 2025", icon: CheckCircle2, pct: "100%" },
    { title: "HIPAA Certified", body: "Encryption and storage protocols comply with healthcare standards.", status: "Verified 2025", icon: Heart, pct: "100%" },
  ];

  const uptimeServices = [
    { name: "API Gateway", uptime: "99.99%", status: "Operational" },
    { name: "Core Database (PostgreSQL)", uptime: "99.98%", status: "Operational" },
    { name: "SaaS Web Portal", uptime: "99.95%", status: "Operational" },
    { name: "FastAPI Authentication Services", uptime: "100.00%", status: "Operational" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader 
        title="Trust Center" 
        description="Verify our real-time compliance standings, data protection standards, certifications, and system operational health."
      />

      {/* Certifications Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {certifications.map((c, idx) => (
          <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between hover:border-[#FF7A00]/30 transition">
            <div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FF7A00]/10 text-[#FF7A00] mb-4">
                <c.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">{c.title}</h3>
              <p className="mt-2 text-xs text-slate-500 leading-relaxed">{c.body}</p>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{c.status}</span>
              <span className="text-sm font-bold text-slate-850">{c.pct}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* System Health / Uptime */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-650" /> Operational Status & Uptime
            </h3>
            <span className="text-xs text-slate-400">90-Day History</span>
          </div>

          <div className="space-y-4">
            {uptimeServices.map((s, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{s.name}</p>
                  <div className="mt-1.5 flex gap-1">
                    {[...Array(20)].map((_, i) => (
                      <span key={i} className="h-4 w-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 transition" />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-850">{s.uptime}</p>
                  <p className="text-xs text-emerald-650 font-semibold mt-0.5">{s.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Security Documents / Downloads */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Trust Resources</h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">Download compliance documentation, pen test results, and compliance reports.</p>
            <div className="space-y-3">
              {[
                { name: "SOC 2 Type II Audit Report", size: "2.4 MB" },
                { name: "Penetration Testing Report (2025)", size: "1.8 MB" },
                { name: "Information Security Policy v3.0", size: "940 KB" },
                { name: "ISO 27001 Certificate Copy", size: "450 KB" },
              ].map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100/50 transition">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <div className="truncate">
                      <p className="text-xs font-semibold text-slate-850 truncate">{doc.name}</p>
                      <p className="text-[10px] text-slate-500">{doc.size}</p>
                    </div>
                  </div>
                  <button className="p-1 hover:text-[#FF7A00] text-slate-400 transition" aria-label="Download document">
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-slate-200 hover:border-slate-350 hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition">
            Request NDA Document access <ExternalLink className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
