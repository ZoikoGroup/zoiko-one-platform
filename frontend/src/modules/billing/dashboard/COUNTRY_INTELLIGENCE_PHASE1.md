COUNTRY_INTELLIGENCE_PHASE1

Summary
- Phase 1 implements Smart Organization defaults for five countries: India (IN), United States (US), United Kingdom (GB), UAE (AE), Singapore (SG).
- Adds a reusable `COUNTRY_DEFAULTS` mapping (country-name keyed) and an intelligent apply-on-country-change handler in the Billing settings UI.

Auto-filled fields
- `default_currency`, `timezone`, `language`, `date_format`, `fiscal_year_start`, `fiscal_year_end`,
- `tax_label`, `tax_calculation_method`, `is_tax_inclusive_default`,
- `default_payment_terms`, `invoice_prefix`, `invoice_number_format`,
- `home_currency`, `base_currency`.

Behavior & rules
- Defaults apply only when the organization is new (no prior values) or the country changes explicitly.
- Manual overrides are preserved: fields the user already customized will not be overwritten.
- When defaults are applied an inline message appears: "✓ Organization defaults applied for <Country>. Review and customize before saving." (non-modal).
- No backend/API/DB/schema/RBAC changes were made — persistence uses existing `settingsApi.updateConfig()`.

Files modified
- `frontend/src/modules/billing/dashboard/settings.jsx` — added `COUNTRY_DEFAULTS` mapping (country-name keyed), `getCountryDefaults`, `isManualOverride`, `applyCountryDefaults`, and wired `handleCountryChange`.

Validation
- Frontend build: `npm run build` completed successfully after changes (vite build succeeded).

Next steps / Extension plan
- Phase 2: move `COUNTRY_DEFAULTS` to a shared reusable file and add unit tests.
- Add admin UI to re-apply defaults or preview differences before applying.

Notes
- Country matching is keyed by the visible country string in the Organization form; extend `COUNTRY_DEFAULTS` for additional countries as needed.
