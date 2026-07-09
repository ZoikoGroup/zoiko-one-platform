"""
modules/billing/models.py
-------------------------
Enterprise SQLAlchemy ORM models for the Zoiko Billing module.

Follows Zoiko HR enterprise patterns for multi-tenancy, audit, and RBAC.

Tables (23):
  Core        - billing_settings, billing_customers, customer_contacts
  Catalog     - product_categories, products, pricing_plans, plan_tiers
  Sales       - contracts, quotations, quotation_items
  Recurring   - subscription_plans, subscriptions, subscription_events
  Invoicing   - invoices, invoice_items, invoice_status_history
  Payments    - payment_methods, payments, payment_allocations, payment_attempts
  Credits     - credit_notes, credit_note_applications, refunds
  Tax         - tax_rates, taxes
  Collections - dunning_levels, dunning_cases, collections_cases, collection_actions
  Revenue     - revenue_recognition_schedules, revenue_recognition_entries
  Audit       - billing_audit_logs
"""

import enum
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from sqlalchemy import (
    Column, Integer, String, Numeric, Boolean, Date, DateTime,
    Text, Enum as SQLEnum, ForeignKey, Float, JSON, Time, UniqueConstraint,
    Index, CheckConstraint,
)
from sqlalchemy.orm import Session, relationship
from sqlalchemy.sql import func

from app.database import Base

from app.modules.employee.models import (
    CaseInsensitiveEnum,
)


# ═══════════════════════════════════════════════════════════════════════════════
# ENUMS
# ═══════════════════════════════════════════════════════════════════════════════


class CustomerStatus(str, enum.Enum):
    ACTIVE    = "active"
    INACTIVE  = "inactive"
    SUSPENDED = "suspended"
    CLOSED    = "closed"


class CustomerType(str, enum.Enum):
    BUSINESS   = "business"
    INDIVIDUAL = "individual"
    NON_PROFIT = "non_profit"
    GOVERNMENT = "government"


class ProductType(str, enum.Enum):
    SERVICE      = "service"
    GOOD         = "good"
    SUBSCRIPTION = "subscription"
    USAGE        = "usage"
    RETAINER     = "retainer"
    OTHER        = "other"


class BillingPeriod(str, enum.Enum):
    MONTHLY      = "monthly"
    QUARTERLY    = "quarterly"
    SEMI_ANNUAL  = "semi_annual"
    ANNUAL       = "annual"
    ONE_TIME     = "one_time"


class PricingModel(str, enum.Enum):
    FLAT      = "flat"
    PER_UNIT  = "per_unit"
    TIERED    = "tiered"
    VOLUME    = "volume"
    GRADUATED = "graduated"


class QuoteStatus(str, enum.Enum):
    DRAFT     = "draft"
    SENT      = "sent"
    ACCEPTED  = "accepted"
    REJECTED  = "rejected"
    EXPIRED   = "expired"
    CONVERTED = "converted"
    CANCELLED = "cancelled"


class ContractStatus(str, enum.Enum):
    DRAFT      = "draft"
    ACTIVE     = "active"
    EXPIRED    = "expired"
    TERMINATED = "terminated"
    CANCELLED  = "cancelled"


class PlanCategory(str, enum.Enum):
    SUBSCRIPTION = "subscription"
    USAGE        = "usage"
    RETAINER     = "retainer"
    BUNDLE       = "bundle"


class BillingSubscriptionStatus(str, enum.Enum):
    ACTIVE    = "active"
    PAUSED    = "paused"
    PAST_DUE  = "past_due"
    CANCELLED = "cancelled"
    EXPIRED   = "expired"


class InvoiceStatus(str, enum.Enum):
    DRAFT     = "draft"
    SENT      = "sent"
    PAID      = "paid"
    OVERDUE   = "overdue"
    CANCELLED = "cancelled"
    PARTIALLY_PAID = "partially_paid"
    REFUNDED  = "refunded"


class InvoiceType(str, enum.Enum):
    STANDARD     = "standard"
    SUBSCRIPTION = "subscription"
    USAGE        = "usage"
    CREDIT       = "credit"
    DEBIT        = "debit"


class InvoiceItemType(str, enum.Enum):
    PRODUCT    = "product"
    DISCOUNT   = "discount"
    TAX        = "tax"
    SHIPPING   = "shipping"
    ADJUSTMENT = "adjustment"


class PaymentType(str, enum.Enum):
    INVOICE_PAYMENT      = "invoice_payment"
    SUBSCRIPTION_PAYMENT = "subscription_payment"
    MANUAL               = "manual"
    REFUND               = "refund"
    DEPOSIT              = "deposit"


class PaymentStatus(str, enum.Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    CLEARED    = "cleared"
    FAILED     = "failed"
    CANCELLED  = "cancelled"
    REFUNDED   = "refunded"


class PaymentGatewayType(str, enum.Enum):
    CREDIT_CARD  = "credit_card"
    ACH          = "ach"
    PAYPAL       = "paypal"
    BANK_ACCOUNT = "bank_account"
    WALLET       = "wallet"
    WIRE_TRANSFER = "wire_transfer"
    BANK_TRANSFER = "bank_transfer"
    CASH         = "cash"
    CHECK        = "check"


class PaymentMethodStatus(str, enum.Enum):
    ACTIVE   = "active"
    EXPIRED  = "expired"
    FAILED   = "failed"
    REMOVED  = "removed"


class CreditNoteType(str, enum.Enum):
    REFUND       = "refund"
    ADJUSTMENT   = "adjustment"
    PROMOTIONAL  = "promotional"
    WRITE_OFF    = "write_off"
    CANCELLATION = "cancellation"


class CreditNoteStatus(str, enum.Enum):
    DRAFT             = "draft"
    ISSUED            = "issued"
    PARTIALLY_APPLIED = "partially_applied"
    FULLY_APPLIED     = "fully_applied"
    VOIDED            = "voided"


class RefundType(str, enum.Enum):
    FULL   = "full"
    PARTIAL = "partial"


class RefundStatus(str, enum.Enum):
    PENDING    = "pending"
    PROCESSING = "processing"
    COMPLETED  = "completed"
    FAILED     = "failed"
    REJECTED   = "rejected"


class TaxType(str, enum.Enum):
    SALES_TAX   = "sales_tax"
    VAT         = "vat"
    GST         = "gst"
    SERVICE_TAX = "service_tax"
    WITHHOLDING = "withholding"
    CUSTOMS     = "customs"


class TaxApplicability(str, enum.Enum):
    PRODUCTS = "products"
    SERVICES = "services"
    BOTH     = "both"


class DunningStatus(str, enum.Enum):
    ACTIVE    = "active"
    RESOLVED  = "resolved"
    ESCALATED = "escalated"
    CLOSED    = "closed"


class CollectionsStatus(str, enum.Enum):
    OPEN        = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED    = "resolved"
    CLOSED      = "closed"
    ESCALATED   = "escalated"


class CollectionsPriority(str, enum.Enum):
    LOW    = "low"
    NORMAL = "normal"
    HIGH   = "high"
    URGENT = "urgent"


class RecognitionMethod(str, enum.Enum):
    IMMEDIATE        = "immediate"
    DAILY_PRORATED   = "daily_prorated"
    MONTHLY_PRORATED = "monthly_prorated"
    MILESTONE        = "milestone"
    MANUAL           = "manual"


class RecognitionStatus(str, enum.Enum):
    PENDING     = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED   = "completed"
    ON_HOLD     = "on_hold"


class BillingAuditAction(str, enum.Enum):
    CREATE  = "create"
    UPDATE  = "update"
    DELETE  = "delete"
    SEND    = "send"
    APPROVE = "approve"
    REJECT  = "reject"
    PAY     = "pay"
    REFUND  = "refund"
    CANCEL  = "cancel"
    VOID    = "void"
    EXPORT  = "export"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 01: BILLING SETTINGS
# ═══════════════════════════════════════════════════════════════════════════════


class BillingSetting(Base):
    __tablename__ = "billing_settings"

    id                        = Column(Integer, primary_key=True, index=True)
    organization_id           = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, unique=True, index=True)
    default_currency          = Column(String(3), default="USD")
    fiscal_year_start         = Column(String(5), default="01-01")
    default_payment_terms     = Column(String(50), default="net_30")
    default_invoice_prefix    = Column(String(10), default="INV-")
    default_quote_prefix      = Column(String(10), default="QTE-")
    auto_generate_invoice_number = Column(Boolean, default=True)
    invoice_number_format     = Column(String(100), nullable=True)
    default_tax_rate_id       = Column(Integer, ForeignKey("tax_rates.id", ondelete="SET NULL"), nullable=True)
    auto_apply_credits        = Column(Boolean, default=True)
    auto_send_invoices        = Column(Boolean, default=False)
    auto_send_receipts        = Column(Boolean, default=True)
    auto_dunning              = Column(Boolean, default=True)
    dunning_level_count       = Column(Integer, default=4)
    payment_reminder_days_before = Column(Integer, default=3)
    late_payment_fee_percentage  = Column(Numeric(5, 2), default=0)
    late_payment_fee_flat     = Column(Numeric(14, 2), default=0)
    enable_revenue_recognition   = Column(Boolean, default=False)
    enable_multi_currency     = Column(Boolean, default=False)
    billing_email             = Column(String(255), nullable=True)
    billing_phone             = Column(String(30), nullable=True)
    terms_and_conditions      = Column(Text, nullable=True)
    logo_url                  = Column(String(500), nullable=True)
    is_active                 = Column(Boolean, default=True)
    created_by                = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by                = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at                = Column(DateTime(timezone=True), server_default=func.now())
    updated_at                = Column(DateTime(timezone=True), onupdate=func.now())


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 02: BILLING CUSTOMERS
# ═══════════════════════════════════════════════════════════════════════════════


