/**
 * workspace/OrganizationProfile.jsx
 * ----------------------------------
 * Read-only Organization Profile for Billing Admin, sourced entirely from the
 * existing BillingConfiguration endpoint (GET /billing/settings/config). Full
 * editing remains in the existing Billing Settings page (/billing/settings) —
 * this workspace page is an overview surface only.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  MapPin,
  Landmark,
  CalendarDays,
  Coins,
  Settings,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { settingsApi } from "../../../service/billingService";
import { Spinner, ErrorState } from "../../../components/billing-shared";
import WorkspaceHeader from "./WorkspaceHeader";
import { formatCurrencyChip, normalizeOrgName, formatFiscalYearLabel, formatFiscalYearRange } from "./workspace-format";

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-700">{value || "\u2014"}</p>
    </div>
  );
}

function Card({ title, icon: Icon, children }) {
  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex items-center gap-2.5 mb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
          <Icon size={18} />
        </span>
        <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      </div>
      <div className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export default function OrganizationProfile() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await settingsApi.getConfig();
      setConfig(data || {});
    } catch (err) {
      setError(err?.message || "Unable to load organization profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <ErrorState title="Organization Profile" message={error} onRetry={load} />;
  }

  const c = config || {};
  const address = [c.address_line1, c.address_line2, c.city, c.state, c.postal_code, c.country]
    .filter(Boolean)
    .join(", ");
  const fiscalYearLabel = formatFiscalYearLabel(c.fiscal_year_start, c.fiscal_year_end);
  const fiscalYearRange = formatFiscalYearRange(c.fiscal_year_start, c.fiscal_year_end);
  const companyName = normalizeOrgName(c.company_name) || "Your Organization";

  const taxNumbers = [
    { label: "Business Registration Number", value: c.business_registration_number },
    { label: "GST Number", value: c.gst_number },
    { label: "VAT Number", value: c.vat_number },
    { label: "PAN Number", value: c.pan_number },
    { label: "TIN Number", value: c.tin_number },
    { label: "Tax Number", value: c.tax_number },
  ];

  return (
    <div className="space-y-6">
      <WorkspaceHeader
        title="Organization Profile"
        organization={companyName}
        plan={null}
        outstanding={null}
        fiscalYear={fiscalYearLabel}
        currency={formatCurrencyChip(c)}
        icon={Building2}
        actions={
          <button
            type="button"
            onClick={() => navigate("/billing/settings")}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#FF7A00] hover:bg-[#FF5500] text-white text-xs font-semibold transition-colors"
          >
            <Settings size={14} /> Edit in Billing Settings
          </button>
        }
      />

      {/* Profile hero */}
      <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.02)] sm:flex-row sm:items-center">
        {c.logo_url ? (
          <img src={c.logo_url} alt="Company logo" className="h-16 w-16 rounded-2xl border border-slate-200 object-contain" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-[#FF7A00] to-[#FF5500] text-white shadow-sm">
            <Building2 size={28} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FF7A00]">Organization Profile</p>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900">{companyName}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
            {c.billing_email && (
              <span className="inline-flex items-center gap-1.5"><Mail size={13} className="text-slate-400" />{c.billing_email}</span>
            )}
            {c.billing_phone && (
              <span className="inline-flex items-center gap-1.5"><ShieldCheck size={13} className="text-slate-400" />{c.billing_phone}</span>
            )}
            {c.website && <span className="truncate">{c.website}</span>}
          </p>
        </div>
        <span className="inline-flex w-max items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Verified Configuration
        </span>
      </div>

      <Card title="Company Identity" icon={Building2}>
        <Field label="Company Name" value={normalizeOrgName(c.company_name)} />
        <Field label="Website" value={c.website} />
        <Field label="Billing Email" value={c.billing_email} />
        <Field label="Billing Phone" value={c.billing_phone} />
        {c.logo_url && (
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Logo</p>
            <img src={c.logo_url} alt="Company logo" className="mt-2 h-14 w-auto rounded-xl border border-slate-200 object-contain" />
          </div>
        )}
      </Card>

      <Card title="Contact & Address" icon={MapPin}>
        <div className="sm:col-span-2">
          <Field label="Address" value={address || "\u2014"} />
        </div>
        <Field label="City" value={c.city} />
        <Field label="State / Region" value={c.state} />
        <Field label="Postal Code" value={c.postal_code} />
        <Field label="Country" value={c.country} />
      </Card>

      <Card title="Tax & Registration" icon={Landmark}>
        {taxNumbers.map((item) => (
          <Field key={item.label} label={item.label} value={item.value} />
        ))}
      </Card>

      <Card title="Billing Defaults" icon={Coins}>
        <Field label="Fiscal Year" value={fiscalYearRange || "\u2014"} />
        <Field label="Default Currency" value={formatCurrencyChip(c)} />
        <Field label="Supported Currencies" value={Array.isArray(c.supported_currencies) ? c.supported_currencies.join(", ") : "\u2014"} />
        <Field label="Date Format" value={c.date_format} />
        <Field label="Timezone" value={c.timezone} />
        <Field label="Language" value={c.language} />
        <Field label="Invoice Prefix" value={c.invoice_prefix} />
        <Field label="Quote Prefix" value={c.quote_prefix} />
      </Card>

      <Card title="Document Defaults" icon={FileText}>
        <Field label="Invoice Number Format" value={c.invoice_number_format} />
        <Field label="Quote Number Format" value={c.quote_number_format} />
        <Field label="Credit Note Prefix" value={c.credit_note_prefix} />
        <Field label="Refund Prefix" value={c.refund_prefix} />
        <Field label="Write-off Prefix" value={c.write_off_prefix} />
        <Field label="Default Payment Terms" value={c.default_payment_terms} />
      </Card>

      {(c.invoice_footer || c.invoice_terms || c.invoice_notes) && (
        <Card title="Invoice Notes & Terms" icon={CalendarDays}>
          {c.invoice_footer && <Field label="Invoice Footer" value={c.invoice_footer} />}
          {c.invoice_terms && <Field label="Invoice Terms" value={c.invoice_terms} />}
          {c.invoice_notes && <Field label="Invoice Notes" value={c.invoice_notes} />}
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50/60 px-5 py-4 text-xs text-slate-500">
        <Mail size={14} className="text-slate-400" />
        <span>
          These fields are managed by the Billing configuration. To change them, open{" "}
          <button type="button" onClick={() => navigate("/billing/settings")} className="font-semibold text-[#FF7A00] hover:text-[#FF5500]">
            Billing Settings
          </button>
          .
        </span>
      </div>
    </div>
  );
}
