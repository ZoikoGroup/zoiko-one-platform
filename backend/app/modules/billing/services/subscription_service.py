import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
    NotFoundException,
)
from app.modules.billing.models import (
    BillingAuditAction,
    BillingPeriod,
    InvoiceItem,
    PricingModel,
    PriceSource,
    Product,
    Subscription,
    SubscriptionEvent,
    SubscriptionPlan,
    BillingSubscriptionStatus,
)
from app.modules.billing.services.price_resolver import PriceResolver
from app.modules.billing.repositories.subscription import (
    SubscriptionEventRepository,
    SubscriptionPlanRepository,
    SubscriptionRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.calculation_service import CalculationService
from app.modules.billing.services.customer_service import CustomerService
from app.modules.billing.services.exchange_rate_service import ExchangeRateService
from app.modules.billing.services.settings_service import BillingConfigurationService

logger = logging.getLogger("zoiko")

SUB_ALLOWED_FIELDS = {
    "customer_id", "plan_id", "contract_id", "subscription_number",
    "currency", "quantity", "unit_price", "setup_fee",
    "discount_percentage", "discount_amount", "tax_percentage",
    "start_date", "current_term_start", "current_term_end",
    "trial_end_date", "next_billing_at", "status",
    "cancellation_reason", "notes",
    "product_id", "pricing_plan_id", "price_source",
    "base_price", "resolved_price",
}
PLAN_ALLOWED_FIELDS = {
    "plan_name", "plan_code", "description", "category",
    "billing_period", "billing_cycles", "unit_price",
    "setup_fee", "trial_days", "is_public",
    "sort_order", "is_active",
}


class SubscriptionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = SubscriptionRepository(db)
        self.plan_repo = SubscriptionPlanRepository(db)
        self.event_repo = SubscriptionEventRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)
        self.config_service = BillingConfigurationService(db)
        self.exchange_rate_service = ExchangeRateService(db)

    def _validate_status_transition(self, current: BillingSubscriptionStatus, target: BillingSubscriptionStatus) -> None:
        valid_transitions = {
            BillingSubscriptionStatus.ACTIVE: [BillingSubscriptionStatus.PAUSED, BillingSubscriptionStatus.CANCELLED, BillingSubscriptionStatus.PAST_DUE],
            BillingSubscriptionStatus.PAUSED: [BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.CANCELLED],
            BillingSubscriptionStatus.PAST_DUE: [BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.CANCELLED],
            BillingSubscriptionStatus.CANCELLED: [],
            BillingSubscriptionStatus.EXPIRED: [],
        }
        allowed = valid_transitions.get(current, [])
        if target not in allowed:
            raise BadRequestException(
                f"Cannot transition from {current.value} to {target.value}"
            )

    def _compute_next_billing_date(self, start: date, period: BillingPeriod) -> date:
        if period == BillingPeriod.ONE_TIME:
            return start
        if period == BillingPeriod.MONTHLY:
            return self._add_months(start, 1)
        if period == BillingPeriod.QUARTERLY:
            return self._add_months(start, 3)
        if period == BillingPeriod.SEMI_ANNUAL:
            return self._add_months(start, 6)
        if period == BillingPeriod.ANNUAL:
            return self._add_months(start, 12)
        return start + timedelta(days=30)

    @staticmethod
    def _add_months(start: date, months: int) -> date:
        import calendar
        target_month = start.month + months
        target_year = start.year + (target_month - 1) // 12
        target_month = ((target_month - 1) % 12) + 1
        max_day = calendar.monthrange(target_year, target_month)[1]
        return date(target_year, target_month, min(start.day, max_day))

    def _resolve_currency(self, data: dict, customer_id: int, contract_id: Optional[int], organization_id: int) -> str:
        """Resolve subscription currency using priority:
        Explicit currency → Contract currency → Customer currency → Org default
        """
        currency = data.get("currency")
        if currency:
            return currency.upper()
        if contract_id:
            try:
                from app.modules.billing.repositories.sales import ContractRepository
                contract_repo = ContractRepository(self.db)
                contract = contract_repo.get_by_id(contract_id, organization_id)
                if contract and hasattr(contract, 'currency') and contract.currency:
                    return contract.currency.upper()
            except Exception:
                pass
        customer = self.customer_service.get_customer(customer_id, organization_id)
        if customer and hasattr(customer, 'currency') and customer.currency:
            return customer.currency.upper()
        return self.config_service.get_default_currency(organization_id) or "USD"

    def create_subscription(
        self, organization_id: int, created_by: int, customer_id: int,
        plan_id: int, subscription_number: str, **data: Any,
    ) -> Subscription:
        data = filter_allowed(data, SUB_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        plan = self.plan_repo.get_by_id(plan_id, organization_id)
        if not plan.is_active:
            raise BadRequestException("Subscription plan is not active")
        if self.repo.exists(organization_id, subscription_number=subscription_number):
            raise AlreadyExistsException("Subscription", "subscription_number")
        contract_id = data.get("contract_id")
        if contract_id and self.repo.exists(organization_id, contract_id=contract_id):
            raise AlreadyExistsException("Subscription", "contract_id")
        data.setdefault("unit_price", plan.unit_price or 0)
        data["currency"] = self._resolve_currency(data, customer_id, contract_id, organization_id)

        product_id = data.get("product_id")
        if product_id is not None:
            price_source = data.get("price_source")
            if price_source == PriceSource.NEGOTIATED.value:
                product = (
                    self.db.query(Product)
                    .filter(
                        Product.id == product_id,
                        Product.organization_id == organization_id,
                    )
                    .first()
                )
                if product:
                    data["base_price"] = Decimal(str(product.default_price or 0))
                data["resolved_price"] = Decimal(str(data.get("unit_price", 0)))
                data["pricing_plan_id"] = None
            else:
                resolver = PriceResolver(self.db)
                try:
                    result = resolver.resolve(
                        organization_id=organization_id,
                        product_id=product_id,
                        pricing_plan_id=data.get("pricing_plan_id"),
                    )
                    data["base_price"] = result.base_price
                    data["resolved_price"] = result.resolved_price
                    data["pricing_plan_id"] = result.pricing_plan_id
                    data["price_source"] = result.price_source
                    data["unit_price"] = result.resolved_price
                except (NotFoundException, BadRequestException) as e:
                    raise

        sub = self.repo.create(
            organization_id,
            customer_id=customer_id, plan_id=plan_id,
            subscription_number=subscription_number,
            **data,
        )
        self._log_event(organization_id, sub.id, "created", None, {"subscription_number": subscription_number, "plan_id": plan_id, "currency": data["currency"]}, created_by=created_by)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Subscription", sub.id)
        return sub

    def update_subscription(self, sub_id: int, organization_id: int, updated_by: int, **data: Any) -> Subscription:
        data = filter_allowed(data, SUB_ALLOWED_FIELDS)
        sub = self.repo.get_by_id(sub_id, organization_id)
        old_values = {"status": sub.status.value, "quantity": sub.quantity, "unit_price": str(sub.unit_price)}
        updated = self.repo.update(sub_id, organization_id, **data)
        self._log_event(organization_id, sub_id, "updated", old_values, data, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return updated

    def get_subscription(self, sub_id: int, organization_id: int) -> Subscription:
        return self.repo.get_by_id(sub_id, organization_id)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Subscription]:
        return self.repo.get_by_number(organization_id, number)

    def list_subscriptions(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        plan_id: Optional[int] = None, status: Optional[str] = None,
        sort_by: str = "created_at", sort_order: str = "desc",
        contract_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            plan_id=plan_id, status=status, contract_id=contract_id,
        )

    def list_active(self, organization_id: int) -> List[Subscription]:
        return self.repo.list_active(organization_id)

    def list_due_for_billing(self, organization_id: int, billing_date: str) -> List[Subscription]:
        return self.repo.list_due_for_billing(organization_id, billing_date)

    # ── Status Mutations ───────────────────────────────────────────────────

    def activate_subscription(self, sub_id: int, organization_id: int, updated_by: int) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        self._validate_status_transition(sub.status, BillingSubscriptionStatus.ACTIVE)
        sub = self.repo.resume(sub_id, organization_id)
        self._log_event(organization_id, sub_id, "activated", {"status": sub.status.value if hasattr(sub, "status") else None}, {"status": "active"}, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return sub

    def resume_subscription(self, sub_id: int, organization_id: int, updated_by: int) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        self._validate_status_transition(sub.status, BillingSubscriptionStatus.ACTIVE)
        sub = self.repo.resume(sub_id, organization_id)
        self._log_event(organization_id, sub_id, "resumed", {"status": sub.status.value if hasattr(sub, "status") else None}, {"status": "active"}, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return sub

    def pause_subscription(self, sub_id: int, organization_id: int, updated_by: int) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        self._validate_status_transition(sub.status, BillingSubscriptionStatus.PAUSED)
        sub = self.repo.pause(sub_id, organization_id)
        self._log_event(organization_id, sub_id, "paused", {"status": "active"}, {"status": "paused"}, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return sub

    def cancel_subscription(self, sub_id: int, organization_id: int, reason: Optional[str] = None, updated_by: int = None) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        self._validate_status_transition(sub.status, BillingSubscriptionStatus.CANCELLED)
        sub = self.repo.cancel(sub_id, organization_id, reason)
        self._log_event(organization_id, sub_id, "cancelled", {"status": sub.status.value if hasattr(sub, "status") else None}, {"status": "cancelled", "reason": reason}, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.CANCEL, "Subscription", sub_id)
        return sub

    # ── Plan Changes ──────────────────────────────────────────────────────

    def change_plan(
        self, sub_id: int, organization_id: int, new_plan_id: int,
        updated_by: int, **data: Any,
    ) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        if sub.status != BillingSubscriptionStatus.ACTIVE:
            raise BadRequestException("Only active subscriptions can change plans")
        new_plan = self.plan_repo.get_by_id(new_plan_id, organization_id)
        if not new_plan.is_active:
            raise BadRequestException("Target plan is not active")
        old_plan_id = sub.plan_id
        sub.plan_id = new_plan_id
        sub.unit_price = data.get("unit_price", new_plan.unit_price or sub.unit_price)
        if new_plan.trial_days and not sub.trial_end_date:
            sub.trial_end_date = date.today() + timedelta(days=new_plan.trial_days)
        safe_commit_and_refresh(self.db, sub)
        self._log_event(organization_id, sub_id, "plan_changed", {"plan_id": old_plan_id}, {"plan_id": new_plan_id}, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return sub

    # ── Billing Cycle ────────────────────────────────────────────────────

    def compute_next_billing(self, sub: Subscription) -> Optional[date]:
        plan = sub.plan
        if not plan or plan.billing_period == BillingPeriod.ONE_TIME:
            return None
        return self._compute_next_billing_date(sub.current_term_end or date.today(), plan.billing_period)

    def renew_subscription(self, sub_id: int, organization_id: int, updated_by: int) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        if sub.status not in (BillingSubscriptionStatus.ACTIVE, BillingSubscriptionStatus.EXPIRED):
            raise BadRequestException("Subscription cannot be renewed")
        plan = sub.plan
        sub.current_term_start = sub.current_term_end or date.today()
        sub.current_term_end = self._compute_next_billing_date(sub.current_term_start, plan.billing_period)
        sub.next_billing_at = self.compute_next_billing(sub)
        sub.status = BillingSubscriptionStatus.ACTIVE
        safe_commit_and_refresh(self.db, sub)
        self._log_event(organization_id, sub_id, "renewed", None, {"current_term_start": str(sub.current_term_start), "current_term_end": str(sub.current_term_end)}, created_by=updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return sub

    def generate_invoice(self, sub_id: int, organization_id: int, created_by: int) -> dict:
        """
        Generate an invoice for a subscription that is due for billing.
        
        Uses existing InvoiceService to create the invoice — NO duplicate calculation engine.
        Resolves currency, exchange rate, and tax from the subscription's context.
        Returns dict with invoice_id and amounts.
        """
        sub = self.repo.get_by_id(sub_id, organization_id)
        if not sub:
            raise NotFoundException("Subscription", sub_id)
        
        if sub.status != BillingSubscriptionStatus.ACTIVE:
            raise BadRequestException(f"Cannot generate invoice for {sub.status.value} subscription")
        
        # Resolve currency from subscription (persisted) → customer → org config
        currency = sub.currency
        if not currency:
            customer = self.customer_service.get_customer(sub.customer_id, organization_id)
            currency = customer.currency if customer and hasattr(customer, 'currency') and customer.currency else None
        if not currency:
            currency = self.config_service.get_default_currency(organization_id)
        
        # Resolve exchange rate for reference/recording only.
        # Invoice amounts are always in the subscription's own currency.
        # The exchange rate is stored on the invoice for reporting conversion
        # but does NOT alter the invoice line-item amounts.
        config = self.config_service.get_configuration(organization_id)
        base_currency = (
            config.base_currency.value
            if hasattr(config.base_currency, "value")
            else str(config.base_currency or "USD")
        )
        currency = (currency or "").upper().strip()
        base_currency = (base_currency or "").upper().strip()

        if not currency:
            currency = base_currency

        # Always use rate=1 for the invoice (same currency as subscription).
        # Cross-currency conversion is handled at reporting level, not invoice level.
        # Record the reference rate for audit/tracking even if not used for amounts.
        invoice_exchange_rate = Decimal("1")
        reference_rate = None
        if currency != base_currency:
            try:
                ref_rate, _, _ = self.exchange_rate_service.get_rate(
                    organization_id, currency, base_currency,
                )
                if ref_rate is not None and ref_rate > 0:
                    reference_rate = ref_rate
            except BadRequestException:
                raise
            except Exception as e:
                logger.warning(
                    "Could not get exchange rate for %s->%s: %s",
                    currency, base_currency, e,
                )

        # Calculate line item amounts using CalculationService
        qty = Decimal(str(sub.quantity or 1))
        price = Decimal(str(sub.unit_price or 0))
        disc_pct = Decimal(str(sub.discount_percentage or 0))
        tax_pct = Decimal(str(sub.tax_percentage or 0))
        is_tax_inclusive = getattr(sub, 'is_tax_inclusive', False) or False

        calc = CalculationService.calculate_line_item(
            quantity=qty,
            unit_price=price,
            discount_percentage=disc_pct,
            tax_percentage=tax_pct,
            exchange_rate=invoice_exchange_rate,
            is_tax_inclusive=is_tax_inclusive
        )
        
        # Build invoice data — deterministic number based on scheduled billing date
        # ensures same billing period always produces the same invoice number
        billing_date = sub.next_billing_at or date.today()
        invoice_number = f"SUB-{sub.subscription_number}-{billing_date.strftime('%Y%m%d')}"
        
        invoice_data = {
            "currency": currency,
            "exchange_rate": float(invoice_exchange_rate),
            "notes": f"Auto-generated from subscription {sub.subscription_number}",
            "subscription_id": sub.id,
            "contract_id": sub.contract_id if hasattr(sub, 'contract_id') else None,
            "issue_date": billing_date,
            "due_date": billing_date,
        }
        
        # Create invoice via InvoiceService (local import to avoid circular dependency)
        from app.modules.billing.services.invoice_service import InvoiceService
        invoice_svc = InvoiceService(self.db)
        try:
            invoice = invoice_svc.create_invoice(
                organization_id=organization_id,
                created_by=created_by,
                customer_id=sub.customer_id,
                invoice_number=invoice_number,
                _skip_recalculate=True,
                **invoice_data
            )
        except AlreadyExistsException:
            # Invoice already generated for this period
            logger.info("Invoice already exists for subscription %s, period %s", sub.subscription_number, invoice_number)
            return {"skipped": True, "reason": "Invoice already exists for this billing period"}

        # Add invoice line item from subscription/plan data
        plan = sub.plan
        plan_name = plan.plan_name if plan else f"Plan #{sub.plan_id}"
        item_description = f"Subscription {sub.subscription_number} — {plan_name}"
        if sub.quantity and sub.quantity > 1:
            item_description += f" (x{sub.quantity})"

        invoice_item = InvoiceItem(
            organization_id=organization_id,
            invoice_id=invoice.id,
            line_number=1,
            description=item_description,
            quantity=Decimal(str(sub.quantity or 1)),
            unit_price=price,
            discount_percentage=disc_pct,
            tax_percentage=tax_pct,
            total=Decimal(str(calc["converted_line_total"])),
            discount_amount=Decimal(str(calc["converted_discount"])),
            tax_amount=Decimal(str(calc["converted_tax_amount"])),
            invoice_currency=currency,
            converted_amount=Decimal(str(calc["converted_line_total"])),
            product_id=getattr(sub, 'product_id', None),
            pricing_plan_id=getattr(sub, 'pricing_plan_id', None),
            price_source=getattr(sub, 'price_source', None),
            base_price=getattr(sub, 'base_price', None),
            resolved_price=getattr(sub, 'resolved_price', None),
        )
        self.db.add(invoice_item)
        self.db.flush()

        # Server-side: set authoritative financial totals directly on the invoice.
        # These fields are excluded from INVOICE_ALLOWED_FIELDS to prevent client
        # injection, but the subscription service sets them authoritatively here.
        invoice.subtotal = Decimal(str(calc["converted_subtotal"]))
        invoice.discount_amount = Decimal(str(calc["converted_discount"]))
        invoice.tax_amount = Decimal(str(calc["converted_tax_amount"]))
        invoice.total_amount = Decimal(str(calc["converted_line_total"]))
        invoice.balance_due = invoice.total_amount - (invoice.paid_amount or Decimal("0"))
        self.db.commit()
        self.db.refresh(invoice)
        
        # Update subscription billing dates
        self.renew_subscription(sub_id, organization_id, created_by)
        
        # Log event
        self._log_event(
            organization_id, sub_id, "invoice_generated",
            None,
            {"invoice_id": invoice.id, "invoice_number": invoice.invoice_number, "amount": str(calc["converted_line_total"])},
            created_by=created_by
        )
        
        return {
            "invoice_id": invoice.id,
            "invoice_number": invoice.invoice_number,
            "amount": float(calc["converted_line_total"]),
            "currency": currency,
        }

    def process_due_subscriptions(self, organization_id: int, billing_date: str, created_by: int) -> dict:
        """
        Process all subscriptions due for billing on a given date.
        Returns summary of processed subscriptions.
        """
        due_subs = self.list_due_for_billing(organization_id, billing_date)
        results = {"processed": 0, "skipped": 0, "failed": 0, "invoices": []}
        
        for sub in due_subs:
            try:
                result = self.generate_invoice(sub.id, organization_id, created_by)
                if result.get("skipped"):
                    results["skipped"] += 1
                else:
                    results["processed"] += 1
                    results["invoices"].append(result)
            except Exception as e:
                logger.error("Failed to generate invoice for subscription %d: %s", sub.id, e)
                results["failed"] += 1
        
        return results

    def mark_past_due(self, sub_id: int, organization_id: int, updated_by: int) -> Subscription:
        sub = self.repo.get_by_id(sub_id, organization_id)
        if sub.status != BillingSubscriptionStatus.ACTIVE:
            raise BadRequestException("Only active subscriptions can become past due")
        sub.status = BillingSubscriptionStatus.PAST_DUE
        safe_commit_and_refresh(self.db, sub)
        self._log_event(organization_id, sub_id, "past_due", {"status": "active"}, {"status": "past_due"})
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Subscription", sub_id)
        return sub

    # ── Events ─────────────────────────────────────────────────────────────

    def _log_event(
        self, organization_id: int, subscription_id: int, event_type: str,
        old_value: Optional[dict] = None, new_value: Optional[dict] = None,
        reason: Optional[str] = None, created_by: Optional[int] = None,
    ) -> SubscriptionEvent:
        return self.event_repo.log_event(
            organization_id,
            subscription_id, event_type, old_value, new_value, reason, created_by,
        )

    def list_events(self, subscription_id: int, organization_id: int, limit: int = 50) -> List[SubscriptionEvent]:
        self.repo.get_by_id(subscription_id, organization_id)
        return self.event_repo.list_by_subscription(organization_id, subscription_id, limit)

    # ── Plans ──────────────────────────────────────────────────────────────

    def create_plan(self, organization_id: int, created_by: int, **data: Any) -> SubscriptionPlan:
        data = filter_allowed(data, PLAN_ALLOWED_FIELDS)
        if self.plan_repo.exists(organization_id, plan_code=data.get("plan_code")):
            raise AlreadyExistsException("SubscriptionPlan", "plan_code")
        plan = self.plan_repo.create(organization_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "SubscriptionPlan", plan.id)
        return plan

    def update_plan(self, plan_id: int, organization_id: int, updated_by: int, **data: Any) -> SubscriptionPlan:
        data = filter_allowed(data, PLAN_ALLOWED_FIELDS)
        self.plan_repo.get_by_id(plan_id, organization_id)
        if data.get("plan_code"):
            existing = self.plan_repo.get_by_code(organization_id, data["plan_code"])
            if existing and existing.id != plan_id:
                raise AlreadyExistsException("SubscriptionPlan", "plan_code")
        updated = self.plan_repo.update(plan_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "SubscriptionPlan", plan_id)
        return updated

    def get_plan(self, plan_id: int, organization_id: int) -> SubscriptionPlan:
        return self.plan_repo.get_by_id(plan_id, organization_id)

    def get_plan_by_code(self, organization_id: int, code: str) -> Optional[SubscriptionPlan]:
        return self.plan_repo.get_by_code(organization_id, code)

    def list_plans(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, category: Optional[str] = None,
        sort_by: str = "sort_order", sort_order: str = "asc",
    ) -> Dict[str, Any]:
        return self.plan_repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, category=category,
        )

    def list_public_plans(self, organization_id: int) -> List[SubscriptionPlan]:
        return self.plan_repo.list_public(organization_id)

    # ── Reporting Aggregation ──────────────────────────────────────────────

    def get_subscription_reporting(self, organization_id: int) -> Dict[str, Any]:
        """
        Compute MRR, ARR and currency breakdown for the organisation's
        active subscriptions.

        Currency-normalisation policy:
          * Each subscription amount is normalised to its billing-period
            (monthly ÷ 1, quarterly ÷ 3, annual ÷ 12, etc.)
          * The normalised monthly amount is converted to the org reporting
            currency using a current exchange rate from ExchangeRateService.
          * Subscriptions whose currency cannot be converted are excluded
            from the aggregate but reported separately.
          * Decimal-safe math throughout — no floating-point for totals.
        """
        active_subs = self.repo.list_active_with_plan(organization_id)
        config = self.config_service.get_configuration(organization_id)
        base_currency = (
            config.base_currency.value
            if hasattr(config.base_currency, "value")
            else str(config.base_currency or "USD")
        )

        BILLING_MONTHS = {
            BillingPeriod.MONTHLY: Decimal("1"),
            BillingPeriod.QUARTERLY: Decimal("3"),
            BillingPeriod.SEMI_ANNUAL: Decimal("6"),
            BillingPeriod.ANNUAL: Decimal("12"),
            BillingPeriod.ONE_TIME: Decimal("1"),
        }

        total_mrr = Decimal("0")
        total_arr = Decimal("0")
        currency_breakdown: Dict[str, Decimal] = {}
        convertible_count = 0
        excluded_count = 0

        for sub in active_subs:
            price = Decimal(str(sub.unit_price or 0))
            qty = Decimal(str(sub.quantity or 1))
            raw_monthly = (price * qty).quantize(Decimal("0.01"))

            # Normalise to monthly
            plan = sub.plan
            period = plan.billing_period if plan else BillingPeriod.MONTHLY
            divisor = BILLING_MONTHS.get(period, Decimal("1"))
            monthly_mrr = (raw_monthly / divisor).quantize(Decimal("0.01"))

            # Per-subscription currency (persisted on the subscription)
            sub_currency = (sub.currency or "").upper().strip()
            if not sub_currency:
                sub_currency = base_currency

            if sub_currency == base_currency:
                total_mrr += monthly_mrr
                currency_breakdown[sub_currency] = currency_breakdown.get(sub_currency, Decimal("0")) + monthly_mrr
                convertible_count += 1
                continue

            # Convert to base currency
            try:
                rate, _source, _ts = self.exchange_rate_service.get_rate(
                    organization_id, sub_currency, base_currency,
                )
                converted = (monthly_mrr * rate).quantize(Decimal("0.01"))
                total_mrr += converted
                currency_breakdown[sub_currency] = currency_breakdown.get(sub_currency, Decimal("0")) + monthly_mrr
                convertible_count += 1
            except Exception:
                logger.warning(
                    "Cannot convert subscription %s currency %s to %s — excluded from aggregate",
                    sub.subscription_number, sub_currency, base_currency,
                )
                excluded_count += 1

        total_arr = (total_mrr * Decimal("12")).quantize(Decimal("0.01"))

        # Build breakdown list (original-currency values)
        breakdown_list = [
            {"currency": curr, "amount": str(amt)}
            for curr, amt in sorted(currency_breakdown.items())
        ]

        return {
            "reporting_currency": base_currency,
            "mrr": str(total_mrr),
            "arr": str(total_arr),
            "active_subscriptions": convertible_count + excluded_count,
            "convertible_subscriptions": convertible_count,
            "excluded_subscriptions": excluded_count,
            "currency_breakdown": breakdown_list,
        }
