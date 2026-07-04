 // RecentActivity.jsx

const STATUS_STYLES = {
  success: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  info: "bg-blue-100 text-blue-700",
};

const STATUS_LABELS = {
  success: "Success",
  pending: "Pending",
  info: "Info",
};

function formatTimestamp(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityItem({ description, timestamp, status }) {
  const badgeClass = STATUS_STYLES[status] || STATUS_STYLES.info;
  const badgeLabel = STATUS_LABELS[status] || "Info";

  return (
    <div className="flex items-start justify-between gap-3 border-b border-slate-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-slate-800">{description}</p>
        <p className="mt-0.5 text-xs text-slate-400">{formatTimestamp(timestamp)}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
      >
        {badgeLabel}
      </span>
    </div>
  );
}

/**
 * RecentActivity
 * Displays a scrollable feed of recent payroll actions.
 *
 * @param {Object} props
 * @param {Array<{id: string, description: string, timestamp: string, status: 'success'|'pending'|'info'}>} props.activities
 */
export default function RecentActivity({ activities = [] }) {
  const isScrollable = activities.length > 5;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-2 text-sm font-semibold text-slate-900">Recent activity</h3>

      {activities.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-slate-400">
          No recent activity
        </div>
      ) : (
        <div className={isScrollable ? "max-h-72 overflow-y-auto pr-1" : ""}>
          {activities.map((item) => (
            <ActivityItem key={item.id} {...item} />
          ))}
        </div>
      )}
    </div>
  );
}