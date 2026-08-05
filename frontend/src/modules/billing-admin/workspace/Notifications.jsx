/**
 * workspace/Notifications.jsx
 * ----------------------------
 * "MY ORGANIZATION → Notifications" — workspace notifications surface for
 * Billing Admin. Announcements, renewal alerts, overdue reminders and billing
 * event notifications will land here; the placeholder keeps the surface
 * ready without inventing backend APIs.
 */

import { useNavigate } from "react-router-dom";
import { Bell, CreditCard, AlertTriangle, CalendarClock, ArrowRight } from "lucide-react";
import { EmptyState } from "../../../components/billing-shared";
import WorkspaceHeader from "./WorkspaceHeader";

const PREVIEWS = [
  { icon: CalendarClock, color: "bg-blue-100 text-blue-700", title: "Subscription renewals", text: "Alerts for upcoming renewals land here." },
  { icon: AlertTriangle, color: "bg-red-100 text-red-700", title: "Overdue invoices", text: "Overdue reminders and dunning events land here." },
  { icon: Bell, color: "bg-violet-100 text-violet-700", title: "Billing events", text: "Payments, credit notes and collections events land here." },
];

export default function Notifications() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title="Notifications"
        organization={null}
        health={null}
        plan={null}
        outstanding={null}
        fiscalYear={null}
        currency={null}
        icon={Bell}
      />

      <EmptyState
        icon={Bell}
        title="No notifications yet"
        message="Renewal alerts, overdue reminders and billing events for your organization will appear here."
      />

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <h2 className="text-lg font-bold text-slate-800 mb-4">What to expect</h2>
        <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
          {PREVIEWS.map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${item.color}`}>
                <item.icon size={17} />
              </span>
              <p className="mt-3 text-sm font-semibold text-slate-700">{item.title}</p>
              <p className="mt-1 text-xs text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => navigate("/billing/workspace/activity")}
          className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-[#FF7A00] hover:text-[#FF5500]"
        >
          See recent activity <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
