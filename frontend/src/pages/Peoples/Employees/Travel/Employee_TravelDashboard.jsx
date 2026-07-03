import { useEffect, useMemo, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getTravel } from "../../../../service/employee";

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("approve")) return "Approved";
  if (v.includes("pending")) return "Pending";
  if (v.includes("reject")) return "Rejected";
  if (v.includes("complete")) return "Completed";
  if (v.includes("expense")) return "Expense";
  return s ? String(s) : "";
}

const statusColor = {
  Approved: "text-indigo-600 bg-indigo-50",
  Pending: "text-yellow-600 bg-yellow-50",
  Completed: "text-green-600 bg-green-50",
};

const statCards = [
  { key: "total", label: "Total Trips", color: "text-indigo-600" },
  { key: "pending", label: "Pending Approval", color: "text-yellow-600" },
  { key: "expenses", label: "Expenses Claimed", color: "text-green-600" },
  { key: "upcoming", label: "Upcoming Trips", color: "text-sky-600" },
];

function computeAmount(records) {
  const total = records.reduce((sum, r) => {
    const amt = parseFloat(String(r.amount || r.expense_amount || "0").replace(/[^0-9.]/g, ""));
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);
  return `₹${total.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function TravelDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trips, setTrips] = useState([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await getTravel();
        const data = res?.data || res?.items || res || [];
        const arr = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
        if (mounted) setTrips(arr);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load travel data");
        setTrips([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const stats = useMemo(() => {
    const total = trips.length;
    const pending = trips.filter((t) => normalizeStatus(t.status) === "Pending").length;
    const expenseRecords = trips.filter((t) => normalizeStatus(t.status) === "Expense" || t.type === "expense" || t.category);
    const expenses = expenseRecords.length > 0
      ? computeAmount(expenseRecords)
      : `₹${trips.reduce((s, t) => {
          const a = parseFloat(String(t.amount || t.expense_amount || "0").replace(/[^0-9.]/g, ""));
          return s + (isNaN(a) ? 0 : a);
        }, 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
    const upcoming = trips.filter((t) => {
      const st = normalizeStatus(t.status);
      return st === "Approved" || st === "Pending";
    }).length;
    return { total, pending, expenses, upcoming };
  }, [trips]);

  const recentTrips = useMemo(() => {
    return trips
      .filter((t) => {
        const st = normalizeStatus(t.status);
        return st === "Approved" || st === "Pending" || st === "Completed";
      })
      .slice(0, 5);
  }, [trips]);

  return (
    <HRPage title="Travel Dashboard" subtitle="Overview of your business travel and reimbursements.">
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading travel data...</span>
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((s) => (
              <div key={s.key} className="bg-white rounded-xl border border-gray-200 p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{s.label}</p>
                <p className={`text-3xl font-extrabold ${s.color}`}>{stats[s.key]}</p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">Recent Trips</h3>
            {recentTrips.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No recent trips found.</p>
            ) : (
              recentTrips.map((t, i) => {
                const st = normalizeStatus(t.status);
                const colors = statusColor[st] || "text-gray-500 bg-gray-100";
                return (
                  <div key={t.id || i} className="flex justify-between items-center py-3.5 border-t border-gray-100 first:border-t-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900">{t.destination || t.location || t.city || "Trip"}</p>
                      <p className="text-xs text-gray-500">{t.purpose || t.reason || ""}</p>
                      <p className="text-xs text-gray-400">{t.travel_date || t.date || t.from || ""}</p>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${colors}`}>{st || t.status || "-"}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </HRPage>
  );
}
