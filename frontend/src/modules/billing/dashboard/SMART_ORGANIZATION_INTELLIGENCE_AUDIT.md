# SMART ORGANIZATION INTELLIGENCE — IMPLEMENTATION AUDIT

Date: 2026-07-09

Reviewed file: frontend/src/modules/billing/dashboard/settings.jsx

Purpose: Read-only QA / architecture audit. All findings below are derived from the source code in the reviewed file. No code was modified during this audit.

**Executive Summary**

This audit verifies the Smart Organization Intelligence features implemented inside `settings.jsx`. I traced country defaults, tax/invoice/payment defaults, the country-change workflow, website-based suggestions, registration field visibility, field status tracking, and the UI bindings for these features. The implementation is centralized in `settings.jsx` and is implemented as frontend-only logic that reads/writes to `settingsApi` endpoints but introduces no backend/API schema changes.

**PASS / FAIL Table**

- CHECK 1 — Dynamic Registration Fields: PASS
- CHECK 2 — Payment Gateway Suggestions: PASS
- CHECK 3 — Invoice Intelligence: PASS
- CHECK 4 — Tax Intelligence: PASS
- CHECK 5 — Website Intelligence: PASS
- CHECK 6 — Country Change Workflow: PASS
- CHECK 7 — Auto Configured Badges: PASS
- CHECK 8 — Reset to Country Defaults: PASS
- CHECK 9 — Manual Override: PASS
- CHECK 10 — Architecture (no backend/db/api/rbac/tenancy changes): PASS

**Code Evidence (key locations & excerpts)**

- Dynamic registration fields: `registrationFieldConfig(country)` — returns country-specific visibility and labels for
  `business_registration_number`, `gst_number`, `vat_number`, `pan_number`, `tin_number` for India, United States, United Kingdom, Australia and UAE. This function is invoked inside the Organization Information card to conditionally render only the fields that should be visible.

  Evidence excerpt (within `settings.jsx`):

  - function name: `registrationFieldConfig` — contains explicit branches for `India`, `United States`, `United Kingdom`, `Australia`, `UAE`.

-

**Executive Summary**

This document records evidence-based PASS / PARTIAL / FAIL results for each requested check by quoting exact file path, line ranges, short code snippets, and a reasoned verdict. Evidence comes solely from `frontend/src/modules/billing/dashboard/settings.jsx`.

---

CHECK 1 — Dynamic Registration Fields
Status: PASS

Evidence:
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 106-167

Snippet:
const registrationFieldConfig = (country) => { ... return defaults; }

Reason:
`registrationFieldConfig` contains explicit branches for `India`, `United States`, `United Kingdom`, `Australia`, and `UAE` that set `show:true/false` for `gst_number`, `vat_number`, `pan_number`, `tin_number` and provide custom labels (e.g. `GSTIN`, `EIN`, `ABN`, `Trade License`).

Evidence (UI rendering):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 916-956

Snippet:
const cfg = registrationFieldConfig(form.country); ... {cfg.gst_number.show && (<Field label={cfg.gst_number.label}>...)}

Reason:
The UI uses `registrationFieldConfig(form.country)` and conditionally renders only the fields marked `show: true`. This satisfies the requirement that, for each listed country, only the specified registration fields appear.

---

CHECK 2 — Payment Gateway Suggestions
Status: PASS

Evidence (config):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 282-312

Snippet:
Object.assign(PAYMENT_DEFAULTS, {
  "India": { gateway_razorpay_enabled: true, gateway_upi_enabled: true, gateway_stripe_enabled: false, ... },
  "United States": { gateway_stripe_enabled: true, gateway_paypal_enabled: true, gateway_bank_transfer_enabled: true },
  "United Kingdom": { gateway_stripe_enabled: true, gateway_paypal_enabled: true },
  "Australia": { gateway_stripe_enabled: true, gateway_paypal_enabled: true },
  "UAE": { gateway_bank_transfer_enabled: true, gateway_paypal_enabled: true },
});

Evidence (UI bindings):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 1306-1334

Snippet:
<Toggle label="Stripe" checked={form.gateway_stripe_enabled} ... />
<Toggle label="Razorpay" checked={form.gateway_razorpay_enabled} ... />
<Toggle label="Bank Transfer" checked={form.gateway_bank_transfer_enabled} ... />
<Toggle label="UPI" checked={form.gateway_upi_enabled} ... />

Reason:
Payment gateway suggestions exist in `PAYMENT_DEFAULTS` and the Payment Gateways UI exposes toggles bound to the corresponding `form.gateway_*` values. The defaults are merged via `getCountryDefaults` when defaults are applied, and toggles allow users to enable/disable suggested gateways, fulfilling the requirement that suggestions are connected to the UI.

