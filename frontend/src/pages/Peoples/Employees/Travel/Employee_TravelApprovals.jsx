import { useEffect, useMemo, useState } from "react";
import HRPage from "../../../../components/HRPage";
import { getTravel } from "../../../../service/employee";

const statusColor = {
  Approved: { color: "#059669", bg: "#ECFDF5" },
  Pending: { color: "#D97706", bg: "#FFFBEB" },
  Rejected: { color: "#DC2626", bg: "#FEF2F2" },
};

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v.includes("approve")) return "Approved";
  if (v.includes("pending")) return "Pending";
  if (v.includes("reject")) return "Rejected";
  return s ? String(s) : "";
}

export default function TravelApprovals() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approvals, setApprovals] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Using existing travel API. We request current user's travel records.
        const res = await getTravel();
        const data = res?.data || res?.items || res || [];
        const arr = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : []);

        // Filter to approvals-related statuses if backend returns more.
        const filtered = arr.filter((t) => {
          const st = normalizeStatus(t.status);
          return st === "Approved" || st === "Pending" || st === "Rejected";
        });

        if (mounted) setApprovals(filtered);
      } catch (e) {
        if (!mounted) return;
        setError(e?.message || "Failed to load travel approvals");
        setApprovals([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const stats = useMemo(() => {
    const s = { Approved: 0, Pending: 0, Rejected: 0 };
    approvals.forEach((a) => {
      const st = normalizeStatus(a.status);
      if (st && s[st] !== undefined) s[st]++;
    });
    return s;
  }, [approvals]);

  return (
    <HRPage title="Travel Approvals" subtitle="View the approval status of your travel requests.">
      {loading && (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-500">Loading approvals...</span>
        </div>
      )}

      {!loading && error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">{error}</div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-xs text-gray-500">Approved</div>
              <div className="text-lg font-bold text-green-600">{stats.Approved}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-xs text-gray-500">Pending</div>
              <div className="text-lg font-bold text-yellow-600">{stats.Pending}</div>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <div className="text-xs text-gray-500">Rejected</div>
              <div className="text-lg font-bold text-red-600">{stats.Rejected}</div>
            </div>
          </div>

          {approvals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <p className="text-gray-500 font-medium">No travel approvals found.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {approvals.map((a) => {
                const st = normalizeStatus(a.status);
                const colors = statusColor[st] || { color: "#6B7280", bg: "#F3F4F6" };

                const destination = a.destination || a.location || a.city || "";
                const requestedOn = a.requestedOn || a.requested_on || a.created_at || "";
                const approver = a.approver || a.approved_by || a.manager_name || "";
                const note = a.note || a.reason || a.comment || "";
                const id = a.id || a.travel_id || a.request_id || a.code || a.travel_code || "";

                return (
                  <div key={id || `${destination}-${requestedOn}`} className="p-5 rounded-xl bg-white border border-gray-200">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0">
                        <div className="flex gap-3 items-center mb-2">
                          <span className="text-xs font-bold text-gray-400">{id || "TR"}</span>
                          <span className="text-base font-bold text-gray-900 truncate">{destination || "Destination"}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">Approver: <strong>{approver || "-"}</strong></p>
                        <p className="text-sm text-gray-600 mb-1">Requested: {requestedOn || "-"}</p>
                        {note && <p className="text-sm text-gray-700 italic">{note}</p>}
                      </div>

                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ color: colors.color, background: colors.bg }}
                      >
                        {st || "-"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </HRPage>
  );
}

