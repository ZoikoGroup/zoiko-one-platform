"""Global multi-country tax rate catalogue, auto-seeded onto every newly
created organization's TaxRate table.

This is deliberately separate from app/core/country_defaults.py, which only
picks a currency/tax-label DEFAULT for BillingConfiguration. This module
provides the actual TaxRate rows (real, standard national rates - never
invented) for a curated set of countries, plus the logic to pick which single
row becomes the organization's own default.

Only real, published, standard national rates are used. Countries where tax
is jurisdiction-dependent (no single nationwide rate exists) are represented
by a clearly-labeled placeholder row that is never marked as a usable
default - see JURISDICTION_REQUIRED_COUNTRIES below.
"""
from typing import Optional, TypedDict


class TaxRateSpec(TypedDict):
    code: str
    name: str
    rate: float
    tax_type: str          # matches app.modules.billing.models.TaxType values
    tax_type_label: str
    jurisdiction: str
    is_standard: bool      # eligible to become this country's org-default row


class CountryTaxProfile(TypedDict):
    country_name: str
    tax_system: str
    currency_code: str
    jurisdiction_required: bool
    rates: list


# Countries where no single nationwide rate exists - the seeded row is a
# clearly-labeled placeholder, never eligible to become an organization's
# default (see get_ordered_catalogue_for_org below).
JURISDICTION_REQUIRED_COUNTRIES = {"US"}

GLOBAL_TAX_CATALOGUE: dict[str, CountryTaxProfile] = {
    "IN": {
        "country_name": "India",
        "tax_system": "GST",
        "currency_code": "INR",
        "jurisdiction_required": False,
        "rates": [
            {"code": "GST-IN-STD", "name": "GST Standard", "rate": 18.0, "tax_type": "gst",
             "tax_type_label": "GST", "jurisdiction": "India", "is_standard": True},
            {"code": "GST-IN-RED", "name": "GST Reduced", "rate": 5.0, "tax_type": "gst",
             "tax_type_label": "GST", "jurisdiction": "India", "is_standard": False},
        ],
    },
    "GB": {
        "country_name": "United Kingdom",
        "tax_system": "VAT",
        "currency_code": "GBP",
        "jurisdiction_required": False,
        "rates": [
            {"code": "VAT-GB-STD", "name": "VAT Standard", "rate": 20.0, "tax_type": "vat",
             "tax_type_label": "VAT", "jurisdiction": "United Kingdom", "is_standard": True},
            {"code": "VAT-GB-RED", "name": "VAT Reduced", "rate": 5.0, "tax_type": "vat",
             "tax_type_label": "VAT", "jurisdiction": "United Kingdom", "is_standard": False},
            {"code": "VAT-GB-ZERO", "name": "VAT Zero Rate", "rate": 0.0, "tax_type": "vat",
             "tax_type_label": "VAT", "jurisdiction": "United Kingdom", "is_standard": False},
        ],
    },
    "US": {
        "country_name": "United States",
        "tax_system": "Sales Tax",
        "currency_code": "USD",
        "jurisdiction_required": True,
        "rates": [
            # No nationwide US sales tax exists - rate is intentionally 0 and
            # this row is never eligible to become an organization default
            # (see JURISDICTION_REQUIRED_COUNTRIES). Real state/local rates
            # must be configured manually per jurisdiction.
            {"code": "TAX-US-JR", "name": "Sales Tax - Jurisdiction Required", "rate": 0.0,
             "tax_type": "sales_tax", "tax_type_label": "Sales Tax (Configuration Required)",
             "jurisdiction": "United States", "is_standard": False},
        ],
    },
    "AU": {
        "country_name": "Australia",
        "tax_system": "GST",
        "currency_code": "AUD",
        "jurisdiction_required": False,
        "rates": [
            {"code": "GST-AU-STD", "name": "GST Standard", "rate": 10.0, "tax_type": "gst",
             "tax_type_label": "GST", "jurisdiction": "Australia", "is_standard": True},
        ],
    },
    "AE": {
        "country_name": "United Arab Emirates",
        "tax_system": "VAT",
        "currency_code": "AED",
        "jurisdiction_required": False,
        "rates": [
            {"code": "VAT-AE-STD", "name": "VAT Standard", "rate": 5.0, "tax_type": "vat",
             "tax_type_label": "VAT", "jurisdiction": "United Arab Emirates", "is_standard": True},
        ],
    },
    "SG": {
        "country_name": "Singapore",
        "tax_system": "GST",
        "currency_code": "SGD",
        "jurisdiction_required": False,
        "rates": [
            {"code": "GST-SG-STD", "name": "GST Standard", "rate": 9.0, "tax_type": "gst",
             "tax_type_label": "GST", "jurisdiction": "Singapore", "is_standard": True},
        ],
    },
    "CA": {
        "country_name": "Canada",
        "tax_system": "GST/HST",
        "currency_code": "CAD",
        # Provincial HST/PST varies (13-15% where applicable) and is
        # intentionally not fabricated here - only the real, invariant 5%
        # federal GST component is seeded. Unlike the US, Canada does have a
        # genuine nationwide tax component, so this row IS eligible to be
        # the org default.
        "jurisdiction_required": False,
        "rates": [
            {"code": "GST-CA-FED", "name": "GST (Federal)", "rate": 5.0, "tax_type": "gst",
             # tax_type_label is DB-limited to 50 chars (TaxRate.tax_type_label);
             # the fuller "provincial HST/PST varies by province" explanation
             # lives in this module's docstring/comments, not on the row itself.
             "tax_type_label": "GST (federal only; provincial HST varies)",
             "jurisdiction": "Canada (Federal)", "is_standard": True},
        ],
    },
    "DE": {
        "country_name": "Germany",
        "tax_system": "VAT",
        "currency_code": "EUR",
        "jurisdiction_required": False,
        "rates": [
            {"code": "VAT-DE-STD", "name": "VAT Standard", "rate": 19.0, "tax_type": "vat",
             "tax_type_label": "VAT", "jurisdiction": "Germany", "is_standard": True},
            {"code": "VAT-DE-RED", "name": "VAT Reduced", "rate": 7.0, "tax_type": "vat",
             "tax_type_label": "VAT", "jurisdiction": "Germany", "is_standard": False},
        ],
    },
}

