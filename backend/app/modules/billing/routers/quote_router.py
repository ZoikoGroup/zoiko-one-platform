"""
modules/billing/routers/quote_router.py
---------------------------------------
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import QuoteService
from app.modules.billing.schemas import (
    QuotationCreate,
    QuotationUpdate,
    QuotationResponse,
    QuotationListResponse,
    QuotationItemCreate,
    QuotationItemResponse,
    InvoiceResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/quotations", tags=["🧾 Quotations"])


@router.post(
    "",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def create_quote(
    data: QuotationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.create_quote(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        customer_id=data.customer_id,
        quote_number=data.quote_number,
        **data.model_dump(exclude={"customer_id", "quote_number"}, exclude_unset=True),
    )


@router.get(
    "",
    response_model=QuotationListResponse,
    summary="List quotations",
)
def list_quotes(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
):
    svc = QuoteService(db)
    return svc.list_quotes(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        status=status,
    )


@router.get(
    "/{quote_id}",
    response_model=QuotationResponse,
    summary="Get a quotation",
)
def get_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.get_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/{quote_id}",
    response_model=QuotationResponse,
    summary="Update a quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def update_quote(
    quote_id: int,
    data: QuotationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.update_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.post(
    "/{quote_id}/items",
    response_model=QuotationItemResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add item to quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def add_item(
    quote_id: int,
    data: QuotationItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.add_item(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        **data.model_dump(exclude_none=True),
    )


@router.get(
    "/{quote_id}/items",
    response_model=list[QuotationItemResponse],
    summary="List quotation items",
)
def list_items(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.list_items(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
    )


@router.post(
    "/{quote_id}/send",
    response_model=QuotationResponse,
    summary="Send quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def send_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.send_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post(
    "/{quote_id}/accept",
    response_model=QuotationResponse,
    summary="Accept quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def accept_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.accept_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post(
    "/{quote_id}/reject",
    response_model=QuotationResponse,
    summary="Reject quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def reject_quote(
    quote_id: int,
    reason: str = Query(..., min_length=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.reject_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        reason=reason,
        updated_by=current_user.id,
    )


@router.post(
    "/{quote_id}/cancel",
    response_model=QuotationResponse,
    summary="Cancel quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def cancel_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.cancel_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post(
    "/{quote_id}/convert-to-invoice",
    response_model=InvoiceResponse,
    summary="Convert quotation to invoice",
    dependencies=[Depends(get_current_org_admin)],
)
def convert_to_invoice(
    quote_id: int,
    invoice_number: str = Query(..., min_length=1),
    issue_date: date = Query(...),
    due_date: date = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.convert_to_invoice(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        invoice_number=invoice_number,
        issue_date=issue_date,
        due_date=due_date,
    )


@router.post(
    "/{quote_id}/recalculate",
    response_model=QuotationResponse,
    summary="Recalculate quotation totals",
    dependencies=[Depends(get_current_org_admin)],
)
def recalculate_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.recalculate_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
    )


@router.post(
    "/{quote_id}/duplicate",
    response_model=QuotationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Duplicate a quotation",
    dependencies=[Depends(get_current_org_admin)],
)
def duplicate_quote(
    quote_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = QuoteService(db)
    return svc.duplicate_quote(
        quote_id=quote_id,
        organization_id=current_user.organization_id,
        created_by=current_user.id,
    )
