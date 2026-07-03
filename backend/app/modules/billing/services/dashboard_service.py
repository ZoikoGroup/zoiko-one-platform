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
        collections = self.payment_repo.get_total_collected(organization_id)
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
        today = date.today()
        data = []
        for i in range(months - 1, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            start = date(y, m, 1)
            if m == 12:
                end = date(y + 1, 1, 1)
            else:
                end = date(y, m + 1, 1)
            revenue = self.invoice_repo.get_monthly_revenue(organization_id, start, end)
            data.append({
                "month": MONTH_NAMES[m - 1],
                "year": y,
                "revenue": revenue,
            })
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
        return {
            "kpis": self.get_kpis(organization_id),
            "monthly_revenue": self.get_monthly_revenue(organization_id),
            "invoice_summary": self.get_invoice_summary(organization_id),
            "customer_summary": self.get_customer_summary(organization_id),
            "subscription_summary": self.get_subscription_summary(organization_id),
        }
