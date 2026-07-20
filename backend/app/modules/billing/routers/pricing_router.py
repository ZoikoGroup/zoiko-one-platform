"""
modules/billing/routers/pricing_router.py
-----------------------------------------
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import PricingService
from app.modules.billing.schemas import (
    PricingPlanCreate,
    PricingPlanUpdate,
    PricingPlanResponse,
    PricingPlanListResponse,
    PriceResolveRequest,
    PriceResolveResponse,
    PlanTierCreate,
    PlanTierResponse,
    SuccessResponse,
)
from app.modules.billing.services.price_resolver import PriceResolver
from app.modules.billing.models import Product, PricingPlan

router = APIRouter(prefix="/pricing-plans", tags=["🧾 Pricing"])


@router.post(
    "",
    response_model=PricingPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a pricing plan",
    dependencies=[Depends(get_current_org_admin)],
)
def create_plan(
    data: PricingPlanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    return svc.create_plan(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        **data.model_dump(),
    )



@router.get(
    "",
    response_model=PricingPlanListResponse,
    summary="List pricing plans",
)
def list_plans(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    product_id: Optional[int] = Query(None),
    billing_period: Optional[str] = Query(None),
    search_term: Optional[str] = Query(None),
    pricing_model: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("name"),
    sort_order: str = Query("asc"),
):
    svc = PricingService(db)
    return svc.list_plans(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        product_id=product_id,
        billing_period=billing_period,
        search_term=search_term,
        pricing_model=pricing_model,
        status=status,
        sort_by=sort_by or "name",
        sort_order=sort_order,
    )


@router.get(
    "/by-product/{product_id}",
    response_model=list[PricingPlanResponse],
    summary="List pricing plans by product",
)
def list_plans_by_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    return svc.list_plans_by_product(
        organization_id=current_user.organization_id,
        product_id=product_id,
    )


@router.post(
    "/resolve",
    response_model=PriceResolveResponse,
    summary="Resolve price for a product with optional pricing plan",
)
def resolve_price(
    data: PriceResolveRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    resolver = PriceResolver(db)
    result = resolver.resolve(
        organization_id=current_user.organization_id,
        product_id=data.product_id,
        pricing_plan_id=data.pricing_plan_id,
    )
    product = (
        db.query(Product)
        .filter(
            Product.id == data.product_id,
            Product.organization_id == current_user.organization_id,
        )
        .first()
    )
    plan = None
    if data.pricing_plan_id is not None:
        plan = (
            db.query(PricingPlan)
            .filter(
                PricingPlan.id == data.pricing_plan_id,
                PricingPlan.organization_id == current_user.organization_id,
            )
            .first()
        )
    return PriceResolveResponse(
        product_id=data.product_id,
        product_name=product.name if product else "",
        base_price=result.base_price,
        resolved_price=result.resolved_price,
        pricing_plan_id=result.pricing_plan_id,
        pricing_plan_name=plan.name if plan else None,
        price_source=result.price_source,
    )


@router.get(
    "/{plan_id}",
    response_model=PricingPlanResponse,
    summary="Get a pricing plan",
)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    return svc.get_plan(
        plan_id=plan_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/{plan_id}",
    response_model=PricingPlanResponse,
    summary="Update a pricing plan",
    dependencies=[Depends(get_current_org_admin)],
)
def update_plan(
    plan_id: int,
    data: PricingPlanUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    return svc.update_plan(
        plan_id=plan_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.delete(
    "/{plan_id}",
    response_model=SuccessResponse,
    summary="Deactivate a pricing plan",
    dependencies=[Depends(get_current_org_admin)],
)
def deactivate_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    svc.deactivate_plan(
        plan_id=plan_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )
    return SuccessResponse(message="Pricing plan deactivated successfully")


@router.post(
    "/{plan_id}/tiers",
    response_model=PlanTierResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a tier to a pricing plan",
    dependencies=[Depends(get_current_org_admin)],
)
def add_tier(
    plan_id: int,
    data: PlanTierCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    payload = data.model_dump(exclude_unset=True)
    payload.pop("pricing_plan_id", None)
    return svc.add_tier(
        organization_id=current_user.organization_id,
        pricing_plan_id=plan_id,
        created_by=current_user.id,
        **payload,
    )


@router.get(
    "/{plan_id}/tiers",
    response_model=list[PlanTierResponse],
    summary="List tiers for a pricing plan",
)
def list_tiers(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    return svc.list_tiers(
        pricing_plan_id=plan_id,
        organization_id=current_user.organization_id,
    )


@router.delete(
    "/{plan_id}/tiers/{tier_id}",
    response_model=SuccessResponse,
    summary="Remove a tier from a pricing plan",
    dependencies=[Depends(get_current_org_admin)],
)
def remove_tier(
    plan_id: int,
    tier_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = PricingService(db)
    svc.remove_tier(
        pricing_plan_id=plan_id,
        tier_id=tier_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )
    return SuccessResponse(message="Tier removed successfully")
