import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
    NotFoundException,
)
from app.modules.billing.models import (
    BillingAuditAction,
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    InvoiceStatusHistory,
    InvoiceType,
    NumberFormat,
    SequenceReset,
)
from app.modules.billing.repositories.invoice import (
    InvoiceItemRepository,
    InvoiceRepository,
    InvoiceStatusHistoryRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.calculation_service import CalculationService
from app.modules.billing.services.customer_service import CustomerService
from app.modules.billing.services.settings_service import BillingConfigurationService
from app.modules.billing.services.exchange_rate_service import ExchangeRateService
from app.modules.billing.services.tax_service import TaxService
from sqlalchemy.orm import joinedload
from decimal import Decimal, ROUND_HALF_UP

logger = logging.getLogger("zoiko")

INVOICE_ALLOWED_FIELDS = {
    "customer_id", "invoice_number", "invoice_type", "issue_date",
    "due_date", "discount_percentage",
    "currency", "exchange_rate", "notes", "payment_terms", "po_number",
    "subscription_id", "quotation_id", "contract_id", "is_recurring", "status",
}
ITEM_ALLOWED_FIELDS = {
    "invoice_id", "line_number", "description", "quantity",
    "unit_price", "discount_percentage", "tax_percentage", "product_id",
    "original_currency", "original_amount", "exchange_rate",
    "pricing_plan_id", "price_source", "base_price", "resolved_price",
}


class InvoiceService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = InvoiceRepository(db)
        self.item_repo = InvoiceItemRepository(db)
        self.history_repo = InvoiceStatusHistoryRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)
        self.config_service = BillingConfigurationService(db)
        self.exchange_rate_service = ExchangeRateService(db)
        self.tax_service = TaxService(self.db)

    def _validate_status_transition(self, current: InvoiceStatus, target: InvoiceStatus) -> None:
        valid = {
            InvoiceStatus.DRAFT: [InvoiceStatus.SENT, InvoiceStatus.CANCELLED],
            InvoiceStatus.SENT: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED],
            InvoiceStatus.PARTIALLY_PAID: [InvoiceStatus.PAID, InvoiceStatus.OVERDUE, InvoiceStatus.CANCELLED],
            InvoiceStatus.OVERDUE: [InvoiceStatus.PAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.CANCELLED],
            InvoiceStatus.PAID: [InvoiceStatus.REFUNDED],
            InvoiceStatus.CANCELLED: [],
            InvoiceStatus.REFUNDED: [],
        }
        if target not in valid.get(current, []):
            raise BadRequestException(f"Cannot transition invoice from {current.value} to {target.value}")

    def _record_status_history(self, organization_id: int, invoice_id: int, from_status: Optional[str], to_status: str, changed_by: Optional[int] = None, reason: Optional[str] = None) -> InvoiceStatusHistory:
        return self.history_repo.log_status_change(organization_id, invoice_id, from_status, to_status, changed_by, reason)

    def _generate_invoice_number(self, organization_id: int) -> str:
        """Generate invoice number using billing configuration format."""
        config = self.config_service.get_configuration(organization_id)
        prefix = config.invoice_prefix or "INV-"
        fmt = config.invoice_number_format or NumberFormat.PREFIX_YYYY_SEQ
        reset = config.invoice_sequence_reset or SequenceReset.ANNUALLY

        now = datetime.utcnow()
        year = now.strftime("%Y")
        month = now.strftime("%m")

        if reset == SequenceReset.MONTHLY:
            seq_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif reset == SequenceReset.QUARTERLY:
            quarter = (now.month - 1) // 3 + 1
            seq_start = now.replace(month=(quarter - 1) * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif reset == SequenceReset.ANNUALLY:
            seq_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:  # NEVER
            seq_start = None

        query = self.db.query(func.count(Invoice.id)).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        )
        if seq_start:
            query = query.filter(Invoice.created_at >= seq_start)

        count = query.scalar() or 0
        seq = str(count + 1).zfill(5)

        fmt_map = {
            NumberFormat.PREFIX_SEQ: f"{prefix}{{SEQ}}",
            NumberFormat.PREFIX_YYYY_SEQ: f"{prefix}{year}-{{SEQ}}",
            NumberFormat.PREFIX_YYYYMM_SEQ: f"{prefix}{year}{month}-{{SEQ}}",
            NumberFormat.PREFIX_YYYY_MM_SEQ: f"{prefix}{year}-{month}-{{SEQ}}",
            NumberFormat.PREFIX_MM_YYYY_SEQ: f"{prefix}{month}-{year}-{{SEQ}}",
        }

        template = fmt_map.get(fmt, f"{prefix}{year}-{{SEQ}}")
        return template.replace("{SEQ}", seq).replace("{YYYY}", year).replace("{MM}", month)

    # ── Currency Conversion (Phase 1) ────────────────────────────────────────

    def _get_exchange_rate(self, organization_id: int, from_currency: str, to_currency: str) -> Optional[Decimal]:
        """Get exchange rate using ExchangeRateService (live API → cached → legacy).
        
        Rates are returned as: from_currency → to_currency.
        """
        if from_currency == to_currency:
            return Decimal("1")
        
        try:
            rate, source, timestamp = self.exchange_rate_service.get_rate(
                organization_id, from_currency, to_currency
            )
            logger.info(
                "Exchange rate %s→%s = %s (source=%s, ts=%s)",
                from_currency, to_currency, rate, source, timestamp,
            )
            return rate
        except BadRequestException:
            return None

    def _convert_currency(self, amount: Decimal, from_currency: str, to_currency: str, organization_id: int) -> tuple[Decimal, Decimal]:
        """Convert amount from one currency to another.
        
        Returns: (converted_amount, exchange_rate)
        """
        if from_currency == to_currency:
            return amount, Decimal("1")
        
        rate = self._get_exchange_rate(organization_id, from_currency, to_currency)
        if rate is None:
            raise BadRequestException(
                f"Exchange rate not configured for {from_currency} to {to_currency}. "
                "Please configure exchange rates in Billing Settings."
            )
        
        converted = (amount * rate).quantize(Decimal('0.01'))
        return converted, rate

    def _validate_exchange_rates(self, organization_id: int, invoice_currency: str, line_items: List[Dict[str, Any]]) -> None:
        """Validate that all required exchange rates are available (live or cached)."""
        currencies_needed = set()
        currencies_needed.add(invoice_currency)
        
        for item in line_items:
            product_currency = item.get("original_currency") or item.get("currency")
            if product_currency:
                currencies_needed.add(product_currency)
        
        missing = []
        for curr in currencies_needed:
            if curr == invoice_currency:
                continue
            try:
                self.exchange_rate_service.get_rate(organization_id, curr, invoice_currency)
            except BadRequestException:
                missing.append(curr)
        
        if missing:
            raise BadRequestException(
                f"Exchange rate not available for currency(ies): {', '.join(missing)}. "
                "Please refresh exchange rates in Billing Settings or configure manual rates."
            )

    def _apply_currency_conversion(self, item_data: Dict[str, Any], invoice_currency: str, organization_id: int) -> Dict[str, Any]:
        """Apply currency conversion to item data if currencies differ.
        
        Fetches the rate from ExchangeRateService (live API → cached → legacy) and
        stores the rate source and timestamp on the item for audit trail.
        """
        original_currency = item_data.get("original_currency")
        original_amount = item_data.get("original_amount")
        
        if not original_currency or not original_amount:
            return item_data
        
        # If currencies are the same, no conversion needed
        if original_currency == invoice_currency:
            item_data["invoice_currency"] = invoice_currency
            item_data["exchange_rate"] = Decimal("1")
            item_data["converted_amount"] = Decimal(str(original_amount))
            item_data["unit_price"] = Decimal(str(original_amount))
            item_data["exchange_rate_timestamp"] = datetime.utcnow()
            return item_data
        
        # Fetch rate from ExchangeRateService
        try:
            rate, source, timestamp = self.exchange_rate_service.get_rate(
                organization_id, original_currency, invoice_currency
            )
        except BadRequestException:
            raise
        
        converted_amount = (Decimal(str(original_amount)) * rate).quantize(Decimal('0.01'))
        
        item_data["invoice_currency"] = invoice_currency
        item_data["exchange_rate"] = rate
        item_data["converted_amount"] = converted_amount
        item_data["unit_price"] = converted_amount
        item_data["exchange_rate_timestamp"] = timestamp or datetime.utcnow()
        
        return item_data

    def calculate_invoice_totals(self, items: List[Dict[str, Any]], discount_percentage: Decimal = Decimal("0")) -> Dict[str, Decimal]:
        line_items_data = []
        for it in items:
            qty = Decimal(str(it.get("quantity", 1)))
            price = Decimal(str(it.get("unit_price", 0)))
            disc = Decimal(str(it.get("discount_percentage", 0)))
            tax = Decimal(str(it.get("tax_percentage", 0)))
            rate = Decimal(str(it.get("exchange_rate", 1)))
            line_items_data.append(CalculationService.calculate_line_item(qty, price, disc, tax_percentage=tax, exchange_rate=rate))
        summary = CalculationService.summarize_invoice(line_items_data)
        
        # Use line-item totals (already includes line discounts + taxes)
        subtotal_before_discount = summary["total_converted_subtotal"]
        line_discount_total = summary["total_converted_discount"]
        tax_amount = summary["total_converted_tax"]
        grand_total = summary["total_converted_grand"]
        
        # Subtotal after line discounts
        subtotal = subtotal_before_discount - line_discount_total
        
        # Apply invoice level discount on the subtotal after line discounts
        inv_discount = subtotal * discount_percentage / Decimal("100")
        
        total_amount = grand_total - inv_discount
        discount_amount = line_discount_total + inv_discount
        
        return {
            "subtotal": subtotal,
            "discount_amount": discount_amount,
            "tax_amount": tax_amount,
            "total_amount": total_amount
        }

    def _calculate_item_total(self, quantity: Decimal, unit_price: Decimal, discount_percentage: Decimal = Decimal("0"), tax_percentage: Decimal = Decimal("0")) -> Decimal:
        res = CalculationService.calculate_line_item(quantity, unit_price, discount_percentage, tax_percentage=tax_percentage)
        return res["converted_line_total"]

    def create_invoice(self, organization_id: int, created_by: int, customer_id: int, invoice_number: str, _skip_recalculate: bool = False, **data: Any) -> Invoice:
        data = filter_allowed(data, INVOICE_ALLOWED_FIELDS)
        customer = self.customer_service.get_customer(customer_id, organization_id)

        # Use customer's currency if not explicitly provided, else org default
        if "currency" not in data or not data["currency"]:
            data["currency"] = customer.currency or self.config_service.get_default_currency(organization_id)

        # Optional server-side tax resolution
        resolve_tax = data.pop("resolve_tax", False)
        items_data = data.get("items")
        if resolve_tax and items_data:
            taxable_amount = Decimal("0")
            for item in items_data:
                qty = Decimal(str(item.get("quantity", 1)))
                price = Decimal(str(item.get("unit_price", 0)))
                taxable_amount += qty * price

            resolved_taxes = self.tax_service.calculate_taxes(
                organization_id, taxable_amount,
                jurisdiction=data.get("jurisdiction"),
                tax_type_filter=data.get("tax_type_filter")
            )

            if resolved_taxes:
                total_tax_pct = sum(Decimal(str(t.get("tax_percentage", 0))) for t in resolved_taxes)
                for item in items_data:
                    item["tax_percentage"] = float(total_tax_pct)

        if not invoice_number or invoice_number.strip().lower() in ("auto", "auto-generated", ""):
            invoice_number = self._generate_invoice_number(organization_id)

        if self.repo.exists(organization_id, invoice_number=invoice_number):
            raise AlreadyExistsException("Invoice", "invoice_number")

        inv = self.repo.create(organization_id, customer_id=customer_id, invoice_number=invoice_number, status=InvoiceStatus.DRAFT, **data)
        # Set balance_due = total_amount for new invoices (no payments yet).
        # This is a safety net; recalculate_invoice or the caller will set the authoritative value.
        total = Decimal(str(data.get("total_amount", 0)))
        inv.balance_due = total
        if _skip_recalculate:
            safe_commit_and_refresh(self.db, inv)
        # Recalculate invoice totals using CalculationService (backend authority)
        if not _skip_recalculate:
            try:
                self.recalculate_invoice(inv.id, organization_id)
            except Exception as e:
                logger.warning("Could not recalculate invoice %d during creation: %s", inv.id, e)
        self._record_status_history(organization_id, inv.id, None, InvoiceStatus.DRAFT, created_by)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Invoice", inv.id, new_values=data)
        return inv

    def update_invoice(self, invoice_id: int, organization_id: int, updated_by: int, **data: Any) -> Invoice:
        data = filter_allowed(data, INVOICE_ALLOWED_FIELDS)
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Only draft invoices can be edited")
        updated = self.repo.update(invoice_id, organization_id, **data)
        # Recalculate after discount_percentage change
        try:
            self.recalculate_invoice(invoice_id, organization_id)
        except Exception as e:
            logger.warning("Could not recalculate invoice %d during update: %s", invoice_id, e)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Invoice", invoice_id)
        return updated

    def get_invoice(self, invoice_id: int, organization_id: int) -> Invoice:
        from sqlalchemy.orm import joinedload
        inv = self.repo.db.query(Invoice).options(
            joinedload(Invoice.customer)
        ).filter(
            Invoice.id == invoice_id,
            Invoice.organization_id == organization_id
        ).first()
        if not inv:
            return self.repo.get_by_id(invoice_id, organization_id)
        return inv

    def get_by_number(self, organization_id: int, number: str) -> Optional[Invoice]:
        return self.repo.get_by_number(organization_id, number)

    def list_invoices(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, invoice_type: Optional[str] = None,
        date_from: Optional[str] = None, date_to: Optional[str] = None,
        sort_by: str = "created_at", sort_order: str = "desc",
        currency: Optional[str] = None, min_amount: Optional[float] = None,
        max_amount: Optional[float] = None, payment_status: Optional[str] = None,
        is_overdue: Optional[bool] = None, owner_id: Optional[int] = None,
        contract_id: Optional[int] = None, subscription_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, invoice_type=invoice_type,
            date_from=date_from, date_to=date_to,
            currency=currency, min_amount=min_amount,
            max_amount=max_amount, is_overdue=is_overdue,
            owner_id=owner_id, contract_id=contract_id,
            subscription_id=subscription_id,
        )

    # ── Enterprise Dashboard ────────────────────────────────────────────────

    def get_enterprise_dashboard_stats(self, organization_id: int) -> Dict[str, Any]:
        return self.repo.get_enterprise_dashboard_stats(organization_id)

    def get_invoice_trend(self, organization_id: int, months: int = 12) -> List:
        return self.repo.get_invoice_trend(organization_id, months)

    def get_revenue_trend(self, organization_id: int, months: int = 12) -> List:
        return self.repo.get_revenue_trend(organization_id, months)

    def get_payment_collection_trend(self, organization_id: int, months: int = 12) -> List:
        return self.repo.get_payment_collection_trend(organization_id, months)

    def get_status_distribution(self, organization_id: int) -> List:
        return self.repo.get_status_distribution(organization_id)

    def get_monthly_revenue_stats(self, organization_id: int, months: int = 12) -> List:
        return self.repo.get_monthly_revenue_stats(organization_id, months)

    def get_recent_activity(self, organization_id: int, limit: int = 10) -> List:
        return self.repo.get_recent_activity(organization_id, limit)

    def bulk_delete_invoices(self, organization_id: int, ids: List[int], updated_by: int) -> int:
        count = self.repo.bulk_delete(ids, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "Invoice", None, new_values={"deleted_ids": ids})
        return count

    # ── Items ─────────────────────────────────────────────────────────────

    def add_item(self, invoice_id: int, organization_id: int, **data: Any) -> InvoiceItem:
        data = filter_allowed(data, ITEM_ALLOWED_FIELDS)
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Cannot add items to a finalized invoice. Create a credit note or adjustment instead.")
        # Check for duplicate line_number
        line_number = data.get("line_number")
        if line_number is not None:
            existing_items = self.item_repo.list_by_invoice(organization_id, invoice_id)
            if any(item.line_number == line_number for item in existing_items):
                raise BadRequestException(f"Line number {line_number} already exists on this invoice")
        # Calculate line total if not provided
        if "total" not in data or data.get("total") is None:
            data["total"] = self._calculate_line_total(data)
        return self.item_repo.create(organization_id, invoice_id=invoice_id, **data)

    def _calculate_line_total(self, item_data: Dict[str, Any]) -> Decimal:
        """Calculate line item total: (qty * unit_price) - discount + tax"""
        qty = Decimal(str(item_data.get("quantity", 1)))
        if item_data.get("original_amount") is not None:
            price = Decimal(str(item_data.get("original_amount")))
            rate = Decimal(str(item_data.get("exchange_rate", 1)))
        else:
            price = Decimal(str(item_data.get("unit_price", 0)))
            rate = Decimal("1.0")
        disc_pct = Decimal(str(item_data.get("discount_percentage", 0)))
        tax_pct = Decimal(str(item_data.get("tax_percentage", 0)))
        res = CalculationService.calculate_line_item(qty, price, disc_pct, tax_percentage=tax_pct, exchange_rate=rate)
        return res["converted_line_total"]

    def _calculate_and_populate_item_financials(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        qty = Decimal(str(item_data.get("quantity", 1)))
        if item_data.get("original_amount") is not None:
            price = Decimal(str(item_data.get("original_amount")))
            rate = Decimal(str(item_data.get("exchange_rate", 1)))
        else:
            price = Decimal(str(item_data.get("unit_price", 0)))
            rate = Decimal("1.0")
        disc_pct = Decimal(str(item_data.get("discount_percentage", 0)))
        tax_pct = Decimal(str(item_data.get("tax_percentage", 0)))
        res = CalculationService.calculate_line_item(qty, price, disc_pct, tax_percentage=tax_pct, exchange_rate=rate)
        item_data["converted_amount"] = res["converted_unit_price"]
        item_data["unit_price"] = res["converted_unit_price"]
        item_data["discount_amount"] = res["converted_discount"]
        item_data["tax_amount"] = res["converted_tax_amount"]
        item_data["total"] = res["converted_line_total"]
        return item_data

    def bulk_set_items(self, invoice_id: int, organization_id: int, items: List[Dict[str, Any]]) -> List[InvoiceItem]:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Cannot modify items on a finalized invoice. Create a credit note or adjustment instead.")
        
        # Get invoice currency for conversion
        invoice_currency = inv.currency or self.config_service.get_default_currency(organization_id)
        
        self.item_repo.delete_by_invoice(organization_id, invoice_id)
        created_items = []
        for idx, it in enumerate(items):
            item_data = filter_allowed(it, ITEM_ALLOWED_FIELDS)
            
            # Handle currency conversion if product currency differs from invoice currency
            if item_data.get("original_currency") and item_data.get("original_amount"):
                item_data = self._apply_currency_conversion(item_data, invoice_currency, organization_id)
            
            # Recalculate financials to be 100% correct in DB
            item_data = self._calculate_populate_item_financials_or_use(item_data)
            item_data["line_number"] = idx + 1
            created_items.append(self.item_repo.create(organization_id, invoice_id=invoice_id, **item_data))
        
        # Recalculate invoice totals after items are set
        self.recalculate_invoice(invoice_id, organization_id)
        return created_items

    def _calculate_populate_item_financials_or_use(self, item_data: Dict[str, Any]) -> Dict[str, Any]:
        qty = Decimal(str(item_data.get("quantity", 1)))
        if item_data.get("original_amount") is not None:
            price = Decimal(str(item_data.get("original_amount")))
            rate = Decimal(str(item_data.get("exchange_rate", 1)))
        else:
            price = Decimal(str(item_data.get("unit_price", 0)))
            rate = Decimal("1.0")
        disc_pct = Decimal(str(item_data.get("discount_percentage", 0)))
        tax_pct = Decimal(str(item_data.get("tax_percentage", 0)))
        res = CalculationService.calculate_line_item(qty, price, disc_pct, tax_percentage=tax_pct, exchange_rate=rate)
        
        # We always populate these to keep DB correct
        item_data["converted_amount"] = res["converted_unit_price"]
        item_data["unit_price"] = res["converted_unit_price"]
        item_data["discount_amount"] = res["converted_discount"]
        item_data["tax_amount"] = res["converted_tax_amount"]
        item_data["total"] = res["converted_line_total"]
        return item_data

    def list_items(self, invoice_id: int, organization_id: int) -> List[InvoiceItem]:
        self.repo.get_by_id(invoice_id, organization_id)
        return self.item_repo.list_by_invoice(organization_id, invoice_id)

    def recalculate_invoice(self, invoice_id: int, organization_id: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Cannot recalculate a finalized invoice. Only draft invoices can be recalculated.")
        self.db.expire(inv)
        
        items_data = []
        for item in inv.items:
            qty = Decimal(str(item.quantity))
            if item.original_amount is not None:
                price = Decimal(str(item.original_amount))
                rate = Decimal(str(item.exchange_rate or 1))
            else:
                price = Decimal(str(item.unit_price))
                rate = Decimal("1.0")
            disc_pct = Decimal(str(item.discount_percentage or 0))
            tax_pct = Decimal(str(item.tax_percentage or 0))
            
            res = CalculationService.calculate_line_item(qty, price, disc_pct, tax_percentage=tax_pct, exchange_rate=rate)
            
            # Sync individual item values in DB
            item.converted_amount = res["converted_unit_price"]
            item.unit_price = res["converted_unit_price"]
            item.discount_amount = res["converted_discount"]
            item.tax_amount = res["converted_tax_amount"]
            item.total = res["converted_line_total"]
            
            items_data.append({
                "quantity": qty,
                "unit_price": price,
                "discount_percentage": disc_pct,
                "tax_percentage": tax_pct,
                "exchange_rate": rate
            })
            
        totals = self.calculate_invoice_totals(items_data, inv.discount_percentage)
        inv.subtotal = totals["subtotal"]
        inv.discount_amount = totals["discount_amount"]
        inv.tax_amount = totals["tax_amount"]
        inv.total_amount = totals["total_amount"]
        inv.balance_due = totals["total_amount"] - (inv.paid_amount or Decimal("0"))
        safe_commit_and_refresh(self.db, inv)
        return inv

    # ── Status Transitions ─────────────────────────────────────────────────

    def finalize_invoice(self, invoice_id: int, organization_id: int, updated_by: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        self._validate_status_transition(inv.status, InvoiceStatus.SENT)
        old_status = inv.status.value
        self.recalculate_invoice(invoice_id, organization_id)
        inv.status = InvoiceStatus.SENT
        inv.sent_at = datetime.utcnow()
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.SENT, updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.SEND, "Invoice", invoice_id)
        self.db.refresh(inv)
        return inv

    def mark_sent(self, invoice_id: int, organization_id: int, updated_by: int) -> Invoice:
        return self.finalize_invoice(invoice_id, organization_id, updated_by)

    def send_invoice_via_email(self, invoice_id: int, organization_id: int, sent_by: int) -> Dict[str, Any]:
        """Validate customer email, send invoice email, and update status to SENT."""
        from app.services.email_service import send_invoice_email
        from decimal import Decimal as D

        inv = self.repo.get_by_id(invoice_id, organization_id)

        if inv.status not in (InvoiceStatus.DRAFT, InvoiceStatus.SENT):
            raise BadRequestException(f"Cannot send invoice in '{inv.status.value}' status. Only draft or sent invoices can be emailed.")

        customer = self.customer_service.get_customer(inv.customer_id, organization_id)
        email = (customer.email or "").strip()
        if not email or "@" not in email:
            raise BadRequestException(
                f"Customer '{customer.company_name}' does not have a valid email address. "
                "Please update the customer profile before sending."
            )

        if inv.status == InvoiceStatus.DRAFT:
            self.recalculate_invoice(invoice_id, organization_id)
            inv = self.repo.get_by_id(invoice_id, organization_id)

        old_status = inv.status.value
        inv.status = InvoiceStatus.SENT
        inv.sent_at = datetime.utcnow()
        self.db.flush()

        issue_date_str = (inv.issue_date or inv.created_at or datetime.utcnow()).strftime("%Y-%m-%d")
        due_date_str = (inv.due_date or datetime.utcnow()).strftime("%Y-%m-%d")
        total_str = f"{float(inv.total_amount or 0):,.2f}"

        email_sent = send_invoice_email(
            email=email,
            customer_name=customer.display_name or customer.company_name,
            invoice_number=inv.invoice_number or f"#{inv.id}",
            issue_date=issue_date_str,
            due_date=due_date_str,
            total_amount=total_str,
            currency=inv.currency or self.config_service.get_default_currency(organization_id),
            notes=inv.notes or "",
        )

        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.SENT.value, sent_by, "Sent via email")
        self.audit.log(
            organization_id, sent_by, BillingAuditAction.SEND, "Invoice", invoice_id,
            new_values={"email_sent_to": email, "email_delivered": email_sent},
        )
        self.db.commit()
        self.db.refresh(inv)

        return {
            "invoice_id": inv.id,
            "invoice_number": inv.invoice_number,
            "status": inv.status.value,
            "email_sent_to": email,
            "email_delivered": email_sent,
            "sent_at": inv.sent_at.isoformat() if inv.sent_at else None,
            "message": f"Invoice emailed to {email}" if email_sent else f"Invoice marked sent (email logging only) for {email}",
        }

    def record_payment(self, invoice_id: int, organization_id: int, amount: Decimal, updated_by: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status in (InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED):
            raise BadRequestException(f"Cannot record payment on a {inv.status.value} invoice")
        if amount <= 0:
            raise BadRequestException("Payment amount must be positive")
        old_status = inv.status.value
        inv.paid_amount = (inv.paid_amount or Decimal("0")) + amount
        inv.balance_due = inv.total_amount - inv.paid_amount
        if inv.balance_due <= 0:
            inv.status = InvoiceStatus.PAID
            inv.paid_at = datetime.utcnow()
        else:
            inv.status = InvoiceStatus.PARTIALLY_PAID
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(organization_id, invoice_id, old_status, inv.status.value, updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.PAY, "Invoice", invoice_id)
        return inv

    def cancel_invoice(self, invoice_id: int, organization_id: int, reason: Optional[str] = None, updated_by: int = None) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        self._validate_status_transition(inv.status, InvoiceStatus.CANCELLED)
        old_status = inv.status.value
        inv.status = InvoiceStatus.CANCELLED
        inv.cancelled_at = datetime.utcnow()
        inv.cancellation_reason = reason
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.CANCELLED.value, updated_by, reason)
        self.audit.log(organization_id, updated_by, BillingAuditAction.CANCEL, "Invoice", invoice_id)
        return inv

    def void_invoice(self, invoice_id: int, organization_id: int, reason: Optional[str] = None, updated_by: int = None) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status in (InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED):
            raise BadRequestException("Invoice cannot be voided")
        if inv.status != InvoiceStatus.DRAFT:
            self._validate_status_transition(inv.status, InvoiceStatus.CANCELLED)
        old_status = inv.status.value
        inv.status = InvoiceStatus.CANCELLED
        inv.cancelled_at = datetime.utcnow()
        inv.cancellation_reason = reason or "Voided"
        inv.is_active = False
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.CANCELLED.value, updated_by, reason or "Voided")
        self.audit.log(organization_id, updated_by, BillingAuditAction.VOID, "Invoice", invoice_id)
        return inv

    def mark_overdue(self, invoice_id: int, organization_id: int, updated_by: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        self._validate_status_transition(inv.status, InvoiceStatus.OVERDUE)
        old_status = inv.status.value
        inv.status = InvoiceStatus.OVERDUE
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.OVERDUE.value, updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Invoice", invoice_id)
        return inv

    # ── Queries ────────────────────────────────────────────────────────────

    def list_overdue(self, organization_id: int) -> List[Invoice]:
        return self.repo.list_overdue(organization_id)

    def list_due_between(self, organization_id: int, start_date: str, end_date: str) -> List[Invoice]:
        return self.repo.list_due_between(organization_id, start_date, end_date)

    def get_outstanding_total(self, organization_id: int) -> float:
        return self.repo.get_outstanding_total(organization_id)

    def get_dashboard_stats(self, organization_id: int) -> Dict[str, Any]:
        return self.repo.get_dashboard_stats(organization_id)

    # ── Status History ─────────────────────────────────────────────────────

    def list_status_history(self, invoice_id: int, organization_id: int) -> List[InvoiceStatusHistory]:
        self.repo.get_by_id(invoice_id, organization_id)
        return self.history_repo.list_by_invoice(organization_id, invoice_id)
