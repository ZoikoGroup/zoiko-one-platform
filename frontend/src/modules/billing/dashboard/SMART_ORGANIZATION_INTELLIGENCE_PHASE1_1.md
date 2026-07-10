SMART ORGANIZATION INTELLIGENCE — PHASE 1

Supported Countries
- India
- United States
- United Kingdom
- United Arab Emirates (UAE)
- Singapore

Why only these 5 countries (Phase 1)
- High priority markets with common billing models and clear tax rules.
- Allows focused validation of tax + invoicing defaults before broader rollout.
- Minimizes legal/regulatory surface while enabling core global functionality.

Tax intelligence per country (Phase 1)
- India
  - Tax Type: GST
  - Supported rules: CGST, SGST, IGST
  - Default GST rate: 18% (editable in UI)
  - Registration label: GSTIN
  - Invoice prefix: INV-IN-
  - Payment terms: Net 30
  - Fiscal year: April → March

- United States
  - Tax Type: Sales Tax (state-based)
  - Registration label: EIN
  - Invoice prefix: INV-US-
  - Payment terms: Net 30
  - Fiscal year: January → December

- United Kingdom
  - Tax Type: VAT
  - Registration label: VAT Number
  - Default VAT: 20% (editable)
  - Invoice prefix: INV-UK-
  - Payment terms: Net 30
  - Fiscal year: January → December (Phase 1 simplification)

- United Arab Emirates
  - Tax Type: VAT
  - Registration label: TRN
  - Default VAT: 5%
  - Invoice prefix: INV-AE-
  - Payment terms: Net 30
  - Fiscal year: January → December

- Singapore
  - Tax Type: GST
  - Registration label: GST Registration Number
  - Default GST: 9% (editable)
  - Invoice prefix: INV-SG-
  - Payment terms: Net 30
  - Fiscal year: January → December

Regional defaults
- Currency, timezone, language, date format, fiscal year, invoice numbering, payment terms, and tax defaults are provided via configuration objects.

Architecture & Implementation Notes
- Config-driven approach: `COUNTRY_DEFAULTS`, `TAX_DEFAULTS`, `INVOICE_DEFAULTS`, `PAYMENT_DEFAULTS` are defined in the frontend billing settings module and read by a lightweight intelligence engine.
- The UI logic does not hardcode per-country rules; it reads from configuration objects and merges defaults when the `country` value changes.
- Manual edits by users are preserved: defaults are only applied where the user has not provided a manual override.
- Adding a new country in Phase 2 requires only adding entries to the configuration objects — no UI logic changes.
- The country dropdown continues to display all countries. Only the Phase 1 list above receives automatic defaults.

Backend / API impact
- No backend schema, API, routing, or database changes were made.
- Settings are saved via the existing `settingsApi.updateConfig()` / `getConfig()` endpoints.

User experience
- If a user selects a country outside the Phase 1 set, the UI shows a small informational helper (non-error) advising manual configuration and listing the supported Phase 1 countries.
- Defaults applied are non-destructive; they respect manual overrides and existing organization configuration.

Build status
- Frontend build completed successfully after the Phase 1 changes (no compile errors; warnings only).

Future expansion strategy
- Phase 2: extend `TAX_DEFAULTS`, `INVOICE_DEFAULTS`, and `PAYMENT_DEFAULTS` with additional countries.
- Introduce localized templates, state/province tax tables (US), and regional validations in a later phase.
- Consider extracting the defaults into a shared module (e.g., `frontend/src/modules/billing/config/countryDefaults.js`) for reuse and testing.

Files modified
- `frontend/src/modules/billing/dashboard/settings.jsx` — added configuration objects and UI helper.
- Documentation added: `SMART_ORGANIZATION_INTELLIGENCE_PHASE1_1.md`

Contact
- For questions about tax rates or invoice formats, contact the billing product owner.
