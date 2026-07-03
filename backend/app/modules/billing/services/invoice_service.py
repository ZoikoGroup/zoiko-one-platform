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
)
from app.modules.billing.repositories.invoice import (
    InvoiceItemRepository,
    InvoiceRepository,
    InvoiceStatusHistoryRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed, calculate_line_item_totals
from app.modules.billing.services.customer_service import CustomerService

logger = logging.getLogger("zoiko")

INVOICE_ALLOWED_FIELDS = {
    "customer_id", "invoice_number", "invoice_type", "issue_date",
    "due_date", "subtotal", "discount_percentage", "discount_amount",
    "tax_amount", "total_amount", "paid_amount", "balance_due",
    "currency_code", "notes", "terms", "po_number",
    "quotation_id", "status",
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

    def _record_status_history(self, invoice_id: int, from_status: Optional[str], to_status: str, changed_by: Optional[int] = None, reason: Optional[str] = None) -> InvoiceStatusHistory:
        return self.history_repo.log_status_change(invoice_id, from_status, to_status, changed_by, reason)

    def _next_number(self, organization_id: int, prefix: str = "INV-") -> str:
        count = self.repo.count(organization_id, active_only=False)
        return f"{prefix}{str(count + 1).zfill(5)}"

    def calculate_invoice_totals(self, items: List[Dict[str, Any]], discount_percentage: Decimal = Decimal("0")) -> Dict[str, Decimal]:
        return calculate_line_item_totals(items, discount_percentage)

    def create_invoice(self, organization_id: int, created_by: int, customer_id: int, invoice_number: str, **data: Any) -> Invoice:
        data = filter_allowed(data, INVOICE_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        if self.repo.exists(organization_id, invoice_number=invoice_number):
            raise AlreadyExistsException("Invoice", "invoice_number")
        inv = self.repo.create(organization_id, customer_id=customer_id, invoice_number=invoice_number, status=InvoiceStatus.DRAFT, **data)
        self._record_status_history(inv.id, None, InvoiceStatus.DRAFT, created_by)
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
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, invoice_type=invoice_type,
            date_from=date_from, date_to=date_to,
        )

    # ── Items ─────────────────────────────────────────────────────────────

    def add_item(self, invoice_id: int, organization_id: int, **data: Any) -> InvoiceItem:
        data = filter_allowed(data, ITEM_ALLOWED_FIELDS)
        self.repo.get_by_id(invoice_id, organization_id)
        return self.item_repo.create(organization_id, invoice_id=invoice_id, **data)

    def bulk_set_items(self, invoice_id: int, organization_id: int, items: List[Dict[str, Any]]) -> List[InvoiceItem]:
        self.repo.get_by_id(invoice_id, organization_id)
        self.item_repo.delete_by_invoice(invoice_id)
        return [self.item_repo.create(organization_id, invoice_id=invoice_id, **filter_allowed(it, ITEM_ALLOWED_FIELDS)) for it in items]

    def list_items(self, invoice_id: int, organization_id: int) -> List[InvoiceItem]:
        self.repo.get_by_id(invoice_id, organization_id)
        return self.item_repo.list_by_invoice(invoice_id)

    def recalculate_invoice(self, invoice_id: int, organization_id: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
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
        inv.status = InvoiceStatus.SENT
        inv.sent_at = datetime.utcnow()
        self.recalculate_invoice(invoice_id, organization_id)
        self._record_status_history(invoice_id, old_status, InvoiceStatus.SENT, updated_by)
        self.audit.log(organization_id, updated_by, BillingAuditAction.SEND, "Invoice", invoice_id)
        self.db.refresh(inv)
        return inv

    def mark_sent(self, invoice_id: int, organization_id: int, updated_by: int) -> Invoice:
        return self.finalize_invoice(invoice_id, organization_id, updated_by)

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
        self._record_status_history(invoice_id, old_status, inv.status.value, updated_by)
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
        self._record_status_history(invoice_id, old_status, InvoiceStatus.CANCELLED, updated_by, reason)
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
        self._record_status_history(invoice_id, old_status, InvoiceStatus.CANCELLED, updated_by, reason)
        self.audit.log(organization_id, updated_by, BillingAuditAction.VOID, "Invoice", invoice_id)
        return inv

    def mark_overdue(self, invoice_id: int, organization_id: int, updated_by: int) -> Invoice:
        inv = self.repo.get_by_id(invoice_id, organization_id)
        if inv.status not in (InvoiceStatus.SENT, InvoiceStatus.PARTIALLY_PAID):
            raise BadRequestException("Invoice cannot be marked overdue")
        old_status = inv.status.value
        inv.status = InvoiceStatus.OVERDUE
        safe_commit_and_refresh(self.db, inv)
        self._record_status_history(invoice_id, old_status, InvoiceStatus.OVERDUE)
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
        return self.history_repo.list_by_invoice(invoice_id)
