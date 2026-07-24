"""
modules/billing/schemas.py
--------------------------
Pydantic schemas for the Zoiko Billing module.
Follows HR conventions: *Create, *Update, *Response with from_attributes.
"""

from datetime import date, datetime
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from decimal import Decimal
from pydantic import BaseModel, Field, ConfigDict, computed_field, model_validator, field_validator

from app.modules.billing.models import (
    BillingAuditAction, BillingFrequency, BillingPeriod, CollectionsPriority, CollectionsStatus,
    ContractStatus, CreditNoteStatus, CreditNoteType, CurrencyCode,
    CurrencySymbolPosition, CustomerStatus, CustomerType, DateFormat,
    DraftBehaviour, DunningActionType, DunningStatus, ExchangeRateProvider,
    InvoiceTemplate, InvoiceItemType, InvoiceStatus, InvoiceType, NumberFormat,
    PaymentGatewayType, PaymentMethodStatus, PaymentStatus, PaymentTerm,
    PaymentType, PlanCategory, PricingModel, ProductType, QuoteStatus,
    RecognitionMethod, RecognitionStatus, RecognizedRevenueMethod, RefundStatus,
    RefundType, RevenueRecognitionMethod, RoundingMethod,
    BillingSubscriptionStatus, SequenceReset, TaxApplicability,
    TaxCalculationMethod, TaxRoundingMethod, TaxType,
    PriceListStatus, PricingRuleType, PricingRuleScope, PricingRuleStatus,
    DiscountType, DiscountStatus, TaxPricingType,
)


# ═══════════════════════════════════════════════════════════════════════════════
# COMMON / SHARED SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

class SuccessResponse(BaseModel):
    message: str


class PaginatedResponse(BaseModel):
    total: int
    page: int
    per_page: int
    pages: int


# ═══════════════════════════════════════════════════════════════════════════════
# BILLING SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════

class BillingSettingUpdate(BaseModel):
    default_currency: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    default_payment_terms: Optional[str] = None
    default_invoice_prefix: Optional[str] = None
    default_quote_prefix: Optional[str] = None
    auto_generate_invoice_number: Optional[bool] = None
    invoice_number_format: Optional[str] = None
    default_tax_rate_id: Optional[int] = None
    auto_apply_credits: Optional[bool] = None
    auto_send_invoices: Optional[bool] = None
    auto_send_receipts: Optional[bool] = None
    auto_dunning: Optional[bool] = None
    dunning_level_count: Optional[int] = None
    payment_reminder_days_before: Optional[int] = None
    late_payment_fee_percentage: Optional[Decimal] = None
    late_payment_fee_flat: Optional[Decimal] = None
    enable_revenue_recognition: Optional[bool] = None
    enable_multi_currency: Optional[bool] = None
    billing_email: Optional[str] = None
    billing_phone: Optional[str] = None
    terms_and_conditions: Optional[str] = None
    logo_url: Optional[str] = None
    is_active: Optional[bool] = None


class BillingSettingResponse(BaseModel):
    id: int
    organization_id: int
    default_currency: str
    fiscal_year_start: str
    default_payment_terms: str
    default_invoice_prefix: str
    default_quote_prefix: str
    auto_generate_invoice_number: bool
    invoice_number_format: Optional[str]
    default_tax_rate_id: Optional[int]
    auto_apply_credits: bool
    auto_send_invoices: bool
    auto_send_receipts: bool
    auto_dunning: bool
    dunning_level_count: int
    payment_reminder_days_before: int
    late_payment_fee_percentage: Decimal
    late_payment_fee_flat: Decimal
    enable_revenue_recognition: bool
    enable_multi_currency: bool
    billing_email: Optional[str]
    billing_phone: Optional[str]
    terms_and_conditions: Optional[str]
    logo_url: Optional[str]
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# BILLING CUSTOMERS
# ═══════════════════════════════════════════════════════════════════════════════