class BillingCustomer(Base):
    __tablename__ = "billing_customers"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_code     = Column(String(50), nullable=False)
    company_name      = Column(String(255), nullable=False)
    display_name      = Column(String(255), nullable=False)
    legal_name        = Column(String(255), nullable=True)

    first_name        = Column(String(100), nullable=True)
    last_name         = Column(String(100), nullable=True)
    email             = Column(String(255), nullable=True)
    alternate_email   = Column(String(255), nullable=True)
    mobile            = Column(String(30), nullable=True)
    phone             = Column(String(30), nullable=True)
    website           = Column(String(500), nullable=True)

    designation       = Column(String(100), nullable=True)
    industry          = Column(String(100), nullable=True)
    employee_count    = Column(Integer, nullable=True)
    customer_type     = Column(CaseInsensitiveEnum(CustomerType), default=CustomerType.BUSINESS, nullable=False)

    gst_number        = Column(String(50), nullable=True)
    vat_number        = Column(String(50), nullable=True)
    pan               = Column(String(50), nullable=True)
    tin               = Column(String(50), nullable=True)
    tax_category      = Column(String(50), nullable=True)
    tax_id            = Column(String(100), nullable=True)
    tax_id_type       = Column(String(50), nullable=True)

    billing_address   = Column(Text, nullable=True)
    shipping_address  = Column(Text, nullable=True)
    payment_terms     = Column(String(50), default="net_30")
    currency          = Column(String(3), default="USD")
    credit_limit      = Column(Numeric(14, 2), default=0)
    credit_days       = Column(Integer, nullable=True)
    price_list        = Column(String(100), nullable=True)

    outstanding_balance = Column(Numeric(14, 2), default=0)
    total_revenue       = Column(Numeric(14, 2), default=0)
    total_invoices      = Column(Integer, default=0)
    total_payments      = Column(Integer, default=0)
    lifetime_value      = Column(Numeric(14, 2), default=0)
    credit_balance      = Column(Numeric(14, 2), default=0)

    notes             = Column(Text, nullable=True)
    tags              = Column(JSON, nullable=True)
    custom_fields     = Column(JSON, nullable=True)
    status            = Column(CaseInsensitiveEnum(CustomerStatus), default=CustomerStatus.ACTIVE, nullable=False, index=True)
    is_active         = Column(Boolean, default=True)
    deleted_at        = Column(DateTime, nullable=True)
    created_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    organization      = relationship("Organization", foreign_keys=[organization_id])
    contacts          = relationship("CustomerContact", back_populates="customer", lazy="selectin")
    invoices          = relationship("Invoice", back_populates="customer", foreign_keys="Invoice.customer_id")
    subscriptions     = relationship("Subscription", back_populates="customer", foreign_keys="Subscription.customer_id")
    payments          = relationship("Payment", back_populates="customer", foreign_keys="Payment.customer_id")
    credit_notes      = relationship("CreditNote", back_populates="customer", foreign_keys="CreditNote.customer_id")
    refunds           = relationship("Refund", back_populates="customer", foreign_keys="Refund.customer_id")
    quotations        = relationship("Quotation", back_populates="customer", foreign_keys="Quotation.customer_id")
    contracts_rel     = relationship("Contract", back_populates="customer", foreign_keys="Contract.customer_id")

    __table_args__ = (
        UniqueConstraint("organization_id", "customer_code", name="uq_billing_customers_org_code"),
    )

    def __repr__(self):
        return f"<BillingCustomer id={self.id} code={self.customer_code} name={self.company_name}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 03: CUSTOMER CONTACTS
# ═══════════════════════════════════════════════════════════════════════════════


class CustomerContact(Base):
    __tablename__ = "customer_contacts"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id     = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    salutation      = Column(String(20), nullable=True)
    first_name      = Column(String(100), nullable=False)
    last_name       = Column(String(100), nullable=False)
    email           = Column(String(255), nullable=False)
    phone           = Column(String(30), nullable=True)
    mobile          = Column(String(30), nullable=True)
    job_title       = Column(String(200), nullable=True)
    department      = Column(String(100), nullable=True)
    is_primary      = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    notes           = Column(Text, nullable=True)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    customer        = relationship("BillingCustomer", back_populates="contacts")

    __table_args__ = (
        UniqueConstraint("customer_id", "email", name="uq_customer_contacts_customer_email"),
    )

    def __repr__(self):
        return f"<CustomerContact id={self.id} name={self.first_name} {self.last_name}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 04: PRODUCT CATEGORIES
# ═══════════════════════════════════════════════════════════════════════════════


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    name            = Column(String(200), nullable=False)
    code            = Column(String(50), nullable=False)
    description     = Column(Text, nullable=True)
    parent_id       = Column(Integer, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True)
    sort_order      = Column(Integer, default=0)
    icon            = Column(String(50), nullable=True)
    color           = Column(String(7), nullable=True)
    is_active       = Column(Boolean, default=True)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    children        = relationship("ProductCategory", backref="parent", remote_side=[id])
    products        = relationship("Product", back_populates="category")

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_product_categories_org_code"),
    )

    def __repr__(self):
        return f"<ProductCategory id={self.id} name={self.name}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 05: PRODUCTS
# ═══════════════════════════════════════════════════════════════════════════════


class Product(Base):
    __tablename__ = "products"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    category_id       = Column(Integer, ForeignKey("product_categories.id", ondelete="SET NULL"), nullable=True)
    name              = Column(String(255), nullable=False)
    code              = Column(String(50), nullable=False)
    description       = Column(Text, nullable=True)
    product_type      = Column(CaseInsensitiveEnum(ProductType), default=ProductType.SERVICE, nullable=False)
    unit_label        = Column(String(50), nullable=True)
    currency          = Column(String(3), default="USD")
    default_price     = Column(Numeric(14, 2), default=0)
    cost_price        = Column(Numeric(14, 2), default=0)
    tax_percentage    = Column(Numeric(5, 2), default=0)
    tax_inclusive     = Column(Boolean, default=False)
    is_subscribable   = Column(Boolean, default=False)
    is_usage_billable = Column(Boolean, default=False)
    is_active         = Column(Boolean, default=True)
    image_url         = Column(String(500), nullable=True)
    deleted_at        = Column(DateTime, nullable=True)
    created_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    category          = relationship("ProductCategory", back_populates="products")
    pricing_plans     = relationship("PricingPlan", back_populates="product")

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_products_org_code"),
    )

    def __repr__(self):
        return f"<Product id={self.id} code={self.code} name={self.name}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 06: PRICING PLANS
# ═══════════════════════════════════════════════════════════════════════════════


class PricingPlan(Base):
    __tablename__ = "pricing_plans"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    product_id        = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    name              = Column(String(255), nullable=False)
    billing_period    = Column(CaseInsensitiveEnum(BillingPeriod), nullable=False)
    billing_cycle_count = Column(Integer, default=0)
    pricing_model     = Column(CaseInsensitiveEnum(PricingModel), default=PricingModel.FLAT, nullable=False)
    unit_price        = Column(Numeric(16, 4), nullable=True)
    flat_fee          = Column(Numeric(14, 2), default=0)
    setup_fee         = Column(Numeric(14, 2), default=0)
    min_quantity      = Column(Integer, default=1)
    max_quantity      = Column(Integer, nullable=True)
    trial_days        = Column(Integer, default=0)
    is_active         = Column(Boolean, default=True)
    effective_from    = Column(Date, nullable=False)
    effective_to      = Column(Date, nullable=True)
    created_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    product           = relationship("Product", back_populates="pricing_plans")
    tiers             = relationship("PlanTier", back_populates="pricing_plan")

    __table_args__ = (
        UniqueConstraint("product_id", "billing_period", "effective_from", name="uq_pricing_plans_product_period"),
        CheckConstraint("unit_price >= 0", name="ck_pricing_plans_unit_price"),
    )

    def __repr__(self):
        return f"<PricingPlan id={self.id} name={self.name}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 07: PLAN TIERS (for tiered/volume/graduated pricing)
