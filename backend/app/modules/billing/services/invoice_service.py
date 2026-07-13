import logging
from datetime import date, datetime
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
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed, calculate_line_item_totals
from app.modules.billing.services.customer_service import CustomerService
from app.modules.billing.services.settings_service import BillingConfigurationService
from sqlalchemy import func, extract, and_

logger = logging.getLogger("zoiko")

INVOICE_ALLOWED_FIELDS = {
    "customer_id", "invoice_number", "invoice_type", "issue_date",
    "due_date", "subtotal", "discount_percentage", "discount_amount",
    "tax_amount", "total_amount", "paid_amount", "balance_due",
    "currency", "exchange_rate", "notes", "payment_terms", "po_number",
    "subscription_id", "quotation_id", "contract_id", "is_recurring", "status",
}
ITEM_ALLOWED_FIELDS = {
    "invoice_id", "line_number", "description", "quantity",
    "unit_price", "discount_percentage", "discount_amount",
    "tax_percentage", "tax_amount", "total", "product_id",
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

    def calculate_invoice_totals(self, items: List[Dict[str, Any]], discount_percentage: Decimal = Decimal("0")) -> Dict[str, Decimal]:
        return calculate_line_item_totals(items, discount_percentage)

    def _calculate_item_total(self, quantity: Decimal, unit_price: Decimal, discount_percentage: Decimal = Decimal("0"), tax_percentage: Decimal = Decimal("0")) -> Decimal:
        """Calculate line item total: (qty * unit_price) - discount + tax"""
        line_total = quantity * unit_price
        discount = line_total * discount_percentage / Decimal("100")
        taxable = line_total - discount
        tax = taxable * tax_percentage / Decimal("100")
        return taxable + tax

    def create_invoice(self, organization_id: int, created_by: int, customer_id: int, invoice_number: str, **data: Any) -> Invoice:
        data = filter_allowed(data, INVOICE_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)

        if not invoice_number or invoice_number.strip().lower() in ("auto", "auto-generated", ""):
            invoice_number = self._generate_invoice_number(organization_id)

        if self.repo.exists(organization_id, invoice_number=invoice_number):
            raise AlreadyExistsException("Invoice", "invoice_number")

        inv = self.repo.create(organization_id, customer_id=customer_id, invoice_number=invoice_number, status=InvoiceStatus.DRAFT, **data)
        self._record_status_history(organization_id, inv.id, None, InvoiceStatus.DRAFT, created_by)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Invoice", inv.id, new_values=data)
        return inv

    def update_invoice(self, invoice_id: int, organization_id: int, updated_by: int, **data: Any) -> Invoice:
        data = filter_allowed(data, INVOICE_ALLOWED_FIELDS)
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Only draft invoices can be edited")
        updated = self.repo.update(invoice_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Invoice", invoice_id)
        return updated

    def get_invoice(self, invoice_id: int, organization_id: int) -> Invoice:
        return self.repo.get_by_id(invoice_id, organization_id)

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
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, invoice_type=invoice_type,
            date_from=date_from, date_to=date_to,
            currency=currency, min_amount=min_amount,
            max_amount=max_amount, is_overdue=is_overdue,
            owner_id=owner_id,
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
        # Calculate line total if not provided
        if "total" not in data or data.get("total") is None:
            data["total"] = self._calculate_line_total(data)
        return self.item_repo.create(organization_id, invoice_id=invoice_id, **data)

    def _calculate_line_total(self, item_data: Dict[str, Any]) -> Decimal:
        """Calculate line item total: (qty * unit_price) - discount + tax"""
        qty = Decimal(str(item_data.get("quantity", 1)))
        price = Decimal(str(item_data.get("unit_price", 0)))
        disc_pct = Decimal(str(item_data.get("discount_percentage", 0)))
        tax_pct = Decimal(str(item_data.get("tax_percentage", 0)))
        line_total = qty * price
        discount = line_total * disc_pct / Decimal("100")
        taxable = line_total - discount
        tax = taxable * tax_pct / Decimal("100")
        return taxable + tax

    def bulk_set_items(self, invoice_id: int, organization_id: int, items: List[Dict[str, Any]]) -> List[InvoiceItem]:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Cannot modify items on a finalized invoice. Create a credit note or adjustment instead.")
        self.item_repo.delete_by_invoice(organization_id, invoice_id)
        created_items = []
        for idx, it in enumerate(items):
            item_data = filter_allowed(it, ITEM_ALLOWED_FIELDS)
            # Calculate line totals if not provided
            if "total" not in item_data or item_data.get("total") is None:
                item_data["total"] = self._calculate_line_total(item_data)
            item_data["line_number"] = idx + 1
            created_items.append(self.item_repo.create(organization_id, invoice_id=invoice_id, **item_data))
        # Recalculate invoice totals after items are set
        self.recalculate_invoice(invoice_id, organization_id)
        return created_items

    def list_items(self, invoice_id: int, organization_id: int) -> List[InvoiceItem]:
        self.repo.get_by_id(invoice_id, organization_id)
        return self.item_repo.list_by_invoice(organization_id, invoice_id)

    def recalculate_invoice(self, invoice_id: int, organization_id: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Cannot recalculate a finalized invoice. Only draft invoices can be recalculated.")
        items_data = [
            {
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount_percentage": item.discount_percentage,
                "tax_percentage": item.tax_percentage,
            }
            for item in inv.items
        ]
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
            currency=inv.currency or "USD",
            notes=inv.notes or "",
        )

        self._record_status_history(organization_id, invoice_id, None, InvoiceStatus.SENT.value, sent_by, "Sent via email")
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
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.CANCELLED, updated_by, reason)
        self.audit.log(organization_id, updated_by, BillingAuditAction.CANCEL, "Invoice", invoice_id)
        return inv

    def void_invoice(self, invoice_id: int, organization_id: int, reason: Optional[str] = None, updated_by: int = None) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status in (InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED):
            raise BadRequestException("Invoice cannot be voided")
        old_status = inv.status.value
        inv.status = InvoiceStatus.CANCELLED
        inv.cancelled_at = datetime.utcnow()
        inv.cancellation_reason = reason or "Voided"
        inv.is_active = False
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.CANCELLED, updated_by, reason)
        self.audit.log(organization_id, updated_by, BillingAuditAction.VOID, "Invoice", invoice_id)
        return inv

    def mark_overdue(self, invoice_id: int, organization_id: int, updated_by: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status not in (InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID):
            raise BadRequestException("Invoice cannot be marked overdue")
        old_status = inv.status.value
        inv.status = InvoiceStatus.OVERDUE
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(organization_id, invoice_id, old_status, InvoiceStatus.OVERDUE)
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
