import logging
from datetime import datetime
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
    PaymentStatus,
    Refund,
    RefundStatus,
    RefundType,
)
from app.modules.billing.repositories.credit import RefundRepository
from app.modules.billing.repositories.payment import PaymentRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.customer_service import CustomerService

logger = logging.getLogger("zoiko")

REFUND_ALLOWED_FIELDS = {
    "customer_id", "refund_number", "refund_type", "amount",
    "payment_id", "invoice_id", "reason", "notes",
    "gateway_refund_id",
}


class RefundService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RefundRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)

    def create_refund(
        self, organization_id: int, created_by: int,
        customer_id: int, refund_number: str,
        refund_type: str, amount: Decimal, **data: Any,
    ) -> Refund:
        data = filter_allowed(data, REFUND_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        if self.repo.exists(organization_id, refund_number=refund_number):
            raise AlreadyExistsException("Refund", "refund_number")
        if data.get("payment_id"):
            pmt_repo = PaymentRepository(self.db)
            pmt_repo.get_by_id(data["payment_id"], organization_id)
        refund = self.repo.create(
            organization_id, customer_id=customer_id,
            refund_number=refund_number, refund_type=refund_type,
            amount=amount, **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Refund", refund.id, new_values=data)
        return refund

    def process_refund(
        self, refund_id: int, organization_id: int, updated_by: int,
        gateway_refund_id: Optional[str] = None,
    ) -> Refund:
        refund = self.repo.get_by_id(refund_id, organization_id)
        if refund.status != RefundStatus.PENDING:
            raise BadRequestException("Refund must be in PENDING status to process")
        refund.status = RefundStatus.PROCESSING
        if gateway_refund_id:
            refund.gateway_refund_id = gateway_refund_id
        safe_commit_and_refresh(self.db, refund)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Refund", refund_id)
        return refund

    def complete_refund(self, refund_id: int, organization_id: int, updated_by: int) -> Refund:
        refund = self.repo.get_by_id(refund_id, organization_id)
        if refund.status != RefundStatus.PROCESSING:
            raise BadRequestException("Refund must be in PROCESSING status to complete")
        refund.status = RefundStatus.COMPLETED
        refund.completed_at = datetime.utcnow()
        safe_commit_and_refresh(self.db, refund)
        self.audit.log(organization_id, updated_by, BillingAuditAction.REFUND, "Refund", refund_id)
        return refund

    def fail_refund(self, refund_id: int, organization_id: int, failure_reason: str, updated_by: int) -> Refund:
        refund = self.repo.get_by_id(refund_id, organization_id)
        refund.status = RefundStatus.FAILED
        refund.failure_reason = failure_reason
        safe_commit_and_refresh(self.db, refund)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Refund", refund_id)
        return refund

    def get_refund(self, refund_id: int, organization_id: int) -> Refund:
        return self.repo.get_by_id(refund_id, organization_id)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Refund]:
        return self.repo.get_by_number(organization_id, number)

    def list_refunds(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, refund_type: Optional[str] = None,
        sort_by: str = "created_at", sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, refund_type=refund_type,
        )
