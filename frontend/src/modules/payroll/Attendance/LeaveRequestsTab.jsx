import { useState, useMemo } from "react";
import { Search, X, Check, Ban, Mail, UserPlus } from "lucide-react";

const STATUS_COLORS = {
  pending:  "bg-[#F8A60A]/10 text-[#F8A60A] border-[#F8A60A]/20",
  approved: "bg-[#19C58A]/10 text-[#19C58A] border-[#19C58A]/20",
  rejected: "bg-[#FF6E86]/10 text-[#FF6E86] border-[#FF6E86]/20",
};

const TYPE_PILL = {
  paid:    "bg-[#35B6F5]/10 text-[#35B6F5] border-[#35B6F5]/20",
  unpaid:  "bg-[#9E9690]/10 text-[#9E9690] border-[#E5E0D9]",
  sick:    "bg-[#FF6E86]/10 text-[#FF6E86] border-[#FF6E86]/20",
  compOff: "bg-[#9D7BF2]/10 text-[#9D7BF2] border-[#9D7BF2]/20",
};

const TYPE_LABEL = { paid: "Paid", unpaid: "Unpaid", sick: "Sick", compOff: "Comp-Off" };

const COLORS = [
  "bg-[#19C58A]", "bg-[#35B6F5]", "bg-[#9D7BF2]",
  "bg-[#FF6E86]", "bg-[#F8A60A]", "bg-[#06B6D4]",
];

