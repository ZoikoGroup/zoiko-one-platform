import { useEffect, useMemo, useRef, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getLeaveBalances, getLeaveRequests } from "../../../../service/employee";
import { getStoredUser } from "../../../../service/api";

const statusColor = {
  Approved: { color: "#166534", bg: "#DCFCE7" },
  Pending: { color: "#D97706", bg: "#FFFBEB" },
  Rejected: { color: "#DC2626", bg: "#FEF2F2" },
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function MyLeave() {
  const [balances, setBalances] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    const employeeId = getStoredUser()?.id;
    if (!employeeId) {
      if (mounted.current) {
        setError("User not found. Please log in again.");
        setLoading(false);
      }
      return;
    }

    Promise.all([
      getLeaveBalances(employeeId),
      getLeaveRequests(employeeId),
    ])
      .then(([balancesRes, historyRes]) => {
        if (!mounted.current) return;
        setBalances(Array.isArray(balancesRes) ? balancesRes : []);
        const list = Array.isArray(historyRes) ? historyRes : [];
        list.sort((a, b) => {
          const da = a.created_at || a.appliedOn || a.start_date;
          const db = b.created_at || b.appliedOn || b.start_date;
          return new Date(db || 0) - new Date(da || 0);
        });
        setHistory(list);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message || "Failed to load leave data");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, []);

  const leaveTypes = useMemo(
    () =>
      balances.map((b) => ({
        type: b.leave_type || b.type || "Leave",
        total: b.total_days || b.total || 0,
        used: b.used_days || b.used || 0,
        remaining: b.remaining_days ?? b.remaining ?? ((b.total_days || b.total || 0) - (b.used_days || b.used || 0)),
        color:
          (b.leave_type || b.type || "").includes("Annual")
            ? "#4F46E5"
            : (b.leave_type || b.type || "").includes("Sick")
              ? "#059669"
              : (b.leave_type || b.type || "").includes("Casual")
                ? "#0EA5E9"
                : (b.leave_type || b.type || "").includes("Unpaid")
                  ? "#DC2626"
                  : "#6B7280",
      })),
    [balances]
  );

  if (loading) {
    return (
      <HRPage title="My Leave" subtitle="View your leave balances and request history.">
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="My Leave" subtitle="View your leave balances and request history.">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="My Leave" subtitle="View your leave balances and request history.">
      {leaveTypes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No leave balances found</p>
          <p className="text-sm mt-1">Contact HR to initialize your leave balance.</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 mb-7">
          {leaveTypes.map((l) => (
            <div key={l.type} className="p-5 rounded-xl bg-white border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 mb-2.5">{l.type}</p>
              <p className="text-3xl font-extrabold mb-1" style={{ color: l.color }}>{l.remaining}</p>
              <p className="text-xs text-gray-400">of {l.total} days remaining</p>
              <div className="mt-2.5 h-1 rounded-full bg-gray-100">
                <div
                  className="h-1 rounded-full"
                  style={{
                    background: l.color,
                    width: l.total ? `${(l.remaining / l.total) * 100}%` : "0%",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No leave history</p>
        </div>
      ) : (
        <div className="p-6 rounded-xl bg-white border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">Leave History</h3>
          {history.map((h, i) => (
            <div key={h.id || i} className="flex justify-between items-center py-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {h.leave_type || h.type || "Leave"}
                </p>
                <p className="text-xs text-gray-500">
                  {formatDate(h.start_date)} &rarr; {formatDate(h.end_date)} &middot;{" "}
                  {h.days || 1} day(s)
                </p>
              </div>
              <span
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  color: statusColor[h.status]?.color || "#6B7280",
                  background: statusColor[h.status]?.bg || "#F3F4F6",
                }}
              >
                {h.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </HRPage>
  );
}
