import React from "react";
import PageHeader from "../../components/PageHeader";
import { SlidersHorizontal, ToggleLeft, ToggleRight, Plus, Search, Users } from "lucide-react";

export default function FeatureFlagsPage() {
  const flags = [
    { key: "new-dashboard-v2", label: "New Dashboard v2", env: "Production", enabled: true, owner: "Product Team" },
    { key: "ai-recommendations", label: "AI Recommendations", env: "Staging", enabled: true, owner: "ML Team" },
    { key: "dark-mode", label: "Dark Mode", env: "Production", enabled: false, owner: "UI Team" },
    { key: "biometric-auth", label: "Biometric Auth", env: "Development", enabled: true, owner: "Security Team" },
    { key: "bulk-export", label: "Bulk CSV Export", env: "Production", enabled: false, owner: "Product Team" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Feature Flags"
        description="Toggle features on/off across environments without deploying code."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5 text-[#FF7A00]" /> Feature Toggles
          </h3>
          <button className="flex items-center gap-1.5 rounded-full bg-[#FF7A00] hover:bg-[#e56e00] text-white px-4 py-2 text-xs font-semibold transition shadow-[0_4px_14px_rgba(255,122,0,0.3)]">
            <Plus className="h-3.5 w-3.5" /> Add Flag
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Flag</th>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4">Environment</th>
                <th className="py-3 px-4">Owner</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flags.map((flag, idx) => (
                <tr key={idx} className="text-sm hover:bg-slate-50/50 transition">
                  <td className="py-4 px-4 font-bold text-slate-800">{flag.label}</td>
                  <td className="py-4 px-4 font-mono text-xs text-slate-500">{flag.key}</td>
                  <td className="py-4 px-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      flag.env === "Production" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      flag.env === "Staging" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      "bg-blue-50 text-blue-700 border-blue-100"
                    }`}>
                      {flag.env}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-slate-500">{flag.owner}</td>
                  <td className="py-4 px-4 text-right">
                    <button className="p-1" aria-label="Toggle flag">
                      {flag.enabled ? (
                        <ToggleRight className="h-6 w-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-300" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