function InitialsAvatar({ name }) {
  const parts = (name || "").trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : (parts[0]?.[0] || "?");
  const idx = (name || "").charCodeAt(0) % COLORS.length;
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 ${COLORS[idx]}`}>
      {initials.toUpperCase()}
    </div>
  );
}

function formatDate(d) {
  if (!d) return "—";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return d; }
}

function daysBetween(from, to) {
  if (!from || !to) return 0;
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.max(1, Math.round((b - a) / 86400000) + 1);
}

export default function LeaveRequestsTab({ requests = [], onApprove, onReject }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.leaveType !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const name = (r.employeeName || "").toLowerCase();
        const reason = (r.reason || "").toLowerCase();
        if (!name.includes(q) && !reason.includes(q)) return false;
      }
      return true;
    });
  }, [requests, statusFilter, typeFilter, search]);

  const thCls = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-[#9E9690] select-none whitespace-nowrap";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] px-3.5 py-2.5 text-[13px] text-[#6B6560] dark:text-[#A69B93] font-medium focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200 cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] px-3.5 py-2.5 text-[13px] text-[#6B6560] dark:text-[#A69B93] font-medium focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200 cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="paid">Paid</option>
          <option value="unpaid">Unpaid</option>
          <option value="sick">Sick</option>
          <option value="compOff">Comp-Off</option>
        </select>
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9E9690] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or reason…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-[12px] border border-[#E5E0D9] dark:border-[#38312D] bg-white dark:bg-[#221D1A] pl-10 pr-10 py-2.5 text-[13px] text-[#1A1816] dark:text-[#F0EDE8] placeholder:text-[#9E9690] focus:outline-none focus:border-[#19C58A] focus:ring-2 focus:ring-[#19C58A]/20 transition-all duration-200"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9E9690] hover:text-[#6B6560] transition-colors" aria-label="Clear">
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#221D1A] border border-[#E5E0D9] dark:border-[#38312D] rounded-[18px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="overflow-x-auto">
          <table className="min-w-full table-fixed">
            <thead>
              <tr className="bg-[#F8F7F4] dark:bg-[#2A2520] border-b border-[#E5E0D9] dark:border-[#38312D]">
                <th className={`${thCls} w-52`}>Employee</th>
                <th className={`${thCls} w-24`}>Type</th>
                <th className={`${thCls} w-28`}>From</th>
                <th className={`${thCls} w-28`}>To</th>
                <th className={`${thCls} w-16`}>Days</th>
                <th className={`${thCls} w-28`}>Request Code</th>
                <th className={`${thCls}`}>Reason</th>
                <th className={`${thCls} w-28`}>Pay Impact</th>
                <th className={`${thCls} w-28`}>Source</th>
                <th className={`${thCls} w-28`}>Status</th>
                <th className={`${thCls} w-20`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EDE8] dark:divide-[#38312D]/50">
              {filtered.length === 0 ? (
                <tr>
                    <td colSpan={11} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 rounded-[14px] bg-[#F0EDE8] dark:bg-[#2A2520] flex items-center justify-center mb-3">
                        <Search size={22} className="text-[#9E9690]" />
                      </div>
                      <p className="text-[13px] font-semibold text-[#9E9690]">No leave requests found</p>
                      <p className="text-[12px] text-[#9E9690] mt-1">Try adjusting the filters</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((r, idx) => (
                  <tr key={r.id || idx} className={`transition-colors duration-150 hover:bg-[#F8F7F4] dark:hover:bg-[#2A2520] ${idx % 2 === 0 ? "bg-white dark:bg-[#221D1A]" : "bg-[#F8F7F4]/50 dark:bg-[#2A2520]/50"}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <InitialsAvatar name={r.employeeName} />
                        <span className="text-[13px] font-semibold text-[#1A1816] dark:text-[#F0EDE8] truncate">{r.employeeName || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${TYPE_PILL[r.leaveType] || "bg-[#F0EDE8] text-[#9E9690]"}`}>
                        {TYPE_LABEL[r.leaveType] || r.leaveType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#6B6560] dark:text-[#A69B93]">{formatDate(r.startDate)}</td>
                    <td className="px-4 py-3 text-[13px] text-[#6B6560] dark:text-[#A69B93]">{formatDate(r.endDate)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[13px] font-bold text-[#1A1816] dark:text-[#F0EDE8]">{r.days || daysBetween(r.startDate, r.endDate)}</span>
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono font-semibold text-[#9E9690]">{r.requestCode || "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-[#6B6560] dark:text-[#A69B93] max-w-[180px] truncate" title={r.reason}>{r.reason || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[12px] font-semibold ${r.leaveType === "unpaid" ? "text-[#FF6E86]" : "text-[#19C58A]"}`}>
                        {r.leaveType === "unpaid" ? "No pay — deducted" : "Full pay"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.source === "email" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#35B6F5]/10 border border-[#35B6F5]/20 text-[11px] font-bold text-[#35B6F5]">
                          <Mail size={10} /> Email
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#F0EDE8] dark:bg-[#2A2520] border border-[#E5E0D9] dark:border-[#38312D] text-[11px] font-bold text-[#9E9690]">
                          <UserPlus size={10} /> Manual
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[11px] font-bold ${STATUS_COLORS[r.status] || ""}`}>
                        {r.status ? r.status.charAt(0).toUpperCase() + r.status.slice(1) : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {r.status === "pending" ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onApprove?.(r.id)}
                            className="p-1.5 rounded-[10px] bg-[#19C58A]/10 text-[#19C58A] hover:bg-[#19C58A]/20 transition-colors"
                            title="Approve"
                          >
                            <Check size={14} />
                          </button>
                          <button
                            onClick={() => onReject?.(r.id)}
                            className="p-1.5 rounded-[10px] bg-[#FF6E86]/10 text-[#FF6E86] hover:bg-[#FF6E86]/20 transition-colors"
                            title="Reject"
                          >
                            <Ban size={14} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-[#9E9690]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="bg-[#F8F7F4] dark:bg-[#2A2520] border-t border-[#E5E0D9] dark:border-[#38312D] px-4 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-[#9E9690]">
            Showing <span className="font-semibold text-[#1A1816] dark:text-[#F0EDE8]">{filtered.length}</span> of {requests.length} request{requests.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
