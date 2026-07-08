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
    CollectionAction,
    CollectionsCase,
    CollectionsPriority,
    CollectionsStatus,
    Invoice,
    InvoiceStatus,
)
from app.modules.billing.repositories.collection import (
    CollectionActionRepository,
    CollectionsCaseRepository,
)

COLLECTION_ALLOWED_FIELDS = {
    "case_number", "customer_id", "invoice_id", "total_outstanding",
    "days_overdue", "status", "assigned_to", "priority", "resolution",
    "notes",
}
from app.modules.billing.repositories.invoice import InvoiceRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.customer_service import CustomerService

logger = logging.getLogger("zoiko")


class CollectionService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CollectionsCaseRepository(db)
        self.action_repo = CollectionActionRepository(db)
        self.invoice_repo = InvoiceRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)

    def open_case(
        self, organization_id: int, customer_id: int,
        invoice_id: int, case_number: str, created_by: int, **data: Any,
    ) -> CollectionsCase:
        data = filter_allowed(data, COLLECTION_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        invoice = self.invoice_repo.get_by_id(invoice_id, organization_id)
        if self.repo.exists(organization_id, case_number=case_number):
            raise AlreadyExistsException("CollectionsCase", "case_number")
        days_overdue = (date.today() - invoice.due_date).days if invoice.due_date else 0
        case = self.repo.create(
            organization_id, customer_id=customer_id,
            invoice_id=invoice_id, case_number=case_number,
            total_outstanding=invoice.balance_due,
            days_overdue=max(days_overdue, 0),
            status=CollectionsStatus.OPEN,
            **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "CollectionsCase", case.id)
        return case

    def update_case(self, case_id: int, organization_id: int, updated_by: int, **data: Any) -> CollectionsCase:
        data = filter_allowed(data, COLLECTION_ALLOWED_FIELDS)
        self.repo.get_by_id(case_id, organization_id)
        updated = self.repo.update(case_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CollectionsCase", case_id)
        return updated

    def get_case(self, case_id: int, organization_id: int) -> CollectionsCase:
        return self.repo.get_by_id(case_id, organization_id)

    def list_cases(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, assigned_to: Optional[int] = None,
        priority: Optional[str] = None, sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, assigned_to=assigned_to, priority=priority,
        )

    def assign_case(self, case_id: int, organization_id: int, assigned_to: int, updated_by: int) -> CollectionsCase:
        case = self.repo.get_by_id(case_id, organization_id)
        case.assigned_to = assigned_to
        case.status = CollectionsStatus.IN_PROGRESS
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CollectionsCase", case_id)
        return case

    def resolve_case(self, case_id: int, organization_id: int, resolution: str, updated_by: int) -> CollectionsCase:
        case = self.repo.get_by_id(case_id, organization_id)
        case.status = CollectionsStatus.RESOLVED
        case.resolution = resolution
        case.resolved_at = datetime.utcnow()
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CollectionsCase", case_id)
        return case

    def close_case(self, case_id: int, organization_id: int, updated_by: int) -> CollectionsCase:
        case = self.repo.get_by_id(case_id, organization_id)
        case.status = CollectionsStatus.CLOSED
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CollectionsCase", case_id)
        return case

    def escalate_case(self, case_id: int, organization_id: int, updated_by: int) -> CollectionsCase:
        case = self.repo.get_by_id(case_id, organization_id)
        case.status = CollectionsStatus.ESCALATED
        case.priority = CollectionsPriority.URGENT
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CollectionsCase", case_id)
        return case

    def log_action(
        self, case_id: int, organization_id: int, action_type: str,
        description: Optional[str] = None, performed_by: Optional[int] = None,
        outcome: Optional[str] = None, follow_up_date: Optional[str] = None,
    ) -> CollectionAction:
        self.repo.get_by_id(case_id, organization_id)
        return self.action_repo.log_action(
            organization_id, case_id, action_type, description,
            performed_by, outcome, follow_up_date,
        )

    # ── Outstanding Invoices ──────────────────────────────────────────────

    def list_outstanding_invoices(self, organization_id: int) -> List[Invoice]:
        return self.invoice_repo.list_all(
            organization_id,
            status=InvoiceStatus.SENT,
            active_only=True,
        ) + self.invoice_repo.list_all(
            organization_id,
            status=InvoiceStatus.OVERDUE,
            active_only=True,
        ) + self.invoice_repo.list_all(
            organization_id,
            status=InvoiceStatus.PARTIALLY_PAID,
            active_only=True,
        )

    # ── Aging Buckets ─────────────────────────────────────────────────────

    def get_aging_buckets(self, organization_id: int) -> Dict[str, Any]:
        today = date.today()
        buckets = {
            "0_30": {"min": 0, "max": 30, "total": Decimal("0"), "count": 0},
            "31_60": {"min": 31, "max": 60, "total": Decimal("0"), "count": 0},
            "61_90": {"min": 61, "max": 90, "total": Decimal("0"), "count": 0},
            "91_plus": {"min": 91, "max": None, "total": Decimal("0"), "count": 0},
        }
        invoices = self.invoice_repo.list_all(organization_id, active_only=True)
        for inv in invoices:
            if inv.status not in (InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID):
                continue
            if not inv.due_date:
                continue
            days = (today - inv.due_date).days
            if days < 0:
                continue
            bucket_key = "91_plus"
            for key, spec in buckets.items():
                if spec["min"] <= days and (spec["max"] is None or days <= spec["max"]):
                    bucket_key = key
                    break
            buckets[bucket_key]["total"] += inv.balance_due or Decimal("0")
            buckets[bucket_key]["count"] += 1
        return {
            k: {"count": v["count"], "total": float(v["total"])}
            for k, v in buckets.items()
        }

    # ── Collections Queue ─────────────────────────────────────────────────

    def get_collections_queue(self, organization_id: int) -> List[Dict[str, Any]]:
        overdue = self.invoice_repo.list_all(organization_id, status=InvoiceStatus.OVERDUE, active_only=True)
        queue = []
        for inv in overdue:
            existing_case = self.repo.get_first(organization_id, invoice_id=inv.id)
            queue.append({
                "invoice_id": inv.id,
                "invoice_number": inv.invoice_number,
                "customer_id": inv.customer_id,
                "customer_name": inv.customer.company_name if inv.customer else None,
                "balance_due": float(inv.balance_due or 0),
                "due_date": inv.due_date,
                "days_overdue": (date.today() - inv.due_date).days if inv.due_date else 0,
                "has_open_case": existing_case is not None and existing_case.status not in (CollectionsStatus.RESOLVED, CollectionsStatus.CLOSED),
                "case_id": existing_case.id if existing_case else None,
                "case_status": existing_case.status.value if existing_case else None,
            })
        return sorted(queue, key=lambda x: x["days_overdue"], reverse=True)
