/**
 * workspace/OrganizationDashboard.jsx
 * ------------------------------------
 * "MY ORGANIZATION → Overview" — the Executive Workspace landing page for
 * Billing Admin. This is NOT a Billing dashboard: it is an organization
 * workspace that gives the Billing Administrator executive context (org
 * identity, plan, billing health, counts) and quick access into the
 * Billing product. No revenue/MRR/ARR/collections figures belong here — those
 * are exclusively the Billing Dashboard's job. Sourced entirely from existing
 * Billing APIs — no Billing page is modified or duplicated, and no backend
 * change exists.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  CreditCard,
  Users,
  History,
  WalletCards,
  FileText,
  Receipt,
  TrendingUp,
  AlertTriangle,
  Activity,
  Settings,
  Package,
  Bell,
  Megaphone,
  UserPlus,
  FileSignature,
  CalendarClock,
  ArrowRight,
  UserCheck,
} from "lucide-react";
import { settingsApi, dashboardApi, subscriptionApi, invoiceApi, productApi } from "../../../service/billingService";
import { DashboardStatCard, DashboardStatCardSkeleton, SkeletonBlock, EmptyState, ErrorState } from "../../../components/billing-shared";
import { formatDisplayDate } from "../../../utils/billing-helpers";
import { useBillingAdminSession } from "../hooks/useBillingAdminSession";
import WorkspaceHeader from "./WorkspaceHeader";
import { formatOrgMoney, formatCurrencyChip, normalizeOrgName, formatFiscalYearLabel } from "./workspace-format";

const CARD_COLORS = [
  "from-violet-500 to-purple-500",
  "from-amber-500 to-orange-500",
  "from-red-500 to-rose-500",
  "from-green-500 to-emerald-500",
  "from-blue-500 to-cyan-500",
  "from-indigo-500 to-blue-500",
];

const STATUS_COLORS = {
  active: "bg-emerald-100 text-emerald-700",
  paused: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  completed: "bg-slate-100 text-slate-600",
  trial: "bg-violet-100 text-violet-700",
  draft: "bg-slate-100 text-slate-600",
};

function QuickAction({ icon: Icon, label, hint, href, navigate }) {
  return (
    <button
      type="button"
      onClick={() => navigate(href)}
      className="group flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-left transition-all hover:border-[#FF7A00]/40 hover:shadow-lg hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF7A00]/50"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white border border-slate-200 text-[#FF7A00] shadow-sm transition-colors group-hover:bg-[#FF7A00] group-hover:text-white group-hover:border-[#FF7A00]">
        <Icon size={18} />
      </span>
      <div className="w-full">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
      </div>
    </button>
  );
}

function IdentityChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700" title={value}>{value}</p>
    </div>
  );
}

export default function OrganizationDashboard() {
  const navigate = useNavigate();
  const { isBillingAdmin } = useBillingAdminSession();

  const [config, setConfig] = useState(null);
  const [kpis, setKpis] = useState(null);
  const [subscriptions, setSubscriptions] = useState([]);
  const [planMap, setPlanMap] = useState({});
  const [productCount, setProductCount] = useState(null);
  const [draftInvoices, setDraftInvoices] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, kpi, subs, plans, products, drafts, recent] = await Promise.all([
        settingsApi.getConfig().catch(() => null),
        dashboardApi.getKPIs().catch(() => null),
        subscriptionApi.listActive().catch(() => []),
        subscriptionApi.listPlans({ per_page: 200 }).catch(() => null),
        productApi.list({ page: 1, per_page: 1 }).catch(() => null),
        invoiceApi.list({ page: 1, per_page: 1, status: "draft" }).catch(() => null),
        invoiceApi.getRecentActivity(6).catch(() => []),
      ]);
      setConfig(cfg || {});
      setKpis(kpi || {});
      setSubscriptions(Array.isArray(subs) ? subs : []);
      const planList = Array.isArray(plans) ? plans : plans?.items || [];
      setPlanMap(Object.fromEntries(planList.map((p) => [p.id, p.plan_name])));
      setProductCount(products?.total != null ? products.total : (Array.isArray(products) ? products.length : null));
      setDraftInvoices(drafts?.total != null ? drafts.total : null);
      setRecentActivity(Array.isArray(recent) ? recent : []);
    } catch (err) {
      setError(err?.message || "Unable to load organization overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const companyName = normalizeOrgName(config?.company_name) || "Your Organization";
  const fiscalYear = formatFiscalYearLabel(config?.fiscal_year_start, config?.fiscal_year_end);
  const taxId = config?.gst_number || config?.vat_number || config?.pan_number || config?.tin_number || config?.tax_number || null;
  const address = [config?.address_line1, config?.address_line2, config?.city, config?.state, config?.postal_code, config?.country]
    .filter(Boolean)
    .join(", ");

  const primarySubscription = useMemo(() => {
    if (!subscriptions.length) return null;
    return [...subscriptions].sort((a, b) => {
      const aAmt = Number(a.unit_price || 0) * Number(a.quantity || 1);
      const bAmt = Number(b.unit_price || 0) * Number(b.quantity || 1);
      return bAmt - aAmt;
    })[0];
  }, [subscriptions]);

  const currentPlan = primarySubscription ? planMap[primarySubscription.plan_id] || "Billing Plan" : "No Active Subscription";
  const planStatus = primarySubscription?.status || null;
  const nextRenewal = primarySubscription?.next_billing_at || null;

  const health = useMemo(() => {
    const overdue = Number(kpis?.overdue_amount || 0);
    const outstanding = Number(kpis?.outstanding_amount || 0);
    if (overdue > 0) return { label: "At Risk", tone: "risk" };
    if (outstanding > 0) return { label: "Attention Required", tone: "attention" };
    return { label: "Healthy", tone: "good" };
  }, [kpis]);

  const quickActions = useMemo(
    () => [
      { label: "Create Customer", hint: "Add a new customer", href: "/billing/customers", icon: UserPlus },
      { label: "Create Product", hint: "Add a product or service", href: "/billing/products", icon: Package },
      { label: "Create Quote", hint: "Send a quotation", href: "/billing/quotations/create", icon: FileSignature },
      { label: "Create Contract", hint: "Draft a contract", href: "/billing/contracts/create", icon: FileText },
      { label: "Create Subscription", hint: "Start a recurring plan", href: "/billing/subscriptions/create", icon: CreditCard },
      { label: "Create Invoice", hint: "Bill a customer", href: "/billing/invoices/create", icon: Receipt },
      { label: "Record Payment", hint: "Log an incoming payment", href: "/billing/payments", icon: WalletCards },
    ],
    []
  );

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading organization overview">
        <SkeletonBlock className="h-44" />
        <SkeletonBlock className="h-28" />
        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <DashboardStatCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error && !config) {
    return <ErrorState title="Organization Overview" message={error} onRetry={load} />;
  }

  return (
    <div className="space-y-6">
      {isBillingAdmin && (
        <div className="flex items-center gap-3 rounded-3xl border border-amber-200/70 bg-amber-50 px-5 py-3.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white">
            <UserCheck size={18} />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-800">Organization Workspace</p>
            <p className="text-xs text-slate-500">
              You are managing <span className="font-semibold text-slate-700">{companyName}</span>. The full Zoiko Billing product
              remains available underneath this workspace.
            </p>
          </div>
        </div>
      )}

      <WorkspaceHeader
        title="Organization Overview"
        organization={companyName}
        health={health}
        plan={currentPlan}
        outstanding={null}
        fiscalYear={fiscalYear}
        currency={formatCurrencyChip(config)}
        icon={Activity}
        actions={
          <button
            type="button"
            onClick={() => navigate("/billing/settings")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
          >
            <Settings size={14} /> Billing Settings
          </button>
        }
      />

      {/* Organization identity hero */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {config?.logo_url ? (
              <img src={config.logo_url} alt="Organization logo" className="h-14 w-14 rounded-2xl border border-slate-200 object-contain" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
                <Building2 size={26} />
              </span>
            )}
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">{companyName}</h2>
              <p className="text-sm text-slate-500">
                Legal Business Name · {config?.company_name || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/billing/workspace/organization")}
            className="inline-flex w-max items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
          >
            View Profile <ArrowRight size={14} />
          </button>
        </div>
        <div className="mt-6 grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-7">
          <IdentityChip label="Business Email" value={config?.billing_email} />
          <IdentityChip label="Business Phone" value={config?.billing_phone} />
          <IdentityChip label="GST / VAT / PAN" value={taxId} />
          <IdentityChip label="Default Currency" value={formatCurrencyChip(config)} />
          <IdentityChip label="Timezone" value={config?.timezone} />
          <IdentityChip label="Financial Year" value={fiscalYear || null} />
          <IdentityChip label="Address" value={address} />
        </div>
      </div>

      {/* Current plan + billing health */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
              <CreditCard size={18} />
            </span>
            <h2 className="text-lg font-bold text-slate-800">Current Billing Plan</h2>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">{currentPlan}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {planStatus && (
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[planStatus] || "bg-slate-100 text-slate-600"}`}>
                {planStatus}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
              <CalendarClock size={13} />
              Renews {nextRenewal ? formatDisplayDate(nextRenewal) : "—"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/billing/workspace/subscription")}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF7A00] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#FF5500]"
          >
            Manage Subscription <ArrowRight size={14} />
          </button>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
              <TrendingUp size={18} />
            </span>
            <h2 className="text-lg font-bold text-slate-800">Billing Health</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-bold ${
              health.tone === "good"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : health.tone === "attention"
                ? "border-amber-200 bg-amber-50 text-amber-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}>
              <span className={`h-2 w-2 rounded-full ${health.tone === "good" ? "bg-emerald-500" : health.tone === "attention" ? "bg-amber-500" : "bg-red-500"}`} />
              {health.label}
            </span>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-500">
            {health.tone === "good"
              ? "No outstanding or overdue invoices. Your billing operations are running smoothly."
              : health.tone === "attention"
              ? "There are outstanding invoices awaiting payment. Review collections to keep cash flow healthy."
              : "Overdue invoices exist. Bring collections up to date to avoid further risk."}
          </p>
        </div>
      </div>

      {/* Counts */}
      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Customers"
          value={kpis?.active_customers ?? 0}
          icon={Users}
          color={CARD_COLORS[0]}
          subtitle="Active customers"
          href="/billing/customers"
        />
        <DashboardStatCard
          title="Products"
          value={productCount ?? "—"}
          icon={Package}
          color={CARD_COLORS[1]}
          subtitle="In your catalog"
          href="/billing/products"
        />
        <DashboardStatCard
          title="Subscriptions"
          value={subscriptions.length}
          icon={CreditCard}
          color={CARD_COLORS[2]}
          subtitle={`${kpis?.active_subscriptions ?? 0} active in Billing`}
          href="/billing/subscriptions"
        />
        <DashboardStatCard
          title="Draft Invoices"
          value={draftInvoices ?? "—"}
          icon={FileText}
          color={CARD_COLORS[3]}
          subtitle="Awaiting finalization"
          href="/billing/invoices"
        />
      </div>

      {/* Quick actions */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">Quick Actions</h2>
          <span className="text-xs text-slate-400">Reuses the existing Billing pages</span>
        </div>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7">
          {quickActions.map((action) => (
            <QuickAction key={action.href} {...action} navigate={navigate} />
          ))}
        </div>
      </div>

      {/* Recent activity + placeholders */}
      <div className="grid gap-6 xl:grid-cols-3 items-stretch">
        <div className="xl:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Activity</h2>
            <button
              type="button"
              onClick={() => navigate("/billing/workspace/activity")}
              className="text-xs font-semibold text-[#FF7A00] hover:text-[#FF5500]"
            >
              View all
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <EmptyState icon={History} title="No recent activity" message="Billing activity will appear here as it happens." />
          ) : (
            <div className="space-y-3">
              {recentActivity.map((item, idx) => (
                <div key={item?.id ?? idx} className="flex items-start gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                    <FileText size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {item?.description || item?.event_type || item?.action || `Invoice #${item?.invoice_number || item?.invoice_id || ""}`}
                    </p>
                    <p className="text-xs text-slate-400">{formatDisplayDate(item?.created_at || item?.timestamp || item?.date)}</p>
                  </div>
                  {item?.total_amount != null && (
                    <span className="text-sm font-semibold text-slate-700">
                      {formatOrgMoney(item.total_amount, config)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="xl:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Megaphone size={18} />
            </span>
            <h2 className="text-lg font-bold text-slate-800">Announcements</h2>
          </div>
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            message="Platform announcements for your organization will appear here."
          />
        </div>

        <div className="xl:col-span-1 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Bell size={18} />
            </span>
            <h2 className="text-lg font-bold text-slate-800">Notifications</h2>
          </div>
          <EmptyState
            icon={Bell}
            title="No notifications"
            message="Alerts about renewals, overdue invoices and billing events will appear here."
          />
        </div>
      </div>
    </div>
  );
}
