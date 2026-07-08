import logging
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import NotFoundException, BadRequestException
from app.modules.billing.models import (
    BillingAuditAction, BillingConfiguration, CurrencyCode,
    CurrencySymbolPosition, DateFormat, DraftBehaviour,
    ExchangeRateProvider, InvoiceTemplate, NumberFormat, PaymentTerm,
    RecognizedRevenueMethod, RevenueRecognitionMethod, RoundingMethod,
    SequenceReset, TaxCalculationMethod, TaxRoundingMethod,
)
from app.modules.billing.repositories.settings import (
    BillingConfigurationRepository, BillingSettingRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import filter_allowed
from app.modules.billing.utils.currency_utils import get_currency_symbol, validate_currency_code, validate_language_code

logger = logging.getLogger("zoiko")

SETTINGS_ALLOWED_FIELDS = {
    "default_currency", "default_invoice_prefix", "default_quote_prefix",
    "default_payment_terms", "auto_dunning", "enable_revenue_recognition",
    "dunning_wait_days", "late_fee_percentage", "late_fee_flat",
    "invoice_footer", "invoice_terms", "tax_calculation_method",
}


def validate_email(email: Optional[str]) -> Optional[str]:
    if not email:
        return None
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(pattern, email):
        return "Invalid email format"
    return None


def validate_phone(phone: Optional[str]) -> Optional[str]:
    if not phone:
        return None
    cleaned = re.sub(r"[\s\-\+\(\)]", "", phone)
    if not cleaned.isdigit() or len(cleaned) < 7 or len(cleaned) > 15:
        return "Invalid phone number format"
    return None


def validate_website(website: Optional[str]) -> Optional[str]:
    if not website:
        return None
    pattern = r"^https?:\/\/([\w\-]+\.)+[\w\-]+(\/[\w\-\.~:/?#\[\]@!$&'\(\)\*\+,;=]*)?$"
    if not re.match(pattern, website):
        return "Invalid website URL format"
    return None


def validate_gst(gst: Optional[str]) -> Optional[str]:
    if not gst:
        return None
    pattern = r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$"
    if not re.match(pattern, gst):
        return "Invalid GST number format"
    return None


def validate_vat(vat: Optional[str]) -> Optional[str]:
    if not vat:
        return None
    if len(vat) < 4 or len(vat) > 20:
        return "Invalid VAT number format"
    return None


def validate_fiscal_year(fy: Optional[str]) -> Optional[str]:
    if not fy:
        return None
    pattern = r"^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$"
    if not re.match(pattern, fy):
        return "Fiscal year must be in MM-DD format"
    return None


def validate_invoice_prefix(prefix: Optional[str]) -> Optional[str]:
    if not prefix:
        return None
    if len(prefix) > 10:
        return "Invoice prefix must be 10 characters or less"
    if not re.match(r"^[A-Za-z0-9\-_]+$", prefix):
        return "Invoice prefix must contain only letters, numbers, hyphens, and underscores"
    return None


CONFIGURATION_DEFAULTS = {
    "default_currency": CurrencyCode.USD,
    "home_currency": CurrencyCode.USD,
    "base_currency": CurrencyCode.USD,
    "supported_currencies": ["USD"],
    "date_format": DateFormat.DD_MM_YYYY,
    "timezone": "UTC",
    "language": "en",
    "fiscal_year_start": "01-01",
    "fiscal_year_end": "12-31",
    "currency_precision": 2,
    "currency_symbol_position": CurrencySymbolPosition.BEFORE,
    "invoice_prefix": "INV-",
    "invoice_number_format": NumberFormat.PREFIX_YYYY_SEQ,
    "invoice_sequence_reset": SequenceReset.ANNUALLY,
    "quote_prefix": "QTE-",
    "quote_number_format": NumberFormat.PREFIX_YYYY_SEQ,
    "quote_sequence_reset": SequenceReset.ANNUALLY,
    "credit_note_prefix": "CN-",
    "credit_note_number_format": NumberFormat.PREFIX_YYYY_SEQ,
    "credit_note_sequence_reset": SequenceReset.ANNUALLY,
    "refund_prefix": "RF-",
    "refund_number_format": NumberFormat.PREFIX_YYYY_SEQ,
    "refund_sequence_reset": SequenceReset.ANNUALLY,
    "auto_generate_invoice_number": True,
    "invoice_template": InvoiceTemplate.STANDARD,
    "invoice_pdf_template": "standard",
    "draft_behaviour": DraftBehaviour.SAVE_AS_DRAFT,
    "show_tax_breakdown": True,
    "show_discount": True,
    "show_shipping": False,
    "default_due_days": 30,
    "payment_reminder_days_before": 3,
    "late_payment_fee_percentage": 0,
    "late_payment_fee_flat": 0,
    "default_payment_terms": PaymentTerm.NET_30,
    "payment_term_options": ["net_30", "net_15", "net_7", "due_on_receipt"],
    "supported_payment_methods": ["credit_card", "bank_transfer", "paypal"],
    "auto_send_receipts": True,
    "exchange_rate_provider": ExchangeRateProvider.MANUAL,
    "exchange_rate_auto_update": False,
    "rounding_method": RoundingMethod.HALF_UP,
    "rounding_precision": 2,
    "gateway_stripe_enabled": False,
    "gateway_razorpay_enabled": False,
    "gateway_paypal_enabled": True,
    "gateway_cash_enabled": True,
    "gateway_bank_transfer_enabled": True,
    "gateway_upi_enabled": False,
    "gateway_offline_enabled": True,
    "auto_capture_enabled": True,
    "grace_period_days": 0,
    "credit_limit": 0,
    "tax_calculation_method": TaxCalculationMethod.EXCLUSIVE,
    "tax_label": "VAT",
    "is_tax_inclusive_default": False,
    "show_tax_on_invoice": True,
    "enable_auto_tax_calculation": False,
    "gst_enabled": False,
    "sales_tax_enabled": False,
    "service_tax_enabled": False,
    "withholding_tax_enabled": False,
    "reverse_charge_enabled": False,
    "compound_tax_enabled": False,
    "tax_rounding_method": TaxRoundingMethod.PER_LINE,
    "auto_dunning": False,
    "dunning_level_count": 4,
    "dunning_wait_days": 3,
    "dunning_action_types": ["email_reminder"],
    "enable_escalation_to_collections": False,
    "collections_wait_days": 30,
    "reminder_sms_enabled": False,
    "reminder_whatsapp_enabled": False,
    "auto_suspend_enabled": False,
    "grace_days": 0,
    "enable_revenue_recognition": False,
    "revenue_recognition_method": RevenueRecognitionMethod.IMMEDIATE,
    "revenue_recognition_deferral_days": 0,
    "recognized_revenue_method": RecognizedRevenueMethod.ACCRUAL,
    "recognition_frequency": "monthly",
    "enable_multi_currency": False,
    "enable_approval_workflow": False,
    "enable_credit_notes": True,
    "enable_discounts": True,
    "enable_retainers": False,
    "enable_schedule_invoicing": False,
    "enable_partial_payments": True,
    "enable_auto_apply_credits": True,
    "enable_quotes": True,
    "enable_contracts": True,
    "enable_usage_billing": False,
    "enable_refunds": True,
    "enable_auto_taxes": False,
    "enable_audit_logs": True,
    "notify_invoice_created": True,
    "notify_invoice_sent": True,
    "notify_invoice_paid": True,
    "notify_invoice_overdue": True,
    "notify_subscription_renewed": True,
    "notify_subscription_cancelled": True,
    "notify_payment_failed": True,
    "notify_payment_success": True,
    "notify_customer_created": False,
    "tax_profiles": [],
    "tax_regions": [],
    "tax_categories": [],
    "hsn_sac_codes": [],
    "email_templates": {},
    "sms_templates": {},
    "notification_preferences": {},
    "security_settings": {},
    "retry_rules": {"max_retries": 3, "retry_interval_hours": 24},
    "refund_settings": {"auto_approve": False, "refund_window_days": 30, "require_reason": True},
    "reminder_schedule": {"before_due": [3, 1], "after_due": [0, 3, 7, 14, 30]},
    "penalty_settings": {"type": "percentage", "value": 0, "max_cap": None},
    "interest_settings": {"annual_rate": 0, "compounding": "simple", "waive_first_x_days": 0},
    "gst_settings": {},
    "vat_settings": {},
    "sales_tax_settings": {},
    "service_tax_settings": {},
    "withholding_tax_settings": {},
    "reverse_charge_settings": {},
    "compound_tax_settings": {},
    "revenue_accounts": {"deferred_revenue": None, "recognized_revenue": None, "contract_asset": None},
    "recognition_schedule": [],
}


class BillingConfigurationService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = BillingConfigurationRepository(db)
        self.audit = BillingAuditService(db)

    def get_configuration(self, organization_id: int) -> BillingConfiguration:
        logger.info("Getting billing configuration for organization_id=%s", organization_id)
        config = self.repo.get_by_organization(organization_id)
        if not config:
            logger.info("No configuration found for organization_id=%s, creating defaults", organization_id)
            config = self.repo.create(organization_id, **CONFIGURATION_DEFAULTS)
            logger.info("Created default configuration for organization_id=%s, config_id=%s", organization_id, config.id)
        return config

    def _validate_config_data(self, data: Dict[str, Any]) -> List[str]:
        errors = []
        validators = {
            "billing_email": validate_email,
            "billing_phone": validate_phone,
            "website": validate_website,
            "gst_number": validate_gst,
            "vat_number": validate_vat,
            "fiscal_year_start": validate_fiscal_year,
            "fiscal_year_end": validate_fiscal_year,
            "invoice_prefix": validate_invoice_prefix,
            "quote_prefix": validate_invoice_prefix,
            "credit_note_prefix": validate_invoice_prefix,
            "refund_prefix": validate_invoice_prefix,
        }
        for field, validator in validators.items():
            if field in data:
                error = validator(data[field])
                if error:
                    errors.append(f"{field}: {error}")

        if data.get("default_due_days") is not None and (data["default_due_days"] < 0 or data["default_due_days"] > 365):
            errors.append("default_due_days must be between 0 and 365")

        if data.get("currency_precision") is not None and (data["currency_precision"] < 0 or data["currency_precision"] > 10):
            errors.append("currency_precision must be between 0 and 10")

        if data.get("rounding_precision") is not None and (data["rounding_precision"] < 0 or data["rounding_precision"] > 10):
            errors.append("rounding_precision must be between 0 and 10")

        if data.get("dunning_level_count") is not None and (data["dunning_level_count"] < 1 or data["dunning_level_count"] > 10):
            errors.append("dunning_level_count must be between 1 and 10")

        if data.get("late_payment_fee_percentage") is not None and (data["late_payment_fee_percentage"] < 0 or data["late_payment_fee_percentage"] > 100):
            errors.append("late_payment_fee_percentage must be between 0 and 100")

        if data.get("default_currency") is not None and not validate_currency_code(data["default_currency"]):
            errors.append(f"default_currency: invalid currency code '{data['default_currency']}'")

        if data.get("home_currency") is not None and not validate_currency_code(data["home_currency"]):
            errors.append(f"home_currency: invalid currency code '{data['home_currency']}'")

        if data.get("base_currency") is not None and not validate_currency_code(data["base_currency"]):
            errors.append(f"base_currency: invalid currency code '{data['base_currency']}'")

        if data.get("language") is not None and not validate_language_code(data["language"]):
            errors.append(f"language: invalid language code '{data['language']}'")

        return errors

    def update_configuration(
        self, organization_id: int, updated_by: int, **data: Any,
    ) -> BillingConfiguration:
        logger.info("Updating billing configuration for organization_id=%s by user_id=%s, fields=%s", organization_id, updated_by, list(data.keys()))
        errors = self._validate_config_data(data)
        if errors:
            logger.warning("Validation failed for organization_id=%s: %s", organization_id, errors)
            raise BadRequestException("Validation failed: " + "; ".join(errors))

        try:
            config = self.repo.upsert(organization_id, updated_by=updated_by, **data)
            self.audit.log(
                organization_id, updated_by, BillingAuditAction.UPDATE,
                "BillingConfiguration", config.id, new_values=data,
            )
            logger.info("Billing configuration updated successfully for organization_id=%s", organization_id)
            return config
        except Exception as e:
            logger.error("Failed to update billing configuration for organization_id=%s: %s", organization_id, str(e), exc_info=True)
            raise

    def reset_configuration(self, organization_id: int, updated_by: int) -> BillingConfiguration:
        logger.info("Resetting billing configuration for organization_id=%s by user_id=%s", organization_id, updated_by)
        try:
            config = self.repo.reset_to_defaults(
                organization_id, updated_by=updated_by, **CONFIGURATION_DEFAULTS,
            )
            self.audit.log(
                organization_id, updated_by, BillingAuditAction.UPDATE,
                "BillingConfiguration", config.id, new_values={"reset": True},
            )
            logger.info("Billing configuration reset successfully for organization_id=%s, config_id=%s", organization_id, config.id)
            return config
        except Exception as e:
            logger.error("Failed to reset billing configuration for organization_id=%s: %s", organization_id, str(e), exc_info=True)
            raise

    def validate_configuration(self, organization_id: int) -> Dict[str, Any]:
        logger.info("Validating billing configuration for organization_id=%s", organization_id)
        config = self.get_configuration(organization_id)
        errors = []

        field_validators = {
            "billing_email": (config.billing_email, validate_email),
            "billing_phone": (config.billing_phone, validate_phone),
            "website": (config.website, validate_website),
            "gst_number": (config.gst_number, validate_gst),
            "vat_number": (config.vat_number, validate_vat),
            "fiscal_year_start": (config.fiscal_year_start, validate_fiscal_year),
            "fiscal_year_end": (config.fiscal_year_end, validate_fiscal_year),
            "invoice_prefix": (config.invoice_prefix, validate_invoice_prefix),
            "quote_prefix": (config.quote_prefix, validate_invoice_prefix),
            "credit_note_prefix": (config.credit_note_prefix, validate_invoice_prefix),
            "refund_prefix": (config.refund_prefix, validate_invoice_prefix),
        }

        for field, (value, validator) in field_validators.items():
            error = validator(value)
            if error:
                errors.append(f"{field}: {error}")

        if not config.default_currency:
            errors.append("default_currency is required")
        elif not validate_currency_code(config.default_currency.value if hasattr(config.default_currency, 'value') else config.default_currency):
            errors.append("default_currency: invalid currency code")

        if not config.language:
            errors.append("language is required")
        elif not validate_language_code(config.language):
            errors.append("language: invalid language code, falling back to English")

        if config.default_due_days is None or config.default_due_days < 0 or config.default_due_days > 365:
            errors.append("default_due_days must be between 0 and 365")

        result = {
            "valid": len(errors) == 0,
            "errors": errors,
            "field_count": len([c for c in BillingConfiguration.__table__.columns if hasattr(config, c.name)]),
        }
        logger.info("Validation result for organization_id=%s: valid=%s, errors=%d", organization_id, result["valid"], len(errors))
        return result

    def get_invoice_prefix(self, organization_id: int) -> str:
        config = self.get_configuration(organization_id)
        return config.invoice_prefix or "INV-"

    def get_quote_prefix(self, organization_id: int) -> str:
        config = self.get_configuration(organization_id)
        return config.quote_prefix or "QTE-"

    def get_default_currency(self, organization_id: int) -> str:
        config = self.get_configuration(organization_id)
        return config.default_currency.value if hasattr(config.default_currency, 'value') else (config.default_currency or "USD")

    def get_currency_symbol(self, organization_id: int) -> str:
        currency_code = self.get_default_currency(organization_id)
        return get_currency_symbol(currency_code)

    def get_payment_terms(self, organization_id: int) -> str:
        config = self.get_configuration(organization_id)
        return config.default_payment_terms.value if hasattr(config.default_payment_terms, 'value') else (config.default_payment_terms or "net_30")


class BillingSettingsService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = BillingSettingRepository(db)
        self.audit = BillingAuditService(db)

    def get_settings(self, organization_id: int):
        settings = self.repo.get_by_organization(organization_id)
        if not settings:
            settings = self.repo.create(organization_id)
        return settings

    def update_settings(self, organization_id: int, updated_by: int, **data: Any):
        data = filter_allowed(data, SETTINGS_ALLOWED_FIELDS)
        settings = self.repo.upsert(organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "BillingSetting", settings.id, new_values=data)
        return settings

    def get_invoice_prefix(self, organization_id: int) -> str:
        settings = self.get_settings(organization_id)
        return settings.default_invoice_prefix or "INV-"

    def get_quote_prefix(self, organization_id: int) -> str:
        settings = self.get_settings(organization_id)
        return settings.default_quote_prefix or "QTE-"

    def get_default_currency(self, organization_id: int) -> str:
        settings = self.get_settings(organization_id)
        return settings.default_currency or "USD"

    def get_payment_terms(self, organization_id: int) -> str:
        settings = self.get_settings(organization_id)
        return settings.default_payment_terms or "net_30"

    def is_auto_dunning_enabled(self, organization_id: int) -> bool:
        settings = self.get_settings(organization_id)
        return bool(settings.auto_dunning)

    def is_revenue_recognition_enabled(self, organization_id: int) -> bool:
        settings = self.get_settings(organization_id)
        return bool(settings.enable_revenue_recognition)
