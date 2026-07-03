"""
modules/billing/routers/credit_note_router.py
----------------------------------------------
"""

from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import CreditNoteService
from app.modules.billing.schemas import (
    CreditNoteCreate,
    CreditNoteUpdate,
    CreditNoteResponse,
    CreditNoteListResponse,
    CreditNoteApplicationResponse,
    CreditNoteApplyCreate,
    SuccessResponse,
)

router = APIRouter(prefix="/credit-notes", tags=["🧾 Credit Notes"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=CreditNoteResponse)
def create_credit_note(
    body: CreditNoteCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = CreditNoteService(db)
    return svc.create_credit_note(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        customer_id=body.customer_id,
        credit_note_number=body.credit_note_number,
        credit_note_type=body.credit_note_type,
        total_amount=body.total_amount,
        issue_date=body.issue_date,
        **body.model_dump(exclude={
            "customer_id", "credit_note_number", "credit_note_type",
            "total_amount", "issue_date",
        }),
    )


@router.get("", response_model=CreditNoteListResponse)
def list_credit_notes(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    credit_note_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CreditNoteService(db)
    return svc.list_credit_notes(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        status=status,
        credit_note_type=credit_note_type,
    )


@router.get("/outstanding", response_model=dict)
def get_outstanding_credits(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CreditNoteService(db)
    total = svc.get_outstanding_credits(organization_id=current_user.organization_id)
    return {"outstanding_credits": total}


@router.get("/{cn_id}", response_model=CreditNoteResponse)
def get_credit_note(
    cn_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CreditNoteService(db)
    return svc.get_credit_note(cn_id=cn_id, organization_id=current_user.organization_id)


@router.put("/{cn_id}", response_model=CreditNoteResponse)
def update_credit_note(
    cn_id: int,
    body: CreditNoteUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = CreditNoteService(db)
    return svc.update_credit_note(
        cn_id=cn_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **body.model_dump(exclude_unset=True),
    )


@router.post("/{cn_id}/issue", response_model=CreditNoteResponse)
def issue_credit_note(
    cn_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = CreditNoteService(db)
    return svc.issue_credit_note(
        cn_id=cn_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post("/{cn_id}/void", response_model=CreditNoteResponse)
def void_credit_note(
    cn_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = CreditNoteService(db)
    return svc.void_credit_note(
        cn_id=cn_id,
        organization_id=current_user.organization_id,
        reason=reason,
        updated_by=current_user.id,
    )


@router.post("/{cn_id}/apply", status_code=status.HTTP_201_CREATED, response_model=CreditNoteApplicationResponse)
def apply_to_invoice(
    cn_id: int,
    body: CreditNoteApplyCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = CreditNoteService(db)
    return svc.apply_to_invoice(
        cn_id=cn_id,
        organization_id=current_user.organization_id,
        invoice_id=body.invoice_id,
        amount=body.amount,
        created_by=current_user.id,
    )


@router.get("/{cn_id}/applications", response_model=list[CreditNoteApplicationResponse])
def list_applications(
    cn_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = CreditNoteService(db)
    return svc.list_applications(
        cn_id=cn_id,
        organization_id=current_user.organization_id,
    )
