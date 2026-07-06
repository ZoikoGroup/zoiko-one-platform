from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import CollectionService
from app.modules.billing.schemas import (
    CollectionsCaseCreate,
    CollectionsCaseUpdate,
    CollectionsCaseResponse,
    CollectionsCaseListResponse,
    CollectionActionCreate,
    CollectionActionResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/collections", tags=["🧾 Collections"])


@router.post(
    "/cases",
    response_model=CollectionsCaseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Open a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def open_case(
    data: CollectionsCaseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.open_case(
        organization_id=current_user.organization_id,
        customer_id=data.customer_id,
        invoice_id=data.invoice_id,
        case_number=data.case_number,
        created_by=current_user.id,
        **data.model_dump(exclude={"customer_id", "invoice_id", "case_number"}, exclude_unset=True),
    )


@router.get(
    "/cases",
    response_model=CollectionsCaseListResponse,
    summary="List collections cases",
)
def list_cases(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to: Optional[int] = Query(None),
    priority: Optional[str] = Query(None),
):
    svc = CollectionService(db)
    return svc.list_cases(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        status=status,
        assigned_to=assigned_to,
        priority=priority,
    )


@router.get(
    "/cases/{case_id}",
    response_model=CollectionsCaseResponse,
    summary="Get a collections case",
)
def get_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.get_case(
        case_id=case_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/cases/{case_id}",
    response_model=CollectionsCaseResponse,
    summary="Update a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def update_case(
    case_id: int,
    data: CollectionsCaseUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.update_case(
        case_id=case_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.post(
    "/cases/{case_id}/assign",
    response_model=CollectionsCaseResponse,
    summary="Assign a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def assign_case(
    case_id: int,
    assigned_to: int = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.assign_case(
        case_id=case_id,
        organization_id=current_user.organization_id,
        assigned_to=assigned_to,
        updated_by=current_user.id,
    )


@router.post(
    "/cases/{case_id}/resolve",
    response_model=CollectionsCaseResponse,
    summary="Resolve a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def resolve_case(
    case_id: int,
    resolution: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.resolve_case(
        case_id=case_id,
        organization_id=current_user.organization_id,
        resolution=resolution,
        updated_by=current_user.id,
    )


@router.post(
    "/cases/{case_id}/close",
    response_model=CollectionsCaseResponse,
    summary="Close a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def close_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.close_case(
        case_id=case_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post(
    "/cases/{case_id}/escalate",
    response_model=CollectionsCaseResponse,
    summary="Escalate a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def escalate_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.escalate_case(
        case_id=case_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post(
    "/cases/{case_id}/actions",
    response_model=CollectionActionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Log an action on a collections case",
    dependencies=[Depends(get_current_org_admin)],
)
def log_action(
    case_id: int,
    data: CollectionActionCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.log_action(
        case_id=case_id,
        organization_id=current_user.organization_id,
        action_type=data.action_type,
        description=data.description,
        outcome=data.outcome,
        follow_up_date=str(data.follow_up_date) if data.follow_up_date else None,
        performed_by=current_user.id,
    )


@router.get(
    "/aging",
    response_model=dict,
    summary="Get aging buckets",
)
def get_aging_buckets(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.get_aging_buckets(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/queue",
    response_model=list[dict],
    summary="Get collections queue",
)
def get_collections_queue(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CollectionService(db)
    return svc.get_collections_queue(
        organization_id=current_user.organization_id,
    )
