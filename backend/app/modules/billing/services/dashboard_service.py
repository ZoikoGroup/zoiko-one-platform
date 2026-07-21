import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.orm import Session

from app.modules.billing.repositories.customer import CustomerRepository
from app.modules.billing.repositories.invoice import InvoiceRepository
from app.modules.billing.repositories.payment import PaymentRepository
from app.modules.billing.repositories.subscription import SubscriptionRepository

logger = logging.getLogger("zoiko")

MONTH_NAMES = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
]


def get_period_dates(period: Optional[str]) -> Tuple[date, date]:
    """Convert a period string to (start_date, end_date).

    WEEK   = current calendar week (Monday → today)
    MONTH  = current calendar month (1st → today)
    QUARTER = current calendar quarter (Q1/Q2/Q3/Q4 start → today)
    YEAR   = current calendar year (Jan 1 → today)
    None   = all-time (1970-01-01 → today) — no filtering
    """
    today = date.today()
    if period == "week":
        start = today - timedelta(days=today.weekday())
    elif period == "month":
        start = today.replace(day=1)
    elif period == "quarter":
        quarter_month = ((today.month - 1) // 3) * 3 + 1
        start = today.replace(month=quarter_month, day=1)
    elif period == "year":
        start = today.replace(month=1, day=1)
    else:
        start = date(1970, 1, 1)
    return start, today


def period_to_months(period: Optional[str]) -> int:
    """Return the number of months for revenue bulk queries based on period."""
    mapping = {"week": 1, "month": 3, "quarter": 3, "year": 12}
    return mapping.get(period, 12)


class BillingDashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.invoice_repo = InvoiceRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.customer_repo = CustomerRepository(db)
        self.sub_repo = SubscriptionRepository(db)

    def get_kpis(self, organization_id: int, period: Optional[str] = None) -> Dict[str, Any]:
        now = datetime.utcnow()
        month_start = date(now.year, now.month, 1)
        today = date.today()

        period_start, period_end = get_period_dates(period)

        summary = self.invoice_repo.get_amount_summary(organization_id)
        active_customers = self.customer_repo.count(organization_id, active_only=True)
        active_subs = self.sub_repo.count(organization_id, active_only=True, status="active")

        month_revenue = self.invoice_repo.get_monthly_revenue(organization_id, month_start, today)
        collections = self.payment_repo.get_total_collected(
            organization_id,
            date_from=str(month_start),
            date_to=str(today),
        )

        period_summary = self.invoice_repo.get_amount_summary(organization_id, date_from=period_start, date_to=period_end)
        period_collections = self.payment_repo.get_total_collected(
            organization_id,
            date_from=str(period_start),
            date_to=str(period_end),
        )

        period_total_revenue = period_summary["total_revenue"]
        period_paid_revenue = period_summary["paid_revenue"]

        return {
            "total_revenue": period_total_revenue if period else summary["total_revenue"],
            "paid_revenue": period_paid_revenue if period else summary["paid_revenue"],
            "paid_amount": period_paid_revenue if period else summary["paid_revenue"],
            "outstanding_amount": summary["outstanding_amount"],
            "overdue_amount": summary["overdue_amount"],
            "active_customers": active_customers,
            "active_subscriptions": active_subs,
            "monthly_revenue": month_revenue,
            "collections": period_collections if period else collections,
            "total_invoices": period_summary["total_invoices"] if period else summary["total_invoices"],
        }

    def get_monthly_revenue(self, organization_id: int, months: int = 12, period: Optional[str] = None) -> Dict[str, Any]:
        if period in ("week", "month"):
            start, end = get_period_dates(period)
            data = self.invoice_repo.get_daily_revenue(organization_id, start, end)
        elif period in ("quarter", "year"):
            start, end = get_period_dates(period)
            data = self.invoice_repo.get_monthly_revenue_for_period(organization_id, start, end)
        else:
            effective_months = period_to_months(period) if period else months
            data = self.invoice_repo.get_monthly_revenue_bulk(organization_id, effective_months)
        return {"monthly_revenue": data}

    def get_payment_trend(self, organization_id: int, period: Optional[str] = None) -> Dict[str, Any]:
        if period in ("week", "month"):
            start, end = get_period_dates(period)
            data = self.payment_repo.get_daily_payment_trend(organization_id, start, end)
        elif period in ("quarter", "year"):
            start, end = get_period_dates(period)
            data = self.payment_repo.get_monthly_payment_trend(organization_id, start, end)
        else:
            start, end = get_period_dates(None)
            data = self.payment_repo.get_monthly_payment_trend(organization_id, start, end)
        return {"payment_trend": data}

    def get_invoice_summary(self, organization_id: int) -> Dict[str, Any]:
        return self.invoice_repo.get_invoice_summary_by_status(organization_id)

    def get_customer_summary(self, organization_id: int) -> Dict[str, Any]:
        base = self.customer_repo.count(organization_id, active_only=True)
        by_status = self.customer_repo.count_by_status(organization_id)
        return {
            "total_active_customers": base,
            "by_status": by_status,
        }

    def get_subscription_summary(self, organization_id: int) -> Dict[str, Any]:
        base = self.sub_repo.count(organization_id, active_only=True)
        by_status = self.sub_repo.count_by_status(organization_id)
        return {
            "total_active_subscriptions": base,
            "by_status": by_status,
        }

    def get_full_dashboard(self, organization_id: int, period: Optional[str] = None) -> Dict[str, Any]:
        kpis = self.get_kpis(organization_id, period=period)
        inv_summary = self.get_invoice_summary(organization_id)
        cust_summary = self.get_customer_summary(organization_id)
        sub_summary = self.get_subscription_summary(organization_id)
        return {
            "kpis": kpis,
            "monthly_revenue": self.get_monthly_revenue(organization_id, period=period),
            "invoice_summary": inv_summary,
            "customer_summary": cust_summary,
            "subscription_summary": sub_summary,
            "total_revenue": kpis.get("total_revenue", 0),
            "outstanding_amount": kpis.get("outstanding_amount", 0),
            "overdue_amount": kpis.get("overdue_amount", 0),
            "total_customers": cust_summary.get("total_active_customers", 0),
            "active_subscriptions": sub_summary.get("total_active_subscriptions", 0),
            "draft_invoices": inv_summary.get("draft_count", 0),
            "unpaid_invoices": inv_summary.get("sent_count", 0),
            "paid_invoices": inv_summary.get("paid_count", 0),
            "overdue_invoices": inv_summary.get("overdue_count", 0),
        }
