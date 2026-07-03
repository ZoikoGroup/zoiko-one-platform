import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.modules.billing.models import (
    BillingAuditAction,
    DunningCase,
    DunningLevel,
    DunningStatus,
    Invoice,
    InvoiceStatus,
)
from app.modules.billing.repositories.collection import (
    DunningCaseRepository,
    DunningLevelRepository,
)
from app.modules.billing.repositories.invoice import InvoiceRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed

logger = logging.getLogger("zoiko")

LEVEL_ALLOWED_FIELDS = {
    "name", "description", "level_number", "min_days_overdue",
    "max_days_overdue", "fee_amount", "fee_percentage",
    "action_type", "action_template", "is_active",
}


class DunningService:
    def __init__(self, db: Session):
        self.db = db
        self.level_repo = DunningLevelRepository(db)
        self.case_repo = DunningCaseRepository(db)
        self.invoice_repo = InvoiceRepository(db)
        self.audit = BillingAuditService(db)

    # ── Dunning Levels (Configuration) ────────────────────────────────────

    def create_level(self, organization_id: int, created_by: int, **data: Any) -> DunningLevel:
        data = filter_allowed(data, LEVEL_ALLOWED_FIELDS)
        level = self.level_repo.create(organization_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "DunningLevel", level.id, new_values=data)
        return level

    def update_level(self, level_id: int, organization_id: int, updated_by: int, **data: Any) -> DunningLevel:
        data = filter_allowed(data, LEVEL_ALLOWED_FIELDS)
        self.level_repo.get_by_id(level_id, organization_id)
        updated = self.level_repo.update(level_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "DunningLevel", level_id)
        return updated

    def get_level(self, level_id: int, organization_id: int) -> DunningLevel:
        return self.level_repo.get_by_id(level_id, organization_id)

    def list_levels(self, organization_id: int) -> List[DunningLevel]:
        return self.level_repo.list_active(organization_id)

    def delete_level(self, level_id: int, organization_id: int, updated_by: int) -> None:
        self.level_repo.get_by_id(level_id, organization_id)
        self.level_repo.soft_delete(level_id, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "DunningLevel", level_id)

    # ── Dunning Cases ─────────────────────────────────────────────────────

    def open_dunning_case(
        self, organization_id: int, customer_id: int,
        invoice_id: int, created_by: int,
    ) -> DunningCase:
        invoice = self.invoice_repo.get_by_id(invoice_id, organization_id)
        if invoice.status not in (InvoiceStatus.SENT, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID):
            raise BadRequestException("Invoice is not eligible for dunning")
        days_overdue = (date.today() - invoice.due_date).days if invoice.due_date else 0
        case = self.case_repo.create(
            organization_id, customer_id=customer_id,
            invoice_id=invoice_id, created_by=created_by,
            total_overdue_amount=invoice.balance_due or 0,
            days_overdue=max(days_overdue, 0),
            current_level=1,
            status=DunningStatus.ACTIVE,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "DunningCase", case.id)
        return case

    def get_case(self, case_id: int, organization_id: int) -> DunningCase:
        return self.case_repo.get_by_id(case_id, organization_id)

    def list_cases(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.case_repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id, status=status,
        )

    def list_active_cases(self, organization_id: int) -> List[DunningCase]:
        return self.case_repo.list_active_cases(organization_id)

    # ── Escalation ────────────────────────────────────────────────────────

    def escalate_case(self, case_id: int, organization_id: int, updated_by: int) -> DunningCase:
        case = self.case_repo.get_by_id(case_id, organization_id)
        levels = self.level_repo.list_active(organization_id)
        if case.current_level >= len(levels):
            raise BadRequestException("Case is already at the highest dunning level")
        case.current_level += 1
        case.last_action_at = datetime.utcnow()
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "DunningCase", case_id)
        return case

    def resolve_case(self, case_id: int, organization_id: int, resolution_note: Optional[str] = None, updated_by: int = None) -> DunningCase:
        case = self.case_repo.get_by_id(case_id, organization_id)
        case.status = DunningStatus.RESOLVED
        case.resolved_at = datetime.utcnow()
        case.resolution_note = resolution_note
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "DunningCase", case_id)
        return case

    def close_case(self, case_id: int, organization_id: int, updated_by: int) -> DunningCase:
        case = self.case_repo.get_by_id(case_id, organization_id)
        case.status = DunningStatus.CLOSED
        safe_commit_and_refresh(self.db, case)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "DunningCase", case_id)
        return case

    # ── Late Fee ──────────────────────────────────────────────────────────

    def calculate_late_fee(self, case: DunningCase, settings: Optional[Dict] = None) -> Dict[str, Decimal]:
        level = self.level_repo.get_by_level(case.organization_id, case.current_level)
        if not level:
            return {"fee_amount": Decimal("0"), "fee_percentage": Decimal("0")}
        fee_flat = level.fee_amount or Decimal("0")
        fee_pct = level.fee_percentage or Decimal("0")
        pct_amount = case.total_overdue_amount * Decimal(str(fee_pct)) / Decimal("100")
        total_fee = fee_flat + pct_amount
        return {
            "fee_amount": fee_flat,
            "fee_percentage": fee_pct,
            "total_fee": total_fee,
        }

    # ── Reminder Schedule ─────────────────────────────────────────────────

    def get_reminder_schedule(self, organization_id: int) -> List[Dict[str, Any]]:
        levels = self.level_repo.list_active(organization_id)
        return [
            {
                "level": l.level_number,
                "name": l.name,
                "trigger_after_days": l.min_days_overdue,
                "action_type": l.action_type,
                "action_template": l.action_template,
                "fee_amount": float(l.fee_amount or 0),
                "fee_percentage": float(l.fee_percentage or 0),
            }
            for l in sorted(levels, key=lambda x: x.level_number)
        ]

    def process_dunning(self, organization_id: int) -> List[Dict[str, Any]]:
        today = date.today()
        overdue = self.invoice_repo.list_all(organization_id, status=InvoiceStatus.OVERDUE, active_only=True)
        levels = self.level_repo.list_active(organization_id)
        results = []
        for inv in overdue:
            if not inv.due_date:
                continue
            days_overdue = (today - inv.due_date).days
            case = self.case_repo.get_first(organization_id, invoice_id=inv.id)
            if not case:
                case = self.open_dunning_case(organization_id, inv.customer_id, inv.id, None)
            applicable_level = None
            for level in sorted(levels, key=lambda x: x.level_number):
                if level.min_days_overdue <= days_overdue and (level.max_days_overdue is None or days_overdue <= level.max_days_overdue):
                    applicable_level = level
                    break
            if applicable_level and applicable_level.level_number > case.current_level:
                case.current_level = applicable_level.level_number
                case.last_action_at = datetime.utcnow()
                case.last_action_type = applicable_level.action_type
                fee = self.calculate_late_fee(case)
                results.append({
                    "case_id": case.id,
                    "invoice_id": inv.id,
                    "invoice_number": inv.invoice_number,
                    "current_level": case.current_level,
                    "action_type": applicable_level.action_type,
                    "late_fee": float(fee["total_fee"]),
                    "days_overdue": days_overdue,
                })
        if results:
            safe_commit_and_refresh(self.db)
        return results
