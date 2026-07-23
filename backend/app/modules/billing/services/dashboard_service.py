import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from sqlalchemy import func, case
from sqlalchemy.orm import Session

from app.modules.billing.repositories.customer import CustomerRepository
from app.modules.billing.repositories.invoice import Invoice, InvoiceRepository
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

        # Single query for all-time + period summaries via conditional aggregation
        from app.modules.billing.models import BillingCustomer, BillingSubscriptionStatus
        from app.modules.billing.models import Subscription as SubModel

        inv_base = self.invoice_repo.db.query(
            func.coalesce(func.sum(
                case((Invoice.is_active == True, Invoice.total_amount), else_=0)
            ), 0).label("all_total"),
            func.coalesce(func.sum(
                case((Invoice.is_active == True, Invoice.balance_due), else_=0)
            ), 0).label("all_outstanding"),
            func.coalesce(func.sum(
                case((Invoice.is_active == True, Invoice.status == "overdue", Invoice.balance_due), else_=0)
            ), 0).label("all_overdue"),
            func.count(case((Invoice.is_active == True, Invoice.id), else_=None)).label("all_count"),
            func.coalesce(func.sum(
                case((Invoice.is_active == True, Invoice.status == "paid", Invoice.total_amount), else_=0)
            ), 0).label("all_paid"),
            func.coalesce(func.sum(
                case((
                    Invoice.is_active == True,
                    Invoice.status == "paid",
                    Invoice.issue_date >= month_start,
                    Invoice.issue_date <= today,
                    Invoice.total_amount
                ), else_=0)
            ), 0).label("month_revenue"),
            func.coalesce(func.sum(
                case((
                    Invoice.is_active == True,
                    Invoice.issue_date >= period_start,
                    Invoice.issue_date <= period_end,
                    Invoice.total_amount
                ), else_=0)
            ), 0).label("period_total"),
            func.coalesce(func.sum(
                case((
                    Invoice.is_active == True,
                    Invoice.status == "paid",
                    Invoice.issue_date >= period_start,
                    Invoice.issue_date <= period_end,
                    Invoice.total_amount
                ), else_=0)
            ), 0).label("period_paid"),
            func.count(case((
                Invoice.is_active == True,
                Invoice.issue_date >= period_start,
                Invoice.issue_date <= period_end,
                Invoice.id
            ), else_=None)).label("period_count"),
        ).first()

        summary = {
            "total_revenue": float(inv_base.all_total),
            "paid_revenue": float(inv_base.all_paid),
            "outstanding_amount": float(inv_base.all_outstanding),
            "overdue_amount": float(inv_base.all_overdue),
            "total_invoices": inv_base.all_count,
        }

        period_summary = {
            "total_revenue": float(inv_base.period_total),
            "paid_revenue": float(inv_base.period_paid),
            "total_invoices": inv_base.period_count,
        }

        # Customer + subscription counts in 2 queries (was 4)
        active_customers = self.customer_repo.count(organization_id, active_only=True)
        active_subs = self.sub_repo.count(organization_id, active_only=True, status="active")

        collections = self.payment_repo.get_total_collected(
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
            "monthly_revenue": float(inv_base.month_revenue),
            "collections": collections,
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
        monthly = self.get_monthly_revenue(organization_id, period=period)

        # Customer + subscription summaries in 2 grouped queries (was 4 separate)
        from app.modules.billing.models import BillingCustomer, BillingSubscriptionStatus
        from app.modules.billing.models import Subscription as SubModel

        cust_rows = (
            self.db.query(
                BillingCustomer.status,
                func.count(BillingCustomer.id),
            ).filter(
                BillingCustomer.organization_id == organization_id,
                BillingCustomer.deleted_at.is_(None),
            ).group_by(BillingCustomer.status).all()
        )
        cust_by_status = {row[0]: row[1] for row in cust_rows}
        cust_summary = {
            "total_active_customers": sum(cust_by_status.values()),
            "by_status": cust_by_status,
        }

        sub_rows = (
            self.db.query(
                SubModel.status,
                func.count(SubModel.id),
            ).filter(
                SubModel.organization_id == organization_id,
                SubModel.is_active == True,
            ).group_by(SubModel.status).all()
        )
        sub_by_status = {row[0].value if hasattr(row[0], "value") else str(row[0]): row[1] for row in sub_rows}
        sub_summary = {
            "total_active_subscriptions": sum(sub_by_status.values()),
            "by_status": sub_by_status,
        }

        return {
            "kpis": kpis,
            "monthly_revenue": monthly,
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
