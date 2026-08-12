"""Country -> currency/tax defaults used to seed BillingConfiguration when an
organization is first created.

This is a backend-owned port of the currency/tax portion of
frontend/src/modules/billing/utils/countryIntelligence.js's COUNTRY_DEFAULTS,
keyed the same way the registration form actually sends country names
(frontend/src/utils/registrationRegions.js REGISTRATION_COUNTRIES, derived
from frontend/src/utils/currency.js COUNTRY_OPTIONS - e.g. "United Arab
Emirates", not the frontend intelligence file's internal "UAE" alias).

Only used at organization-creation time to pick an initial default. It must
never be used to determine per-invoice tax, which continues to depend on the
customer, transaction, and configured tax rates (see
app/modules/billing/services/tax_service.py).
"""
from typing import Optional, TypedDict


class CountryTaxDefaults(TypedDict, total=False):
    tax_label: str
    tax_number_field: str  # BillingConfiguration column the org's tax_number should also populate
    enabled_flag: str      # BillingConfiguration boolean flag to switch on for this tax system


class CountryLocaleDefaults(TypedDict):
    timezone: str
    fiscal_year_start: str   # MM-DD
    fiscal_year_end: str     # MM-DD
    date_format: str         # a DateFormat enum value, e.g. "DD-MM-YYYY"
    language: str


class CountryRegionalDefaults(CountryLocaleDefaults):
    # Document numbering prefixes are intentionally country-neutral - the
    # organization/tenant context already identifies the country, so it is
    # not duplicated inside every document number. Every country resolves to
    # the same generic prefixes below; only the locale fields above vary by
    # country. Administrators can still set a custom prefix (including a
    # country code, if desired) via Billing Settings at any time.
    invoice_prefix: str
    quote_prefix: str
    credit_note_prefix: str
    refund_prefix: str


DEFAULT_CURRENCY = "USD"
DEFAULT_TAX_DEFAULTS: CountryTaxDefaults = {
    "tax_label": "VAT",
    "tax_number_field": "business_registration_number",
}

# Mirrors CONFIGURATION_DEFAULTS in billing/services/settings_service.py -
# the values a BillingConfiguration already gets today for an unmapped
# country, so falling back to this changes nothing for countries this module
# doesn't cover.
DEFAULT_REGIONAL_DEFAULTS: CountryRegionalDefaults = {
    "timezone": "UTC",
    "fiscal_year_start": "01-01",
    "fiscal_year_end": "12-31",
    "date_format": "DD-MM-YYYY",
    "language": "en",
    "invoice_prefix": "INV-",
    "quote_prefix": "QTE-",
    "credit_note_prefix": "CN-",
    "refund_prefix": "RF-",
}

_COUNTRY_CURRENCY_MAP = {
    "India": "INR",
    "United States": "USD",
    "United Kingdom": "GBP",
    "Australia": "AUD",
    "United Arab Emirates": "AED",
    "Singapore": "SGD",
    "Canada": "CAD",
}

_COUNTRY_TAX_MAP: dict[str, CountryTaxDefaults] = {
    "India": {
        "tax_label": "GST",
        "tax_number_field": "gst_number",
        "enabled_flag": "gst_enabled",
    },
    "United States": {
        "tax_label": "Sales Tax",
        "tax_number_field": "business_registration_number",
        "enabled_flag": "sales_tax_enabled",
    },
    "United Kingdom": {
        # BillingConfiguration has no top-level vat_enabled column (only
        # gst_enabled/sales_tax_enabled exist) - VAT is expressed via
        # tax_label + tax_number_field only.
        "tax_label": "VAT",
        "tax_number_field": "vat_number",
    },
    "Australia": {
        "tax_label": "GST",
        "tax_number_field": "gst_number",
        "enabled_flag": "gst_enabled",
    },
    "United Arab Emirates": {
        "tax_label": "VAT",
        "tax_number_field": "vat_number",
    },
    "Singapore": {
        "tax_label": "GST",
        "tax_number_field": "gst_number",
        "enabled_flag": "gst_enabled",
    },
    "Canada": {
        "tax_label": "GST/HST",
        "tax_number_field": "gst_number",
        "enabled_flag": "gst_enabled",
    },
}

