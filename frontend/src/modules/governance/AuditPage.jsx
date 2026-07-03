import React, { useState } from "react";
import PageHeader from "../../components/PageHeader";
import { History, ShieldAlert, Cpu, Network, Search, Filter, RefreshCw, Calendar } from "lucide-react";

export default function AuditPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const stats = [
    { title: "Logged Actions", value: "24,819", icon: History, color: "text-blue-400 bg-blue-500/10 border-blue-500/25" },
    { title: "WAF Blocks", value: "1,248", icon: ShieldAlert, color: "text-red-400 bg-red-500/10 border-red-500/25" },
    { title: "System Syncs", value: "48", icon: Cpu, color: "text-purple-400 bg-purple-500/10 border-purple-500/25" },
    { title: "Integrations", value: "12", icon: Network, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25" },
  ];

  const initialLogs = [
    { id: 1, time: "2026-06-12 16:44:12", user: "admin@zoiko.com", action: "user.role_update", module: "Platform Governance", resource: "user_142", ip: "192.168.1.52", status: "Success" },
    { id: 2, time: "2026-06-12 16:42:08", user: "admin@zoiko.com", action: "auth.login", module: "Authentication", resource: "session_mock_token", ip: "127.0.0.1", status: "Success" },
    { id: 3, time: "2026-06-12 16:30:15", user: "system@zoikocorex", action: "ledger.reconcile", module: "Infrastructure", resource: "tx_94812", ip: "10.0.4.15", status: "Success" },
    { id: 4, time: "2026-06-12 16:18:44", user: "guest@unauthorized.com", action: "auth.login_failed", module: "Authentication", resource: "session_failed", ip: "198.51.100.42", status: "Denied" },
    { id: 5, time: "2026-06-12 15:52:30", user: "hr@zoiko.com", action: "employee.leave_approve", module: "Zoiko HR", resource: "leave_42", ip: "192.168.1.18", status: "Success" },
    { id: 6, time: "2026-06-12 15:10:12", user: "billing@zoiko.com", action: "refund.process", module: "Zoiko Billing", resource: "inv_842", ip: "192.168.1.20", status: "Denied" },
  ];

  const filteredLogs = initialLogs.filter(log => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || log.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      <PageHeader 
        title="Audit Center" 
        description="Immutable audit trail and security log repository tracking all actions performed across the Zoiko One environment."
      />

      {/* Stats Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, idx) => (
          <div key={idx} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{s.title}</p>
                <p className="mt-2 text-3xl font-extrabold text-slate-850">{s.value}</p>
              </div>
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter and Log Table */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_24px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-slate-100 pb-5">
          <h3 className="text-lg font-bold text-slate-800">Security Trail</h3>
          <div className="flex flex-wrap items-center gap-3 max-w-xl w-full sm:justify-end">
            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Filter logs..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 outline-none focus:bg-white focus:border-[#FF7A00]"
              />
            </div>
            {/* Status Dropdown */}
            <div className="relative">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-8 text-xs text-slate-700 outline-none focus:bg-white focus:border-[#FF7A00] appearance-none cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUCCESS">Success Only</option>
                <option value="DENIED">Denied Only</option>
              </select>
              <Filter className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Resource ID</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="text-xs text-slate-650 hover:bg-slate-50/50 transition">
                  <td className="py-4 px-4 text-slate-500 font-mono whitespace-nowrap">{log.time}</td>
                  <td className="py-4 px-4 font-semibold text-slate-850">{log.user}</td>
                  <td className="py-4 px-4"><code className="rounded bg-orange-50/50 px-2 py-0.5 border border-orange-100 text-[#FF7A00] font-mono">{log.action}</code></td>
                  <td className="py-4 px-4 text-slate-700">{log.module}</td>
                  <td className="py-4 px-4 text-slate-500 font-mono">{log.resource}</td>
                  <td className="py-4 px-4 text-slate-500 font-mono">{log.ip}</td>
                  <td className="py-4 px-4 text-right">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                      log.status === "Success" ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/25" : "bg-red-500/10 text-red-600 border border-red-500/25"
                    }`}>
                      {log.status}
                    </span>
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
