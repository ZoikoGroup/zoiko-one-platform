import { useEffect, useRef, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getLeaveCalendar, getLeaveRequests, getHolidays } from "../../../../service/employee";
import { getStoredUser } from "../../../../service/api";

const statusColor = {
  Approved: { color: "#166534", bg: "#DCFCE7" },
  Pending: { color: "#D97706", bg: "#FFFBEB" },
};

export default function LeaveCalendar() {
  const [holidays, setHolidays] = useState([]);
  const [myLeaves, setMyLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setLoading(true);
    setError(null);

    const now = new Date();
    const employeeId = getStoredUser()?.id;

    Promise.all([
      getLeaveCalendar({ year: now.getFullYear(), month: now.getMonth() + 1 }),
      employeeId ? getLeaveRequests(employeeId) : Promise.resolve([]),
      getHolidays({ year: now.getFullYear() }),
    ])
      .then(([calendarRes, requestsRes, holidaysRes]) => {
        if (!mounted.current) return;

        const calendarData = Array.isArray(calendarRes) ? calendarRes : calendarRes?.data || [];
        const publicHolidays = calendarData.filter(
          (c) => c.type === "holiday" || c.is_holiday || c.category === "public_holiday"
        );

        const hrHolidays = Array.isArray(holidaysRes) ? holidaysRes : holidaysRes?.data || holidaysRes?.items || [];
        const allHolidays = [...publicHolidays, ...hrHolidays];
        const seen = new Set();
        const deduped = allHolidays.filter(h => {
          const key = h.id || h.name || h.title || h.holiday_name || h.date;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        setHolidays(deduped);

        const requests = Array.isArray(requestsRes) ? requestsRes : [];
        setMyLeaves(requests);
      })
      .catch((err) => {
        if (mounted.current) setError(err.message || "Failed to load calendar data");
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => { mounted.current = false; };
  }, []);

  if (loading) {
    return (
      <HRPage title="Leave Calendar" subtitle="View your personal leave schedule and public holidays.">
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </HRPage>
    );
  }

  if (error) {
    return (
      <HRPage title="Leave Calendar" subtitle="View your personal leave schedule and public holidays.">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm font-medium">
          {error}
        </div>
      </HRPage>
    );
  }

  return (
    <HRPage title="Leave Calendar" subtitle="View your personal leave schedule and public holidays.">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="p-6 rounded-xl bg-white border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">My Leave Schedule</h3>
          {myLeaves.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No leave requests found</p>
          ) : (
            myLeaves.map((l, i) => (
              <div key={l.id || i} className="flex justify-between items-center py-3 border-t border-gray-100">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{l.leave_type || l.type || "Leave"}</p>
                  <p className="text-xs text-gray-500">
                    {l.start_date
                      ? new Date(l.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                      : "-"}
                    {l.end_date && l.end_date !== l.start_date
                      ? `–${new Date(l.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                      : ""}
                  </p>
                </div>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    color: statusColor[l.status]?.color || "#6B7280",
                    background: statusColor[l.status]?.bg || "#F3F4F6",
                  }}
                >
                  {l.status}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="p-6 rounded-xl bg-white border border-gray-200">
          <h3 className="text-base font-bold text-gray-900 mb-4">Public Holidays {new Date().getFullYear()}</h3>
          {holidays.length === 0 ? (
            <p className="text-center py-8 text-sm text-gray-400">No holidays found</p>
          ) : (
            holidays.map((h, i) => (
              <div key={h.id || i} className="flex justify-between items-center py-2.5 border-t border-gray-100">
                <p className="text-sm text-gray-900">{h.name || h.title || h.holiday_name}</p>
                <span className="text-xs font-semibold text-indigo-600">
                  {h.date
                    ? new Date(h.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : h.month_day || h.date_str || "-"}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </HRPage>
  );
}
