import { useState } from "react";
import { Clock, Plus, Search } from "lucide-react";

export default function ZoikoTimeModule() {
  const [activeTab] = useState("overview");

  return (
    <div className="space-y-6 font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Zoiko Time</h1>
          <p className="text-sm text-slate-500 mt-1">Time tracking, attendance, and shift management.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00] text-white rounded-full text-sm font-semibold hover:bg-[#FF7A00]/90 transition">
          <Plus className="h-4 w-4" /> New Entry
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-100 pb-3">
        {["overview", "timesheets", "attendance", "shifts", "reports"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition capitalize ${
              activeTab === tab ? "bg-[#FF7A00] text-white" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Hours", value: "0h" },
          { label: "Active Staff", value: "0" },
          { label: "Pending Approvals", value: "0" },
          { label: "Absent Today", value: "0" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-xs text-slate-400">{s.label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Recent Time Entries</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search entries..."
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-full outline-none focus:border-[#FF7A00]"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <th className="py-3 pr-4">Employee</th>
              <th className="py-3 pr-4">Date</th>
              <th className="py-3 pr-4">Clock In</th>
              <th className="py-3 pr-4">Clock Out</th>
              <th className="py-3 pr-4">Hours</th>
              <th className="py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan="6" className="py-12 text-center text-sm text-slate-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                No time entries yet. Time tracking data will appear here once employees clock in.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