# ═══════════════════════════════════════════════════════════════════════════════


class PlanTier(Base):
    __tablename__ = "plan_tiers"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    pricing_plan_id = Column(Integer, ForeignKey("pricing_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    from_quantity   = Column(Integer, nullable=False)
    to_quantity     = Column(Integer, nullable=True)
    unit_price      = Column(Numeric(16, 4), nullable=True)
    flat_fee        = Column(Numeric(14, 2), default=0)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    pricing_plan    = relationship("PricingPlan", back_populates="tiers")

    __table_args__ = (
        CheckConstraint("from_quantity > 0", name="ck_plan_tiers_from_qty"),
        CheckConstraint("to_quantity IS NULL OR to_quantity > from_quantity", name="ck_plan_tiers_range"),
    )

    def __repr__(self):
        return f"<PlanTier id={self.id} from={self.from_quantity} to={self.to_quantity}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 08: CONTRACTS
# ═══════════════════════════════════════════════════════════════════════════════


class Contract(Base):
    __tablename__ = "contracts"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    contract_number     = Column(String(50), nullable=False)
    contract_name       = Column(String(255), nullable=False)
    status              = Column(CaseInsensitiveEnum(ContractStatus), default=ContractStatus.DRAFT, nullable=False, index=True)
    start_date          = Column(Date, nullable=False, index=True)
    end_date            = Column(Date, nullable=True, index=True)
    notice_period_days  = Column(Integer, default=30)
    auto_renew          = Column(Boolean, default=False)
    renewal_term_days   = Column(Integer, nullable=True)
    value               = Column(Numeric(14, 2), default=0)
    signed_by_customer  = Column(Boolean, default=False)
    signed_by_org       = Column(Boolean, default=False)
    signed_at           = Column(DateTime, nullable=True)
    document_url        = Column(String(500), nullable=True)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", back_populates="contracts_rel")
    subscriptions       = relationship("Subscription", back_populates="contract")

    __table_args__ = (
        UniqueConstraint("organization_id", "contract_number", name="uq_contracts_org_number"),
    )

    def __repr__(self):
        return f"<Contract id={self.id} number={self.contract_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 09: QUOTATIONS
# ═══════════════════════════════════════════════════════════════════════════════


class Quotation(Base):
    __tablename__ = "quotations"

    id                        = Column(Integer, primary_key=True, index=True)
    organization_id           = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id               = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    quote_number              = Column(String(50), nullable=False)
    quote_version             = Column(Integer, default=1)
    status                    = Column(CaseInsensitiveEnum(QuoteStatus), default=QuoteStatus.DRAFT, nullable=False, index=True)
    subject                   = Column(String(500), nullable=True)
    subtotal                  = Column(Numeric(14, 2), default=0)
    discount_percentage       = Column(Numeric(5, 2), default=0)
    discount_amount           = Column(Numeric(14, 2), default=0)
    tax_amount                = Column(Numeric(14, 2), default=0)
    total_amount              = Column(Numeric(14, 2), default=0)
    currency                  = Column(String(3), default="USD")
    valid_until               = Column(Date, nullable=True)
    accepted_at               = Column(DateTime, nullable=True)
    rejected_reason           = Column(Text, nullable=True)
    converted_to_invoice_id   = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    converted_to_subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    notes                     = Column(Text, nullable=True)
    terms                     = Column(Text, nullable=True)
    is_active                 = Column(Boolean, default=True)
    created_by                = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by                = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at                = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at                = Column(DateTime(timezone=True), onupdate=func.now())

    customer                  = relationship("BillingCustomer", back_populates="quotations")
    items                     = relationship("QuotationItem", back_populates="quotation")

    __table_args__ = (
        UniqueConstraint("organization_id", "quote_number", name="uq_quotations_org_number"),
    )

    def __repr__(self):
        return f"<Quotation id={self.id} number={self.quote_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 10: QUOTATION ITEMS
# ═══════════════════════════════════════════════════════════════════════════════


class QuotationItem(Base):
    __tablename__ = "quotation_items"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    quotation_id        = Column(Integer, ForeignKey("quotations.id", ondelete="CASCADE"), nullable=False, index=True)
    line_number         = Column(Integer, nullable=False)
    product_id          = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    description         = Column(String(1000), nullable=False)
    quantity            = Column(Numeric(12, 2), nullable=False, default=1)
    unit_price          = Column(Numeric(16, 4), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount     = Column(Numeric(14, 2), default=0)
    tax_percentage      = Column(Numeric(5, 2), default=0)
    tax_amount          = Column(Numeric(14, 2), default=0)
    total_amount        = Column(Numeric(14, 2), nullable=False)
    is_tax_inclusive    = Column(Boolean, default=False)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    quotation           = relationship("Quotation", back_populates="items")

    __table_args__ = (
        UniqueConstraint("quotation_id", "line_number", name="uq_quotation_items_quote_line"),
        CheckConstraint("quantity > 0", name="ck_quotation_items_qty"),
        CheckConstraint("unit_price >= 0", name="ck_quotation_items_price"),
    )

    def __repr__(self):
        return f"<QuotationItem id={self.id} line={self.line_number}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 11: SUBSCRIPTION PLANS
# ═══════════════════════════════════════════════════════════════════════════════


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    plan_code         = Column(String(50), nullable=False)
    plan_name         = Column(String(255), nullable=False)
    description       = Column(Text, nullable=True)
    category          = Column(CaseInsensitiveEnum(PlanCategory), nullable=False)
    billing_period    = Column(CaseInsensitiveEnum(BillingPeriod), nullable=False)
    billing_cycles    = Column(Integer, default=0)
    pricing_model     = Column(CaseInsensitiveEnum(PricingModel), default=PricingModel.FLAT, nullable=False)
    unit_price        = Column(Numeric(16, 4), nullable=True)
    setup_fee         = Column(Numeric(14, 2), default=0)
    trial_days        = Column(Integer, default=0)
    is_public         = Column(Boolean, default=True)
    sort_order        = Column(Integer, default=0)
    is_active         = Column(Boolean, default=True)
    created_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), onupdate=func.now())

    subscriptions     = relationship("Subscription", back_populates="plan")

    __table_args__ = (
        UniqueConstraint("organization_id", "plan_code", name="uq_subscription_plans_org_code"),
    )

    def __repr__(self):
        return f"<SubscriptionPlan id={self.id} code={self.plan_code}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 12: SUBSCRIPTIONS
# ═══════════════════════════════════════════════════════════════════════════════


class Subscription(Base):
    __tablename__ = "subscriptions"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    plan_id             = Column(Integer, ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    contract_id         = Column(Integer, ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)
    subscription_number = Column(String(50), nullable=False)
    status              = Column(CaseInsensitiveEnum(BillingSubscriptionStatus), default=BillingSubscriptionStatus.ACTIVE, nullable=False, index=True)
    quantity            = Column(Integer, default=1)
    unit_price          = Column(Numeric(16, 4), nullable=False)
    setup_fee           = Column(Numeric(14, 2), default=0)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount     = Column(Numeric(14, 2), default=0)
    tax_percentage      = Column(Numeric(5, 2), default=0)
    start_date          = Column(Date, nullable=False, index=True)
    current_term_start  = Column(Date, nullable=False)
    current_term_end    = Column(Date, nullable=False, index=True)
    trial_end_date      = Column(Date, nullable=True)
    cancelled_at        = Column(DateTime, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    paused_at           = Column(DateTime, nullable=True)
    resume_at           = Column(Date, nullable=True)
    last_billed_at      = Column(DateTime, nullable=True)
    next_billing_at     = Column(Date, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", back_populates="subscriptions")
    plan                = relationship("SubscriptionPlan", back_populates="subscriptions")
    contract            = relationship("Contract", back_populates="subscriptions")
    events              = relationship("SubscriptionEvent", back_populates="subscription")

    __table_args__ = (
        UniqueConstraint("organization_id", "subscription_number", name="uq_subscriptions_org_number"),
    )

    def __repr__(self):
        return f"<Subscription id={self.id} number={self.subscription_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 13: SUBSCRIPTION EVENTS (change/audit log)
# ═══════════════════════════════════════════════════════════════════════════════


class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type      = Column(String(50), nullable=False)  # TODO: migrate to CaseInsensitiveEnum(SubscriptionEventType)
    old_value       = Column(JSON, nullable=True)
    new_value       = Column(JSON, nullable=True)
    reason          = Column(Text, nullable=True)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    subscription    = relationship("Subscription", back_populates="events")

    def __repr__(self):
        return f"<SubscriptionEvent id={self.id} type={self.event_type}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 14: INVOICES (enhanced from existing)
# ═══════════════════════════════════════════════════════════════════════════════


class Invoice(Base):
    __tablename__ = "invoices"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    subscription_id     = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    quotation_id        = Column(Integer, ForeignKey("quotations.id", ondelete="SET NULL"), nullable=True)
    contract_id         = Column(Integer, ForeignKey("contracts.id", ondelete="SET NULL"), nullable=True)
    invoice_number      = Column(String(50), nullable=False)
    invoice_type        = Column(CaseInsensitiveEnum(InvoiceType), default=InvoiceType.STANDARD, nullable=False, index=True)
    status              = Column(CaseInsensitiveEnum(InvoiceStatus), default=InvoiceStatus.DRAFT, nullable=False, index=True)
    issue_date          = Column(Date, nullable=False, index=True)
    due_date            = Column(Date, nullable=False, index=True)
    subtotal            = Column(Numeric(14, 2), default=0)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount     = Column(Numeric(14, 2), default=0)
    tax_amount          = Column(Numeric(14, 2), default=0)
    total_amount        = Column(Numeric(14, 2), default=0)
    paid_amount         = Column(Numeric(14, 2), default=0)
    balance_due         = Column(Numeric(14, 2), default=0)
    currency            = Column(String(3), default="USD")
    exchange_rate       = Column(Numeric(12, 6), default=1)
    notes               = Column(Text, nullable=True)
    sent_at             = Column(DateTime, nullable=True)
    reminded_at         = Column(DateTime, nullable=True)
    paid_at             = Column(DateTime, nullable=True)
    cancelled_at        = Column(DateTime, nullable=True)
    cancellation_reason = Column(Text, nullable=True)
    payment_terms       = Column(String(50), nullable=True)
    po_number           = Column(String(100), nullable=True)
    is_recurring        = Column(Boolean, default=False)
    is_active           = Column(Boolean, default=True)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", back_populates="invoices", foreign_keys=[customer_id])
    subscription        = relationship("Subscription", foreign_keys=[subscription_id])
    quotation           = relationship("Quotation", foreign_keys=[quotation_id])
    contract            = relationship("Contract", foreign_keys=[contract_id])
    items               = relationship("InvoiceItem", back_populates="invoice")
    status_history      = relationship("InvoiceStatusHistory", back_populates="invoice")
    payment_allocations = relationship("PaymentAllocation", back_populates="invoice")
    credit_note_applications = relationship("CreditNoteApplication", back_populates="invoice")

    __table_args__ = (
        UniqueConstraint("organization_id", "invoice_number", name="uq_invoices_org_number"),
        CheckConstraint("total_amount >= 0", name="ck_invoices_total"),
        CheckConstraint("paid_amount >= 0", name="ck_invoices_paid"),
        CheckConstraint("discount_percentage BETWEEN 0 AND 100", name="ck_invoices_discount_pct"),
    )

    def __repr__(self):
        return f"<Invoice id={self.id} number={self.invoice_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 15: INVOICE ITEMS (replaces invoice_lines)
# ═══════════════════════════════════════════════════════════════════════════════


class InvoiceItem(Base):
    __tablename__ = "invoice_items"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id          = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    line_number         = Column(Integer, nullable=False)
    product_id          = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)
    item_type           = Column(CaseInsensitiveEnum(InvoiceItemType), default=InvoiceItemType.PRODUCT, nullable=False)
    description         = Column(String(1000), nullable=False)
    quantity            = Column(Numeric(12, 2), nullable=False, default=1)
    unit_price          = Column(Numeric(16, 4), nullable=False)
    discount_percentage = Column(Numeric(5, 2), default=0)
    discount_amount     = Column(Numeric(14, 2), default=0)
    tax_percentage      = Column(Numeric(5, 2), default=0)
    tax_amount          = Column(Numeric(14, 2), default=0)
    total               = Column(Numeric(14, 2), nullable=False)
    is_tax_inclusive    = Column(Boolean, default=False)
    sort_order          = Column(Integer, default=0)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())

    invoice             = relationship("Invoice", back_populates="items")

    __table_args__ = (
        UniqueConstraint("invoice_id", "line_number", name="uq_invoice_items_invoice_line"),
        CheckConstraint("quantity > 0", name="ck_invoice_items_qty"),
        CheckConstraint("unit_price >= 0", name="ck_invoice_items_price"),
        CheckConstraint("discount_percentage BETWEEN 0 AND 100", name="ck_invoice_items_discount_pct"),
    )

    def __repr__(self):
        return f"<InvoiceItem id={self.id} line={self.line_number}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 16: INVOICE STATUS HISTORY
# ═══════════════════════════════════════════════════════════════════════════════


class InvoiceStatusHistory(Base):
    __tablename__ = "invoice_status_history"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id      = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    from_status     = Column(CaseInsensitiveEnum(InvoiceStatus), nullable=True)
    to_status       = Column(CaseInsensitiveEnum(InvoiceStatus), nullable=False)
    changed_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    reason          = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    invoice         = relationship("Invoice", back_populates="status_history")

    def __repr__(self):
        return f"<InvoiceStatusHistory id={self.id} {self.from_status}->{self.to_status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 17: PAYMENT METHODS
# ═══════════════════════════════════════════════════════════════════════════════


class PaymentMethod(Base):
    __tablename__ = "payment_methods"

    id                        = Column(Integer, primary_key=True, index=True)
    organization_id           = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id               = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_type              = Column(CaseInsensitiveEnum(PaymentGatewayType), nullable=False)
    gateway                   = Column(String(50), nullable=False)
    gateway_customer_id       = Column(String(255), nullable=True)
    gateway_payment_method_id = Column(String(255), nullable=True)
    is_default                = Column(Boolean, default=False)
    last_four                 = Column(String(4), nullable=True)
    card_brand                = Column(String(50), nullable=True)
    card_expiry_month         = Column(Integer, nullable=True)
    card_expiry_year          = Column(Integer, nullable=True)
    bank_name                 = Column(String(255), nullable=True)
    account_last_four         = Column(String(4), nullable=True)
    billing_address           = Column(Text, nullable=True)
    status                    = Column(CaseInsensitiveEnum(PaymentMethodStatus), default=PaymentMethodStatus.ACTIVE, nullable=False)
    verified_at               = Column(DateTime, nullable=True)
    is_active                 = Column(Boolean, default=True)
    created_by                = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by                = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at                = Column(DateTime(timezone=True), server_default=func.now())
    updated_at                = Column(DateTime(timezone=True), onupdate=func.now())

    customer                  = relationship("BillingCustomer", foreign_keys=[customer_id])
    payments                  = relationship("Payment", back_populates="payment_method")

    def __repr__(self):
        return f"<PaymentMethod id={self.id} type={self.payment_type} default={self.is_default}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 18: PAYMENTS
# ═══════════════════════════════════════════════════════════════════════════════


class Payment(Base):
    __tablename__ = "payments"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_number      = Column(String(50), nullable=False)
    transaction_id      = Column(String(255), nullable=True)
    payment_method_id   = Column(Integer, ForeignKey("payment_methods.id", ondelete="SET NULL"), nullable=True)
    payment_type        = Column(CaseInsensitiveEnum(PaymentType), nullable=False, index=True)
    status              = Column(CaseInsensitiveEnum(PaymentStatus), default=PaymentStatus.PENDING, nullable=False, index=True)
    amount              = Column(Numeric(14, 2), nullable=False)
    currency            = Column(String(3), default="USD")
    exchange_rate       = Column(Numeric(12, 6), default=1)
    gateway             = Column(CaseInsensitiveEnum(PaymentGatewayType), nullable=True)
    gateway_charge_id   = Column(String(255), nullable=True)
    gateway_fee         = Column(Numeric(14, 2), default=0)
    net_amount          = Column(Numeric(14, 2), default=0)
    payment_date        = Column(Date, nullable=False, index=True)
    cleared_at          = Column(DateTime, nullable=True)
    failure_reason      = Column(Text, nullable=True)
    failure_code        = Column(String(50), nullable=True)
    receipt_sent        = Column(Boolean, default=False)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", back_populates="payments", foreign_keys=[customer_id])
    payment_method      = relationship("PaymentMethod", back_populates="payments")
    allocations         = relationship("PaymentAllocation", back_populates="payment")
    attempts            = relationship("PaymentAttempt", back_populates="payment")

    __table_args__ = (
        UniqueConstraint("organization_id", "payment_number", name="uq_payments_org_number"),
        CheckConstraint("amount > 0", name="ck_payments_amount"),
    )

    def __repr__(self):
        return f"<Payment id={self.id} number={self.payment_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 19: PAYMENT ALLOCATIONS
# ═══════════════════════════════════════════════════════════════════════════════


class PaymentAllocation(Base):
    __tablename__ = "payment_allocations"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_id      = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id      = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount          = Column(Numeric(14, 2), nullable=False)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    payment         = relationship("Payment", back_populates="allocations")
    invoice         = relationship("Invoice", back_populates="payment_allocations")

    __table_args__ = (
        UniqueConstraint("payment_id", "invoice_id", name="uq_payalloc_payment_invoice"),
        CheckConstraint("amount > 0", name="ck_payalloc_amount"),
    )

    def __repr__(self):
        return f"<PaymentAllocation id={self.id} payment={self.payment_id} invoice={self.invoice_id}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 20: PAYMENT ATTEMPTS
# ═══════════════════════════════════════════════════════════════════════════════


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_id      = Column(Integer, ForeignKey("payments.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt_number  = Column(Integer, nullable=False)
    status          = Column(CaseInsensitiveEnum(PaymentStatus), nullable=False)
    gateway_response = Column(JSON, nullable=True)
    failure_reason  = Column(Text, nullable=True)
    attempted_at    = Column(DateTime(timezone=True), server_default=func.now())

    payment         = relationship("Payment", back_populates="attempts")

    def __repr__(self):
        return f"<PaymentAttempt id={self.id} attempt={self.attempt_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 21: CREDIT NOTES
# ═══════════════════════════════════════════════════════════════════════════════


class CreditNote(Base):
    __tablename__ = "credit_notes"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id          = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    credit_note_number  = Column(String(50), nullable=False)
    credit_note_type    = Column(CaseInsensitiveEnum(CreditNoteType), nullable=False)
    reason              = Column(Text, nullable=True)
    status              = Column(CaseInsensitiveEnum(CreditNoteStatus), default=CreditNoteStatus.DRAFT, nullable=False, index=True)
    subtotal            = Column(Numeric(14, 2), default=0)
    tax_amount          = Column(Numeric(14, 2), default=0)
    total_amount        = Column(Numeric(14, 2), nullable=False)
    remaining_amount    = Column(Numeric(14, 2), nullable=False)
    currency            = Column(String(3), default="USD")
    issue_date          = Column(Date, nullable=False, index=True)
    voided_at           = Column(DateTime, nullable=True)
    voided_reason       = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    deleted_at          = Column(DateTime, nullable=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", back_populates="credit_notes", foreign_keys=[customer_id])
    invoice             = relationship("Invoice", foreign_keys=[invoice_id])
    applications        = relationship("CreditNoteApplication", back_populates="credit_note")

    __table_args__ = (
        UniqueConstraint("organization_id", "credit_note_number", name="uq_credit_notes_org_number"),
        CheckConstraint("total_amount > 0", name="ck_credit_notes_total"),
    )

    def __repr__(self):
        return f"<CreditNote id={self.id} number={self.credit_note_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 22: CREDIT NOTE APPLICATIONS
# ═══════════════════════════════════════════════════════════════════════════════


class CreditNoteApplication(Base):
    __tablename__ = "credit_note_applications"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    credit_note_id  = Column(Integer, ForeignKey("credit_notes.id", ondelete="CASCADE"), nullable=False, index=True)
    invoice_id      = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    amount          = Column(Numeric(14, 2), nullable=False)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    credit_note     = relationship("CreditNote", back_populates="applications")
    invoice         = relationship("Invoice", back_populates="credit_note_applications")

    def __repr__(self):
        return f"<CreditNoteApplication id={self.id} cn={self.credit_note_id} inv={self.invoice_id}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 23: REFUNDS
# ═══════════════════════════════════════════════════════════════════════════════


class Refund(Base):
    __tablename__ = "refunds"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id     = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    payment_id      = Column(Integer, ForeignKey("payments.id", ondelete="SET NULL"), nullable=True)
    credit_note_id  = Column(Integer, ForeignKey("credit_notes.id", ondelete="SET NULL"), nullable=True)
    refund_number   = Column(String(50), nullable=False)
    refund_type     = Column(CaseInsensitiveEnum(RefundType), nullable=False)
    status          = Column(CaseInsensitiveEnum(RefundStatus), default=RefundStatus.PENDING, nullable=False)
    amount          = Column(Numeric(14, 2), nullable=False)
    currency        = Column(String(3), default="USD")
    gateway         = Column(CaseInsensitiveEnum(PaymentGatewayType), nullable=True)
    gateway_refund_id = Column(String(255), nullable=True)
    reason          = Column(Text, nullable=True)
    completed_at    = Column(DateTime, nullable=True)
    failure_reason  = Column(Text, nullable=True)
    is_active       = Column(Boolean, default=True)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    customer        = relationship("BillingCustomer", back_populates="refunds", foreign_keys=[customer_id])
    payment         = relationship("Payment", foreign_keys=[payment_id])
    credit_note     = relationship("CreditNote", foreign_keys=[credit_note_id])

    __table_args__ = (
        UniqueConstraint("organization_id", "refund_number", name="uq_refunds_org_number"),
        CheckConstraint("amount > 0", name="ck_refunds_amount"),
    )

    def __repr__(self):
        return f"<Refund id={self.id} number={self.refund_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 24: TAX RATES
# ═══════════════════════════════════════════════════════════════════════════════


class TaxRate(Base):
    __tablename__ = "tax_rates"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    name            = Column(String(255), nullable=False)
    code            = Column(String(50), nullable=False)
    jurisdiction    = Column(String(255), nullable=False)
    rate            = Column(Numeric(5, 2), nullable=False)
    tax_type        = Column(CaseInsensitiveEnum(TaxType), nullable=False)
    is_compound     = Column(Boolean, default=False)
    is_recoverable  = Column(Boolean, default=True)
    effective_from  = Column(Date, nullable=False)
    effective_to    = Column(Date, nullable=True)
    applies_to      = Column(CaseInsensitiveEnum(TaxApplicability), default=TaxApplicability.BOTH, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("organization_id", "code", name="uq_tax_rates_org_code"),
        CheckConstraint("rate BETWEEN 0 AND 100", name="ck_tax_rates_rate"),
    )

    def __repr__(self):
        return f"<TaxRate id={self.id} code={self.code} rate={self.rate}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 25: TAXES (transaction-level tax records)
# ═══════════════════════════════════════════════════════════════════════════════


class Tax(Base):
    __tablename__ = "taxes"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id      = Column(Integer, ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    credit_note_id  = Column(Integer, ForeignKey("credit_notes.id", ondelete="SET NULL"), nullable=True)
    tax_rate_id     = Column(Integer, ForeignKey("tax_rates.id", ondelete="SET NULL"), nullable=True)
    taxable_amount  = Column(Numeric(14, 2), nullable=False)
    tax_amount      = Column(Numeric(14, 2), nullable=False)
    tax_percentage  = Column(Numeric(5, 2), nullable=False)
    jurisdiction    = Column(String(255), nullable=True)
    tax_type        = Column(CaseInsensitiveEnum(TaxType), nullable=True)
    is_reverse_charge = Column(Boolean, default=False)
    is_active       = Column(Boolean, default=True)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    invoice         = relationship("Invoice", foreign_keys=[invoice_id])
    credit_note     = relationship("CreditNote", foreign_keys=[credit_note_id])
    tax_rate        = relationship("TaxRate", foreign_keys=[tax_rate_id])

    def __repr__(self):
        return f"<Tax id={self.id} amount={self.tax_amount} rate={self.tax_percentage}>"


class DunningActionType(str, enum.Enum):
    EMAIL_REMINDER = "email_reminder"
    SMS_REMINDER = "sms_reminder"
    LATE_FEE = "late_fee"
    PHONE_CALL = "phone_call"
    ESCALATE_COLLECTIONS = "escalate_collections"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 26: DUNNING LEVELS (configuration)
# ═══════════════════════════════════════════════════════════════════════════════


class DunningLevel(Base):
    __tablename__ = "dunning_levels"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    level_number      = Column(Integer, nullable=False)
    name              = Column(String(100), nullable=False)
    min_days_overdue  = Column(Integer, nullable=False)
    max_days_overdue  = Column(Integer, nullable=True)
    action_type       = Column(CaseInsensitiveEnum(DunningActionType), nullable=False)
    action_template   = Column(String(500), nullable=True)
    fee_amount        = Column(Numeric(14, 2), default=0)
    fee_percentage    = Column(Numeric(5, 2), default=0)
    is_active         = Column(Boolean, default=True)
    created_at        = Column(DateTime(timezone=True), server_default=func.now())

    def __repr__(self):
        return f"<DunningLevel id={self.id} level={self.level_number} name={self.name}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 27: DUNNING CASES
# ═══════════════════════════════════════════════════════════════════════════════


class DunningCase(Base):
    __tablename__ = "dunning_cases"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id          = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    status              = Column(CaseInsensitiveEnum(DunningStatus), default=DunningStatus.ACTIVE, nullable=False, index=True)
    current_level       = Column(Integer, nullable=False, default=1)
    total_overdue_amount = Column(Numeric(14, 2), nullable=False)
    days_overdue        = Column(Integer, nullable=False)
    last_action_at      = Column(DateTime, nullable=True)
    last_action_type    = Column(CaseInsensitiveEnum(DunningActionType), nullable=True)
    next_action_at      = Column(Date, nullable=True)
    auto_escalate       = Column(Boolean, default=True)
    resolved_at         = Column(DateTime, nullable=True)
    resolution_note     = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", foreign_keys=[customer_id])
    invoice             = relationship("Invoice", foreign_keys=[invoice_id])

    def __repr__(self):
        return f"<DunningCase id={self.id} level={self.current_level} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 28: COLLECTIONS CASES
# ═══════════════════════════════════════════════════════════════════════════════


class CollectionsCase(Base):
    __tablename__ = "collections_cases"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id         = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id          = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    case_number         = Column(String(50), nullable=False)
    status              = Column(CaseInsensitiveEnum(CollectionsStatus), default=CollectionsStatus.OPEN, nullable=False, index=True)
    assigned_to         = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    total_outstanding   = Column(Numeric(14, 2), nullable=False)
    amount_collected    = Column(Numeric(14, 2), default=0)
    days_overdue        = Column(Integer, nullable=False)
    priority            = Column(CaseInsensitiveEnum(CollectionsPriority), default=CollectionsPriority.NORMAL, nullable=False, index=True)
    last_contact_at     = Column(DateTime, nullable=True)
    next_action_date    = Column(Date, nullable=True)
    resolution          = Column(Text, nullable=True)
    resolved_at         = Column(DateTime, nullable=True)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    customer            = relationship("BillingCustomer", foreign_keys=[customer_id])
    invoice             = relationship("Invoice", foreign_keys=[invoice_id])
    assignee            = relationship("Employee", foreign_keys=[assigned_to])
    actions             = relationship("CollectionAction", back_populates="collection")

    __table_args__ = (
        UniqueConstraint("organization_id", "case_number", name="uq_collections_cases_org_number"),
    )

    def __repr__(self):
        return f"<CollectionsCase id={self.id} number={self.case_number} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 29: COLLECTION ACTIONS
# ═══════════════════════════════════════════════════════════════════════════════


class CollectionAction(Base):
    __tablename__ = "collection_actions"

    id               = Column(Integer, primary_key=True, index=True)
    organization_id  = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    collection_id    = Column(Integer, ForeignKey("collections_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    action_type      = Column(CaseInsensitiveEnum(DunningActionType), nullable=False)
    description      = Column(Text, nullable=True)
    performed_by     = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    performed_at     = Column(DateTime(timezone=True), server_default=func.now())
    outcome          = Column(Text, nullable=True)
    follow_up_date   = Column(Date, nullable=True)

    collection       = relationship("CollectionsCase", back_populates="actions")

    def __repr__(self):
        return f"<CollectionAction id={self.id} type={self.action_type}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 30: REVENUE RECOGNITION SCHEDULES
# ═══════════════════════════════════════════════════════════════════════════════


class RevenueRecognitionSchedule(Base):
    __tablename__ = "revenue_recognition_schedules"

    id                  = Column(Integer, primary_key=True, index=True)
    organization_id     = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    invoice_id          = Column(Integer, ForeignKey("invoices.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id     = Column(Integer, ForeignKey("subscriptions.id", ondelete="SET NULL"), nullable=True)
    recognition_method  = Column(CaseInsensitiveEnum(RecognitionMethod), nullable=False)
    total_amount        = Column(Numeric(14, 2), nullable=False)
    recognized_amount   = Column(Numeric(14, 2), default=0)
    deferred_amount     = Column(Numeric(14, 2), default=0)
    start_date          = Column(Date, nullable=False)
    end_date            = Column(Date, nullable=False)
    status              = Column(CaseInsensitiveEnum(RecognitionStatus), default=RecognitionStatus.PENDING, nullable=False)
    is_active           = Column(Boolean, default=True)
    created_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by          = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), onupdate=func.now())

    invoice             = relationship("Invoice", foreign_keys=[invoice_id])
    subscription        = relationship("Subscription", foreign_keys=[subscription_id])
    entries             = relationship("RevenueRecognitionEntry", back_populates="schedule")

    def __repr__(self):
        return f"<RevenueRecognitionSchedule id={self.id} method={self.recognition_method} status={self.status}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 31: REVENUE RECOGNITION ENTRIES
# ═══════════════════════════════════════════════════════════════════════════════


class RevenueRecognitionEntry(Base):
    __tablename__ = "revenue_recognition_entries"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    schedule_id     = Column(Integer, ForeignKey("revenue_recognition_schedules.id", ondelete="CASCADE"), nullable=False, index=True)
    entry_date      = Column(Date, nullable=False)
    amount          = Column(Numeric(14, 2), nullable=False)
    is_released     = Column(Boolean, default=False)
    released_at     = Column(DateTime, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    schedule        = relationship("RevenueRecognitionSchedule", back_populates="entries")

    def __repr__(self):
        return f"<RevenueRecognitionEntry id={self.id} date={self.entry_date} amount={self.amount}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 32: BILLING AUDIT LOGS (immutable, append-only)
# ═══════════════════════════════════════════════════════════════════════════════


class BillingAuditLog(Base):
    __tablename__ = "billing_audit_logs"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    actor_id        = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    entity_type     = Column(String(50), nullable=False)
    entity_id       = Column(Integer, nullable=False)
    action          = Column(CaseInsensitiveEnum(BillingAuditAction), nullable=False)
    old_values      = Column(JSON, nullable=True)
    new_values      = Column(JSON, nullable=True)
    changes         = Column(JSON, nullable=True)
    ip_address      = Column(String(50), nullable=True)
    user_agent      = Column(String(500), nullable=True)
    request_id      = Column(String(100), nullable=True)
    timestamp       = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    organization    = relationship("Organization", foreign_keys=[organization_id])
    actor           = relationship("Employee", foreign_keys=[actor_id])

    __table_args__ = (
        # Index for entity lookups
        Index("ix_billing_audit_logs_entity", "entity_type", "entity_id"),
        Index("ix_billing_audit_logs_org_action", "organization_id", "action"),
        Index("ix_billing_audit_logs_timestamp", "timestamp"),
    )

    def __repr__(self):
        return f"<BillingAuditLog id={self.id} entity={self.entity_type}:{self.entity_id} action={self.action}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 33: BILLING CONFIGURATION (Enterprise-grade settings)
# ═══════════════════════════════════════════════════════════════════════════════


class CurrencyCode(str, enum.Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"
    CAD = "CAD"
    AUD = "AUD"
    ZAR = "ZAR"
    INR = "INR"
    JPY = "JPY"
    CNY = "CNY"
    BRL = "BRL"
    CHF = "CHF"
    SEK = "SEK"
    NOK = "NOK"
    DKK = "DKK"
    NZD = "NZD"
    SGD = "SGD"
    HKD = "HKD"
    KRW = "KRW"
    MXN = "MXN"
    AED = "AED"
    SAR = "SAR"
    QAR = "QAR"
    KWD = "KWD"
    MYR = "MYR"
    THB = "THB"
    NGN = "NGN"
    PKR = "PKR"
    BDT = "BDT"
    LKR = "LKR"
    NPR = "NPR"
    BHD = "BHD"
    OMR = "OMR"


class PaymentTerm(str, enum.Enum):
    DUE_ON_RECEIPT = "due_on_receipt"
    NET_7 = "net_7"
    NET_10 = "net_10"
    NET_15 = "net_15"
    NET_30 = "net_30"
    NET_45 = "net_45"
    NET_60 = "net_60"
    NET_90 = "net_90"


class DateFormat(str, enum.Enum):
    DD_MM_YYYY = "DD-MM-YYYY"
    MM_DD_YYYY = "MM-DD-YYYY"
    YYYY_MM_DD = "YYYY-MM-DD"
    DD_MM_YY = "DD-MM-YY"
    MM_DD_YY = "MM-DD-YY"


class NumberFormat(str, enum.Enum):
    PREFIX_SEQ = "PREFIX-{SEQ}"
    PREFIX_YYYY_SEQ = "PREFIX-{YYYY}-{SEQ}"
    PREFIX_YYYYMM_SEQ = "PREFIX-{YYYYMM}-{SEQ}"
    PREFIX_YYYY_MM_SEQ = "PREFIX-{YYYY}-{MM}-{SEQ}"
    PREFIX_MM_YYYY_SEQ = "PREFIX-{MM}-{YYYY}-{SEQ}"


class ExchangeRateProvider(str, enum.Enum):
    MANUAL = "manual"
    ECB = "ecb"
    FIXER = "fixer"
    OPEN_EXCHANGE = "open_exchange"
    XE = "xe"
    CURRENCY_LAYER = "currency_layer"


class RoundingMethod(str, enum.Enum):
    NONE = "none"
    UP = "up"
    DOWN = "down"
    HALF_UP = "half_up"
    HALF_DOWN = "half_down"
    HALF_EVEN = "half_even"


class SequenceReset(str, enum.Enum):
    NEVER = "never"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"


class TaxCalculationMethod(str, enum.Enum):
    EXCLUSIVE = "exclusive"
    INCLUSIVE = "inclusive"


class RevenueRecognitionMethod(str, enum.Enum):
    IMMEDIATE = "immediate"
    DAILY = "daily_prorated"
    MONTHLY = "monthly_prorated"
    MILESTONE = "milestone"
    MANUAL = "manual"


class InvoiceTemplate(str, enum.Enum):
    STANDARD = "standard"
    MODERN = "modern"
    PROFESSIONAL = "professional"
    MINIMAL = "minimal"
    BOLD = "bold"


class DraftBehaviour(str, enum.Enum):
    SAVE_AS_DRAFT = "save_as_draft"
    AUTO_FINALIZE = "auto_finalize"
    SEND_FOR_APPROVAL = "send_for_approval"


class CurrencySymbolPosition(str, enum.Enum):
    BEFORE = "before"
    AFTER = "after"


class TaxRoundingMethod(str, enum.Enum):
    PER_LINE = "per_line"
    PER_INVOICE = "per_invoice"
    PER_LINE_ITEM = "per_line_item"


class RecognizedRevenueMethod(str, enum.Enum):
    CASH = "cash"
    ACCRUAL = "accrual"
    DEFERRED = "deferred"


class ReminderChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"


class BillingConfiguration(Base):
    __tablename__ = "billing_configurations"

    # ── Primary ──
    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, unique=True, index=True)

    # ── General ──
    company_name             = Column(String(255), nullable=True)
    billing_email            = Column(String(255), nullable=True)
    billing_phone            = Column(String(30), nullable=True)
    website                  = Column(String(500), nullable=True)
    logo_url                 = Column(String(500), nullable=True)
    fiscal_year_start        = Column(String(5), default="01-01")
    fiscal_year_end          = Column(String(5), default="12-31")
    default_currency         = Column(CaseInsensitiveEnum(CurrencyCode), default=CurrencyCode.USD, nullable=False)
    supported_currencies     = Column(JSON, default=lambda: ["USD"])
    date_format              = Column(CaseInsensitiveEnum(DateFormat), default=DateFormat.DD_MM_YYYY, nullable=False)
    timezone                 = Column(String(50), default="UTC")
    language                 = Column(String(10), default="en")

    # ── Address ──
    country                  = Column(String(100), nullable=True)
    state                    = Column(String(100), nullable=True)
    city                     = Column(String(100), nullable=True)
    postal_code              = Column(String(20), nullable=True)
    address_line1            = Column(String(255), nullable=True)
    address_line2            = Column(String(255), nullable=True)

    # ── Registration ──
    business_registration_number = Column(String(100), nullable=True)
    gst_number               = Column(String(50), nullable=True)
    vat_number               = Column(String(50), nullable=True)
    pan_number               = Column(String(50), nullable=True)
    tin_number               = Column(String(50), nullable=True)

    # ── Invoicing ──
    invoice_prefix                  = Column(String(10), default="INV-")
    invoice_number_format           = Column(CaseInsensitiveEnum(NumberFormat), default=NumberFormat.PREFIX_YYYY_SEQ, nullable=False)
    invoice_sequence_reset          = Column(CaseInsensitiveEnum(SequenceReset), default=SequenceReset.ANNUALLY, nullable=False)
    quote_prefix                    = Column(String(10), default="QTE-")
    quote_number_format             = Column(CaseInsensitiveEnum(NumberFormat), default=NumberFormat.PREFIX_YYYY_SEQ, nullable=False)
    quote_sequence_reset            = Column(CaseInsensitiveEnum(SequenceReset), default=SequenceReset.ANNUALLY, nullable=False)
    credit_note_prefix              = Column(String(10), default="CN-")
    credit_note_number_format       = Column(CaseInsensitiveEnum(NumberFormat), default=NumberFormat.PREFIX_YYYY_SEQ, nullable=False)
    credit_note_sequence_reset      = Column(CaseInsensitiveEnum(SequenceReset), default=SequenceReset.ANNUALLY, nullable=False)
    refund_prefix                   = Column(String(10), default="RF-")
    refund_number_format            = Column(CaseInsensitiveEnum(NumberFormat), default=NumberFormat.PREFIX_YYYY_SEQ, nullable=False)
    refund_sequence_reset           = Column(CaseInsensitiveEnum(SequenceReset), default=SequenceReset.ANNUALLY, nullable=False)
    auto_generate_invoice_number    = Column(Boolean, default=True)
    invoice_footer                  = Column(Text, nullable=True)
    invoice_terms                   = Column(Text, nullable=True)
    invoice_notes                   = Column(Text, nullable=True)
    invoice_logo_url                = Column(String(500), nullable=True)
    invoice_watermark               = Column(String(500), nullable=True)
    invoice_template                = Column(CaseInsensitiveEnum(InvoiceTemplate), default=InvoiceTemplate.STANDARD, nullable=False)
    invoice_pdf_template            = Column(String(50), default="standard")
    draft_behaviour                 = Column(CaseInsensitiveEnum(DraftBehaviour), default=DraftBehaviour.SAVE_AS_DRAFT, nullable=False)
    invoice_terms_and_conditions    = Column(Text, nullable=True)
    show_tax_breakdown              = Column(Boolean, default=True)
    show_discount                   = Column(Boolean, default=True)
    show_shipping                   = Column(Boolean, default=False)
    default_due_days                = Column(Integer, default=30)
    payment_reminder_days_before    = Column(Integer, default=3)
    late_payment_fee_percentage     = Column(Numeric(5, 2), default=0)
    late_payment_fee_flat           = Column(Numeric(14, 2), default=0)

    # ── Currency ──
    base_currency                   = Column(CaseInsensitiveEnum(CurrencyCode), default=CurrencyCode.USD, nullable=False)
    currency_precision              = Column(Integer, default=2)
    currency_symbol_position        = Column(CaseInsensitiveEnum(CurrencySymbolPosition), default=CurrencySymbolPosition.BEFORE, nullable=False)

    # ── Payments ──
    default_payment_terms           = Column(CaseInsensitiveEnum(PaymentTerm), default=PaymentTerm.NET_30, nullable=False)
    payment_term_options            = Column(JSON, default=lambda: ["net_30", "net_15", "net_7", "due_on_receipt"])
    supported_payment_methods       = Column(JSON, default=lambda: ["credit_card", "bank_transfer", "paypal"])
    auto_send_receipts              = Column(Boolean, default=True)
    exchange_rate_provider          = Column(CaseInsensitiveEnum(ExchangeRateProvider), default=ExchangeRateProvider.MANUAL, nullable=False)
    exchange_rate_auto_update       = Column(Boolean, default=False)
    rounding_method                 = Column(CaseInsensitiveEnum(RoundingMethod), default=RoundingMethod.HALF_UP, nullable=False)
    rounding_precision              = Column(Integer, default=2)

    # ── Payment Gateways ──
    gateway_stripe_enabled          = Column(Boolean, default=False)
    gateway_razorpay_enabled        = Column(Boolean, default=False)
    gateway_paypal_enabled          = Column(Boolean, default=True)
    gateway_cash_enabled            = Column(Boolean, default=True)
    gateway_bank_transfer_enabled   = Column(Boolean, default=True)
    gateway_upi_enabled             = Column(Boolean, default=False)
    gateway_offline_enabled         = Column(Boolean, default=True)
    webhook_secret                  = Column(String(500), nullable=True)
    retry_rules                     = Column(JSON, default=lambda: {"max_retries": 3, "retry_interval_hours": 24})
    auto_capture_enabled            = Column(Boolean, default=True)
    refund_settings                 = Column(JSON, default=lambda: {"auto_approve": False, "refund_window_days": 30, "require_reason": True})
    grace_period_days               = Column(Integer, default=0)
    credit_limit                    = Column(Numeric(14, 2), default=0)

    # ── Tax ──
    tax_calculation_method          = Column(CaseInsensitiveEnum(TaxCalculationMethod), default=TaxCalculationMethod.EXCLUSIVE, nullable=False)
    default_tax_rate_id             = Column(Integer, ForeignKey("tax_rates.id", ondelete="SET NULL"), nullable=True)
    tax_label                       = Column(String(50), default="VAT")
    tax_number                      = Column(String(100), nullable=True)
    tax_profiles                    = Column(JSON, default=lambda: [])
    is_tax_inclusive_default        = Column(Boolean, default=False)
    show_tax_on_invoice             = Column(Boolean, default=True)
    enable_auto_tax_calculation     = Column(Boolean, default=False)

    # ── Tax Types ──
    gst_enabled                     = Column(Boolean, default=False)
    gst_settings                    = Column(JSON, default=lambda: {})
    vat_settings                    = Column(JSON, default=lambda: {})
    sales_tax_enabled               = Column(Boolean, default=False)
    sales_tax_settings              = Column(JSON, default=lambda: {})
    service_tax_enabled             = Column(Boolean, default=False)
    service_tax_settings            = Column(JSON, default=lambda: {})
    withholding_tax_enabled         = Column(Boolean, default=False)
    withholding_tax_settings        = Column(JSON, default=lambda: {})
    reverse_charge_enabled          = Column(Boolean, default=False)
    reverse_charge_settings         = Column(JSON, default=lambda: {})
    compound_tax_enabled            = Column(Boolean, default=False)
    compound_tax_settings           = Column(JSON, default=lambda: {})
    tax_regions                     = Column(JSON, default=lambda: [])
    tax_categories                  = Column(JSON, default=lambda: [])
    hsn_sac_codes                   = Column(JSON, default=lambda: [])
    tax_rounding_method             = Column(CaseInsensitiveEnum(TaxRoundingMethod), default=TaxRoundingMethod.PER_LINE, nullable=False)

    # ── Dunning & Collections ──
    auto_dunning                        = Column(Boolean, default=False)
    dunning_level_count                 = Column(Integer, default=4)
    dunning_wait_days                   = Column(Integer, default=3)
    dunning_action_types                = Column(JSON, default=lambda: ["email_reminder"])
    enable_escalation_to_collections    = Column(Boolean, default=False)
    collections_wait_days               = Column(Integer, default=30)
    dunning_email_template              = Column(Text, nullable=True)
    reminder_schedule                   = Column(JSON, default=lambda: {"before_due": [3, 1], "after_due": [0, 3, 7, 14, 30]})
    reminder_sms_enabled                = Column(Boolean, default=False)
    reminder_whatsapp_enabled           = Column(Boolean, default=False)
    auto_suspend_enabled                = Column(Boolean, default=False)
    grace_days                          = Column(Integer, default=0)
    penalty_settings                    = Column(JSON, default=lambda: {"type": "percentage", "value": 0, "max_cap": None})
    interest_settings                   = Column(JSON, default=lambda: {"annual_rate": 0, "compounding": "simple", "waive_first_x_days": 0})
    final_notice_template              = Column(Text, nullable=True)

    # ── Revenue Recognition ──
    enable_revenue_recognition      = Column(Boolean, default=False)
    revenue_recognition_method      = Column(CaseInsensitiveEnum(RevenueRecognitionMethod), default=RevenueRecognitionMethod.IMMEDIATE, nullable=False)
    revenue_recognition_deferral_days = Column(Integer, default=0)
    recognized_revenue_method       = Column(CaseInsensitiveEnum(RecognizedRevenueMethod), default=RecognizedRevenueMethod.ACCRUAL, nullable=False)
    revenue_accounts                = Column(JSON, default=lambda: {"deferred_revenue": None, "recognized_revenue": None, "contract_asset": None})
    recognition_frequency           = Column(String(50), default="monthly")
    recognition_schedule            = Column(JSON, default=lambda: [])

    # ── Multi-currency ──
    enable_multi_currency           = Column(Boolean, default=False)
    home_currency                   = Column(CaseInsensitiveEnum(CurrencyCode), default=CurrencyCode.USD, nullable=False)

    # ── Notifications ──
    email_templates                 = Column(JSON, default=lambda: {})
    sms_templates                   = Column(JSON, default=lambda: {})
    notification_preferences        = Column(JSON, default=lambda: {})

    # ── Notification Events ──
    notify_invoice_created          = Column(Boolean, default=True)
    notify_invoice_sent             = Column(Boolean, default=True)
    notify_invoice_paid             = Column(Boolean, default=True)
    notify_invoice_overdue          = Column(Boolean, default=True)
    notify_subscription_renewed     = Column(Boolean, default=True)
    notify_subscription_cancelled   = Column(Boolean, default=True)
    notify_payment_failed           = Column(Boolean, default=True)
    notify_payment_success          = Column(Boolean, default=True)
    notify_customer_created         = Column(Boolean, default=False)

    # ── Feature Flags / Advanced ──
    enable_approval_workflow        = Column(Boolean, default=False)
    enable_credit_notes             = Column(Boolean, default=True)
    enable_discounts                = Column(Boolean, default=True)
    enable_retainers                = Column(Boolean, default=False)
    enable_schedule_invoicing       = Column(Boolean, default=False)
    enable_partial_payments         = Column(Boolean, default=True)
    enable_auto_apply_credits       = Column(Boolean, default=True)
    enable_quotes                   = Column(Boolean, default=True)
    enable_contracts                = Column(Boolean, default=True)
    enable_usage_billing            = Column(Boolean, default=False)
    enable_refunds                  = Column(Boolean, default=True)
    enable_auto_taxes               = Column(Boolean, default=False)
    enable_audit_logs               = Column(Boolean, default=True)
    security_settings               = Column(JSON, default=lambda: {})

    # ── Product Settings ──
    product_numbering_prefix        = Column(String(20), default="PROD-")
    product_numbering_format        = Column(String(100), default="{PREFIX}{NUMBER}")
    default_product_currency        = Column(String(3), default="USD")
    default_category_id             = Column(Integer, nullable=True)
    default_tax_rate                = Column(String(50), nullable=True)
    max_discount_percentage         = Column(Numeric(5, 2), nullable=True)
    usage_billing_unit              = Column(String(50), default="unit")
    usage_billing_rounding          = Column(String(20), default="nearest")
    auto_archive_days               = Column(Integer, nullable=True)
    product_visibility              = Column(String(20), default="visible")
    require_sku                     = Column(String(10), default="no")

    # ── Audit ──
    is_active         = Column(Boolean, default=True)
    created_by   = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by   = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())
    updated_at   = Column(DateTime(timezone=True), onupdate=func.now())

    organization = relationship("Organization", foreign_keys=[organization_id])

    __table_args__ = (
        CheckConstraint("default_due_days >= 0", name="ck_billingconfig_due_days"),
        CheckConstraint("grace_period_days >= 0", name="ck_billingconfig_grace"),
        CheckConstraint("credit_limit >= 0", name="ck_billingconfig_credit"),
        CheckConstraint("rounding_precision >= 0", name="ck_billingconfig_rounding"),
    )

    def __repr__(self):
        return f"<BillingConfiguration id={self.id} org={self.organization_id}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 34: CUSTOMER DOCUMENTS
# ═══════════════════════════════════════════════════════════════════════════════


class CustomerDocument(Base):
    __tablename__ = "customer_documents"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id     = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    file_name       = Column(String(255), nullable=False)
    file_path       = Column(String(500), nullable=False)
    file_size       = Column(Integer, nullable=True)
    mime_type       = Column(String(100), nullable=True)
    document_type   = Column(String(50), nullable=True)
    notes           = Column(Text, nullable=True)
    uploaded_by     = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    version         = Column(Integer, default=1)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    organization    = relationship("Organization", foreign_keys=[organization_id])
    customer        = relationship("BillingCustomer", foreign_keys=[customer_id])
    uploader        = relationship("Employee", foreign_keys=[uploaded_by])

    def __repr__(self):
        return f"<CustomerDocument id={self.id} name={self.file_name} customer={self.customer_id}>"


# ═══════════════════════════════════════════════════════════════════════════════
# TABLE 35: CUSTOMER NOTES
# ═══════════════════════════════════════════════════════════════════════════════


class CustomerNote(Base):
    __tablename__ = "customer_notes"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id", ondelete="RESTRICT"), nullable=False, index=True)
    customer_id     = Column(Integer, ForeignKey("billing_customers.id", ondelete="RESTRICT"), nullable=False, index=True)
    content         = Column(Text, nullable=False)
    is_pinned       = Column(Boolean, default=False)
    is_internal     = Column(Boolean, default=False)
    created_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    updated_by      = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"), nullable=True)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    organization    = relationship("Organization", foreign_keys=[organization_id])
    customer        = relationship("BillingCustomer", foreign_keys=[customer_id])
    creator         = relationship("Employee", foreign_keys=[created_by])
    updater         = relationship("Employee", foreign_keys=[updated_by])

    def __repr__(self):
        return f"<CustomerNote id={self.id} customer={self.customer_id}>"
