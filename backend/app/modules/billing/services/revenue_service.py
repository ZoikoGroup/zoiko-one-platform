import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException
from app.modules.billing.models import (
    BillingAuditAction,
    RecognitionMethod,
    RecognitionStatus,
    RevenueRecognitionEntry,
    RevenueRecognitionSchedule,
)
from app.modules.billing.repositories.revenue import (
    RevenueRecognitionEntryRepository,
    RevenueRecognitionScheduleRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import filter_allowed, safe_commit, safe_commit_and_refresh

logger = logging.getLogger("zoiko")

SCHEDULE_ALLOWED_FIELDS = {
    "invoice_id", "recognition_method", "total_amount",
    "start_date", "end_date", "status",
    "recognized_amount", "deferred_amount",
}


class RevenueRecognitionService:
    def __init__(self, db: Session):
        self.db = db
        self.sched_repo = RevenueRecognitionScheduleRepository(db)
        self.entry_repo = RevenueRecognitionEntryRepository(db)
        self.audit = BillingAuditService(db)

    def create_schedule(
        self, organization_id: int, created_by: int, invoice_id: int,
        recognition_method: str, total_amount: Decimal,
        start_date: date, end_date: date, **data: Any,
    ) -> RevenueRecognitionSchedule:
        data = filter_allowed(data, SCHEDULE_ALLOWED_FIELDS)
        sched = self.sched_repo.create(
            organization_id, invoice_id=invoice_id,
            recognition_method=recognition_method,
            total_amount=total_amount, recognized_amount=0,
            deferred_amount=total_amount,
            start_date=start_date, end_date=end_date,
            status=RecognitionStatus.PENDING,
            **data,
        )
        if recognition_method == RecognitionMethod.IMMEDIATE:
            self._release_immediate(sched)
        elif recognition_method in (
            RecognitionMethod.DAILY_PRORATED,
            RecognitionMethod.MONTHLY_PRORATED,
        ):
            self._release_prorated(sched, recognition_method)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "RevenueRecognitionSchedule", sched.id)
        return sched

    def _release_immediate(self, sched: RevenueRecognitionSchedule) -> None:
        self.entry_repo.create(
            sched.organization_id,
            schedule_id=sched.id,
            entry_date=sched.start_date,
            amount=sched.total_amount,
            is_released=True,
            released_at=datetime.utcnow(),
        )
        self.sched_repo.update(sched.id, sched.organization_id,
            recognized_amount=sched.total_amount,
            deferred_amount=Decimal("0"),
            status=RecognitionStatus.COMPLETED,
        )

    def _release_prorated(self, sched: RevenueRecognitionSchedule, method: str) -> None:
        total_days = (sched.end_date - sched.start_date).days
        if total_days <= 0:
            self.sched_repo.update(sched.id, sched.organization_id, status=RecognitionStatus.COMPLETED)
            return
        if method == RecognitionMethod.DAILY_PRORATED:
            daily_amount = sched.total_amount / Decimal(str(total_days))
            current = sched.start_date
            while current <= sched.end_date:
                self.entry_repo.create(
                    sched.organization_id,
                    schedule_id=sched.id, entry_date=current,
                    amount=daily_amount, is_released=False,
                )
                from datetime import timedelta
                current += timedelta(days=1)
        elif method == RecognitionMethod.MONTHLY_PRORATED:
            total_months = max((sched.end_date.year - sched.start_date.year) * 12 + sched.end_date.month - sched.start_date.month, 1)
            monthly_amount = sched.total_amount / Decimal(str(total_months))
            current = date(sched.start_date.year, sched.start_date.month, 1)
            while current <= sched.end_date:
                from calendar import monthrange
                _, last_day = monthrange(current.year, current.month)
                entry_date = min(date(current.year, current.month, last_day), sched.end_date)
                self.entry_repo.create(
                    sched.organization_id,
                    schedule_id=sched.id, entry_date=entry_date,
                    amount=monthly_amount, is_released=False,
                )
                if current.month == 12:
                    current = date(current.year + 1, 1, 1)
                else:
                    current = date(current.year, current.month + 1, 1)

    def update_schedule(self, sched_id: int, organization_id: int, updated_by: int, **data: Any) -> RevenueRecognitionSchedule:
        data = filter_allowed(data, SCHEDULE_ALLOWED_FIELDS)
        self.sched_repo.get_by_id(sched_id, organization_id)
        updated = self.sched_repo.update(sched_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "RevenueRecognitionSchedule", sched_id)
        return updated

    def get_schedule(self, sched_id: int, organization_id: int) -> RevenueRecognitionSchedule:
        return self.sched_repo.get_by_id(sched_id, organization_id)

    def list_schedules(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        status: Optional[str] = None, recognition_method: Optional[str] = None,
        sort_by: str = "created_at", sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.sched_repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            status=status, recognition_method=recognition_method,
        )

    def list_pending_schedules(self, organization_id: int) -> List[RevenueRecognitionSchedule]:
        return self.sched_repo.list_pending(organization_id)

    def get_total_deferred(self, organization_id: int) -> float:
        return self.sched_repo.get_total_deferred(organization_id)

    # ── Revenue Recognition ───────────────────────────────────────────────

    def recognize_revenue(self, sched_id: int, organization_id: int, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        sched = self.sched_repo.get_by_id(sched_id, organization_id)
        if sched.status == RecognitionStatus.COMPLETED:
            return {"schedule_id": sched_id, "recognized": 0, "remaining": 0, "status": "completed"}
        as_of = as_of_date or date.today()
        entries = self.entry_repo.list_unreleased(organization_id, sched_id)
        recognized = Decimal("0")
        for entry in entries:
            if entry.entry_date <= as_of:
                entry.is_released = True
                entry.released_at = datetime.utcnow()
                recognized += entry.amount
        if recognized > 0:
            sched.recognized_amount = (sched.recognized_amount or Decimal("0")) + recognized
            sched.deferred_amount = sched.total_amount - sched.recognized_amount
            if sched.deferred_amount <= 0:
                sched.status = RecognitionStatus.COMPLETED
            else:
                sched.status = RecognitionStatus.IN_PROGRESS
            safe_commit_and_refresh(self.db, sched)
        return {
            "schedule_id": sched_id,
            "recognized": float(recognized),
            "remaining": float(sched.deferred_amount) if sched.deferred_amount else 0,
            "status": sched.status.value,
        }

    def get_entries(self, schedule_id: int, organization_id: int) -> List[RevenueRecognitionEntry]:
        self.sched_repo.get_by_id(schedule_id, organization_id)
        return self.entry_repo.list_by_schedule(organization_id, schedule_id)

    def get_unreleased_entries(self, schedule_id: int, organization_id: int) -> List[RevenueRecognitionEntry]:
        self.sched_repo.get_by_id(schedule_id, organization_id)
        return self.entry_repo.list_unreleased(organization_id, schedule_id)

    def get_total_released(self, schedule_id: int, organization_id: int) -> float:
        self.sched_repo.get_by_id(schedule_id, organization_id)
        return self.entry_repo.get_total_released(organization_id, schedule_id)

    # ── Batch Recognition ─────────────────────────────────────────────────

    def recognize_all_pending(self, organization_id: int, as_of_date: Optional[date] = None) -> Dict[str, Any]:
        pending = self.sched_repo.list_pending(organization_id)
        total_recognized = Decimal("0")
        schedules_processed = 0
        for sched in pending:
            result = self.recognize_revenue(sched.id, organization_id, as_of_date)
            total_recognized += Decimal(str(result["recognized"]))
            schedules_processed += 1
        return {
            "schedules_processed": schedules_processed,
            "total_recognized": float(total_recognized),
        }