class CustomerCreate(BaseModel):
    customer_code: str = Field(..., min_length=1, max_length=50)
    company_name: str = Field(..., min_length=1, max_length=255)
    display_name: str = Field(..., min_length=1, max_length=255)
    legal_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    alternate_email: Optional[str] = None
    mobile: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    designation: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    gst_number: Optional[str] = None
    vat_number: Optional[str] = None
    pan: Optional[str] = None
    tin: Optional[str] = None
    tax_category: Optional[str] = None
    tax_id: Optional[str] = None
    tax_id_type: Optional[str] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = "net_30"
    credit_limit: Optional[Decimal] = Decimal("0")
    credit_days: Optional[int] = None
    price_list: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_country: Optional[str] = None
    shipping_country: Optional[str] = None
    status: Optional[CustomerStatus] = CustomerStatus.ACTIVE
    customer_type: Optional[CustomerType] = CustomerType.BUSINESS
    notes: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None

    @field_validator("email", "alternate_email", mode="before")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v.strip()):
            raise ValueError("Invalid email format")
        return v.strip().lower()

    @field_validator("phone", "mobile", mode="before")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^[\+]?\d{7,15}$", cleaned):
            raise ValueError("Invalid phone format")
        return cleaned

    @field_validator("website", mode="before")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        if not re.match(r"^https?://[\w\-]+(\.[\w\-]+)+(/[\w\-./?#&%=]*)?$", v.strip()):
            raise ValueError("Invalid website URL (must start with http:// or https://)")
        return v.strip()

    @field_validator("gst_number", mode="before")
    @classmethod
    def validate_gst(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        gst = v.strip().upper()
        if not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$", gst):
            raise ValueError("Invalid GSTIN format (expected: 2 digits + 5 letters + 4 digits + 1 letter + Z + 1 alphanumeric)")
        state_code = gst[:2]
        valid_states = {"01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38"}
        if state_code not in valid_states:
            raise ValueError(f"Invalid GSTIN state code: {state_code}")
        pan_in_gst = gst[2:12]
        if not re.match(r"^[A-Z]{5}\d{4}[A-Z]$", pan_in_gst):
            raise ValueError("GSTIN contains invalid PAN portion")
        return gst

    @field_validator("vat_number", mode="before")
    @classmethod
    def validate_vat(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        vat = v.strip()
        if len(vat) < 4 or len(vat) > 20:
            raise ValueError("VAT number length must be 4-20 characters")
        return vat

    @field_validator("pan", mode="before")
    @classmethod
    def validate_pan(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        pan = v.strip().upper()
        if not re.match(r"^[A-Z]{5}\d{4}[A-Z]{1}$", pan):
            raise ValueError("Invalid PAN format (expected: 5 letters + 4 digits + 1 letter)")
        entity_char = pan[3]
        valid_entities = {"A", "B", "C", "F", "G", "H", "L", "J", "P", "T"}
        if entity_char not in valid_entities:
            raise ValueError(f"Unusual PAN entity type: {entity_char}")
        return pan

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("credit_limit", mode="before")
    @classmethod
    def validate_credit_limit(cls, v: Optional[Union[Decimal, str, float, int]]) -> Optional[Decimal]:
        if v is None or v == "":
            return Decimal("0")
        try:
            limit = Decimal(str(v))
            if limit < 0:
                raise ValueError("Credit limit cannot be negative")
            return limit
        except Exception:
            raise ValueError("Invalid credit limit value")

    @field_validator("credit_days", mode="before")
    @classmethod
    def validate_credit_days(cls, v: Optional[int]) -> Optional[int]:
        if v is None or v == "":
            return None
        try:
            days = int(v)
            if days < 0 or days > 365:
                raise ValueError("Credit days must be between 0 and 365")
            return days
        except Exception:
            raise ValueError("Invalid credit days value")

    @field_validator("employee_count", mode="before")
    @classmethod
    def validate_employee_count(cls, v: Optional[int]) -> Optional[int]:
        if v is None or v == "":
            return None
        try:
            count = int(v)
            if count < 0:
                raise ValueError("Employee count cannot be negative")
            return count
        except Exception:
            raise ValueError("Invalid employee count value")

    @field_validator("payment_terms", mode="before")
    @classmethod
    def validate_payment_terms(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return "net_30"
        valid_terms = {"due_on_receipt", "net_15", "net_30", "net_45", "net_60", "net_90"}
        if v.strip() not in valid_terms:
            raise ValueError(f"Invalid payment terms. Must be one of: {', '.join(valid_terms)}")
        return v.strip()

    @field_validator("customer_type", mode="before")
    @classmethod
    def validate_customer_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return "business"
        valid_types = {"business", "individual", "non_profit", "government"}
        if v.strip() not in valid_types:
            raise ValueError(f"Invalid customer type. Must be one of: {', '.join(valid_types)}")
        return v.strip()


class CustomerUpdate(BaseModel):
    customer_code: Optional[str] = Field(None, min_length=1, max_length=50)
    company_name: Optional[str] = Field(None, min_length=1, max_length=255)
    display_name: Optional[str] = Field(None, min_length=1, max_length=255)
    legal_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    alternate_email: Optional[str] = None
    mobile: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    designation: Optional[str] = None
    industry: Optional[str] = None
    employee_count: Optional[int] = None
    gst_number: Optional[str] = None
    vat_number: Optional[str] = None
    pan: Optional[str] = None
    tin: Optional[str] = None
    tax_category: Optional[str] = None
    tax_id: Optional[str] = None
    tax_id_type: Optional[str] = None
    currency: Optional[str] = None
    payment_terms: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    credit_days: Optional[int] = None
    price_list: Optional[str] = None
    billing_address: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_country: Optional[str] = None
    shipping_country: Optional[str] = None
    status: Optional[CustomerStatus] = None
    customer_type: Optional[CustomerType] = None
    notes: Optional[str] = None
    tags: Optional[Dict[str, Any]] = None
    custom_fields: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

    @field_validator("email", "alternate_email", mode="before")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        if not re.match(r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$", v.strip()):
            raise ValueError("Invalid email format")
        return v.strip().lower()

    @field_validator("phone", "mobile", mode="before")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^[\+]?\d{7,15}$", cleaned):
            raise ValueError("Invalid phone format")
        return cleaned

    @field_validator("website", mode="before")
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        if not re.match(r"^https?://[\w\-]+(\.[\w\-]+)+(/[\w\-./?#&%=]*)?$", v.strip()):
            raise ValueError("Invalid website URL (must start with http:// or https://)")
        return v.strip()

    @field_validator("gst_number", mode="before")
    @classmethod
    def validate_gst(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        gst = v.strip().upper()
        if not re.match(r"^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}$", gst):
            raise ValueError("Invalid GSTIN format (expected: 2 digits + 5 letters + 4 digits + 1 letter + Z + 1 alphanumeric)")
        state_code = gst[:2]
        valid_states = {"01","02","03","04","05","06","07","08","09","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31","32","33","34","35","36","37","38"}
        if state_code not in valid_states:
            raise ValueError(f"Invalid GSTIN state code: {state_code}")
        pan_in_gst = gst[2:12]
        if not re.match(r"^[A-Z]{5}\d{4}[A-Z]$", pan_in_gst):
            raise ValueError("GSTIN contains invalid PAN portion")
        return gst

    @field_validator("vat_number", mode="before")
    @classmethod
    def validate_vat(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        vat = v.strip()
        if len(vat) < 4 or len(vat) > 20:
            raise ValueError("VAT number length must be 4-20 characters")
        return vat

    @field_validator("pan", mode="before")
    @classmethod
    def validate_pan(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        import re
        pan = v.strip().upper()
        if not re.match(r"^[A-Z]{5}\d{4}[A-Z]{1}$", pan):
            raise ValueError("Invalid PAN format (expected: 5 letters + 4 digits + 1 letter)")
        entity_char = pan[3]
        valid_entities = {"A", "B", "C", "F", "G", "H", "L", "J", "P", "T"}
        if entity_char not in valid_entities:
            raise ValueError(f"Unusual PAN entity type: {entity_char}")
        return pan

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("credit_limit", mode="before")
    @classmethod
    def validate_credit_limit(cls, v: Optional[Union[Decimal, str, float, int]]) -> Optional[Decimal]:
        if v is None or v == "":
            return None
        try:
            limit = Decimal(str(v))
            if limit < 0:
                raise ValueError("Credit limit cannot be negative")
            return limit
        except Exception:
            raise ValueError("Invalid credit limit value")

    @field_validator("credit_days", mode="before")
    @classmethod
    def validate_credit_days(cls, v: Optional[int]) -> Optional[int]:
        if v is None or v == "":
            return None
        try:
            days = int(v)
            if days < 0 or days > 365:
                raise ValueError("Credit days must be between 0 and 365")
            return days
        except Exception:
            raise ValueError("Invalid credit days value")

    @field_validator("employee_count", mode="before")
    @classmethod
    def validate_employee_count(cls, v: Optional[int]) -> Optional[int]:
        if v is None or v == "":
            return None
        try:
            count = int(v)
            if count < 0:
                raise ValueError("Employee count cannot be negative")
            return count
        except Exception:
            raise ValueError("Invalid employee count value")

    @field_validator("payment_terms", mode="before")
    @classmethod
    def validate_payment_terms(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        valid_terms = {"due_on_receipt", "net_15", "net_30", "net_45", "net_60", "net_90"}
        if v.strip() not in valid_terms:
            raise ValueError(f"Invalid payment terms. Must be one of: {', '.join(valid_terms)}")
        return v.strip()

    @field_validator("customer_type", mode="before")
    @classmethod
    def validate_customer_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        valid_types = {"business", "individual", "non_profit", "government"}
        if v.strip() not in valid_types:
            raise ValueError(f"Invalid customer type. Must be one of: {', '.join(valid_types)}")
        return v.strip()


class CustomerResponse(BaseModel):
    id: int
    organization_id: int
    customer_code: str
    company_name: str
    display_name: str
    legal_name: Optional[str]
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    alternate_email: Optional[str]
    mobile: Optional[str]
    phone: Optional[str]
    website: Optional[str]
    designation: Optional[str]
    industry: Optional[str]
    employee_count: Optional[int]
    gst_number: Optional[str]
    vat_number: Optional[str]
    pan: Optional[str]
    tin: Optional[str]
    tax_category: Optional[str]
    tax_id: Optional[str]
    tax_id_type: Optional[str]
    currency: str
    payment_terms: str
    credit_limit: Decimal
    credit_days: Optional[int]
    price_list: Optional[str]
    credit_balance: Decimal
    outstanding_balance: Decimal
    total_revenue: Decimal
    total_invoices: int
    total_payments: int
    lifetime_value: Decimal
    billing_address: Optional[str]
    shipping_address: Optional[str]
    billing_country: Optional[str]
    shipping_country: Optional[str]
    status: CustomerStatus
    customer_type: CustomerType
    notes: Optional[str]
    tags: Optional[Dict[str, Any]]
    custom_fields: Optional[Dict[str, Any]]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CustomerListResponse(PaginatedResponse):
    items: List[CustomerResponse]


class BulkDeleteRequest(BaseModel):
    ids: List[int]


class BulkStatusRequest(BaseModel):
    ids: List[int]
    status: str


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOMER CONTACTS
# ═══════════════════════════════════════════════════════════════════════════════

class CustomerContactCreate(BaseModel):
    salutation: Optional[str] = None
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: str
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    is_primary: bool = False
    notes: Optional[str] = None


class CustomerContactUpdate(BaseModel):
    salutation: Optional[str] = None
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    is_primary: Optional[bool] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class CustomerContactResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    salutation: Optional[str]
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    mobile: Optional[str]
    job_title: Optional[str]
    department: Optional[str]
    is_primary: bool
    is_active: bool
    notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCT CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════

class ProductCategoryCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: int = 0
    icon: Optional[str] = None
    color: Optional[str] = None


class ProductCategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    icon: Optional[str] = None
    color: Optional[str] = None
    is_active: Optional[bool] = None


class ProductCategoryResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    description: Optional[str]
    parent_id: Optional[int]
    sort_order: int
    icon: Optional[str]
    color: Optional[str]
    is_active: bool
    product_count: int = 0
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════════════════════

class ProductCreate(BaseModel):
    category_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    product_type: ProductType = ProductType.SERVICE
    unit_label: Optional[str] = None
    currency: Optional[str] = None
    default_price: Decimal = Decimal("0")
    original_price: Decimal = Decimal("0")
    cost_price: Decimal = Decimal("0")
    tax_percentage: Decimal = Decimal("0")
    tax_category_id: Optional[int] = None
    country: Optional[str] = None
    gst_vat_group: Optional[str] = None
    tax_inclusive: bool = False
    is_subscribable: bool = False
    is_usage_billable: bool = False
    is_active: bool = True
    image_url: Optional[str] = None
    brand: Optional[str] = None
    billing_frequency: BillingFrequency = BillingFrequency.ONE_TIME
    default_discount: Decimal = Decimal("0")
    invoice_description: Optional[str] = None


class ProductUpdate(BaseModel):
    category_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    product_type: Optional[ProductType] = None
    unit_label: Optional[str] = None
    currency: Optional[str] = None
    default_price: Optional[Decimal] = None
    original_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    tax_percentage: Optional[Decimal] = None
    tax_category_id: Optional[int] = None
    country: Optional[str] = None
    gst_vat_group: Optional[str] = None
    tax_inclusive: Optional[bool] = None
    is_subscribable: Optional[bool] = None
    is_usage_billable: Optional[bool] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None
    brand: Optional[str] = None
    billing_frequency: Optional[BillingFrequency] = None
    default_discount: Optional[Decimal] = None
    invoice_description: Optional[str] = None


class ProductResponse(BaseModel):
    id: int
    organization_id: int
    category_id: Optional[int]
    name: str
    code: str
    description: Optional[str]
    product_type: ProductType
    unit_label: Optional[str]
    currency: Optional[str] = "USD"
    default_price: Decimal
    original_price: Optional[Decimal] = None
    cost_price: Optional[Decimal] = None
    tax_percentage: Optional[Decimal] = None
    tax_category_id: Optional[int] = None
    country: Optional[str] = None
    gst_vat_group: Optional[str] = None
    tax_inclusive: bool
    is_subscribable: bool
    is_usage_billable: bool
    is_active: bool
    image_url: Optional[str] = None
    brand: Optional[str] = None
    billing_frequency: BillingFrequency
    default_discount: Optional[Decimal] = None
    invoice_description: Optional[str] = None
    deleted_at: Optional[datetime] = None
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def status(self) -> str:
        if self.deleted_at:
            return "archived"
        return "active" if self.is_active else "inactive"


class ProductListResponse(PaginatedResponse):
    items: List[ProductResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# PRICING PLANS
# ═══════════════════════════════════════════════════════════════════════════════

class PricingPlanCreate(BaseModel):
    product_id: int
    name: str = Field(..., min_length=1, max_length=255)
    billing_period: BillingPeriod
    billing_cycle_count: int = Field(0, ge=0)
    pricing_model: PricingModel = PricingModel.FLAT
    unit_price: Optional[Decimal] = Field(None, ge=0)
    flat_fee: Decimal = Field(Decimal("0"), ge=0)
    setup_fee: Decimal = Field(Decimal("0"), ge=0)
    min_quantity: int = Field(1, ge=1)
    max_quantity: Optional[int] = Field(None, ge=1)
    trial_days: int = Field(0, ge=0)
    effective_from: date
    effective_to: Optional[date] = None

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.max_quantity is not None and self.max_quantity < self.min_quantity:
            raise ValueError("max_quantity must be greater than or equal to min_quantity")
        if self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        return self


class PricingPlanUpdate(BaseModel):
    product_id: Optional[int] = None
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    billing_period: Optional[BillingPeriod] = None
    billing_cycle_count: Optional[int] = Field(None, ge=0)
    pricing_model: Optional[PricingModel] = None
    unit_price: Optional[Decimal] = Field(None, ge=0)
    flat_fee: Optional[Decimal] = Field(None, ge=0)
    setup_fee: Optional[Decimal] = Field(None, ge=0)
    min_quantity: Optional[int] = Field(None, ge=1)
    max_quantity: Optional[int] = Field(None, ge=1)
    trial_days: Optional[int] = Field(None, ge=0)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None

    @model_validator(mode="after")
    def validate_ranges(self):
        if self.min_quantity is not None and self.max_quantity is not None and self.max_quantity < self.min_quantity:
            raise ValueError("max_quantity must be greater than or equal to min_quantity")
        if self.effective_from is not None and self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        return self


class PricingPlanResponse(BaseModel):
    id: int
    organization_id: int
    product_id: int
    name: str
    billing_period: BillingPeriod
    billing_cycle_count: int
    pricing_model: PricingModel
    unit_price: Optional[Decimal]
    flat_fee: Decimal
    setup_fee: Decimal
    min_quantity: int
    max_quantity: Optional[int]
    trial_days: int
    is_active: bool
    effective_from: date
    effective_to: Optional[date]
    deleted_at: Optional[datetime] = None
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    currency: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def status(self) -> str:
        if self.deleted_at:
            return "archived"
        return "active" if self.is_active else "inactive"


class PricingPlanListResponse(PaginatedResponse):
    items: List[PricingPlanResponse]


class PriceResolveRequest(BaseModel):
    product_id: int
    pricing_plan_id: Optional[int] = None
    quantity: Optional[Decimal] = None


class PriceResolveResponse(BaseModel):
    product_id: int
    product_name: str
    base_price: Decimal
    resolved_price: Decimal
    pricing_plan_id: Optional[int] = None
    pricing_plan_name: Optional[str] = None
    price_source: str
    currency: Optional[str] = None
    pricing_model: Optional[str] = None
    tier_info: Optional[dict] = None


class PlanTierCreate(BaseModel):
    pricing_plan_id: Optional[int] = None
    from_quantity: int = Field(..., ge=1)
    to_quantity: Optional[int] = Field(None, ge=1)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    flat_fee: Decimal = Field(Decimal("0"), ge=0)

    @model_validator(mode="after")
    def validate_tier_range(self):
        if self.to_quantity is not None and self.to_quantity <= self.from_quantity:
            raise ValueError("to_quantity must be greater than from_quantity")
        return self


class PlanTierResponse(BaseModel):
    id: int
    pricing_plan_id: int
    from_quantity: int
    to_quantity: Optional[int]
    unit_price: Optional[Decimal]
    flat_fee: Decimal
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PRICE LISTS
# ═══════════════════════════════════════════════════════════════════════════════


class PriceListStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"
    DEPRECATED = "deprecated"


class PriceListCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    currency: Optional[str] = None
    is_default: bool = False
    effective_from: date
    effective_to: Optional[date] = None
    is_active: bool = True

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if v is None or v.strip() == "":
            raise ValueError("Code cannot be empty")
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        return self


class PriceListUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    currency: Optional[str] = None
    is_default: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_active: Optional[bool] = None
    status: Optional[PriceListStatus] = None

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_from is not None and self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        return self


class PriceListResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    description: Optional[str]
    version: int
    status: PriceListStatus
    currency: str
    is_default: bool
    effective_from: date
    effective_to: Optional[date]
    is_active: bool
    deleted_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def status_display(self) -> str:
        if self.deleted_at:
            return "archived"
        if self.status == PriceListStatus.ACTIVE and self.is_active:
            return "active"
        return "inactive"


class PriceListListResponse(PaginatedResponse):
    items: List[PriceListResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# PRICE LIST ITEMS
# ═══════════════════════════════════════════════════════════════════════════════


class PriceListItemCreate(BaseModel):
    price_list_id: Optional[int] = None
    product_id: int
    unit_price: Decimal = Field(..., ge=0)
    min_quantity: int = Field(default=1, ge=1)
    max_quantity: Optional[int] = Field(None, ge=1)
    currency: Optional[str] = None
    is_active: bool = True

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @model_validator(mode="after")
    def validate_quantity_range(self):
        if self.max_quantity is not None and self.max_quantity < self.min_quantity:
            raise ValueError("max_quantity must be greater than or equal to min_quantity")
        return self


class PriceListItemUpdate(BaseModel):
    product_id: Optional[int] = None
    unit_price: Optional[Decimal] = Field(None, ge=0)
    min_quantity: Optional[int] = Field(None, ge=1)
    max_quantity: Optional[int] = Field(None, ge=1)
    currency: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @model_validator(mode="after")
    def validate_quantity_range(self):
        if self.min_quantity is not None and self.max_quantity is not None and self.max_quantity < self.min_quantity:
            raise ValueError("max_quantity must be greater than or equal to min_quantity")
        return self


class PriceListItemResponse(BaseModel):
    id: int
    organization_id: int
    price_list_id: int
    product_id: int
    unit_price: Decimal
    min_quantity: int
    max_quantity: Optional[int]
    currency: str
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PRICING RULES
# ═══════════════════════════════════════════════════════════════════════════════


class PricingRuleType(str, Enum):
    PERCENTAGE_DISCOUNT = "percentage_discount"
    FIXED_DISCOUNT = "fixed_discount"
    TIER_PRICING = "tier_pricing"
    VOLUME_PRICING = "volume_pricing"
    QUANTITY_BREAK = "quantity_break"
    CUSTOMER_PRICING = "customer_pricing"
    ORGANIZATION_PRICING = "organization_pricing"
    REGIONAL_PRICING = "regional_pricing"
    DATE_BASED_PRICING = "date_based_pricing"
    BUY_GET = "buy_get"
    BUNDLE_PRICING = "bundle_pricing"
    LOYALTY_PRICING = "loyalty_pricing"


class PricingRuleScope(str, Enum):
    PRODUCT = "product"
    PRODUCT_CATEGORY = "product_category"
    CUSTOMER = "customer"
    CUSTOMER_GROUP = "customer_group"
    ORGANIZATION = "organization"
    REGION = "region"
    GLOBAL = "global"


class PricingRuleStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    INACTIVE = "inactive"
    EXPIRED = "expired"
    SCHEDULED = "scheduled"


class PricingRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    rule_type: PricingRuleType
    scope: PricingRuleScope = PricingRuleScope.GLOBAL
    priority: int = Field(default=0, ge=0)
    stackable: bool = True
    max_stack_count: int = Field(default=1, ge=1)
    value: Optional[Decimal] = Field(None, ge=0)
    value_type: str = Field(default="percentage", pattern="^(percentage|fixed)$")
    min_quantity: Optional[int] = Field(None, ge=1)
    max_quantity: Optional[int] = Field(None, ge=1)
    buy_quantity: Optional[int] = Field(None, ge=1)
    get_quantity: Optional[int] = Field(None, ge=1)
    get_discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    customer_id: Optional[int] = None
    customer_group: Optional[str] = Field(None, max_length=100)
    product_id: Optional[int] = None
    product_category_id: Optional[int] = None
    region: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    effective_from: date
    effective_to: Optional[date] = None
    valid_from_time: Optional[str] = None
    valid_to_time: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    status: PricingRuleStatus = PricingRuleStatus.DRAFT
    is_active: bool = True
    auto_apply: bool = False
    requires_approval: bool = False
    usage_limit: Optional[int] = Field(None, ge=1)
    per_customer_limit: Optional[int] = Field(None, ge=1)

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if v is None or v.strip() == "":
            raise ValueError("Code cannot be empty")
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        if self.max_quantity is not None and self.min_quantity is not None and self.max_quantity < self.min_quantity:
            raise ValueError("max_quantity must be greater than or equal to min_quantity")
        if self.buy_quantity is not None and self.get_quantity is not None:
            if self.buy_quantity <= 0 or self.get_quantity <= 0:
                raise ValueError("buy_quantity and get_quantity must be positive")
        return self


class PricingRuleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    rule_type: Optional[PricingRuleType] = None
    scope: Optional[PricingRuleScope] = None
    priority: Optional[int] = Field(None, ge=0)
    stackable: Optional[bool] = None
    max_stack_count: Optional[int] = Field(None, ge=1)
    value: Optional[Decimal] = Field(None, ge=0)
    value_type: Optional[str] = Field(None, pattern="^(percentage|fixed)$")
    min_quantity: Optional[int] = Field(None, ge=1)
    max_quantity: Optional[int] = Field(None, ge=1)
    buy_quantity: Optional[int] = Field(None, ge=1)
    get_quantity: Optional[int] = Field(None, ge=1)
    get_discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    customer_id: Optional[int] = None
    customer_group: Optional[str] = Field(None, max_length=100)
    product_id: Optional[int] = None
    product_category_id: Optional[int] = None
    region: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    currency: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    valid_from_time: Optional[str] = None
    valid_to_time: Optional[str] = None
    days_of_week: Optional[List[int]] = None
    status: Optional[PricingRuleStatus] = None
    is_active: Optional[bool] = None
    auto_apply: Optional[bool] = None
    requires_approval: Optional[bool] = None
    usage_limit: Optional[int] = Field(None, ge=1)
    per_customer_limit: Optional[int] = Field(None, ge=1)

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_from is not None and self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        if self.max_quantity is not None and self.min_quantity is not None and self.max_quantity < self.min_quantity:
            raise ValueError("max_quantity must be greater than or equal to min_quantity")
        return self


class PricingRuleResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    description: Optional[str]
    rule_type: PricingRuleType
    scope: PricingRuleScope
    priority: int
    stackable: bool
    max_stack_count: int
    value: Optional[Decimal]
    value_type: str
    min_quantity: Optional[int]
    max_quantity: Optional[int]
    buy_quantity: Optional[int]
    get_quantity: Optional[int]
    get_discount_percentage: Optional[Decimal]
    customer_id: Optional[int]
    customer_group: Optional[str]
    product_id: Optional[int]
    product_category_id: Optional[int]
    region: Optional[str]
    country: Optional[str]
    state: Optional[str]
    currency: Optional[str]
    effective_from: date
    effective_to: Optional[date]
    valid_from_time: Optional[str]
    valid_to_time: Optional[str]
    days_of_week: Optional[List[int]]
    status: PricingRuleStatus
    is_active: bool
    auto_apply: bool
    requires_approval: bool
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    usage_limit: Optional[int]
    usage_count: int
    per_customer_limit: Optional[int]
    deleted_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PricingRuleListResponse(PaginatedResponse):
    items: List[PricingRuleResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# PRICING RULE TIERS
# ═══════════════════════════════════════════════════════════════════════════════


class PricingRuleTierCreate(BaseModel):
    pricing_rule_id: Optional[int] = None
    from_quantity: int = Field(..., ge=1)
    to_quantity: Optional[int] = Field(None, ge=1)
    discount_percentage: Optional[Decimal] = Field(None, ge=0, le=100)
    discount_amount: Optional[Decimal] = Field(None, ge=0)
    unit_price: Optional[Decimal] = Field(None, ge=0)
    flat_fee: Decimal = Field(Decimal("0"), ge=0)

    @model_validator(mode="after")
    def validate_tier_range(self):
        if self.to_quantity is not None and self.to_quantity <= self.from_quantity:
            raise ValueError("to_quantity must be greater than from_quantity")
        return self


class PricingRuleTierResponse(BaseModel):
    id: int
    organization_id: int
    pricing_rule_id: int
    from_quantity: int
    to_quantity: Optional[int]
    discount_percentage: Optional[Decimal]
    discount_amount: Optional[Decimal]
    unit_price: Optional[Decimal]
    flat_fee: Decimal
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# DISCOUNTS / COUPONS / PROMOTIONS / CAMPAIGNS
# ═══════════════════════════════════════════════════════════════════════════════


class DiscountType(str, Enum):
    COUPON = "coupon"
    PROMOTION = "promotion"
    CAMPAIGN = "campaign"
    SEASONAL = "seasonal"
    MANUAL_OVERRIDE = "manual_override"
    AUTOMATIC = "automatic"
    LOYALTY = "loyalty"
    REFERRAL = "referral"
    BULK = "bulk"
    EARLY_BIRD = "early_bird"


class DiscountStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    EXHAUSTED = "exhausted"
    CANCELLED = "cancelled"
    PENDING_APPROVAL = "pending_approval"


class DiscountCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    discount_type: DiscountType
    discount_value: Decimal = Field(..., ge=0)
    value_type: str = Field(default="percentage", pattern="^(percentage|fixed)$")
    min_order_amount: Optional[Decimal] = Field(None, ge=0)
    max_discount_amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = None
    usage_limit: Optional[int] = Field(None, ge=1)
    per_customer_limit: int = Field(default=1, ge=1)
    customer_id: Optional[int] = None
    customer_group: Optional[str] = Field(None, max_length=100)
    product_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None
    excluded_product_ids: Optional[List[int]] = None
    excluded_category_ids: Optional[List[int]] = None
    valid_from: datetime
    valid_to: Optional[datetime] = None
    timezone: str = Field(default="UTC", max_length=50)
    stackable: bool = False
    applies_to_sale_items: bool = True
    applies_to_subscription: bool = False
    first_order_only: bool = False
    status: DiscountStatus = DiscountStatus.DRAFT
    is_active: bool = True
    requires_approval: bool = False
    auto_apply: bool = False

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or (isinstance(v, str) and v.strip() == ""):
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_to is not None and self.valid_to <= self.valid_from:
            raise ValueError("valid_to must be greater than valid_from")
        return self


class DiscountUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[Decimal] = Field(None, ge=0)
    value_type: Optional[str] = Field(None, pattern="^(percentage|fixed)$")
    min_order_amount: Optional[Decimal] = Field(None, ge=0)
    max_discount_amount: Optional[Decimal] = Field(None, ge=0)
    currency: Optional[str] = None
    usage_limit: Optional[int] = Field(None, ge=1)
    per_customer_limit: Optional[int] = Field(None, ge=1)
    customer_id: Optional[int] = None
    customer_group: Optional[str] = Field(None, max_length=100)
    product_ids: Optional[List[int]] = None
    category_ids: Optional[List[int]] = None
    excluded_product_ids: Optional[List[int]] = None
    excluded_category_ids: Optional[List[int]] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    timezone: Optional[str] = Field(None, max_length=50)
    stackable: Optional[bool] = None
    applies_to_sale_items: Optional[bool] = None
    applies_to_subscription: Optional[bool] = None
    first_order_only: Optional[bool] = None
    status: Optional[DiscountStatus] = None
    is_active: Optional[bool] = None
    requires_approval: Optional[bool] = None
    auto_apply: Optional[bool] = None

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.valid_from is not None and self.valid_to is not None and self.valid_to <= self.valid_from:
            raise ValueError("valid_to must be greater than valid_from")
        return self


class DiscountResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: Optional[str]
    description: Optional[str]
    discount_type: DiscountType
    discount_value: Decimal
    value_type: str
    min_order_amount: Optional[Decimal]
    max_discount_amount: Optional[Decimal]
    currency: str
    usage_limit: Optional[int]
    usage_count: int
    per_customer_limit: int
    customer_id: Optional[int]
    customer_group: Optional[str]
    product_ids: Optional[List[int]]
    category_ids: Optional[List[int]]
    excluded_product_ids: Optional[List[int]]
    excluded_category_ids: Optional[List[int]]
    valid_from: datetime
    valid_to: Optional[datetime]
    timezone: str
    stackable: bool
    applies_to_sale_items: bool
    applies_to_subscription: bool
    first_order_only: bool
    status: DiscountStatus
    is_active: bool
    requires_approval: bool
    approved_by: Optional[int]
    approved_at: Optional[datetime]
    auto_apply: bool
    deleted_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class DiscountListResponse(PaginatedResponse):
    items: List[DiscountResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# DISCOUNT USAGE
# ═══════════════════════════════════════════════════════════════════════════════


class DiscountUsageResponse(BaseModel):
    id: int
    organization_id: int
    discount_id: int
    customer_id: Optional[int]
    invoice_id: Optional[int]
    quotation_id: Optional[int]
    order_amount: Decimal
    discount_amount: Decimal
    used_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# CURRENCY PRICING
# ═══════════════════════════════════════════════════════════════════════════════


class CurrencyPricingCreate(BaseModel):
    product_id: int
    currency: str = Field(..., min_length=3, max_length=3)
    price: Decimal = Field(..., ge=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    price_list_id: Optional[int] = None
    conversion_type: str = Field(default="manual", pattern="^(manual|live|historical)$")
    exchange_rate: Optional[Decimal] = Field(None, ge=0)
    exchange_rate_date: Optional[date] = None
    is_active: bool = True

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        if v is None or v.strip() == "":
            raise ValueError("Currency is required")
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency


class CurrencyPricingUpdate(BaseModel):
    product_id: Optional[int] = None
    currency: Optional[str] = Field(None, min_length=3, max_length=3)
    price: Optional[Decimal] = Field(None, ge=0)
    cost_price: Optional[Decimal] = Field(None, ge=0)
    price_list_id: Optional[int] = None
    conversion_type: Optional[str] = Field(None, pattern="^(manual|live|historical)$")
    exchange_rate: Optional[Decimal] = Field(None, ge=0)
    exchange_rate_date: Optional[date] = None
    is_active: Optional[bool] = None

    @field_validator("currency", mode="before")
    @classmethod
    def validate_currency(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        currency = v.strip().upper()
        valid_currencies = {"USD", "EUR", "GBP", "INR", "AED", "SGD", "AUD", "CAD", "CHF", "JPY", "CNY", "HKD", "NZD", "SEK", "NOK", "DKK", "PLN", "CZK", "HUF", "RON", "BGN", "HRK", "RUB", "TRY", "ZAR", "BRL", "MXN", "THB", "MYR", "IDR", "PHP", "VND", "KRW", "TWD"}
        if currency not in valid_currencies:
            raise ValueError(f"Unsupported currency code: {currency}")
        return currency


class CurrencyPricingResponse(BaseModel):
    id: int
    organization_id: int
    product_id: int
    currency: str
    price: Decimal
    cost_price: Optional[Decimal]
    price_list_id: Optional[int]
    conversion_type: str
    exchange_rate: Optional[Decimal]
    exchange_rate_date: Optional[date]
    is_active: bool
    deleted_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CurrencyPricingListResponse(PaginatedResponse):
    items: List[CurrencyPricingResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# TAX PRICING
# ═══════════════════════════════════════════════════════════════════════════════


class TaxPricingType(str, Enum):
    INCLUSIVE = "inclusive"
    EXCLUSIVE = "exclusive"


class TaxPricingCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    tax_type: TaxType
    tax_category_id: Optional[int] = None
    country: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    rate: Decimal = Field(..., ge=0, le=100)
    pricing_type: TaxPricingType = TaxPricingType.EXCLUSIVE
    applies_to_products: bool = True
    applies_to_services: bool = True
    applies_to_shipping: bool = False
    is_compound: bool = False
    compound_order: int = Field(default=0, ge=0)
    is_recoverable: bool = True
    hsn_sac_code: Optional[str] = Field(None, max_length=20)
    effective_from: date
    effective_to: Optional[date] = None
    is_default: bool = False
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if v is None or v.strip() == "":
            raise ValueError("Code cannot be empty")
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        return self


class TaxPricingUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    tax_type: Optional[TaxType] = None
    tax_category_id: Optional[int] = None
    country: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    city: Optional[str] = Field(None, max_length=100)
    postal_code: Optional[str] = Field(None, max_length=20)
    rate: Optional[Decimal] = Field(None, ge=0, le=100)
    pricing_type: Optional[TaxPricingType] = None
    applies_to_products: Optional[bool] = None
    applies_to_services: Optional[bool] = None
    applies_to_shipping: Optional[bool] = None
    is_compound: Optional[bool] = None
    compound_order: Optional[int] = Field(None, ge=0)
    is_recoverable: Optional[bool] = None
    hsn_sac_code: Optional[str] = Field(None, max_length=20)
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return v.strip().upper()

    @model_validator(mode="after")
    def validate_dates(self):
        if self.effective_from is not None and self.effective_to is not None and self.effective_to < self.effective_from:
            raise ValueError("effective_to must be greater than or equal to effective_from")
        return self


class TaxPricingResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    description: Optional[str]
    tax_type: TaxType
    tax_category_id: Optional[int]
    country: Optional[str]
    region: Optional[str]
    state: Optional[str]
    city: Optional[str]
    postal_code: Optional[str]
    rate: Decimal
    pricing_type: TaxPricingType
    applies_to_products: bool
    applies_to_services: bool
    applies_to_shipping: bool
    is_compound: bool
    compound_order: int
    is_recoverable: bool
    hsn_sac_code: Optional[str]
    effective_from: date
    effective_to: Optional[date]
    is_default: bool
    is_active: bool
    deleted_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# TAX GROUPS
# ═══════════════════════════════════════════════════════════════════════════════


class TaxGroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    description: Optional[str] = None
    country: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    is_default: bool = False
    is_active: bool = True

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: str) -> str:
        if v is None or v.strip() == "":
            raise ValueError("Code cannot be empty")
        return v.strip().upper()


class TaxGroupUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    description: Optional[str] = None
    country: Optional[str] = Field(None, max_length=100)
    region: Optional[str] = Field(None, max_length=100)
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None

    @field_validator("code", mode="before")
    @classmethod
    def validate_code(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v.strip() == "":
            return None
        return v.strip().upper()


class TaxGroupResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    description: Optional[str]
    country: Optional[str]
    region: Optional[str]
    is_default: bool
    is_active: bool
    deleted_at: Optional[datetime]
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class TaxPricingListResponse(PaginatedResponse):
    items: List[TaxPricingResponse]


class TaxGroupListResponse(PaginatedResponse):
    items: List[TaxGroupResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# TAX GROUP MEMBERS
# ═══════════════════════════════════════════════════════════════════════════════


class TaxGroupMemberCreate(BaseModel):
    tax_group_id: Optional[int] = None
    tax_pricing_id: int
    display_order: int = 0
    is_active: bool = True


class TaxGroupMemberResponse(BaseModel):
    id: int
    organization_id: int
    tax_group_id: int
    tax_pricing_id: int
    display_order: int
    is_active: bool
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# CONTRACTS
# ═══════════════════════════════════════════════════════════════════════════════

class ContractCreate(BaseModel):
    customer_id: int
    contract_number: str = Field(..., min_length=1, max_length=50)
    contract_name: str = Field(..., min_length=1, max_length=255)
    status: ContractStatus = ContractStatus.DRAFT
    start_date: date
    end_date: Optional[date] = None
    notice_period_days: int = 30
    auto_renew: bool = False
    renewal_term_days: Optional[int] = None
    # Billing schedule fields
    billing_period: BillingPeriod = BillingPeriod.MONTHLY
    billing_day: int = 1
    payment_terms: str = "net_30"
    value: Decimal = Decimal("0")
    currency: Optional[str] = None
    signed_by_customer: bool = False
    signed_by_org: bool = False
    document_url: Optional[str] = None
    notes: Optional[str] = None
    terminated_reason: Optional[str] = None
    contract_version: int = 1


class ContractUpdate(BaseModel):
    contract_name: Optional[str] = Field(None, min_length=1, max_length=255)
    status: Optional[ContractStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notice_period_days: Optional[int] = None
    auto_renew: Optional[bool] = None
    renewal_term_days: Optional[int] = None
    billing_period: Optional[BillingPeriod] = None
    billing_day: Optional[int] = None
    payment_terms: Optional[str] = None
    value: Optional[Decimal] = None
    currency: Optional[str] = None
    signed_by_customer: Optional[bool] = None
    signed_by_org: Optional[bool] = None
    document_url: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    terminated_reason: Optional[str] = None
    contract_version: Optional[int] = None


class ContractResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    quotation_id: Optional[int] = None
    contract_number: str
    contract_name: str
    status: ContractStatus
    start_date: date
    end_date: Optional[date]
    notice_period_days: int
    auto_renew: bool
    renewal_term_days: Optional[int]
    billing_period: Optional[BillingPeriod] = None
    billing_day: Optional[int] = None
    payment_terms: Optional[str] = None
    value: Decimal
    currency: str
    signed_by_customer: bool
    signed_by_org: bool
    signed_at: Optional[datetime]
    document_url: Optional[str]
    notes: Optional[str]
    is_active: bool
    terminated_reason: Optional[str]
    contract_version: int
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ContractListResponse(PaginatedResponse):
    items: List[ContractResponse]


class ContractAmendmentCreate(BaseModel):
    amendment_date: date
    effective_date: date
    reason: Optional[str] = None
    previous_values: Optional[dict] = None
    new_values: Optional[dict] = None


class ContractAmendmentResponse(BaseModel):
    id: int
    organization_id: int
    contract_id: int
    amendment_number: int
    amendment_date: date
    effective_date: date
    reason: Optional[str]
    changed_by: Optional[int]
    previous_values: Optional[dict]
    new_values: Optional[dict]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ContractItemCreate(BaseModel):
    product_id: Optional[int] = None
    description: str = Field(..., min_length=1, max_length=1000)
    quantity: Decimal = Decimal("1")
    unit_price: Decimal = Field(..., ge=0)
    discount_percentage: Decimal = Decimal("0")
    tax_percentage: Decimal = Decimal("0")
    is_tax_inclusive: bool = False
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None


class ContractItemBulkCreate(BaseModel):
    items: List[ContractItemCreate]


class ContractItemResponse(BaseModel):
    id: int
    organization_id: int
    contract_id: int
    line_number: int
    product_id: Optional[int]
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_percentage: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    is_tax_inclusive: bool
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class ConvertQuotationRequest(BaseModel):
    quotation_id: int
    contract_number: Optional[str] = None
    contract_name: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    notice_period_days: int = 30
    auto_renew: bool = False
    renewal_term_days: Optional[int] = None
    notes: Optional[str] = None


# ═══════════════════════════════════════════════════════════════════════════════
# QUOTATIONS
# ═══════════════════════════════════════════════════════════════════════════════

class QuotationCreate(BaseModel):
    customer_id: int
    quote_number: str = Field(..., min_length=1, max_length=50)
    quote_version: int = 1
    subject: Optional[str] = None
    discount_percentage: Decimal = Decimal("0")
    currency: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None


class QuotationUpdate(BaseModel):
    subject: Optional[str] = None
    discount_percentage: Optional[Decimal] = None
    currency: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None
    terms: Optional[str] = None
    is_active: Optional[bool] = None


class QuotationResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    quote_number: str
    quote_version: int
    status: QuoteStatus
    subject: Optional[str]
    subtotal: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    valid_until: Optional[date]
    accepted_at: Optional[datetime]
    rejected_reason: Optional[str]
    converted_to_invoice_id: Optional[int]
    converted_to_subscription_id: Optional[int]
    notes: Optional[str]
    terms: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class QuotationListResponse(PaginatedResponse):
    items: List[QuotationResponse]


class QuotationItemCreate(BaseModel):
    line_number: int
    product_id: Optional[int] = None
    description: str = Field(..., min_length=1, max_length=1000)
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    discount_percentage: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    tax_percentage: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    total_amount: Decimal = Decimal("0")
    is_tax_inclusive: bool = False
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None


class QuotationItemUpdate(BaseModel):
    line_number: Optional[int] = None
    product_id: Optional[int] = None
    description: Optional[str] = Field(None, min_length=1, max_length=1000)
    quantity: Optional[Decimal] = None
    unit_price: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    tax_percentage: Optional[Decimal] = None
    is_tax_inclusive: Optional[bool] = None
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None


class QuotationItemResponse(BaseModel):
    id: int
    quotation_id: int
    line_number: int
    product_id: Optional[int]
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_percentage: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    is_tax_inclusive: bool
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTION PLANS
# ═══════════════════════════════════════════════════════════════════════════════

class SubscriptionPlanCreate(BaseModel):
    plan_code: str = Field(..., min_length=1, max_length=50)
    plan_name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    category: PlanCategory
    billing_period: BillingPeriod
    billing_cycles: int = 0
    pricing_model: PricingModel = PricingModel.FLAT
    unit_price: Optional[Decimal] = None
    setup_fee: Decimal = Decimal("0")
    trial_days: int = 0
    is_public: bool = True
    sort_order: int = 0


class SubscriptionPlanUpdate(BaseModel):
    plan_name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    category: Optional[PlanCategory] = None
    billing_period: Optional[BillingPeriod] = None
    billing_cycles: Optional[int] = None
    pricing_model: Optional[PricingModel] = None
    unit_price: Optional[Decimal] = None
    setup_fee: Optional[Decimal] = None
    trial_days: Optional[int] = None
    is_public: Optional[bool] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class SubscriptionPlanResponse(BaseModel):
    id: int
    organization_id: int
    plan_code: str
    plan_name: str
    description: Optional[str]
    category: PlanCategory
    billing_period: BillingPeriod
    billing_cycles: int
    pricing_model: PricingModel
    unit_price: Optional[Decimal]
    setup_fee: Decimal
    trial_days: int
    is_public: bool
    sort_order: int
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# SUBSCRIPTIONS
# ═══════════════════════════════════════════════════════════════════════════════

class SubscriptionCreate(BaseModel):
    customer_id: int
    plan_id: int
    contract_id: Optional[int] = None
    product_id: Optional[int] = None
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    subscription_number: str = Field(..., min_length=1, max_length=50)
    currency: Optional[str] = Field(None, max_length=3)
    quantity: int = 1
    unit_price: Decimal
    setup_fee: Decimal = Decimal("0")
    discount_percentage: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    tax_percentage: Decimal = Decimal("0")
    start_date: date
    current_term_start: date
    current_term_end: date
    trial_end_date: Optional[date] = None
    notes: Optional[str] = None


class SubscriptionUpdate(BaseModel):
    quantity: Optional[int] = None
    unit_price: Optional[Decimal] = None
    discount_percentage: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    tax_percentage: Optional[Decimal] = None
    current_term_start: Optional[date] = None
    current_term_end: Optional[date] = None
    trial_end_date: Optional[date] = None
    next_billing_at: Optional[date] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class SubscriptionResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    plan_id: int
    contract_id: Optional[int]
    product_id: Optional[int] = None
    pricing_plan_id: Optional[int] = None
    subscription_number: str
    status: BillingSubscriptionStatus
    currency: Optional[str]
    quantity: int
    unit_price: Decimal
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None
    setup_fee: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_percentage: Decimal
    start_date: date
    current_term_start: date
    current_term_end: date
    trial_end_date: Optional[date]
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
    paused_at: Optional[datetime]
    resume_at: Optional[date]
    last_billed_at: Optional[datetime]
    next_billing_at: Optional[date]
    notes: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class SubscriptionListResponse(PaginatedResponse):
    items: List[SubscriptionResponse]


class SubscriptionEventResponse(BaseModel):
    id: int
    subscription_id: int
    event_type: str
    old_value: Optional[Dict[str, Any]]
    new_value: Optional[Dict[str, Any]]
    reason: Optional[str]
    created_by: Optional[int]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# INVOICES
# ═══════════════════════════════════════════════════════════════════════════════

class InvoiceCreate(BaseModel):
    customer_id: int
    subscription_id: Optional[int] = None
    quotation_id: Optional[int] = None
    contract_id: Optional[int] = None
    invoice_number: Optional[str] = Field(None, min_length=1, max_length=50)
    invoice_type: InvoiceType = InvoiceType.STANDARD
    issue_date: date
    due_date: date
    discount_percentage: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    currency: Optional[str] = None
    exchange_rate: Decimal = Decimal("1")
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    po_number: Optional[str] = None
    is_recurring: bool = False

    @field_validator("discount_percentage")
    @classmethod
    def validate_discount_pct(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("discount_percentage must be between 0 and 100")
        return v

    @field_validator("discount_amount")
    @classmethod
    def validate_discount_amt(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("discount_amount must be non-negative")
        return v

    @field_validator("exchange_rate")
    @classmethod
    def validate_exchange_rate(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("exchange_rate must be positive")
        return v

    @model_validator(mode="after")
    def validate_dates(self) -> "InvoiceCreate":
        if self.issue_date and self.due_date and self.due_date < self.issue_date:
            raise ValueError("due_date must not be before issue_date")
        return self


class InvoiceUpdate(BaseModel):
    due_date: Optional[date] = None
    discount_percentage: Optional[Decimal] = None
    discount_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    payment_terms: Optional[str] = None
    po_number: Optional[str] = None


class InvoiceResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    subscription_id: Optional[int]
    quotation_id: Optional[int]
    contract_id: Optional[int]
    invoice_number: str
    invoice_type: InvoiceType
    status: InvoiceStatus
    issue_date: date
    due_date: date
    subtotal: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    paid_amount: Decimal
    balance_due: Decimal
    currency: str
    exchange_rate: Decimal
    notes: Optional[str]
    sent_at: Optional[datetime]
    reminded_at: Optional[datetime]
    paid_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
    payment_terms: Optional[str]
    po_number: Optional[str]
    is_recurring: bool
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    # Customer details (populated from relationship)
    customer_name: Optional[str] = None
    customer_email: Optional[str] = None
    customer_phone: Optional[str] = None
    customer_mobile: Optional[str] = None
    customer_billing_address: Optional[str] = None
    customer_shipping_address: Optional[str] = None
    customer_gst_number: Optional[str] = None
    customer_vat_number: Optional[str] = None
    customer_pan: Optional[str] = None
    customer_tax_id: Optional[str] = None
    customer_tax_id_type: Optional[str] = None
    customer_company_name: Optional[str] = None
    customer_display_name: Optional[str] = None
    customer_first_name: Optional[str] = None
    customer_last_name: Optional[str] = None
    customer_website: Optional[str] = None
    customer_designation: Optional[str] = None
    customer_industry: Optional[str] = None
    customer_employee_count: Optional[int] = None
    customer_currency: Optional[str] = None
    customer_payment_terms: Optional[str] = None
    customer_credit_limit: Optional[Decimal] = None
    customer_credit_days: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceListResponse(PaginatedResponse):
    items: List[InvoiceResponse]


class InvoiceBulkDeleteRequest(BaseModel):
    ids: List[int] = Field(..., min_length=1)


class InvoiceItemCreate(BaseModel):
    line_number: int
    product_id: Optional[int] = None
    item_type: InvoiceItemType = InvoiceItemType.PRODUCT
    description: str = Field(..., min_length=1, max_length=1000)
    quantity: Decimal = Decimal("1")
    unit_price: Decimal
    discount_percentage: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    tax_percentage: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    is_tax_inclusive: bool = False
    sort_order: int = 0

    # Currency Conversion (Phase 1)
    original_currency: Optional[str] = None
    original_amount: Optional[Decimal] = None
    invoice_currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    converted_amount: Optional[Decimal] = None
    exchange_rate_timestamp: Optional[datetime] = None

    # Price Provenance (P1A)
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None

    @field_validator("quantity")
    @classmethod
    def validate_quantity(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("quantity must be greater than 0")
        return v

    @field_validator("unit_price")
    @classmethod
    def validate_unit_price(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("unit_price must be non-negative")
        return v

    @field_validator("discount_percentage")
    @classmethod
    def validate_discount_pct(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("discount_percentage must be between 0 and 100")
        return v

    @field_validator("tax_percentage")
    @classmethod
    def validate_tax_pct(cls, v: Decimal) -> Decimal:
        if v < 0 or v > 100:
            raise ValueError("tax_percentage must be between 0 and 100")
        return v


class InvoiceItemBulkCreate(BaseModel):
    items: List[InvoiceItemCreate]


class InvoiceItemResponse(BaseModel):
    id: int
    invoice_id: int
    line_number: int
    product_id: Optional[int]
    item_type: InvoiceItemType
    description: str
    quantity: Decimal
    unit_price: Decimal
    discount_percentage: Decimal
    discount_amount: Decimal
    tax_percentage: Decimal
    tax_amount: Decimal
    total: Decimal
    is_tax_inclusive: bool
    sort_order: int
    created_at: Optional[datetime]

    # Currency Conversion (Phase 1)
    original_currency: Optional[str] = None
    original_amount: Optional[Decimal] = None
    invoice_currency: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    converted_amount: Optional[Decimal] = None
    exchange_rate_timestamp: Optional[datetime] = None

    # Price Provenance (P1A)
    pricing_plan_id: Optional[int] = None
    price_source: Optional[str] = None
    base_price: Optional[Decimal] = None
    resolved_price: Optional[Decimal] = None

    model_config = ConfigDict(from_attributes=True)


class InvoiceStatusHistoryResponse(BaseModel):
    id: int
    invoice_id: int
    from_status: Optional[str]
    to_status: str
    changed_by: Optional[int]
    reason: Optional[str]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENT METHODS
# ═══════════════════════════════════════════════════════════════════════════════

class PaymentMethodCreate(BaseModel):
    customer_id: int
    payment_type: PaymentGatewayType
    gateway: str
    gateway_customer_id: Optional[str] = None
    gateway_payment_method_id: Optional[str] = None
    is_default: bool = False
    last_four: Optional[str] = None
    card_brand: Optional[str] = None
    card_expiry_month: Optional[int] = None
    card_expiry_year: Optional[int] = None
    bank_name: Optional[str] = None
    account_last_four: Optional[str] = None
    billing_address: Optional[str] = None


class PaymentMethodUpdate(BaseModel):
    is_default: Optional[bool] = None
    billing_address: Optional[str] = None
    status: Optional[PaymentMethodStatus] = None
    is_active: Optional[bool] = None


class PaymentMethodResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    payment_type: PaymentGatewayType
    gateway: str
    gateway_customer_id: Optional[str]
    gateway_payment_method_id: Optional[str]
    is_default: bool
    last_four: Optional[str]
    card_brand: Optional[str]
    card_expiry_month: Optional[int]
    card_expiry_year: Optional[int]
    bank_name: Optional[str]
    account_last_four: Optional[str]
    billing_address: Optional[str]
    status: PaymentMethodStatus
    verified_at: Optional[datetime]
    is_active: bool
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# PAYMENTS
# ═══════════════════════════════════════════════════════════════════════════════

class PaymentCreate(BaseModel):
    customer_id: int
    payment_number: str = Field(..., min_length=1, max_length=50)
    transaction_id: Optional[str] = None
    payment_method_id: Optional[int] = None
    payment_type: PaymentType
    amount: Decimal
    currency: Optional[str] = None
    exchange_rate: Decimal = Decimal("1")
    gateway: Optional[PaymentGatewayType] = None
    gateway_charge_id: Optional[str] = None
    gateway_fee: Decimal = Decimal("0")
    payment_date: date
    notes: Optional[str] = None


class PaymentUpdate(BaseModel):
    status: Optional[PaymentStatus] = None
    cleared_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    failure_code: Optional[str] = None
    receipt_sent: Optional[bool] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    payment_number: str
    transaction_id: Optional[str]
    payment_method_id: Optional[int]
    payment_type: PaymentType
    status: PaymentStatus
    amount: Decimal
    currency: str
    exchange_rate: Decimal
    gateway: Optional[PaymentGatewayType]
    gateway_charge_id: Optional[str]
    gateway_fee: Decimal
    net_amount: Decimal
    payment_date: date
    cleared_at: Optional[datetime]
    failure_reason: Optional[str]
    failure_code: Optional[str]
    receipt_sent: bool
    notes: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PaymentListResponse(PaginatedResponse):
    items: List[PaymentResponse]


class PaymentAllocationCreate(BaseModel):
    invoice_id: int
    amount: Decimal


class PaymentAllocationResponse(BaseModel):
    id: int
    payment_id: int
    invoice_id: int
    amount: Decimal
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class PaymentAttemptResponse(BaseModel):
    id: int
    payment_id: int
    attempt_number: int
    status: str
    gateway_response: Optional[Dict[str, Any]]
    failure_reason: Optional[str]
    attempted_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# CREDIT NOTES
# ═══════════════════════════════════════════════════════════════════════════════

class CreditNoteCreate(BaseModel):
    customer_id: int
    invoice_id: Optional[int] = None
    credit_note_number: str = Field(..., min_length=1, max_length=50)
    credit_note_type: CreditNoteType
    reason: Optional[str] = None
    subtotal: Decimal = Decimal("0")
    tax_amount: Decimal = Decimal("0")
    total_amount: Decimal
    currency: Optional[str] = None
    issue_date: date


class CreditNoteUpdate(BaseModel):
    reason: Optional[str] = None
    subtotal: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    is_active: Optional[bool] = None


class CreditNoteResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    invoice_id: Optional[int]
    credit_note_number: str
    credit_note_type: CreditNoteType
    reason: Optional[str]
    status: CreditNoteStatus
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    remaining_amount: Decimal
    currency: str
    issue_date: date
    voided_at: Optional[datetime]
    voided_reason: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CreditNoteListResponse(PaginatedResponse):
    items: List[CreditNoteResponse]


class CreditNoteApplicationResponse(BaseModel):
    id: int
    credit_note_id: int
    invoice_id: int
    amount: Decimal
    created_by: Optional[int]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CreditNoteApplyCreate(BaseModel):
    invoice_id: int
    amount: Decimal


# ═══════════════════════════════════════════════════════════════════════════════
# REFUNDS
# ═══════════════════════════════════════════════════════════════════════════════

class RefundCreate(BaseModel):
    customer_id: int
    payment_id: Optional[int] = None
    credit_note_id: Optional[int] = None
    refund_number: str = Field(..., min_length=1, max_length=50)
    refund_type: RefundType
    amount: Decimal = Field(..., gt=0)
    currency: Optional[str] = None
    gateway: Optional[PaymentGatewayType] = None
    reason: Optional[str] = None


class RefundResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    payment_id: Optional[int]
    credit_note_id: Optional[int]
    refund_number: str
    refund_type: RefundType
    status: RefundStatus
    amount: Decimal
    currency: str
    gateway: Optional[PaymentGatewayType]
    gateway_refund_id: Optional[str]
    reason: Optional[str]
    completed_at: Optional[datetime]
    failure_reason: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class RefundListResponse(PaginatedResponse):
    items: List[RefundResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# TAX RATES & TAXES
# ═══════════════════════════════════════════════════════════════════════════════

class TaxRateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    code: str = Field(..., min_length=1, max_length=50)
    jurisdiction: str = Field(..., min_length=1, max_length=255)
    rate: Decimal
    tax_type: TaxType
    is_compound: bool = False
    is_recoverable: bool = True
    effective_from: date = Field(default_factory=date.today)
    effective_to: Optional[date] = None
    applies_to: TaxApplicability = TaxApplicability.BOTH
    country_code: Optional[str] = Field(None, max_length=2)
    currency_code: Optional[str] = Field(None, max_length=3)
    tax_type_label: Optional[str] = Field(None, max_length=50)
    is_default: bool = False
    priority: int = 0


class TaxRateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    code: Optional[str] = Field(None, min_length=1, max_length=50)
    jurisdiction: Optional[str] = None
    rate: Optional[Decimal] = None
    tax_type: Optional[TaxType] = None
    is_compound: Optional[bool] = None
    is_recoverable: Optional[bool] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    applies_to: Optional[TaxApplicability] = None
    is_active: Optional[bool] = None
    country_code: Optional[str] = None
    currency_code: Optional[str] = None
    tax_type_label: Optional[str] = None
    is_default: Optional[bool] = None
    priority: Optional[int] = None


class TaxRateResponse(BaseModel):
    id: int
    organization_id: int
    name: str
    code: str
    jurisdiction: str
    rate: Decimal
    tax_type: TaxType
    is_compound: bool
    is_recoverable: bool
    effective_from: date
    effective_to: Optional[date]
    applies_to: TaxApplicability
    is_active: bool
    country_code: Optional[str]
    currency_code: Optional[str]
    tax_type_label: Optional[str]
    is_default: bool
    priority: int
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class TaxRateListResponse(PaginatedResponse):
    items: List[TaxRateResponse]


class TaxResponse(BaseModel):
    id: int
    organization_id: int
    invoice_id: Optional[int]
    credit_note_id: Optional[int]
    tax_rate_id: Optional[int]
    taxable_amount: Decimal
    tax_amount: Decimal
    tax_percentage: Decimal
    jurisdiction: Optional[str]
    tax_type: Optional[TaxType]
    is_reverse_charge: bool
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# DUNNING LEVELS & CASES
# ═══════════════════════════════════════════════════════════════════════════════

class DunningLevelCreate(BaseModel):
    level_number: int
    name: str = Field(..., min_length=1, max_length=100)
    min_days_overdue: int
    max_days_overdue: Optional[int] = None
    action_type: str
    action_template: Optional[str] = None
    fee_amount: Decimal = Decimal("0")
    fee_percentage: Decimal = Decimal("0")


class DunningLevelUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    min_days_overdue: Optional[int] = None
    max_days_overdue: Optional[int] = None
    action_type: Optional[str] = None
    action_template: Optional[str] = None
    fee_amount: Optional[Decimal] = None
    fee_percentage: Optional[Decimal] = None
    is_active: Optional[bool] = None


class DunningLevelResponse(BaseModel):
    id: int
    organization_id: int
    level_number: int
    name: str
    min_days_overdue: int
    max_days_overdue: Optional[int]
    action_type: str
    action_template: Optional[str]
    fee_amount: Decimal
    fee_percentage: Decimal
    is_active: bool
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class DunningCaseCreate(BaseModel):
    customer_id: int
    invoice_id: int
    total_overdue_amount: Decimal = Field(..., gt=0)
    days_overdue: int = Field(..., ge=0)
    current_level: int = Field(1, ge=1)
    status: Optional[DunningStatus] = DunningStatus.ACTIVE
    auto_escalate: Optional[bool] = True
    next_action_at: Optional[date] = None
    notes: Optional[str] = None


class DunningCaseUpdate(BaseModel):
    total_overdue_amount: Optional[Decimal] = None
    days_overdue: Optional[int] = None
    current_level: Optional[int] = None
    status: Optional[DunningStatus] = None
    last_action_type: Optional[str] = None
    last_action_at: Optional[datetime] = None
    next_action_at: Optional[date] = None
    auto_escalate: Optional[bool] = None
    resolution_note: Optional[str] = None
    is_active: Optional[bool] = None


class DunningCaseResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    invoice_id: int
    status: DunningStatus
    current_level: int
    total_overdue_amount: Decimal
    days_overdue: int
    last_action_at: Optional[datetime]
    last_action_type: Optional[str]
    next_action_at: Optional[date]
    auto_escalate: bool
    resolved_at: Optional[datetime]
    resolution_note: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class DunningCaseListResponse(PaginatedResponse):
    items: List[DunningCaseResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# COLLECTIONS CASES
# ═══════════════════════════════════════════════════════════════════════════════

class CollectionsCaseCreate(BaseModel):
    customer_id: int
    invoice_id: int
    case_number: str = Field(..., min_length=1, max_length=50)
    assigned_to: Optional[int] = None
    total_outstanding: Decimal
    days_overdue: int
    priority: CollectionsPriority = CollectionsPriority.NORMAL
    notes: Optional[str] = None


class CollectionsCaseUpdate(BaseModel):
    status: Optional[CollectionsStatus] = None
    assigned_to: Optional[int] = None
    priority: Optional[CollectionsPriority] = None
    amount_collected: Optional[Decimal] = None
    last_contact_at: Optional[datetime] = None
    next_action_date: Optional[date] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None


class CollectionsCaseResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    invoice_id: int
    case_number: str
    status: CollectionsStatus
    assigned_to: Optional[int]
    total_outstanding: Decimal
    amount_collected: Decimal
    days_overdue: int
    priority: CollectionsPriority
    last_contact_at: Optional[datetime]
    next_action_date: Optional[date]
    resolution: Optional[str]
    resolved_at: Optional[datetime]
    notes: Optional[str]
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class CollectionsCaseListResponse(PaginatedResponse):
    items: List[CollectionsCaseResponse]


class CollectionActionResponse(BaseModel):
    id: int
    collection_id: int
    action_type: str
    description: Optional[str]
    performed_by: Optional[int]
    performed_at: Optional[datetime]
    outcome: Optional[str]
    follow_up_date: Optional[date]

    model_config = ConfigDict(from_attributes=True)


class CollectionActionCreate(BaseModel):
    action_type: str
    description: Optional[str] = None
    outcome: Optional[str] = None
    follow_up_date: Optional[date] = None


# ═══════════════════════════════════════════════════════════════════════════════
# REVENUE RECOGNITION
# ═══════════════════════════════════════════════════════════════════════════════

class RevenueRecognitionScheduleCreate(BaseModel):
    invoice_id: int
    subscription_id: Optional[int] = None
    recognition_method: RecognitionMethod
    total_amount: Decimal
    start_date: date
    end_date: date


class RevenueRecognitionScheduleUpdate(BaseModel):
    recognition_method: Optional[RecognitionMethod] = None
    total_amount: Optional[Decimal] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    is_active: Optional[bool] = None


class RevenueRecognitionScheduleResponse(BaseModel):
    id: int
    organization_id: int
    invoice_id: int
    subscription_id: Optional[int]
    recognition_method: RecognitionMethod
    total_amount: Decimal
    recognized_amount: Decimal
    deferred_amount: Decimal
    start_date: date
    end_date: date
    status: RecognitionStatus
    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class RevenueRecognitionEntryResponse(BaseModel):
    id: int
    schedule_id: int
    entry_date: date
    amount: Decimal
    is_released: bool
    released_at: Optional[datetime]
    created_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


# ═══════════════════════════════════════════════════════════════════════════════
# BILLING AUDIT LOGS
# ═══════════════════════════════════════════════════════════════════════════════

class BillingAuditLogResponse(BaseModel):
    id: int
    organization_id: int
    actor_id: Optional[int]
    entity_type: str
    entity_id: int
    action: BillingAuditAction
    old_values: Optional[Dict[str, Any]]
    new_values: Optional[Dict[str, Any]]
    changes: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_id: Optional[str]
    timestamp: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class BillingAuditLogListResponse(PaginatedResponse):
    items: List[BillingAuditLogResponse]


# ═══════════════════════════════════════════════════════════════════════════════
# DASHBOARD SCHEMAS
# ═══════════════════════════════════════════════════════════════════════════════

# ═══════════════════════════════════════════════════════════════════════════════
# BILLING CONFIGURATION (Enterprise-grade)
# ═══════════════════════════════════════════════════════════════════════════════

class BillingConfigurationUpdate(BaseModel):
    company_name: Optional[str] = None
    billing_email: Optional[str] = None
    billing_phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    fiscal_year_start: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    default_currency: Optional[CurrencyCode] = None
    supported_currencies: Optional[List[str]] = None
    date_format: Optional[DateFormat] = None
    timezone: Optional[str] = None
    language: Optional[str] = None

    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None

    business_registration_number: Optional[str] = None
    gst_number: Optional[str] = None
    vat_number: Optional[str] = None
    pan_number: Optional[str] = None
    tin_number: Optional[str] = None

    invoice_prefix: Optional[str] = None
    invoice_number_format: Optional[NumberFormat] = None
    invoice_sequence_reset: Optional[SequenceReset] = None
    quote_prefix: Optional[str] = None
    quote_number_format: Optional[NumberFormat] = None
    quote_sequence_reset: Optional[SequenceReset] = None
    credit_note_prefix: Optional[str] = None
    credit_note_number_format: Optional[NumberFormat] = None
    credit_note_sequence_reset: Optional[SequenceReset] = None
    refund_prefix: Optional[str] = None
    refund_number_format: Optional[NumberFormat] = None
    refund_sequence_reset: Optional[SequenceReset] = None
    auto_generate_invoice_number: Optional[bool] = None
    invoice_footer: Optional[str] = None
    invoice_terms: Optional[str] = None
    invoice_notes: Optional[str] = None
    invoice_logo_url: Optional[str] = None
    invoice_watermark: Optional[str] = None
    invoice_template: Optional[InvoiceTemplate] = None
    invoice_pdf_template: Optional[str] = None
    draft_behaviour: Optional[DraftBehaviour] = None
    invoice_terms_and_conditions: Optional[str] = None
    show_tax_breakdown: Optional[bool] = None
    show_discount: Optional[bool] = None
    show_shipping: Optional[bool] = None
    default_due_days: Optional[int] = None
    payment_reminder_days_before: Optional[int] = None
    late_payment_fee_percentage: Optional[Decimal] = None
    late_payment_fee_flat: Optional[Decimal] = None

    base_currency: Optional[CurrencyCode] = None
    currency_precision: Optional[int] = None
    currency_symbol_position: Optional[CurrencySymbolPosition] = None

    default_payment_terms: Optional[PaymentTerm] = None
    payment_term_options: Optional[List[str]] = None
    supported_payment_methods: Optional[List[str]] = None
    auto_send_receipts: Optional[bool] = None
    exchange_rate_provider: Optional[ExchangeRateProvider] = None
    exchange_rate_auto_update: Optional[bool] = None
    rounding_method: Optional[RoundingMethod] = None
    rounding_precision: Optional[int] = None

    gateway_stripe_enabled: Optional[bool] = None
    gateway_razorpay_enabled: Optional[bool] = None
    gateway_paypal_enabled: Optional[bool] = None
    gateway_cash_enabled: Optional[bool] = None
    gateway_bank_transfer_enabled: Optional[bool] = None
    gateway_upi_enabled: Optional[bool] = None
    gateway_offline_enabled: Optional[bool] = None
    webhook_secret: Optional[str] = None
    retry_rules: Optional[Dict[str, Any]] = None
    auto_capture_enabled: Optional[bool] = None
    refund_settings: Optional[Dict[str, Any]] = None
    grace_period_days: Optional[int] = None
    credit_limit: Optional[Decimal] = None

    tax_calculation_method: Optional[TaxCalculationMethod] = None
    default_tax_rate_id: Optional[int] = None
    tax_label: Optional[str] = None
    tax_number: Optional[str] = None
    tax_profiles: Optional[List[Dict[str, Any]]] = None
    is_tax_inclusive_default: Optional[bool] = None
    show_tax_on_invoice: Optional[bool] = None
    enable_auto_tax_calculation: Optional[bool] = None

    gst_enabled: Optional[bool] = None
    gst_settings: Optional[Dict[str, Any]] = None
    vat_settings: Optional[Dict[str, Any]] = None
    sales_tax_enabled: Optional[bool] = None
    sales_tax_settings: Optional[Dict[str, Any]] = None
    service_tax_enabled: Optional[bool] = None
    service_tax_settings: Optional[Dict[str, Any]] = None
    withholding_tax_enabled: Optional[bool] = None
    withholding_tax_settings: Optional[Dict[str, Any]] = None
    reverse_charge_enabled: Optional[bool] = None
    reverse_charge_settings: Optional[Dict[str, Any]] = None
    compound_tax_enabled: Optional[bool] = None
    compound_tax_settings: Optional[Dict[str, Any]] = None
    tax_regions: Optional[List[Dict[str, Any]]] = None
    tax_categories: Optional[List[Dict[str, Any]]] = None
    hsn_sac_codes: Optional[List[Dict[str, Any]]] = None
    tax_rounding_method: Optional[TaxRoundingMethod] = None
    # Catch-all for unmapped frontend tax preference toggles (stored inside tax_profiles JSON).
    tax_preferences: Optional[Dict[str, Any]] = None

    auto_dunning: Optional[bool] = None
    dunning_level_count: Optional[int] = None
    dunning_wait_days: Optional[int] = None
    dunning_action_types: Optional[List[str]] = None
    enable_escalation_to_collections: Optional[bool] = None
    collections_wait_days: Optional[int] = None
    dunning_email_template: Optional[str] = None
    reminder_schedule: Optional[Dict[str, Any]] = None
    reminder_sms_enabled: Optional[bool] = None
    reminder_whatsapp_enabled: Optional[bool] = None
    auto_suspend_enabled: Optional[bool] = None
    grace_days: Optional[int] = None
    penalty_settings: Optional[Dict[str, Any]] = None
    interest_settings: Optional[Dict[str, Any]] = None
    final_notice_template: Optional[str] = None

    enable_revenue_recognition: Optional[bool] = None
    revenue_recognition_method: Optional[RevenueRecognitionMethod] = None
    revenue_recognition_deferral_days: Optional[int] = None
    recognized_revenue_method: Optional[RecognizedRevenueMethod] = None
    revenue_accounts: Optional[Dict[str, Any]] = None
    recognition_frequency: Optional[str] = None
    recognition_schedule: Optional[List[Dict[str, Any]]] = None

    enable_multi_currency: Optional[bool] = None
    home_currency: Optional[CurrencyCode] = None

    # Exchange Rates (Phase 1)
    exchange_rate_usd: Optional[Decimal] = None
    exchange_rate_inr: Optional[Decimal] = None
    exchange_rate_gbp: Optional[Decimal] = None
    exchange_rate_eur: Optional[Decimal] = None
    exchange_rate_aed: Optional[Decimal] = None

    # Exchange Rates (Phase 2: Live API)
    exchange_rates: Optional[Dict[str, Any]] = None
    exchange_rate_base_currency: Optional[str] = None
    exchange_rate_last_refreshed: Optional[datetime] = None
    exchange_rate_auto_refresh: Optional[bool] = None

    email_templates: Optional[Dict[str, Any]] = None
    sms_templates: Optional[Dict[str, Any]] = None
    notification_preferences: Optional[Dict[str, Any]] = None

    notify_invoice_created: Optional[bool] = None
    notify_invoice_sent: Optional[bool] = None
    notify_invoice_paid: Optional[bool] = None
    notify_invoice_overdue: Optional[bool] = None
    notify_subscription_renewed: Optional[bool] = None
    notify_subscription_cancelled: Optional[bool] = None
    notify_payment_failed: Optional[bool] = None
    notify_payment_success: Optional[bool] = None
    notify_customer_created: Optional[bool] = None

    enable_approval_workflow: Optional[bool] = None
    enable_credit_notes: Optional[bool] = None
    enable_discounts: Optional[bool] = None
    enable_retainers: Optional[bool] = None
    enable_schedule_invoicing: Optional[bool] = None
    enable_partial_payments: Optional[bool] = None
    enable_auto_apply_credits: Optional[bool] = None
    enable_quotes: Optional[bool] = None
    enable_contracts: Optional[bool] = None
    enable_usage_billing: Optional[bool] = None
    enable_refunds: Optional[bool] = None
    enable_auto_taxes: Optional[bool] = None
    enable_audit_logs: Optional[bool] = None
    security_settings: Optional[Dict[str, Any]] = None

    product_numbering_prefix: Optional[str] = None
    product_numbering_format: Optional[str] = None
    default_product_currency: Optional[str] = None
    default_category_id: Optional[int] = None
    default_tax_rate: Optional[str] = None
    max_discount_percentage: Optional[Decimal] = None
    usage_billing_unit: Optional[str] = None
    usage_billing_rounding: Optional[str] = None
    auto_archive_days: Optional[int] = None
    product_visibility: Optional[str] = None
    require_sku: Optional[str] = None

    # ── Contract Settings ──
    default_contract_prefix: Optional[str] = None
    contract_number_format: Optional[str] = None
    auto_generate_contract_number: Optional[bool] = None
    default_notice_period_days: Optional[int] = None
    default_contract_term_days: Optional[int] = None
    auto_renew_default: Optional[bool] = None
    default_renewal_term_days: Optional[int] = None
    require_customer_signature: Optional[bool] = None
    require_org_signature: Optional[bool] = None
    default_terms_and_conditions: Optional[str] = None


class BillingConfigurationResponse(BaseModel):
    id: int
    organization_id: int
    company_name: Optional[str]
    billing_email: Optional[str]
    billing_phone: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    fiscal_year_start: str
    fiscal_year_end: str
    default_currency: CurrencyCode
    supported_currencies: List[str]
    date_format: DateFormat
    timezone: str
    language: str

    country: Optional[str]
    state: Optional[str]
    city: Optional[str]
    postal_code: Optional[str]
    address_line1: Optional[str]
    address_line2: Optional[str]

    business_registration_number: Optional[str]
    gst_number: Optional[str]
    vat_number: Optional[str]
    pan_number: Optional[str]
    tin_number: Optional[str]

    invoice_prefix: str
    invoice_number_format: NumberFormat
    invoice_sequence_reset: SequenceReset
    quote_prefix: str
    quote_number_format: NumberFormat
    quote_sequence_reset: SequenceReset
    credit_note_prefix: str
    credit_note_number_format: NumberFormat
    credit_note_sequence_reset: SequenceReset
    refund_prefix: str
    refund_number_format: NumberFormat
    refund_sequence_reset: SequenceReset
    auto_generate_invoice_number: bool
    invoice_footer: Optional[str]
    invoice_terms: Optional[str]
    invoice_notes: Optional[str]
    invoice_logo_url: Optional[str]
    invoice_watermark: Optional[str]
    invoice_template: InvoiceTemplate
    invoice_pdf_template: str
    draft_behaviour: DraftBehaviour
    invoice_terms_and_conditions: Optional[str]
    show_tax_breakdown: bool
    show_discount: bool
    show_shipping: bool
    default_due_days: int
    payment_reminder_days_before: int
    late_payment_fee_percentage: Decimal
    late_payment_fee_flat: Decimal

    base_currency: CurrencyCode
    currency_precision: int
    currency_symbol_position: CurrencySymbolPosition

    default_payment_terms: PaymentTerm
    payment_term_options: List[str]
    supported_payment_methods: List[str]
    auto_send_receipts: bool
    exchange_rate_provider: ExchangeRateProvider
    exchange_rate_auto_update: bool
    rounding_method: RoundingMethod
    rounding_precision: int

    gateway_stripe_enabled: bool
    gateway_razorpay_enabled: bool
    gateway_paypal_enabled: bool
    gateway_cash_enabled: bool
    gateway_bank_transfer_enabled: bool
    gateway_upi_enabled: bool
    gateway_offline_enabled: bool
    webhook_secret: Optional[str]
    retry_rules: Dict[str, Any]
    auto_capture_enabled: bool
    refund_settings: Dict[str, Any]
    grace_period_days: int
    credit_limit: Decimal

    tax_calculation_method: TaxCalculationMethod
    default_tax_rate_id: Optional[int]
    tax_label: str
    tax_number: Optional[str]
    tax_profiles: List[Dict[str, Any]]
    is_tax_inclusive_default: bool
    show_tax_on_invoice: bool
    enable_auto_tax_calculation: bool

    gst_enabled: bool
    gst_settings: Dict[str, Any]
    vat_settings: Dict[str, Any]
    sales_tax_enabled: bool
    sales_tax_settings: Dict[str, Any]
    service_tax_enabled: bool
    service_tax_settings: Dict[str, Any]
    withholding_tax_enabled: bool
    withholding_tax_settings: Dict[str, Any]
    reverse_charge_enabled: bool
    reverse_charge_settings: Dict[str, Any]
    compound_tax_enabled: bool
    compound_tax_settings: Dict[str, Any]
    tax_regions: List[Dict[str, Any]]
    tax_categories: List[Dict[str, Any]]
    hsn_sac_codes: List[Dict[str, Any]]
    tax_rounding_method: TaxRoundingMethod

    auto_dunning: bool
    dunning_level_count: int
    dunning_wait_days: int
    dunning_action_types: List[str]
    enable_escalation_to_collections: bool
    collections_wait_days: int
    dunning_email_template: Optional[str]
    reminder_schedule: Dict[str, Any]
    reminder_sms_enabled: bool
    reminder_whatsapp_enabled: bool
    auto_suspend_enabled: bool
    grace_days: int
    penalty_settings: Dict[str, Any]
    interest_settings: Dict[str, Any]
    final_notice_template: Optional[str]

    enable_revenue_recognition: bool
    revenue_recognition_method: RevenueRecognitionMethod
    revenue_recognition_deferral_days: int
    recognized_revenue_method: RecognizedRevenueMethod
    revenue_accounts: Dict[str, Any]
    recognition_frequency: str
    recognition_schedule: List[Dict[str, Any]]

    enable_multi_currency: bool
    home_currency: CurrencyCode

    # Exchange Rates (Phase 1)
    exchange_rate_usd: Optional[Decimal]
    exchange_rate_inr: Optional[Decimal]
    exchange_rate_gbp: Optional[Decimal]
    exchange_rate_eur: Optional[Decimal]
    exchange_rate_aed: Optional[Decimal]

    # Exchange Rates (Phase 2: Live API)
    exchange_rates: Optional[Dict[str, Any]]
    exchange_rate_base_currency: Optional[str]
    exchange_rate_last_refreshed: Optional[datetime]
    exchange_rate_auto_refresh: bool

    email_templates: Dict[str, Any]
    sms_templates: Dict[str, Any]
    notification_preferences: Dict[str, Any]

    notify_invoice_created: bool
    notify_invoice_sent: bool
    notify_invoice_paid: bool
    notify_invoice_overdue: bool
    notify_subscription_renewed: bool
    notify_subscription_cancelled: bool
    notify_payment_failed: bool
    notify_payment_success: bool
    notify_customer_created: bool

    enable_approval_workflow: bool
    enable_credit_notes: bool
    enable_discounts: bool
    enable_retainers: bool
    enable_schedule_invoicing: bool
    enable_partial_payments: bool
    enable_auto_apply_credits: bool
    enable_quotes: bool
    enable_contracts: bool
    enable_usage_billing: bool
    enable_refunds: bool
    enable_auto_taxes: bool
    enable_audit_logs: bool
    security_settings: Dict[str, Any]

    product_numbering_prefix: Optional[str]
    product_numbering_format: Optional[str]
    default_product_currency: Optional[str]
    default_category_id: Optional[int]
    default_tax_rate: Optional[str]
    max_discount_percentage: Optional[Decimal]
    usage_billing_unit: Optional[str]
    usage_billing_rounding: Optional[str]
    auto_archive_days: Optional[int]
    product_visibility: Optional[str]
    require_sku: Optional[str]

    # ── Contract Settings ──
    default_contract_prefix: Optional[str]
    contract_number_format: Optional[str]
    auto_generate_contract_number: bool
    default_notice_period_days: int
    default_contract_term_days: int
    auto_renew_default: bool
    default_renewal_term_days: int
    require_customer_signature: bool
    require_org_signature: bool
    default_terms_and_conditions: Optional[str]

    is_active: bool
    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    model_config = ConfigDict(from_attributes=True)


class BillingConfigurationResetResponse(BaseModel):
    message: str
    configuration: BillingConfigurationResponse


class TestEmailRequest(BaseModel):
    email: str
    template_type: str = "test"


class TestEmailResponse(BaseModel):
    message: str
    sent_to: str


# ── Customer Documents ─────────────────────────────────────────────────────


class CustomerDocumentCreate(BaseModel):
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    document_type: Optional[str] = None
    notes: Optional[str] = None


class CustomerDocumentUpdate(BaseModel):
    file_name: Optional[str] = None
    document_type: Optional[str] = None
    notes: Optional[str] = None


class CustomerDocumentResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    file_name: str
    file_path: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None
    document_type: Optional[str] = None
    notes: Optional[str] = None
    uploaded_by: Optional[int] = None
    version: int = 1
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Customer Notes ─────────────────────────────────────────────────────────


class CustomerNoteCreate(BaseModel):
    content: str
    is_pinned: bool = False
    is_internal: bool = False


class CustomerNoteUpdate(BaseModel):
    content: Optional[str] = None
    is_pinned: Optional[bool] = None
    is_internal: Optional[bool] = None


class CustomerNoteResponse(BaseModel):
    id: int
    organization_id: int
    customer_id: int
    content: str
    is_pinned: bool = False
    is_internal: bool = False
    created_by: Optional[int] = None
    updated_by: Optional[int] = None
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Customer Import / Export ───────────────────────────────────────────────


class CustomerImportResponse(BaseModel):
    success: bool
    imported: int = 0
    skipped: int = 0
    errors: List[str] = []


class CustomerKPIResponse(BaseModel):
    total_customers: int = 0
    active_customers: int = 0
    inactive_customers: int = 0
    new_this_month: int = 0
    new_customers_30d: int = 0
    customers_with_outstanding_balance: int = 0
    customers_over_credit_limit: int = 0
    total_revenue: float = 0
    avg_revenue_per_customer: float = 0
    avg_collection_time_days: float = 0
    outstanding_balance: float = 0
    credit_utilization: float = 0
    avg_invoice_value: float = 0
    total_invoices: int = 0
    paid_invoices: int = 0
    open_quotations: int = 0
    active_contracts: int = 0
    active_subscriptions: int = 0
    credit_notes_total: float = 0
    refunds_total: float = 0
    revenue_by_customer: List[Dict[str, Any]] = []
    outstanding_by_customer: List[Dict[str, Any]] = []


class CustomerAnalyticsResponse(BaseModel):
    total_revenue: float = 0
    total_invoices: int = 0
    outstanding_balance: float = 0
    total_paid: float = 0
    avg_invoice_value: float = 0
    avg_payment_time_days: float = 0
    open_quotations: int = 0
    active_contracts: int = 0
    active_subscriptions: int = 0
    credit_notes_total: float = 0
    refunds_total: float = 0


class CreditBalanceAdjustmentRequest(BaseModel):
    amount: float
    type: str  # "increase", "decrease", "adjustment"
    reason: str


class CreditBalanceAdjustmentResponse(BaseModel):
    customer_id: int
    previous_balance: float
    new_balance: float
    adjustment: float
    type: str
    message: str


class SyncExchangeRatesResponse(BaseModel):
    message: str
    rates: Optional[Dict[str, Decimal]] = None
    count: int = 0


class BillingDashboardResponse(BaseModel):
    kpis: Optional[Dict[str, Any]] = None
    monthly_revenue: Optional[Dict[str, Any]] = None
    invoice_summary: Optional[Dict[str, Any]] = None
    customer_summary: Optional[Dict[str, Any]] = None
    subscription_summary: Optional[Dict[str, Any]] = None
    total_revenue: float = 0
    outstanding_amount: float = 0
    overdue_amount: float = 0
    total_customers: int = 0
    active_subscriptions: int = 0
    draft_invoices: int = 0
    unpaid_invoices: int = 0
    paid_invoices: int = 0
    overdue_invoices: int = 0
    recent_payments: List[Dict[str, Any]] = []
    revenue_trend: List[Dict[str, Any]] = []
