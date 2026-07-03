import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
    NotFoundException,
)
from app.modules.billing.models import BillingAuditAction, PlanTier, PricingPlan
from app.modules.billing.repositories.catalog import (
    PlanTierRepository,
    PricingPlanRepository,
)
from app.modules.billing.repositories.catalog import ProductRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import filter_allowed, safe_commit_and_refresh

logger = logging.getLogger("zoiko")

PLAN_ALLOWED_FIELDS = {
    "name", "product_id", "billing_period",
    "billing_cycle_count", "trial_days", "unit_price", "setup_fee",
    "is_active", "pricing_model", "flat_fee",
    "min_quantity", "max_quantity", "effective_from", "effective_to",
}

TIER_ALLOWED_FIELDS = {
    "name", "description", "min_quantity", "max_quantity",
    "unit_price", "flat_fee", "is_active", "sort_order",
}


class PricingService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PricingPlanRepository(db)
        self.tier_repo = PlanTierRepository(db)
        self.product_repo = ProductRepository(db)
        self.audit = BillingAuditService(db)

    def create_plan(self, organization_id: int, created_by: int, **data: Any) -> PricingPlan:
        data = filter_allowed(data, PLAN_ALLOWED_FIELDS)
        product_id = data.get("product_id")
        if product_id:
            self.product_repo.get_by_id(product_id, organization_id)
        plan = self.repo.create(organization_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "PricingPlan", plan.id, new_values=data)
        return plan

    def update_plan(self, plan_id: int, organization_id: int, updated_by: int, **data: Any) -> PricingPlan:
        data = filter_allowed(data, PLAN_ALLOWED_FIELDS)
        self.repo.get_by_id(plan_id, organization_id)
        if data.get("product_id"):
            self.product_repo.get_by_id(data["product_id"], organization_id)
        updated = self.repo.update(plan_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "PricingPlan", plan_id, new_values=data)
        return updated

    def get_plan(self, plan_id: int, organization_id: int) -> PricingPlan:
        return self.repo.get_by_id(plan_id, organization_id)

    def list_plans(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        product_id: Optional[int] = None, billing_period: Optional[str] = None,
        sort_by: str = "name", sort_order: str = "asc", active_only: bool = True,
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order, active_only=active_only,
            product_id=product_id, billing_period=billing_period,
        )

    def list_plans_by_product(self, organization_id: int, product_id: int) -> List[PricingPlan]:
        self.product_repo.get_by_id(product_id, organization_id)
        return self.repo.list_by_product(organization_id, product_id)

    def get_active_plan_at_date(self, organization_id: int, product_id: int, date_str: str) -> Optional[PricingPlan]:
        self.product_repo.get_by_id(product_id, organization_id)
        return self.repo.get_active_at_date(organization_id, product_id, date_str)

    def deactivate_plan(self, plan_id: int, organization_id: int, updated_by: int) -> PricingPlan:
        self.repo.get_by_id(plan_id, organization_id)
        updated = self.repo.update(plan_id, organization_id, is_active=False)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "PricingPlan", plan_id)
        return updated

    # ── Tiers ───────────────────────────────────────────────────────────

    def add_tier(self, organization_id: int, pricing_plan_id: int, **data: Any) -> PlanTier:
        data = filter_allowed(data, TIER_ALLOWED_FIELDS)
        self.repo.get_by_id(pricing_plan_id, organization_id)
        tier = self.tier_repo.create(organization_id, pricing_plan_id=pricing_plan_id, **data)
        self.audit.log(organization_id, None, BillingAuditAction.CREATE, "PlanTier", tier.id, new_values=data)
        return tier

    def list_tiers(self, pricing_plan_id: int, organization_id: int) -> List[PlanTier]:
        self.repo.get_by_id(pricing_plan_id, organization_id)
        return self.tier_repo.list_by_plan(pricing_plan_id)

    def remove_tier(self, tier_id: int, organization_id: int, updated_by: int) -> None:
        tier = self.tier_repo.get_by_id(tier_id, organization_id)
        self.repo.get_by_id(tier.pricing_plan_id, organization_id)
        self.db.delete(tier)
        safe_commit_and_refresh(self.db)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "PlanTier", tier_id)