# Matches the country name strings actually sent by the registration form
# (frontend/src/utils/registrationRegions.js / currency.js COUNTRY_OPTIONS).
_COUNTRY_NAME_TO_CODE = {
    "India": "IN",
    "United Kingdom": "GB",
    "United States": "US",
    "Australia": "AU",
    "United Arab Emirates": "AE",
    "UAE": "AE",
    "Singapore": "SG",
    "Canada": "CA",
    "Germany": "DE",
}

# Stable base ordering for countries other than the organization's own.
_CATALOGUE_ORDER = ["IN", "GB", "US", "AU", "AE", "SG", "CA", "DE"]

# Reverse mapping: currency_code -> country_code
_CURRENCY_TO_COUNTRY = {
    profile["currency_code"]: code for code, profile in GLOBAL_TAX_CATALOGUE.items()
}


def resolve_country_code(country_name: Optional[str]) -> Optional[str]:
    """Maps an Organization.country free-text name to a catalogue key, or
    None if the country isn't in the catalogue."""
    if not country_name:
        return None
    return _COUNTRY_NAME_TO_CODE.get(country_name)


def resolve_country_code_from_currency(currency_code: Optional[str]) -> Optional[str]:
    """Maps a currency code (e.g., 'GBP') to a catalogue country code (e.g., 'GB'),
    or None if the currency isn't in the catalogue."""
    if not currency_code:
        return None
    return _CURRENCY_TO_COUNTRY.get(currency_code.upper())


def get_ordered_catalogue_for_org(org_country_name: Optional[str]) -> list:
    """Returns a flat, ordered list of rate rows for seeding, each augmented
    with country_code/country_name/currency_code/priority/is_default.

    Ordering: the organization's own country's rates come first (in that
    country's declared order), then every other country follows in the
    stable catalogue order. Priority is assigned 1..N across this flattened
    order, so priority 1 is always the organization's own country's first
    rate. Exactly one row is marked is_default=True: the org's own country's
    `is_standard` rate - unless that country is jurisdiction_required (e.g.
    US) or the org's country isn't in the catalogue at all, in which case no
    row is forced default (nothing to safely default to).
    """
    org_code = resolve_country_code(org_country_name)
    ordered_codes = list(_CATALOGUE_ORDER)
    if org_code and org_code in ordered_codes:
        ordered_codes.remove(org_code)
        ordered_codes.insert(0, org_code)

    flat = []
    priority = 1
    for code in ordered_codes:
        profile = GLOBAL_TAX_CATALOGUE[code]
        is_org_country = code == org_code
        for rate_spec in profile["rates"]:
            is_default = (
                is_org_country
                and rate_spec["is_standard"]
                and not profile["jurisdiction_required"]
            )
            flat.append({
                **rate_spec,
                "country_code": code,
                "country_name": profile["country_name"],
                "currency_code": profile["currency_code"],
                "priority": priority,
                "is_default": is_default,
            })
            priority += 1
    return flat
