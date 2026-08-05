/**
 * workspace/BillingSubscription.jsx
 * ---------------------------------
 * "MY ORGANIZATION → Billing Subscription" — organization subscription
 * overview for Billing Admin: current plan, subscription status, renewal,
 * usage meters (from real Billing counts) and billing history (invoices +
 * payments). Sourced entirely from existing Billing endpoints — the platform
 * OrgSubscription data lives in the super-admin module and stays out of scope.
 * No Billing page is modified or duplicated.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CreditCard,
  TrendingUp,
  UserCheck,
  CalendarClock,
  ExternalLink,
  Users,
  Package,
  FileText,
  WalletCards,
  ArrowRight,
  Gauge,
} from "lucide-react";
import { settingsApi, subscriptionApi, dashboardApi, productApi, invoiceApi, paymentApi } from "../../../service/billingService";
import { Spinner, ErrorState, EmptyState, SkeletonBlock } from "../../../components/billing-shared";
import { formatDisplayDate } from "../../../utils/billing-helpers";
import WorkspaceHeader from "./WorkspaceHeader";
import { formatOrgMoney, formatCurrencyChip, normalizeOrgName } from "./workspace-format";

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-slate-100 text-slate-600",
  trial: "bg-violet-100 text-violet-700",
  draft: "bg-slate-100 text-slate-600",
};

const CARD_COLORS = [
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
  "from-green-500 to-emerald-500",
  "from-blue-500 to-cyan-500",
];

function StatusPill({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] || "bg-slate-100 text-slate-600"}`}>
      {status || "unknown"}
    </span>
  );
}

function UsageMeter({ icon: Icon, label, value, color }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-r ${color} text-white`}>
            <Icon size={15} />
          </span>
          {label}
        </span>
        <span className="text-sm font-bold text-slate-800">{value ?? "—"} <span className="font-medium text-slate-400">/ unlimited</span></span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200/70" role="progressbar" aria-valuenow={0} aria-valuemin={0} aria-valuemax={100} aria-label={`${label} usage`}>
        <div className="h-full w-full rounded-full bg-gradient-to-r from-[#FF7A00]/40 to-[#FF7A00]/70" />
      </div>
      <p className="mt-2 text-[11px] text-slate-400">Current usage in the {label.toLowerCase()} module</p>
    </div>
  );
}

export default function BillingSubscription() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [reporting, setReporting] = useState(null);
  const [planMap, setPlanMap] = useState({});
  const [kpis, setKpis] = useState(null);
  const [productCount, setProductCount] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, subs, rep, plans, kpi, products, invoices, payments] = await Promise.all([
        settingsApi.getConfig().catch(() => null),
        subscriptionApi.listActive().catch(() => []),
        subscriptionApi.getReporting().catch(() => null),
        subscriptionApi.listPlans({ per_page: 200 }).catch(() => null),
        dashboardApi.getKPIs().catch(() => null),
        productApi.list({ page: 1, per_page: 1 }).catch(() => null),
        invoiceApi.list({ page: 1, per_page: 5 }).catch(() => null),
        paymentApi.list({ page: 1, per_page: 5 }).catch(() => null),
      ]);
      setConfig(cfg || {});
      setSubscriptions(Array.isArray(subs) ? subs : []);
      setReporting(rep || null);
      const planList = Array.isArray(plans) ? plans : plans?.items || [];
      setPlanMap(Object.fromEntries(planList.map((p) => [p.id, p.plan_name])));
      setKpis(kpi || null);
      setProductCount(products?.total != null ? products.total : (Array.isArray(products) ? products.length : null));
      setRecentInvoices(invoices?.items ? invoices.items : Array.isArray(invoices) ? invoices : []);
      setRecentPayments(payments?.items ? payments.items : Array.isArray(payments) ? payments : []);
    } catch (err) {
      setError(err?.message || "Unable to load subscription overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const currency = formatCurrencyChip(config);
  const companyName = normalizeOrgName(config?.company_name) || "your organization";
  const mrr = reporting?.mrr != null ? Number(reporting.mrr) : null;
  const arr = reporting?.arr != null ? Number(reporting.arr) : null;

  const primarySubscription = useMemo(() => {
    if (!subscriptions.length) return null;
    return [...subscriptions].sort((a, b) => {
      const aAmt = Number(a.unit_price || 0) * Number(a.quantity || 1);
      const bAmt = Number(b.unit_price || 0) * Number(b.quantity || 1);
      return bAmt - aAmt;
    })[0];
  }, [subscriptions]);

  const upcomingRenewals = useMemo(
    () =>
      subscriptions
        .filter((s) => s.next_billing_at)
        .sort((a, b) => new Date(a.next_billing_at) - new Date(b.next_billing_at)),
    [subscriptions]
  );

  const currentPlan = primarySubscription ? planMap[primarySubscription.plan_id] || "Billing Plan" : "No Active Subscription";
  const planStatus = primarySubscription?.status || null;
  const planSince = primarySubscription?.start_date || primarySubscription?.current_term_start || null;
  const nextRenewal = primarySubscription?.next_billing_at || upcomingRenewals[0]?.next_billing_at || null;

  const breakdown = useMemo(() => {
    if (!reporting?.currency_breakdown || !Array.isArray(reporting.currency_breakdown)) return [];
    return reporting.currency_breakdown.map((b) => ({ currency: b.currency, amount: Number(b.amount || 0) }));
  }, [reporting]);

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading billing subscription">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-40" />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Billing Subscription" message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title="Billing Subscription"
        organization={companyName}
        health={null}
        plan={currentPlan}
        outstanding={null}
        fiscalYear={null}
        currency={currency}
        icon={CreditCard}
        actions={
          <button
            type="button"
            onClick={() => navigate("/billing/subscriptions")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#FF5500] text-white text-xs font-semibold transition-colors"
          >
            <ExternalLink size={14} /> Manage in Billing
          </button>
        }
      />

      {/* Current plan panel */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="grid gap-0 lg:grid-cols-3">
          <div className="p-6 lg:col-span-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
                <CreditCard size={22} />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Plan</p>
                <h2 className="text-2xl font-extrabold text-slate-900">{currentPlan}</h2>
              </div>
              {planStatus && <StatusPill status={planStatus} />}
            </div>
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Next Renewal</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-slate-800">
                  <CalendarClock size={14} className="text-[#FF7A00]" />
                  {nextRenewal ? formatDisplayDate(nextRenewal) : "—"}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Subscriptions</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{subscriptions.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Member Since</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{planSince ? formatDisplayDate(planSince) : "—"}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => navigate("/billing/subscriptions/create")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#FF5500]"
              >
                Upgrade / Add Subscription <ArrowRight size={14} />
              </button>
              <button
                type="button"
                onClick={() => navigate("/billing/pricing")}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                View Pricing Plans <ExternalLink size={14} />
              </button>
            </div>
          </div>
          <div className="border-t border-slate-100 p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2.5 mb-5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
                <TrendingUp size={18} />
              </span>
              <h3 className="text-base font-bold text-slate-800">Recurring Revenue</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Monthly Recurring Revenue</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {mrr != null ? formatOrgMoney(mrr, config) : "—"}
                </p>
              </div>
              <div className="border-t border-slate-100 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Annual Recurring Revenue</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">
                  {arr != null ? formatOrgMoney(arr, config) : "—"}
                </p>
              </div>
              <p className="text-[11px] text-slate-400">Recurring revenue shown in your configured currency · {reporting?.active_subscriptions ?? 0} active, {reporting?.excluded_subscriptions ?? 0} excluded from MRR</p>
            </div>
          </div>
        </div>
      </div>

      {breakdown.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <h2 className="text-lg font-bold text-slate-800 mb-4">MRR by Currency</h2>
          <div className="flex flex-wrap gap-3">
            {breakdown.map((b) => (
              <span key={b.currency} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-2.5 text-sm">
                <span className="font-bold text-slate-700">{b.currency}</span>
                <span className="font-semibold text-[#FF7A00]">{formatDisplayCurrency(b.amount, b.currency)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Usage */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2.5 mb-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
            <Gauge size={18} />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Usage</h2>
            <p className="text-xs text-slate-400">Live usage from your Billing product data</p>
          </div>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          <UsageMeter icon={Users} label="Customers" value={kpis?.active_customers ?? 0} color={CARD_COLORS[0]} />
          <UsageMeter icon={Package} label="Products" value={productCount} color={CARD_COLORS[1]} />
          <UsageMeter icon={CreditCard} label="Subscriptions" value={subscriptions.length} color={CARD_COLORS[2]} />
          <UsageMeter icon={FileText} label="Invoices" value={kpis?.total_invoices ?? 0} color={CARD_COLORS[3]} />
        </div>
        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-3 text-xs text-slate-500">
          Storage, API and platform-level usage limits are defined by your organization's platform plan (managed outside
          Billing). The meters above reflect live operational usage within the Zoiko Billing product.
        </div>
      </div>

      {/* Billing history */}
      <div className="grid gap-6 lg:grid-cols-2 items-stretch">
        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Invoices</h2>
            <button type="button" onClick={() => navigate("/billing/invoices")} className="text-xs font-semibold text-[#FF7A00] hover:text-[#FF5500]">
              View all
            </button>
          </div>
          {recentInvoices.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState icon={FileText} title="No invoices yet" message="Invoices created in Billing will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3 font-semibold">Invoice</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <button type="button" onClick={() => navigate(`/billing/invoices/${inv.id}`)} className="text-sm font-semibold text-[#FF7A00] hover:text-[#FF5500]">
                          {inv.invoice_number || `#${inv.id}`}
                        </button>
                      </td>
                      <td className="px-6 py-3.5"><StatusPill status={inv.status} /></td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-700">
                        {formatOrgMoney(inv.total_amount, config)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{formatDisplayDate(inv.issue_date || inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Payments</h2>
            <button type="button" onClick={() => navigate("/billing/payments")} className="text-xs font-semibold text-[#FF7A00] hover:text-[#FF5500]">
              View all
            </button>
          </div>
          {recentPayments.length === 0 ? (
            <div className="px-6 pb-6">
              <EmptyState icon={WalletCards} title="No payments yet" message="Payments recorded in Billing will appear here." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-y border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wider text-slate-400">
                    <th className="px-6 py-3 font-semibold">Payment</th>
                    <th className="px-6 py-3 font-semibold">Status</th>
                    <th className="px-6 py-3 font-semibold text-right">Amount</th>
                    <th className="px-6 py-3 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((pay) => (
                    <tr key={pay.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <button type="button" onClick={() => navigate(`/billing/payments/${pay.id}`)} className="text-sm font-semibold text-[#FF7A00] hover:text-[#FF5500]">
                          {pay.payment_number || pay.reference || `#${pay.id}`}
                        </button>
                      </td>
                      <td className="px-6 py-3.5"><StatusPill status={pay.status} /></td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-700">
                        {formatOrgMoney(pay.amount, config)}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{formatDisplayDate(pay.payment_date || pay.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Active subscriptions table */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-slate-800">Active Subscriptions</h2>
          <span className="text-xs text-slate-400">{subscriptions.length} total</span>
        </div>
        {subscriptions.length === 0 ? (
          <div className="px-6 pb-6">
            <EmptyState
              icon={CreditCard}
              title="No active subscriptions"
              message="Subscriptions you create in the Billing product will appear here."
              actionLabel="Open Billing"
              onAction={() => navigate("/billing/subscriptions")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-y border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wider text-slate-400">
                  <th className="px-6 py-3 font-semibold">Subscription</th>
                  <th className="px-6 py-3 font-semibold">Plan</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Amount</th>
                  <th className="px-6 py-3 font-semibold">Renews</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => {
                  return (
                    <tr key={sub.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/billing/subscriptions/${sub.id}`)}
                          className="text-sm font-semibold text-[#FF7A00] hover:text-[#FF5500]"
                        >
                          {sub.subscription_number}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{planMap[sub.plan_id] || `Plan #${sub.plan_id}`}</td>
                      <td className="px-6 py-4"><StatusPill status={sub.status} /></td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-700">
                        {formatOrgMoney(Number(sub.unit_price || 0) * Number(sub.quantity || 1), config)}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{formatDisplayDate(sub.next_billing_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
