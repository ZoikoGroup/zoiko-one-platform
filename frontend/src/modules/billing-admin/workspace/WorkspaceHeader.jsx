/**
 * workspace/WorkspaceHeader.jsx
 * ------------------------------
 * Premium shared header for the Billing Admin "MY ORGANIZATION" workspace.
 * Renders a welcome strip ("Welcome back, <name> — Billing Administrator ·
 * Managing <org>") plus a row of executive stat chips (Billing Health,
 * Current Plan, Outstanding, Financial Year, Currency). Data is supplied by
 * each page via props so no API call is duplicated; the authenticated user's
 * identity comes from the shared AuthContext.
 */

import { useAuth } from "../../../context/AuthContext";

const HEALTH_STYLES = {
  good: { dot: "bg-emerald-500", text: "text-emerald-700", ring: "border-emerald-200 bg-emerald-50" },
  attention: { dot: "bg-amber-500", text: "text-amber-700", ring: "border-amber-200 bg-amber-50" },
  risk: { dot: "bg-red-500", text: "text-red-700", ring: "border-red-200 bg-red-50" },
};

function Chip({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex min-w-0 flex-col px-4 py-2.5">
      <p className="truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-bold text-slate-800" title={value}>{value}</p>
    </div>
  );
}

export default function WorkspaceHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  organization,
  health,
  plan,
  outstanding,
  fiscalYear,
  currency,
}) {
  const { user } = useAuth();
  const displayName =
    user?.full_name || user?.first_name || user?.display_name || user?.username || "Billing Administrator";
  const initials = [user?.first_name, user?.last_name]
    .filter(Boolean)
    .map((n) => n[0]?.toUpperCase())
    .join("") || "BA";
  const managing = organization || "your organization";
  const healthStyle = HEALTH_STYLES[health?.tone] || HEALTH_STYLES.good;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
      <div className="bg-gradient-to-r from-[#FF7A00]/[0.06] via-transparent to-transparent p-6 md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-lg font-extrabold text-white shadow-sm">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7A00]">Billing Administrator</p>
              <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                Welcome back, {displayName}
              </h1>
              <p className="mt-0.5 truncate text-sm text-slate-500 dark:text-slate-400">
                Managing <span className="font-semibold text-slate-700 dark:text-slate-300">{managing}</span>
                {subtitle ? ` · ${subtitle}` : ""}
              </p>
            </div>
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>

        <div className="mt-6 grid grid-cols-2 divide-x divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/50 sm:grid-cols-3 xl:grid-cols-5">
          {health && (
            <div className="flex flex-col justify-center px-4 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Health</p>
              <span className={`mt-0.5 inline-flex w-max items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-bold ${healthStyle.ring} ${healthStyle.text}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${healthStyle.dot}`} />
                {health?.label || "Healthy"}
              </span>
            </div>
          )}
          <Chip label="Current Plan" value={plan} />
          <Chip label="Outstanding" value={outstanding} />
          <Chip label="Financial Year" value={fiscalYear} />
          <Chip label="Currency" value={currency} />
        </div>

        {Icon && (
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
            <Icon size={14} />
            <span>{title}</span>
          </div>
        )}
      </div>
    </div>
  );
}
