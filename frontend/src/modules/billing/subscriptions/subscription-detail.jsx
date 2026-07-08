import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Repeat, RefreshCw, AlertCircle, Loader2, Play, Pause, Ban } from "lucide-react";
import HRPage from "../../../components/HRPage";
import { subscriptionApi } from "../../../service/billingService";
import { formatDisplayCurrency, formatDisplayDate } from "../../../utils/billing-helpers";

function StatusBadge({ status }) {
  const styles = {
    active: "bg-emerald-100 text-emerald-700",
    pending: "bg-blue-100 text-blue-700",
    paused: "bg-amber-100 text-amber-700",
    cancelled: "bg-slate-100 text-slate-500",
    expired: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-600"}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown"}
    </span>
  );
}

export default function SubscriptionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subscription, setSubscription] = useState(null);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subData, eventsData] = await Promise.all([
        subscriptionApi.get(id),
        subscriptionApi.listEvents(id).catch(() => { /* error logged by api layer */ return []; }),
      ]);
      setSubscription(subData);
      setEvents(Array.isArray(eventsData) ? eventsData : eventsData?.events || []);
    } catch (err) {
      setError(err?.detail || err?.message || "Failed to load subscription");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);

  const handleAction = async (action, actionFn) => {
    setActionLoading(action);
    try {
      await actionFn();
      await fetchSubscription();
    } catch (err) {
      setError(err?.detail || err?.message || `Failed to ${action} subscription`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <HRPage title="Subscription Detail" subtitle="Loading subscription details...">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      </HRPage>
    );
  }

  if (error && !subscription) {
    return (
      <HRPage title="Subscription Detail" subtitle="Error loading subscription">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
          <p className="text-sm text-red-600 mb-3">{error}</p>
          <button onClick={fetchSubscription} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </HRPage>
    );
  }

  if (!subscription) {
    return (
      <HRPage title="Subscription Detail" subtitle="Subscription not found">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Repeat className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">Subscription not found</p>
        </div>
      </HRPage>
    );
  }

  const isActive = subscription.status === "active";
  const isPaused = subscription.status === "paused";
  const isPending = subscription.status === "pending";

  return (
    <HRPage
      title={`Subscription #${subscription.subscription_number || id}`}
      subtitle={<StatusBadge status={subscription.status} />}
      actions={
        <button onClick={() => navigate("/billing/subscriptions")} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Plan</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{subscription.plan_name || subscription.plan_id || "—"}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayCurrency(subscription.amount ?? subscription.monthly_amount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Next Billing</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatDisplayDate(subscription.next_billing_date)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">Status</p>
            <div className="mt-2"><StatusBadge status={subscription.status} /></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</p>
              <p className="text-gray-900 mt-0.5">{subscription.customer_name || subscription.customer_id || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</p>
              <p className="text-gray-900 mt-0.5">{formatDisplayDate(subscription.start_date)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Period</p>
              <p className="text-gray-900 mt-0.5">{formatDisplayDate(subscription.current_period_start)} — {formatDisplayDate(subscription.current_period_end)}</p>
            </div>
            {subscription.billing_period && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Billing Period</p>
                <p className="text-gray-900 mt-0.5">{subscription.billing_period}</p>
              </div>
            )}
          </div>
        </div>

        {(isPending || isActive || isPaused) && (
          <div className="flex gap-3">
            {isPending && (
              <button
                onClick={() => handleAction("activate", () => subscriptionApi.activate(id))}
                disabled={actionLoading === "activate"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Activate
              </button>
            )}
            {isActive && (
              <button
                onClick={() => handleAction("pause", () => subscriptionApi.pause(id))}
                disabled={actionLoading === "pause"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "pause" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pause className="h-4 w-4" />}
                Pause
              </button>
            )}
            {isPaused && (
              <button
                onClick={() => handleAction("activate", () => subscriptionApi.activate(id))}
                disabled={actionLoading === "activate"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Resume
              </button>
            )}
            {(isActive || isPaused) && (
              <button
                onClick={() => handleAction("cancel", () => subscriptionApi.cancel(id))}
                disabled={actionLoading === "cancel"}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {actionLoading === "cancel" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                Cancel
              </button>
            )}
          </div>
        )}

        {events.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription Events</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="text-left py-3 px-4">Date</th>
                    <th className="text-left py-3 px-4">Event</th>
                    <th className="text-left py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {events.map((evt, i) => (
                    <tr key={evt.id || i} className="text-sm text-gray-900">
                      <td className="py-3 px-4 whitespace-nowrap">{formatDisplayDate(evt.created_at || evt.timestamp)}</td>
                      <td className="py-3 px-4">{evt.event_type || evt.action}</td>
                      <td className="py-3 px-4 text-gray-500">{evt.description || evt.details || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </HRPage>
  );
}
