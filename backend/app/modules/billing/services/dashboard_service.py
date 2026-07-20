import logging
from datetime import date, datetime
from typing import Any, Dict

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


class BillingDashboardService:
    def __init__(self, db: Session):
        self.db = db
        self.invoice_repo = InvoiceRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.customer_repo = CustomerRepository(db)
        self.sub_repo = SubscriptionRepository(db)

    def get_kpis(self, organization_id: int) -> Dict[str, Any]:
        now = datetime.utcnow()
        month_start = date(now.year, now.month, 1)
        summary = self.invoice_repo.get_amount_summary(organization_id)
        active_customers = self.customer_repo.count(organization_id, active_only=True)
        active_subs = self.sub_repo.count(organization_id, active_only=True, status="active")
        month_revenue = self.invoice_repo.get_monthly_revenue(organization_id, month_start, date.today())
        collections = self.payment_repo.get_total_collected(
            organization_id,
            date_from=str(month_start),
            date_to=str(date.today()),
        )
        return {
            "total_revenue": summary["total_revenue"],
            "paid_revenue": summary["paid_revenue"],
            "outstanding_amount": summary["outstanding_amount"],
            "overdue_amount": summary["overdue_amount"],
            "active_customers": active_customers,
            "active_subscriptions": active_subs,
            "monthly_revenue": month_revenue,
            "collections": collections,
            "total_invoices": summary["total_invoices"],
        }

    def get_monthly_revenue(self, organization_id: int, months: int = 12) -> Dict[str, Any]:
        data = self.invoice_repo.get_monthly_revenue_bulk(organization_id, months)
        return {"monthly_revenue": data}

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

    def get_full_dashboard(self, organization_id: int) -> Dict[str, Any]:
        kpis = self.get_kpis(organization_id)
        inv_summary = self.get_invoice_summary(organization_id)
        cust_summary = self.get_customer_summary(organization_id)
        sub_summary = self.get_subscription_summary(organization_id)
        return {
            "kpis": kpis,
            "monthly_revenue": self.get_monthly_revenue(organization_id),
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
