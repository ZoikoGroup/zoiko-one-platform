"""
modules/billing/routers/invoice_router.py
-----------------------------------------
"""

from typing import Optional
from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import InvoiceService
from app.modules.billing.schemas import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceResponse,
    InvoiceListResponse,
    InvoiceItemCreate,
    InvoiceItemBulkCreate,
    InvoiceItemResponse,
    InvoiceStatusHistoryResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/invoices", tags=["🧾 Invoices"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=InvoiceResponse)
def create_invoice(
    body: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.create_invoice(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        customer_id=body.customer_id,
        invoice_number=body.invoice_number,
        **body.model_dump(exclude={"customer_id", "invoice_number"}),
    )


@router.get("", response_model=InvoiceListResponse)
def list_invoices(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    invoice_type: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    currency: Optional[str] = Query(None),
    min_amount: Optional[float] = Query(None),
    max_amount: Optional[float] = Query(None),
    sort_by: Optional[str] = Query(None),
    sort_order: Optional[str] = Query("desc"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.list_invoices(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        status=status,
        invoice_type=invoice_type,
        date_from=date_from,
        date_to=date_to,
        currency=currency,
        min_amount=min_amount,
        max_amount=max_amount,
        sort_by=sort_by or "created_at",
        sort_order=sort_order,
    )


# ── Static paths MUST come before /{invoice_id} to avoid FastAPI matching them as int ──

@router.get("/overdue", response_model=list[InvoiceResponse])
def list_overdue(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.list_overdue(organization_id=current_user.organization_id)


@router.get("/outstanding-total", response_model=dict)
def get_outstanding_total(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    total = svc.get_outstanding_total(organization_id=current_user.organization_id)
    return {"total_outstanding": total}


@router.get("/dashboard-stats", response_model=dict)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_dashboard_stats(organization_id=current_user.organization_id)


@router.get("/enterprise-dashboard", response_model=dict)
def get_enterprise_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_enterprise_dashboard_stats(organization_id=current_user.organization_id)


@router.get("/invoice-trend", response_model=list)
def get_invoice_trend(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_invoice_trend(organization_id=current_user.organization_id, months=months)


@router.get("/revenue-trend", response_model=list)
def get_revenue_trend(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_revenue_trend(organization_id=current_user.organization_id, months=months)


@router.get("/payment-collection-trend", response_model=list)
def get_payment_collection_trend(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_payment_collection_trend(organization_id=current_user.organization_id, months=months)


@router.get("/status-distribution", response_model=list)
def get_status_distribution(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_status_distribution(organization_id=current_user.organization_id)


@router.get("/monthly-revenue", response_model=list)
def get_monthly_revenue(
    months: int = Query(12, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_monthly_revenue_stats(organization_id=current_user.organization_id, months=months)


@router.get("/recent-activity", response_model=list)
def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_recent_activity(organization_id=current_user.organization_id, limit=limit)


@router.post("/bulk-delete", response_model=SuccessResponse)
def bulk_delete_invoices(
    body: dict,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    ids = body.get("ids", [])
    if not ids:
        from app.core.exceptions import BadRequestException
        raise BadRequestException("No invoice IDs provided")
    svc = InvoiceService(db)
    count = svc.bulk_delete_invoices(
        organization_id=current_user.organization_id,
        ids=ids,
        updated_by=current_user.id,
    )
    return SuccessResponse(message=f"Deleted {count} invoice(s)")


@router.get("/due-between", response_model=list[InvoiceResponse])
def list_due_between(
    start_date: str = Query(...),
    end_date: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.list_due_between(
        organization_id=current_user.organization_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/{invoice_id}", response_model=InvoiceResponse)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.get_invoice(invoice_id=invoice_id, organization_id=current_user.organization_id)


@router.put("/{invoice_id}", response_model=InvoiceResponse)
def update_invoice(
    invoice_id: int,
    body: InvoiceUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.update_invoice(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **body.model_dump(exclude_unset=True),
    )


@router.post("/{invoice_id}/finalize", response_model=InvoiceResponse)
def finalize_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.finalize_invoice(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post("/{invoice_id}/send", response_model=InvoiceResponse)
def mark_sent(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.mark_sent(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.post("/{invoice_id}/send-email")
def send_invoice_email(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.send_invoice_via_email(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        sent_by=current_user.id,
    )


@router.post("/{invoice_id}/cancel", response_model=InvoiceResponse)
def cancel_invoice(
    invoice_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.cancel_invoice(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        reason=reason,
        updated_by=current_user.id,
    )


@router.post("/{invoice_id}/void", response_model=InvoiceResponse)
def void_invoice(
    invoice_id: int,
    reason: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.void_invoice(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        reason=reason,
        updated_by=current_user.id,
    )


@router.post("/{invoice_id}/recalculate", response_model=InvoiceResponse, dependencies=[Depends(get_current_org_admin)])
def recalculate_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.recalculate_invoice(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
    )


@router.get("/{invoice_id}/items", response_model=list[InvoiceItemResponse])
def list_items(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.list_items(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
    )


@router.post("/{invoice_id}/items", status_code=status.HTTP_201_CREATED, response_model=InvoiceItemResponse)
def add_item(
    invoice_id: int,
    body: InvoiceItemCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.add_item(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        **body.model_dump(),
    )


@router.put("/{invoice_id}/items", response_model=list[InvoiceItemResponse])
def bulk_set_items(
    invoice_id: int,
    body: InvoiceItemBulkCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    _admin=Depends(get_current_org_admin),
):
    svc = InvoiceService(db)
    return svc.bulk_set_items(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
        items=[item.model_dump() for item in body.items],
    )


@router.get("/{invoice_id}/status-history", response_model=list[InvoiceStatusHistoryResponse])
def list_status_history(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = InvoiceService(db)
    return svc.list_status_history(
        invoice_id=invoice_id,
        organization_id=current_user.organization_id,
    )
