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
    PricingModel,
    Subscription,
    SubscriptionEvent,
    SubscriptionPlan,
    BillingSubscriptionStatus,
)
from app.modules.billing.repositories.subscription import (
    SubscriptionEventRepository,
    SubscriptionPlanRepository,
    SubscriptionRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.customer_service import CustomerService

logger = logging.getLogger("zoiko")

SUB_ALLOWED_FIELDS = {
    "customer_id", "plan_id", "contract_id", "subscription_number",
    "quantity", "unit_price", "setup_fee",
    "discount_percentage", "discount_amount", "tax_percentage",
    "start_date", "current_term_start", "current_term_end",
    "trial_end_date", "next_billing_at", "status",
    "cancellation_reason", "notes",
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
        periods = {
            BillingPeriod.MONTHLY: 30,
            BillingPeriod.QUARTERLY: 90,
            BillingPeriod.SEMI_ANNUAL: 180,
            BillingPeriod.ANNUAL: 365,
            BillingPeriod.ONE_TIME: 0,
        }
        days = periods.get(period, 30)
        if days == 0:
            return start
        return start + timedelta(days=days)

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
        sub = self.repo.create(
            organization_id,
            customer_id=customer_id, plan_id=plan_id,
            subscription_number=subscription_number,
            **data,
        )
        self._log_event(organization_id, sub.id, "created", None, {"subscription_number": subscription_number, "plan_id": plan_id}, created_by=created_by)
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
