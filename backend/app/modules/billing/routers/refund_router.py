"""
modules/billing/routers/refund_router.py
-----------------------------------------
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import RefundService
from app.modules.billing.schemas import (
    RefundCreate,
    RefundResponse,
    RefundListResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/refunds", tags=["🧾 Refunds"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=RefundResponse)
def create_refund(
    body: RefundCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = RefundService(db)
    return svc.create_refund(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        customer_id=body.customer_id,
        refund_number=body.refund_number,
        refund_type=body.refund_type,
        amount=body.amount,
        **body.model_dump(exclude={
            "customer_id", "refund_number", "refund_type", "amount",
        }),
    )


@router.get("", response_model=RefundListResponse)
def list_refunds(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    refund_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = RefundService(db)
    return svc.list_refunds(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        status=status,
        refund_type=refund_type,
    )


@router.get("/{refund_id}", response_model=RefundResponse)
def get_refund(
    refund_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = RefundService(db)
    return svc.get_refund(refund_id=refund_id, organization_id=current_user.organization_id)


@router.post("/{refund_id}/process", response_model=RefundResponse)
def process_refund(
    refund_id: int,
    gateway_refund_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = RefundService(db)
    return svc.process_refund(
        refund_id=refund_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        gateway_refund_id=gateway_refund_id,
    )


@router.post("/{refund_id}/complete", response_model=RefundResponse)
def complete_refund(
    refund_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = RefundService(db)
    return svc.complete_refund(
        refund_id=refund_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post("/{refund_id}/fail", response_model=RefundResponse)
def fail_refund(
    refund_id: int,
    failure_reason: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = RefundService(db)
    return svc.fail_refund(
        refund_id=refund_id,
        organization_id=current_user.organization_id,
        failure_reason=failure_reason,
        updated_by=current_user.id,
    )