# Locale-only fields ported from frontend/src/modules/billing/utils/
# countryIntelligence.js's COUNTRY_DEFAULTS (timezone, fiscal_year_start/end,
# date_format) so the two stay in agreement - the frontend's "Auto-configured"
# badge compares the value returned by the backend against this same
# COUNTRY_DEFAULTS table client-side, so seeding these exact values is what
# makes that badge show correctly with no frontend changes. Document
# numbering prefixes are deliberately NOT keyed by country here - see
# CountryRegionalDefaults - so they are not listed per-country below.
_COUNTRY_LOCALE_MAP: dict[str, CountryLocaleDefaults] = {
    "India": {
        "timezone": "Asia/Kolkata",
        "fiscal_year_start": "04-01",
        "fiscal_year_end": "03-31",
        "date_format": "DD-MM-YYYY",
        "language": "en",
    },
    "United States": {
        "timezone": "America/New_York",
        "fiscal_year_start": "01-01",
        "fiscal_year_end": "12-31",
        "date_format": "MM-DD-YYYY",
        "language": "en",
    },
    "United Kingdom": {
        "timezone": "Europe/London",
        "fiscal_year_start": "04-01",
        "fiscal_year_end": "03-31",
        "date_format": "DD-MM-YYYY",
        "language": "en",
    },
    "Australia": {
        "timezone": "Australia/Sydney",
        "fiscal_year_start": "07-01",
        "fiscal_year_end": "06-30",
        "date_format": "DD-MM-YYYY",
        "language": "en",
    },
    "United Arab Emirates": {
        "timezone": "Asia/Dubai",
        "fiscal_year_start": "01-01",
        "fiscal_year_end": "12-31",
        "date_format": "DD-MM-YYYY",
        "language": "en",
    },
    "Singapore": {
        "timezone": "Asia/Singapore",
        "fiscal_year_start": "01-01",
        "fiscal_year_end": "12-31",
        "date_format": "DD-MM-YYYY",
        "language": "en",
    },
    "Canada": {
        "timezone": "America/Toronto",
        "fiscal_year_start": "01-01",
        "fiscal_year_end": "12-31",
        "date_format": "DD-MM-YYYY",
        "language": "en",
    },
}

# UAE alias so lookups from either naming convention resolve the same way.
_COUNTRY_KEY_ALIASES = {
    "UAE": "United Arab Emirates",
}


def _resolve_key(country: Optional[str]) -> Optional[str]:
    if not country:
        return None
    return _COUNTRY_KEY_ALIASES.get(country, country)


def get_currency_for_country(country: Optional[str]) -> str:
    """Returns the ISO currency code (a valid CurrencyCode member) to use as
    the initial default for a new organization/BillingConfiguration. Falls
    back to the platform's existing generic default (USD) for countries
    outside the supported set - not a newly invented value."""
    key = _resolve_key(country)
    return _COUNTRY_CURRENCY_MAP.get(key, DEFAULT_CURRENCY)


def get_tax_defaults_for_country(country: Optional[str]) -> CountryTaxDefaults:
    """Returns the tax label / tax-number field / enabled-flag to seed on a
    new BillingConfiguration. Falls back to the platform's existing generic
    tax_label default ("VAT") for unsupported countries, matching
    CONFIGURATION_DEFAULTS['tax_label'] - i.e. no behavior change for
    countries this mapping doesn't yet cover."""
    key = _resolve_key(country)
    return dict(_COUNTRY_TAX_MAP.get(key, DEFAULT_TAX_DEFAULTS))


def get_regional_defaults_for_country(country: Optional[str]) -> CountryRegionalDefaults:
    """Returns timezone/fiscal-year/date-format/language/numbering-prefix
    defaults to seed on a new BillingConfiguration.

    Locale fields (timezone/fiscal_year_start/fiscal_year_end/date_format/
    language) vary by country, falling back to the platform's existing
    generic values (UTC / calendar year / DD-MM-YYYY) for unsupported
    countries - no invented per-state or per-region data (e.g. US timezone
    is the existing safe country-level fallback; the organization can change
    it manually).

    Document numbering prefixes (invoice_prefix/quote_prefix/
    credit_note_prefix/refund_prefix) are always the generic ones
    (INV-/QTE-/CN-/RF-) regardless of country - the organization/tenant
    context already identifies the country, so it is not duplicated inside
    every document number. A Billing Admin can still set any custom prefix
    manually via Billing Settings.
    """
    key = _resolve_key(country)
    locale = _COUNTRY_LOCALE_MAP.get(key, DEFAULT_REGIONAL_DEFAULTS)
    return {
        "timezone": locale["timezone"],
        "fiscal_year_start": locale["fiscal_year_start"],
        "fiscal_year_end": locale["fiscal_year_end"],
        "date_format": locale["date_format"],
        "language": locale["language"],
        "invoice_prefix": DEFAULT_REGIONAL_DEFAULTS["invoice_prefix"],
        "quote_prefix": DEFAULT_REGIONAL_DEFAULTS["quote_prefix"],
        "credit_note_prefix": DEFAULT_REGIONAL_DEFAULTS["credit_note_prefix"],
        "refund_prefix": DEFAULT_REGIONAL_DEFAULTS["refund_prefix"],
    }
