import { useEffect, useMemo, useRef, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getAttendanceRecords } from "../../../../service/employee";

const statusColor = {
  Present: { color: "#059669", bg: "#ECFDF5" },
  Absent: { color: "#DC2626", bg: "#FEF2F2" },
  Late: { color: "#D97706", bg: "#FFFBEB" },
};

export default function EssAttendance() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    getAttendanceRecords()
      .then((data) => {
        if (!mounted.current) return;
        const list = data?.items || (Array.isArray(data) ? data : []);
        setRecords(list);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message || "Failed to load attendance records");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, []);

  const summary = useMemo(
    () => ({
      present: records.filter((r) => r.status === "Present").length,
      absent: records.filter((r) => r.status === "Absent").length,
      late: records.filter((r) => r.status === "Late").length,
    }),
    [records]
  );

  if (loading) {
    return (
      <HRPage title="My Attendance" subtitle="Track your daily check-in and check-out records.">
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="My Attendance" subtitle="Track your daily check-in and check-out records.">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="My Attendance" subtitle="Track your daily check-in and check-out records.">
      {records.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-medium">No attendance records found</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-7">
            {[
              { label: "Present Days", value: summary.present, color: "#059669" },
              { label: "Absent Days", value: summary.absent, color: "#DC2626" },
              { label: "Late Arrivals", value: summary.late, color: "#D97706" },
            ].map((s) => (
              <div key={s.label} className="p-5 rounded-xl bg-white border border-gray-200 text-center">
                <p className="text-3xl font-extrabold mb-1" style={{ color: s.color }}>
                  {s.value}
                </p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h3 className="text-base font-bold text-gray-900">Attendance Records</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    {["Date", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id || i} className="border-t border-gray-100">
                      <td className="px-5 py-3.5 text-sm font-medium text-gray-900">{r.date || r.date}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{r.checkIn || r.check_in || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{r.checkOut || r.check_out || "-"}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-700">{r.hours || r.total_hours || "-"}</td>
                      <td className="px-5 py-3.5">
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
        </>
      )}
    </HRPage>
  );
}