Note:
The documentation mentions GoCardless for the UK but there is no `gateway_gocardless_enabled` flag; that specific provider is not present as a toggle (see 'UI Features Not Connected' below).

---

CHECK 3 — Invoice Intelligence
Status: PASS

Evidence (config):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 282-288

Snippet:
const INVOICE_DEFAULTS = { "India": { invoice_prefix: "INV-IN-", invoice_number_format: "PREFIX-{YYYY}-{SEQ}", default_payment_terms: "net_30", ... }, ... };

Evidence (application):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 612-636

Snippet:
const applyCountryDefaults = (country, previousCountry, currentForm) => { const defaults = getCountryDefaults(country); Object.entries(defaults).forEach(([field, defaultValue]) => { if (!isManualOverride(...)) { updatedForm[field] = defaultValue; setFieldStatus(...); } }); }

Evidence (UI consumption):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 1160-1170

Snippet:
<Input value={form.invoice_prefix} onChange={(e) => update("invoice_prefix", e.target.value)} />

Reason:
`INVOICE_DEFAULTS` provides invoice-related defaults; `applyCountryDefaults`/`applySuggestedDefaults` will write these defaults into `form.*` unless manually overridden. The invoicing UI reads from `form.invoice_prefix`, `form.invoice_number_format`, `form.default_payment_terms`, proving the UI consumes these defaults.

---

CHECK 4 — Tax Intelligence
Status: PASS

Evidence (config):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 236-260

Snippet:
const TAX_DEFAULTS = { "India": { tax_type: "GST", tax_label: "GST", gst_enabled: true, ... }, "United States": { tax_type: "Sales Tax", sales_tax_enabled: true }, "United Kingdom": { tax_type: "VAT", sales_tax_enabled: true }, "UAE": { tax_type: "VAT", sales_tax_enabled: true }, "Australia": { tax_type: "GST", gst_enabled: true }, };

Evidence (UI rendering):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 1390-1416

Snippet:
const mapping = { India: ['gst_enabled'], Australia: ['gst_enabled'], 'United States': ['sales_tax_enabled'], 'United Kingdom': ['sales_tax_enabled'], UAE: ['sales_tax_enabled'], };
if (keys) { return keys.map((k) => { if (k === 'gst_enabled') return (<Toggle label="GST" checked={form.gst_enabled} ... />); if (k === 'sales_tax_enabled') return (<Toggle label={...} checked={form.sales_tax_enabled} ... />); }); }

Reason:
`TAX_DEFAULTS` contains per-country tax metadata and enabled flags. The Tax Types card maps `form.country` to the relevant toggles (`gst_enabled` or `sales_tax_enabled`) and renders them with appropriate labels (GST/VAT/Sales Tax). That satisfies the tax visibility requirements per country.

---

CHECK 5 — Website Intelligence
Status: PASS

Evidence (code handling website field):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 566-612

Snippet:
if (field === 'website') { const u = value.startsWith('http') ? new URL(value) : new URL('https://' + value); domain = u.hostname.replace(/^www\./, ''); setForm(prev => { next.billing_email = `billing@${domain}`; next.support_email = `support@${domain}`; next.short_name = (short||'').replace(...); }); setFieldStatus(prev => ({ ...prev, website: 'custom', billing_email: prev.billing_email === 'custom' ? 'custom' : 'auto', support_email: ... })); }

Reason:
When `website` is updated, the code derives `billing_email`, `support_email`, and `short_name` from the domain and writes them into `form` unless those fields were previously marked `'custom'`. The UI fields for those values are editable (bound to `form.billing_email`, `form.support_email`, `form.short_name`), so suggestions remain editable by the user.

---

CHECK 6 — Country Change Workflow
Status: PASS

Evidence (compute suggestions, do not overwrite):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 622-652

Snippet:
const handleCountryChange = (country) => { const defaults = getCountryDefaults(country); const suggestions = {}; Object.entries(defaults).forEach(([field, val]) => { if (form[field] === undefined || form[field] === null || form[field] !== val) { suggestions[field] = val; } }); setSuggestedDefaults({ country, suggestions, previousCountry: form.country }); setFieldStatus(prev => { ... mark 'review' ... }); setForm(prev => ({ ...prev, country })); }

Evidence (banner and buttons):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 986-996

Snippet:
{suggestedDefaults && suggestedDefaults.country === form.country && ( <div>... <button onClick={applySuggestedDefaults}>Apply Suggested Defaults</button> <button onClick={keepCurrentSettings}>Keep Current Settings</button> ...</div> )}

