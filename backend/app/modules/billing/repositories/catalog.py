from typing import Any, Dict, List, Optional

from app.modules.billing.models import (
    PlanTier,
    PricingPlan,
    Product,
    ProductCategory,
)
from app.modules.billing.repositories.base import BaseRepository


class ProductCategoryRepository(BaseRepository[ProductCategory]):
    def __init__(self, db):
        super().__init__(db, ProductCategory)

    def get_by_code(self, organization_id: int, code: str) -> Optional[ProductCategory]:
        return self.get_first(organization_id, code=code)

    def list_root(self, organization_id: int, active_only: bool = True) -> List[ProductCategory]:
        return self.list_all(organization_id, active_only=active_only, parent_id=None)

    def list_children(self, organization_id: int, parent_id: int) -> List[ProductCategory]:
        return self.list_all(organization_id, parent_id=parent_id)

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "name",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=["name", "code", "description"],
            **filters,
        )


class ProductRepository(BaseRepository[Product]):
    def __init__(self, db):
        super().__init__(db, Product)

    def get_by_code(self, organization_id: int, code: str) -> Optional[Product]:
        return self.get_first(organization_id, code=code)

    def list_by_category(
        self,
        organization_id: int,
        category_id: int,
        active_only: bool = True,
    ) -> List[Product]:
        return self.list_all(organization_id, active_only=active_only, category_id=category_id)

    def list_subscribable(self, organization_id: int, active_only: bool = True) -> List[Product]:
        return self.list_all(organization_id, active_only=active_only, is_subscribable=True)

    def list_usage_billable(self, organization_id: int, active_only: bool = True) -> List[Product]:
        return self.list_all(organization_id, active_only=active_only, is_usage_billable=True)

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        category_id: Optional[int] = None,
        product_type: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if category_id:
            filters["category_id"] = category_id
        if product_type:
            filters["product_type"] = product_type
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "name",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=["name", "code", "description"],
            **filters,
        )


class PricingPlanRepository(BaseRepository[PricingPlan]):
    def __init__(self, db):
        super().__init__(db, PricingPlan)

    def list_by_product(
        self,
        organization_id: int,
        product_id: int,
        active_only: bool = True,
    ) -> List[PricingPlan]:
        return self.list_all(organization_id, active_only=active_only, product_id=product_id)

    def get_active_at_date(
        self,
        organization_id: int,
        product_id: int,
        date_str: str,
    ) -> Optional[PricingPlan]:
        from sqlalchemy import and_
        return self.db.query(PricingPlan).filter(
            PricingPlan.organization_id == organization_id,
            PricingPlan.product_id == product_id,
            PricingPlan.is_active == True,
            PricingPlan.effective_from <= date_str,
            and_(
                PricingPlan.effective_to >= date_str,
                PricingPlan.effective_to.is_(None),
            ),
        ).first()

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        product_id: Optional[int] = None,
        billing_period: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if product_id:
            filters["product_id"] = product_id
        if billing_period:
            filters["billing_period"] = billing_period
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "name",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=["name"],
            **filters,
        )


class PlanTierRepository(BaseRepository[PlanTier]):
    def __init__(self, db):
        super().__init__(db, PlanTier)

    def list_by_plan(self, pricing_plan_id: int) -> List[PlanTier]:
        return self.db.query(PlanTier).filter(
            PlanTier.pricing_plan_id == pricing_plan_id,
        ).order_by(PlanTier.from_quantity).all()

    def create(self, organization_id: int, **data: Any) -> PlanTier:
        return super().create(organization_id, **data)
