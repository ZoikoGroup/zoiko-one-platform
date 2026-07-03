import { useEffect, useRef, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getLeaveRequests } from "../../../../service/employee";
import { getStoredUser } from "../../../../service/api";

const statusColor = {
  Approved: { color: "#166534", bg: "#DCFCE7" },
  Rejected: { color: "#DC2626", bg: "#FEF2F2" },
  Pending: { color: "#D97706", bg: "#FFFBEB" },
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default function LeaveHistory() {
  const [records, setRecords] = useState([]);
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

    getLeaveRequests(employeeId)
      .then((data) => {
        if (!mounted.current) return;
        const list = Array.isArray(data) ? data : [];
        list.sort((a, b) => {
          const da = a.created_at || a.appliedOn || a.start_date;
          const db = b.created_at || b.appliedOn || b.start_date;
          return new Date(db || 0) - new Date(da || 0);
        });
        setRecords(list);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message || "Failed to load leave history");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, []);

  if (loading) {
    return (
      <HRPage title="Leave History" subtitle="Complete record of all your leave requests.">
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="Leave History" subtitle="Complete record of all your leave requests.">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Leave History" subtitle="Complete record of all your leave requests.">
      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No leave history found</p>
        </div>
      ) : (
        <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {["ID", "Type", "From", "To", "Days", "Applied On", "Approver", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id || r.leaveId} className="border-t border-gray-100">
                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-400">{r.id || r.leaveId || "-"}</td>
                    <td className="px-4 py-3.5 text-xs font-semibold text-gray-900">
                      {r.leave_type || r.type || "Leave"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-700">{formatDate(r.start_date)}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-700">{formatDate(r.end_date)}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-700 text-center">{r.days || 1}</td>
                    <td className="px-4 py-3.5 text-xs text-gray-700">
                      {formatDate(r.created_at || r.appliedOn)}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-gray-700">{r.approver || r.approved_by || "-"}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                        style={{
                          color: statusColor[r.status]?.color || "#6B7280",
                          background: statusColor[r.status]?.bg || "#F3F4F6",
                        }}
                      >
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </HRPage>
  );
}