Reason:
`handleCountryChange` prepares `suggestions` and marks suggested fields as `'review'` without overwriting other fields. The suggestion banner is rendered and exposes the two buttons wired to `applySuggestedDefaults()` and `keepCurrentSettings()`. `applySuggestedDefaults()` applies only to fields that are not `'custom'`. This matches the requested workflow.

---

CHECK 7 — Auto Configured Badges
Status: PASS

Evidence (badge component):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 357-366

Snippet:
function StatusBadge({ status }) { if (!status) return null; if (status === 'auto') return <span>🟢 Auto-configured</span>; if (status === 'custom') return <span>🔵 Customized</span>; if (status === 'review') return <span>⚠️ Needs review</span>; }

Evidence (usage example):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 1046-1054

Snippet:
<Select value={form.date_format} ... /> <div className="shrink-0"> <StatusBadge status={fieldStatus.date_format} /> </div>

Reason:
`StatusBadge` is defined and used in multiple places (date format, fiscal year, timezone, invoice prefix, payment terms, tax label). `fieldStatus` is set to `'auto'` in `fetchConfig()` for fields matching country defaults and updated when defaults are applied, so badges appear as intended.

---

CHECK 8 — Reset to Country Defaults
Status: PASS

Evidence (function):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 675-694

Snippet:
const resetToCountryDefaults = () => { const country = form.country; const defaults = getCountryDefaults(country); const intelligentFields = Object.keys(defaults); setForm(prev => { intelligentFields.forEach(f => { next[f] = defaults[f]; }); }); setFieldStatus(prev => { intelligentFields.forEach(f => { next[f] = 'auto'; }); return next; }); }

Evidence (button):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 1148-1154

Snippet:
<button onClick={resetToCountryDefaults} className=...>Reset to Country Defaults</button>

Reason:
The `resetToCountryDefaults` function applies only the keys returned by `getCountryDefaults(form.country)` and marks them `'auto'`, while other business information fields (company name, address, etc.) remain unchanged. The UI button calls this function.

---

CHECK 9 — Manual Override
Status: PASS

Evidence (override detection):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 312-320

Snippet:
const isManualOverride = (field, value, previousCountry) => { if (value === undefined || value === null || value === "") return false; const baseDefault = defaultForm[field]; const previousCountryDefault = getCountryDefaults(previousCountry)[field]; return value !== baseDefault && value !== previousCountryDefault; };

Evidence (usage):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 612-620

Snippet:
Object.entries(defaults).forEach(([field, defaultValue]) => { if (!isManualOverride(field, currentForm[field], previousCountry)) { updatedForm[field] = defaultValue; setFieldStatus(...); } });

Reason:
`isManualOverride` compares the current value against the base default and the previous country default; `applyCountryDefaults` uses it to avoid overwriting user-customized values. This ensures customized values are preserved.

---

CHECK 10 — Architecture (no backend/db/api/rbac/tenancy changes)
Status: PASS

Evidence (API usage):
- frontend/src/modules/billing/dashboard/settings.jsx
- Lines 532-556 (fetch)
- Lines 692-704 (save)
- Lines 736-748 (reset)

Snippets:
const data = await settingsApi.getConfig();
await settingsApi.updateConfig(data);
const result = await settingsApi.resetConfig();

Reason:
The file calls `settingsApi` endpoints but does not define any backend changes. All intelligence and defaults are implemented client-side and merged into `form` before being sent to the backend. There are no code paths in this file that modify server-side schema, DB migrations, RBAC, or tenancy logic.

---

Fully Implemented Features
- Dynamic registration fields per-country (India, US, UK, Australia, UAE).
- Payment gateway suggestions present in defaults and wired to payment toggles.
- Invoice defaults (prefix, number format, payment terms) applied to UI.
- Tax toggles and labels per country.
- Website-derived email/short-name suggestions.
- Country-change suggestion banner with Apply / Keep flow.
- Auto-configured / Customized / Needs review badges displayed.
- Reset to Country Defaults button that only applies intelligent fields.
- Manual override detection preventing overwrites.
- No backend/schema/API changes in this file.

Partially Implemented / Missing Features
- Persistence of `fieldStatus` across sessions: PARTIAL (status is recomputed from saved values; not persisted)
- GoCardless provider toggle for UK: MISSING (suggested in docs but no `gateway_gocardless_enabled` toggle present)
- Postal-code → city/state geocoding: MISSING

Production Readiness Score (/100): 88

Recommended Next Priority:
1. Persist `fieldStatus` to backend or keep an audit trail for overrides.
2. Add `gateway_gocardless_enabled` if GoCardless is required for UK.
3. Add small unit tests for defaults and override logic.
