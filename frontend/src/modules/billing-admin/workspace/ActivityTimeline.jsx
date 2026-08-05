/**
 * workspace/ActivityTimeline.jsx
 * -------------------------------
 * "MY ORGANIZATION → Activity Timeline" — a unified Billing Workspace timeline
 * for Billing Admin. Merges audit logs (which cover invoice, subscription,
 * payment, customer, product and configuration activity) with the invoice
 * status-history feed into a single newest-first timeline grouped under
 * Today / Yesterday / Earlier. No new backend work — existing data only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { History, FileText, CreditCard, Users, Settings, ShieldCheck, RefreshCw, Package, WalletCards, FileSignature, Bell } from "lucide-react";
import { auditApi, invoiceApi } from "../../../service/billingService";
import { Spinner, ErrorState, EmptyState } from "../../../components/billing-shared";
import { formatDisplayDate } from "../../../utils/billing-helpers";
import WorkspaceHeader from "./WorkspaceHeader";

const ENTITY_ICONS = {
  Invoice: FileText,
  Subscription: CreditCard,
  Customer: Users,
  Product: Package,
  Payment: WalletCards,
  Quote: FileText,
  Contract: FileSignature,
  BillingConfiguration: Settings,
};

const ENTITY_COLORS = {
  Invoice: "bg-violet-100 text-violet-700",
  Subscription: "bg-blue-100 text-blue-700",
  Customer: "bg-emerald-100 text-emerald-700",
  Product: "bg-amber-100 text-amber-700",
  Payment: "bg-cyan-100 text-cyan-700",
  Quote: "bg-indigo-100 text-indigo-700",
  Contract: "bg-pink-100 text-pink-700",
  BillingConfiguration: "bg-slate-100 text-slate-600",
};

const FILTERS = [
  { key: "all", label: "All Activity" },
  { key: "Invoice", label: "Invoices" },
  { key: "Payment", label: "Payments" },
  { key: "Subscription", label: "Subscriptions" },
  { key: "Customer", label: "Customers" },
  { key: "BillingConfiguration", label: "Settings" },
];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayLabel(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Earlier";
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, now)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  return "Earlier";
}

function normalizeEntry(entry, source) {
  const timestamp = entry?.timestamp || entry?.created_at || entry?.date;
  const label = entry?.action || entry?.description || `${source} activity`;
  const detail =
    entry?.reason ||
    entry?.message ||
    (entry?.from_status && entry?.to_status
      ? `${entry.from_status || "new"} → ${entry.to_status}`
      : null);
  return {
    id: entry?.id ?? `${source}-${timestamp}-${label}`,
    timestamp,
    label,
    detail,
    entityType: entry?.entity_type || (source === "invoice" ? "Invoice" : "Activity"),
    entityId: entry?.entity_id ?? entry?.invoice_id,
  };
}

export default function ActivityTimeline() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [invoiceActivity, setInvoiceActivity] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logs, recent] = await Promise.all([
        auditApi.list({ page: 1, per_page: 60 }).catch(() => null),
        invoiceApi.getRecentActivity(20).catch(() => []),
      ]);
      const logItems = Array.isArray(logs) ? logs : logs?.items || [];
      setAuditLogs(logItems);
      setInvoiceActivity(Array.isArray(recent) ? recent : []);
    } catch (err) {
      setError(err?.message || "Unable to load activity timeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const timeline = useMemo(() => {
    const entries = [
      ...auditLogs.map((e) => normalizeEntry(e, "audit")),
      ...invoiceActivity.map((e) => normalizeEntry(e, "invoice")),
    ];
    return entries
      .filter((e) => e.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [auditLogs, invoiceActivity]);

  const grouped = useMemo(() => {
    const entries = filter === "all" ? timeline : timeline.filter((e) => e.entityType === filter);
    const groups = [];
    for (const entry of entries) {
      const day = dayLabel(entry.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.day === day) {
        last.entries.push(entry);
      } else {
        groups.push({ day, entries: [entry] });
      }
    }
    return groups;
  }, [timeline, filter]);

  const counts = useMemo(() => {
    const result = { all: timeline.length };
    for (const f of FILTERS) {
      if (f.key !== "all") result[f.key] = timeline.filter((e) => e.entityType === f.key).length;
    }
    return result;
  }, [timeline]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Activity Timeline" message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title="Activity Timeline"
        organization={null}
        health={null}
        plan={null}
        outstanding={null}
        fiscalYear={null}
        currency={null}
        icon={History}
        actions={
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50 ${
              filter === f.key
                ? "border-[#FF7A00] bg-[#FF7A00] text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f.label}
            {counts[f.key] ? <span className={filter === f.key ? "text-white/80" : "text-slate-400"}>({counts[f.key]})</span> : null}
          </button>
        ))}
      </div>

      {timeline.length === 0 ? (
        <EmptyState
          icon={History}
          title="No billing activity has been recorded yet"
          message="Changes to customers, invoices, subscriptions, payments and billing settings will appear here as your organization starts operating. Use Quick Actions on the Overview to create your first invoice or record a payment."
        />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No activity in this view"
          message="Nothing matches the selected filter yet. Try a different filter to see more of your billing timeline."
        />
      ) : (
        <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.day}>
                <div className="mb-3 flex items-center gap-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{group.day}</p>
                  <span className="h-px flex-1 bg-slate-100" />
                  <span className="text-xs text-slate-300">{group.entries.length} event{group.entries.length === 1 ? "" : "s"}</span>
                </div>
                <div className="space-y-4">
                  {group.entries.map((entry) => {
                    const Icon = ENTITY_ICONS[entry.entityType] || ShieldCheck;
                    const color = ENTITY_COLORS[entry.entityType] || "bg-slate-100 text-slate-600";
                    return (
                      <div key={entry.id} className="flex items-start gap-3">
                        <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${color}`}>
                          <Icon size={16} />
                        </span>
                        <div className="min-w-0 flex-1 border-b border-slate-100 pb-4">
                          <p className="text-sm font-semibold text-slate-700">{entry.label}</p>
                          {entry.detail && <p className="mt-0.5 text-xs text-slate-500">{entry.detail}</p>}
                          <p className="mt-1 text-xs text-slate-400">
                            {entry.entityType}
                            {entry.entityId != null ? ` #${entry.entityId}` : ""}
                            {" · "}
                            {entry.timestamp
                              ? new Date(entry.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }) +
                                " · " +
                                new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : ""}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">
            Timeline powered by your Billing audit logs ({formatDisplayDate(new Date())})
          </p>
        </div>
      )}
    </div>
  );
}
