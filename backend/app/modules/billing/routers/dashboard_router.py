from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import BillingDashboardService
from app.modules.billing.schemas import BillingDashboardResponse

router = APIRouter(prefix="/dashboard", tags=["🧾 Dashboard"])


@router.get(
    "",
    response_model=BillingDashboardResponse,
    summary="Get full billing dashboard",
)
def get_full_dashboard(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = BillingDashboardService(db)
    return svc.get_full_dashboard(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/kpis",
    response_model=dict,
    summary="Get billing KPIs",
)
def get_kpis(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = BillingDashboardService(db)
    return svc.get_kpis(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/revenue",
    response_model=dict,
    summary="Get monthly revenue data",
)
def get_monthly_revenue(
    months: int = Query(12, ge=1, le=60),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = BillingDashboardService(db)
    return svc.get_monthly_revenue(
        organization_id=current_user.organization_id,
        months=months,
    )
