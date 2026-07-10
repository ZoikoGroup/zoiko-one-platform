CEO Smart Organization Setup — Phase 2

Date: 2026-07-09

Summary
- Implemented Phase 2 intelligence inside the existing Billing Settings page (no layout redesign, no backend/API/database changes).
- Focus: reduce manual typing, suggest sensible defaults, preserve admin edits, and present clear review/accept flows.

Files modified
- `frontend/src/modules/billing/dashboard/settings.jsx`
  - Added `SUPPORTED_PHASE1` update (India, United States, United Kingdom, Australia, UAE)
  - Added `TAX_DEFAULTS`, `INVOICE_DEFAULTS`, `PAYMENT_DEFAULTS` entries for Australia
  - Added `fieldStatus` tracking + `StatusBadge` component (auto/custom/review)
  - Added suggestion banner and `Apply Suggested Defaults` / `Keep Current Settings` flow
  - Implemented `Reset to Country Defaults` (resets only intelligent fields)
  - Added registration field visibility per-country (GSTIN, PAN, CIN, EIN, Company Number, ABN, Trade License, VAT)
  - Added auto-suggestion from `website` -> `billing_email`, `support_email`, `short_name`
  - Conditional tax toggles per country and payment gateway suggestions
  - Minor UI badges for `default_currency`, `timezone`, `date_format`, `fiscal_year_start`, `fiscal_year_end`, `invoice_prefix`, `default_payment_terms`, and `tax_label`.

Features implemented
1. Smart Status
- `Auto-configured`, `Customized`, `Needs review` badges appear next to key intelligent fields.
- Field status is tracked in `fieldStatus` state to prevent overwrites of customized values.

2. Country Intelligence (Phase 1 countries)
- Supported countries: India, United States, United Kingdom, Australia, United Arab Emirates.
- Country defaults applied via a non-destructive suggestion flow; defaults include currency, timezone, language, fiscal year, invoice prefixes, invoice numbering format, tax defaults, payment terms, and suggested gateways.

3. Country Change Experience
- Changing the `Country` shows an inline recommendation banner when suggested defaults differ.
- Buttons: `Apply Suggested Defaults` and `Keep Current Settings` (no modal dialogs).
- Suggested fields are marked `Needs review` until accepted.

4. Dynamic Business Fields
- Registration fields shown/hidden and relabeled based on selected country (reuses existing form keys to avoid backend changes):
  - India: show GSTIN (`gst_number`), PAN (`pan_number`), CIN (`business_registration_number`)
  - United States: EIN (`business_registration_number`), Sales Tax ID (`tin_number`)
  - United Kingdom: Company Number (`business_registration_number`), VAT (`vat_number`)
  - Australia: ABN (`business_registration_number`), GST (`gst_number`)
  - UAE: Trade License (`business_registration_number`), VAT (`vat_number`)

5. Tax Intelligence
- The UI automatically surfaces only the tax system relevant to the selected country (GST vs Sales Tax / VAT) and hides irrelevant toggles.
- Tax default rates are provided in `TAX_DEFAULTS`; these are suggested and can be accepted.

6. Invoice Intelligence
- Invoice prefixes, numbering format, default payment terms, and default due days are suggested per country (in `INVOICE_DEFAULTS`).
- Badges indicate whether invoice fields are auto-configured, customized, or need review.

7. Payment Intelligence
- Suggested payment gateways per country (e.g., Razorpay/UPI for India, Stripe/PayPal for US/UK/AU) are included in `PAYMENT_DEFAULTS` and shown as suggested toggles.

8. Smart Organization Intelligence
- Website auto-suggestions: billing/support email and short display name are suggested from the website domain (editable and marked `Auto-configured` until edited).

Validation & Build
- Verified by running `npm run build` in `frontend` after each significant change. Build succeeded (vite v8.1.0) with only informational warnings about chunk sizes; no compile errors.

Known limitations & future improvements
- Postal code -> city/state auto-fill: not implemented (requires third-party geocoding or region dataset); recommended for Phase 3.
- Persistent overrides across sessions: `fieldStatus` is stored in-memory; to persist manual override flags across sessions we should store a `_overrides` map in persisted config (requires backend support if desired).
- More granular tax/rate rules (state-based US sales tax tables, UK VAT exemptions) remain for later phases.
- Consider extracting defaults into a shared config module for testing and reuse (post-CEO sign-off).

Next steps
- QA and user testing with Organization Admins in the 5 supported countries.
- Optional: persist override flags in org config, implement postal-code lookups, and expand phase 2 country list.

Build status
- `npm run build` completed successfully after Phase 2 changes (warnings only).

Contact
- For questions or to request changes, contact the billing product owner.
