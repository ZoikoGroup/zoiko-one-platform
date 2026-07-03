import React from "react";
import PageHeader from "../../components/PageHeader";
import { MessageSquare, HelpCircle, Ticket, Phone, Mail, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function SupportCenterPage() {
  const tickets = [
    { id: "#TKT-4821", subject: "Unable to process payroll run", priority: "High", status: "Open", assignee: "Alex Chen" },
    { id: "#TKT-4820", subject: "API rate limit exceeded unexpectedly", priority: "Medium", status: "In Progress", assignee: "Maria Lopez" },
    { id: "#TKT-4819", subject: "New onboarding: SSO integration", priority: "Low", status: "Open", assignee: "James Wilson" },
    { id: "#TKT-4818", subject: "Billing invoice discrepancy", priority: "High", status: "Resolved", assignee: "Sarah Kim" },
    { id: "#TKT-4817", subject: "Feature request: bulk user import", priority: "Low", status: "Closed", assignee: "Product Team" },
  ];

  return (
    <div className="space-y-6 font-sans">
      <PageHeader
        title="Support Center"
        description="Manage support tickets, track escalations, and monitor SLAs across the platform."
      />

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-sm font-bold text-slate-800 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-[#FF7A00]" /> Overview
          </h3>
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">12</p>
              <p className="text-xs text-slate-400 mt-1">Open Tickets</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">4.2<span className="text-sm font-medium text-slate-400">hrs</span></p>
              <p className="text-xs text-slate-400 mt-1">Avg Response</p>
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 text-center">
              <p className="text-2xl font-bold text-slate-800">94<span className="text-sm font-medium text-slate-400">%</span></p>
              <p className="text-xs text-slate-400 mt-1">SLA Met</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Ticket className="h-5 w-5 text-[#FF7A00]" /> Recent Tickets
            </h3>
            <button className="rounded-full bg-[#FF7A00] hover:bg-[#e56e00] text-white px-4 py-2 text-xs font-semibold transition shadow-[0_4px_14px_rgba(255,122,0,0.3)]">
              + New Ticket
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Ticket</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tickets.map((t, idx) => (
                  <tr key={idx} className="text-sm hover:bg-slate-50/50 transition">
                    <td className="py-4 px-4 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="py-4 px-4 font-bold text-slate-800">{t.subject}</td>
                    <td className="py-4 px-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        t.priority === "High" ? "bg-red-50 text-red-700 border-red-100" :
                        t.priority === "Medium" ? "bg-amber-50 text-amber-700 border-amber-100" :
                        "bg-slate-50 text-slate-500 border-slate-200"
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-500">{t.assignee}</td>
                    <td className="py-4 px-4 text-right">
                      <span className={`flex items-center justify-end gap-1 text-[10px] font-semibold ${
                        t.status === "Open" ? "text-blue-600" :
                        t.status === "In Progress" ? "text-amber-600" :
                        t.status === "Resolved" ? "text-emerald-600" : "text-slate-400"
                      }`}>
                        {t.status === "Open" && <AlertCircle className="h-3 w-3" />}
                        {t.status === "In Progress" && <Clock className="h-3 w-3" />}
                        {t.status === "Resolved" && <CheckCircle2 className="h-3 w-3" />}
                        {t.status === "Closed" && <CheckCircle2 className="h-3 w-3" />}
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
