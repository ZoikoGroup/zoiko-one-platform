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
    CreditNote,
    CreditNoteApplication,
    CreditNoteStatus,
    CreditNoteType,
    InvoiceStatus,
)
from app.modules.billing.repositories.credit import (
    CreditNoteApplicationRepository,
    CreditNoteRepository,
)
from app.modules.billing.repositories.invoice import InvoiceRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import filter_allowed, safe_commit_and_refresh
from app.modules.billing.services.customer_service import CustomerService
from app.modules.billing.services.invoice_service import InvoiceService

logger = logging.getLogger("zoiko")

CREDIT_NOTE_ALLOWED_FIELDS = {
    "customer_id", "credit_note_number", "credit_note_type",
    "total_amount", "remaining_amount", "issue_date",
    "invoice_id", "reason", "status", "notes",
}


class CreditNoteService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CreditNoteRepository(db)
        self.app_repo = CreditNoteApplicationRepository(db)
        self.invoice_repo = InvoiceRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)

    def create_credit_note(
        self, organization_id: int, created_by: int,
        customer_id: int, credit_note_number: str,
        credit_note_type: str, total_amount: Decimal,
        issue_date: date, **data: Any,
    ) -> CreditNote:
        data = filter_allowed(data, CREDIT_NOTE_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        if self.repo.exists(organization_id, credit_note_number=credit_note_number):
            raise AlreadyExistsException("CreditNote", "credit_note_number")
        cn = self.repo.create(
            organization_id, customer_id=customer_id,
            credit_note_number=credit_note_number,
            credit_note_type=credit_note_type,
            total_amount=total_amount, remaining_amount=total_amount,
            issue_date=issue_date, **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "CreditNote", cn.id, new_values=data)
        return cn

    def update_credit_note(self, cn_id: int, organization_id: int, updated_by: int, **data: Any) -> CreditNote:
        data = filter_allowed(data, CREDIT_NOTE_ALLOWED_FIELDS)
        cn = self.repo.get_by_id(cn_id, organization_id)
        if cn.status != CreditNoteStatus.DRAFT:
            raise BadRequestException("Only draft credit notes can be edited")
        updated = self.repo.update(cn_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CreditNote", cn_id)
        return updated

    def get_credit_note(self, cn_id: int, organization_id: int) -> CreditNote:
        return self.repo.get_by_id(cn_id, organization_id)

    def list_credit_notes(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, credit_note_type: Optional[str] = None,
        sort_by: str = "created_at", sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, credit_note_type=credit_note_type,
        )

    # ── Status Transitions ─────────────────────────────────────────────────

    def issue_credit_note(self, cn_id: int, organization_id: int, updated_by: int) -> CreditNote:
        cn = self.repo.get_by_id(cn_id, organization_id)
        if cn.status != CreditNoteStatus.DRAFT:
            raise BadRequestException("Only draft credit notes can be issued")
        cn.status = CreditNoteStatus.ISSUED
        safe_commit_and_refresh(self.db, cn)
        self.audit.log(organization_id, updated_by, BillingAuditAction.SEND, "CreditNote", cn_id)
        return cn

    def void_credit_note(self, cn_id: int, organization_id: int, reason: Optional[str] = None, updated_by: int = None) -> CreditNote:
        cn = self.repo.get_by_id(cn_id, organization_id)
        if cn.status == CreditNoteStatus.VOIDED:
            raise BadRequestException("Credit note is already voided")
        cn.status = CreditNoteStatus.VOIDED
        cn.voided_at = datetime.utcnow()
        cn.voided_reason = reason
        safe_commit_and_refresh(self.db, cn)
        self.audit.log(organization_id, updated_by, BillingAuditAction.VOID, "CreditNote", cn_id)
        return cn

    # ── Application ────────────────────────────────────────────────────────

    def apply_to_invoice(
        self, cn_id: int, organization_id: int, invoice_id: int,
        amount: Decimal, created_by: int,
    ) -> CreditNoteApplication:
        cn = self.repo.get_by_id(cn_id, organization_id)
        if cn.status not in (CreditNoteStatus.ISSUED, CreditNoteStatus.PARTIALLY_APPLIED):
            raise BadRequestException("Credit note cannot be applied in its current status")
        invoice = self.invoice_repo.get_by_id(invoice_id, organization_id)
        if invoice.status in (InvoiceStatus.CANCELLED, InvoiceStatus.REFUNDED):
            raise BadRequestException("Cannot apply credit to a cancelled/refunded invoice")
        if amount > cn.remaining_amount:
            raise BadRequestException(f"Amount exceeds remaining credit of {cn.remaining_amount}")
        remaining_invoice = invoice.balance_due
        if amount > remaining_invoice:
            amount = remaining_invoice
        app = self.app_repo.create(organization_id, credit_note_id=cn_id, invoice_id=invoice_id, amount=amount, created_by=created_by)
        cn.remaining_amount -= amount
        if cn.remaining_amount <= 0:
            cn.status = CreditNoteStatus.FULLY_APPLIED
        else:
            cn.status = CreditNoteStatus.PARTIALLY_APPLIED
        inv_service = InvoiceService(self.db)
        inv_service.record_payment(invoice_id, organization_id, amount, created_by)
        safe_commit_and_refresh(self.db, cn)
        self.audit.log(organization_id, created_by, BillingAuditAction.UPDATE, "CreditNoteApplication", app.id)
        return app

    def list_applications(self, cn_id: int, organization_id: int) -> List[CreditNoteApplication]:
        self.repo.get_by_id(cn_id, organization_id)
        return self.app_repo.list_by_credit_note(cn_id)

    def get_total_applied(self, cn_id: int, organization_id: int) -> float:
        self.repo.get_by_id(cn_id, organization_id)
        return self.app_repo.get_total_applied(cn_id)

    def get_remaining_balance(self, cn_id: int, organization_id: int) -> Decimal:
        cn = self.repo.get_by_id(cn_id, organization_id)
        return cn.remaining_amount

    def get_outstanding_credits(self, organization_id: int) -> float:
        return self.repo.get_outstanding_total(organization_id)
