"""
modules/billing/routers/subscription_router.py
------------------------------------------------
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import SubscriptionService
from app.modules.billing.schemas import (
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse,
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionListResponse,
    SubscriptionEventResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/subscriptions", tags=["🧾 Subscriptions"])


# ── Plans ─────────────────────────────────────────────────────────────────────

@router.post("/plans", status_code=status.HTTP_201_CREATED, response_model=SubscriptionPlanResponse)
def create_plan(
    body: SubscriptionPlanCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.create_plan(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        **body.model_dump(),
    )


@router.get("/plans", response_model=dict)
def list_plans(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.list_plans(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        category=category,
    )


@router.get("/plans/public", response_model=list[SubscriptionPlanResponse])
def list_public_plans(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.list_public_plans(organization_id=current_user.organization_id)


@router.get("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
def get_plan(
    plan_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.get_plan(plan_id=plan_id, organization_id=current_user.organization_id)


@router.put("/plans/{plan_id}", response_model=SubscriptionPlanResponse)
def update_plan(
    plan_id: int,
    body: SubscriptionPlanUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.update_plan(
        plan_id=plan_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **body.model_dump(exclude_unset=True),
    )


# ── Subscriptions ─────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=SubscriptionResponse)
def create_subscription(
    body: SubscriptionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.create_subscription(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        customer_id=body.customer_id,
        plan_id=body.plan_id,
        subscription_number=body.subscription_number,
        **body.model_dump(exclude={"customer_id", "plan_id", "subscription_number"}),
    )


@router.get("", response_model=SubscriptionListResponse)
def list_subscriptions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    plan_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    contract_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.list_subscriptions(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        plan_id=plan_id,
        status=status,
        contract_id=contract_id,
    )


@router.get("/active", response_model=list[SubscriptionResponse])
def list_active(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.list_active(organization_id=current_user.organization_id)


@router.get("/{subscription_id}", response_model=SubscriptionResponse)
def get_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.get_subscription(sub_id=subscription_id, organization_id=current_user.organization_id)


@router.put("/{subscription_id}", response_model=SubscriptionResponse)
def update_subscription(
    subscription_id: int,
    body: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.update_subscription(
        sub_id=subscription_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **body.model_dump(exclude_unset=True),
    )


@router.post("/{subscription_id}/activate", response_model=SubscriptionResponse)
def activate_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.activate_subscription(
        sub_id=subscription_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post("/{subscription_id}/pause", response_model=SubscriptionResponse)
def pause_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.pause_subscription(
        sub_id=subscription_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post("/{subscription_id}/cancel", response_model=SubscriptionResponse)
def cancel_subscription(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.cancel_subscription(
        sub_id=subscription_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.put("/{subscription_id}/change-plan", response_model=SubscriptionResponse)
def change_plan(
    subscription_id: int,
    new_plan_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = SubscriptionService(db)
    return svc.change_plan(
        sub_id=subscription_id,
        organization_id=current_user.organization_id,
        new_plan_id=new_plan_id,
        updated_by=current_user.id,
    )


@router.get("/{subscription_id}/events", response_model=list[SubscriptionEventResponse])
def list_events(
    subscription_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = SubscriptionService(db)
    return svc.list_events(
        subscription_id=subscription_id,
        organization_id=current_user.organization_id,
    )
