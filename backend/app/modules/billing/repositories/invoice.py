from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func, case, extract, and_, or_

from app.core.exceptions import BadRequestException
from app.modules.billing.models import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    InvoiceStatusHistory,
)
from app.modules.billing.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self, db):
        super().__init__(db, Invoice)

    def update(self, id: int, organization_id: int, **data: Any) -> Invoice:
        obj = self.get_by_id(id, organization_id)
        if obj.status != InvoiceStatus.DRAFT:
            raise BadRequestException("Only draft invoices can be edited")
        return super().update(id, organization_id, **data)

    def get_amount_summary(self, organization_id: int, date_from: Optional[date] = None, date_to: Optional[date] = None) -> Dict[str, Any]:
        filters = [
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        ]
        if date_from is not None:
            filters.append(Invoice.issue_date >= date_from)
        if date_to is not None:
            filters.append(Invoice.issue_date <= date_to)

        rows = self.db.query(
            Invoice.status,
            func.coalesce(func.sum(Invoice.total_amount), 0),
            func.coalesce(func.sum(Invoice.balance_due), 0),
            func.count(Invoice.id),
        ).filter(*filters).group_by(Invoice.status).all()

        total_amount = 0.0
        total_balance = 0.0
        total_count = 0
        paid = 0.0
        overdue = 0.0
        for status, amount, balance, count in rows:
            total_amount += float(amount)
            total_balance += float(balance)
            total_count += count
            status_val = status.value if hasattr(status, "value") else str(status)
            if status_val == "paid":
                paid = float(amount)
            elif status_val == "overdue":
                overdue = float(balance)

        return {
            "total_revenue": total_amount,
            "paid_revenue": paid,
            "outstanding_amount": total_balance,
            "overdue_amount": overdue,
            "total_invoices": total_count,
        }

    def get_monthly_revenue(self, organization_id: int, start: date, end: date) -> float:
        result = self.db.query(
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "paid",
            Invoice.issue_date >= start,
            Invoice.issue_date < end,
        ).scalar() or 0
        return float(result)

    def get_monthly_revenue_bulk(self, organization_id: int, months: int) -> List[Dict[str, Any]]:
        cutoff = date.today().replace(day=1)
        rows = (
            self.db.query(
                extract("year", Invoice.issue_date).label("yr"),
                extract("month", Invoice.issue_date).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.issue_date >= date(cutoff.year - 1, 1, 1),
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        lookup = {(int(r.yr), int(r.mo)): float(r.revenue) for r in rows}
        from app.modules.billing.services.dashboard_service import MONTH_NAMES
        result = []
        today = date.today()
        for i in range(months - 1, -1, -1):
            m = today.month - i
            y = today.year
            while m <= 0:
                m += 12
                y -= 1
            result.append({
                "month": MONTH_NAMES[m - 1],
                "year": y,
                "revenue": lookup.get((y, m), 0.0),
            })
        return result

    def get_daily_revenue(self, organization_id: int, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Return daily paid revenue between start_date and end_date (inclusive)."""
        rows = (
            self.db.query(
                Invoice.issue_date.label("day"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.issue_date >= start_date,
                Invoice.issue_date <= end_date,
            )
            .group_by(Invoice.issue_date)
            .order_by(Invoice.issue_date)
            .all()
        )
        lookup = {r.day: float(r.revenue) for r in rows}
        result = []
        current = start_date
        while current <= end_date:
            result.append({
                "date": current.strftime("%b %d"),
                "period": current.strftime("%b %d"),
                "revenue": lookup.get(current, 0.0),
            })
            current += timedelta(days=1)
        return result

    def get_monthly_revenue_for_period(self, organization_id: int, start_date: date, end_date: date) -> List[Dict[str, Any]]:
        """Return monthly paid revenue between start_date and end_date."""
        rows = (
            self.db.query(
                extract("year", Invoice.issue_date).label("yr"),
                extract("month", Invoice.issue_date).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.issue_date >= start_date,
                Invoice.issue_date <= end_date,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        lookup = {(int(r.yr), int(r.mo)): float(r.revenue) for r in rows}
        from app.modules.billing.services.dashboard_service import MONTH_NAMES
        result = []
        current = start_date.replace(day=1)
        end_month = end_date.replace(day=1)
        while current <= end_month:
            result.append({
                "month": MONTH_NAMES[current.month - 1],
                "period": f"{MONTH_NAMES[current.month - 1]} {current.year}",
                "revenue": lookup.get((current.year, current.month), 0.0),
            })
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)
        return result

    def get_invoice_summary_by_status(self, organization_id: int) -> Dict[str, Any]:
        rows = self.db.query(
            Invoice.status,
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        ).group_by(Invoice.status).all()

        total_count = 0
        total_amount = 0.0
        counts = {}
        for status, count, amount in rows:
            total_count += count
            total_amount += float(amount)
            counts[status.value if hasattr(status, "value") else str(status)] = {"count": count, "amount": float(amount)}

        paid = counts.get("paid", {"count": 0, "amount": 0.0})
        overdue = counts.get("overdue", {"count": 0, "amount": 0.0})

        return {
            "total_invoices": total_count,
            "total_amount": total_amount,
            "paid_count": paid["count"],
            "paid_amount": paid["amount"],
            "overdue_count": overdue["count"],
            "overdue_amount": overdue["amount"],
            "sent_count": counts.get("sent", {"count": 0})["count"],
            "draft_count": counts.get("draft", {"count": 0})["count"],
        }

    def get_by_number(self, organization_id: int, number: str) -> Optional[Invoice]:
        return self.get_first(organization_id, invoice_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[Invoice]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[Invoice]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def list_overdue(self, organization_id: int) -> List[Invoice]:
        return self.list_all(organization_id, active_only=True, status="overdue")

    def list_due_between(
        self,
        organization_id: int,
        start_date: str,
        end_date: str,
    ) -> List[Invoice]:
        return self.db.query(Invoice).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.due_date >= start_date,
            Invoice.due_date <= end_date,
        ).all()

    def get_outstanding_total(self, organization_id: int) -> float:
        result = self.db.query(
            func.coalesce(func.sum(Invoice.balance_due), 0)
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status.in_(["sent", "overdue", "partially_paid"]),
        ).scalar()
        return float(result)

    def mark_sent(self, id: int, organization_id: int) -> Invoice:
        inv = self.get_by_id(id, organization_id)
        inv.status = InvoiceStatus.SENT
        inv.sent_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def mark_paid(self, id: int, organization_id: int, amount: Decimal) -> Invoice:
        inv = self.get_by_id(id, organization_id)
        inv.paid_amount = amount
        inv.balance_due = inv.total_amount - amount
        inv.status = InvoiceStatus.PAID if inv.balance_due <= 0 else InvoiceStatus.PARTIALLY_PAID
        inv.paid_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def get_dashboard_stats(self, organization_id: int, period: Optional[str] = None) -> Dict[str, Any]:
        from app.modules.billing.services.dashboard_service import get_period_dates
        filters = [
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        ]
        if period:
            period_start, period_end = get_period_dates(period)
            filters.append(Invoice.issue_date >= period_start)
            filters.append(Invoice.issue_date <= period_end)
        base = self.db.query(Invoice).filter(*filters)
        total_invoices = base.count()
        total_amount = base.with_entities(
            func.coalesce(func.sum(Invoice.total_amount), 0)
        ).scalar()
        paid_amount = base.filter(Invoice.status == "paid").with_entities(
            func.coalesce(func.sum(Invoice.total_amount), 0)
        ).scalar()
        overdue_amount = base.filter(Invoice.status == "overdue").with_entities(
            func.coalesce(func.sum(Invoice.balance_due), 0)
        ).scalar()
        return {
            "total_invoices": total_invoices,
            "total_amount": float(total_amount),
            "paid_amount": float(paid_amount),
            "overdue_amount": float(overdue_amount),
        }

    def get_enterprise_dashboard_stats(self, organization_id: int) -> Dict[str, Any]:
        base = self.db.query(Invoice).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        )

        total_invoices = base.count()
        total_amount = float(base.with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
        paid_amount = float(base.filter(Invoice.status == "paid").with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
        outstanding_amount = float(base.filter(Invoice.status.in_(["sent", "overdue", "partially_paid"])).with_entities(func.coalesce(func.sum(Invoice.balance_due), 0)).scalar() or 0)
        overdue_amount = float(base.filter(Invoice.status == "overdue").with_entities(func.coalesce(func.sum(Invoice.balance_due), 0)).scalar() or 0)

        status_rows = (
            self.db.query(
                Invoice.status,
                func.count(Invoice.id),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
            )
            .group_by(Invoice.status)
            .all()
        )
        status_counts = {row[0].value if hasattr(row[0], "value") else str(row[0]): row[1] for row in status_rows}

        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_revenue = float(base.filter(
            Invoice.status == "paid",
            Invoice.paid_at >= month_start,
        ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)

        total_tax = float(base.with_entities(func.coalesce(func.sum(Invoice.tax_amount), 0)).scalar() or 0)

        avg_days = float(
            self.db.query(
                func.avg(
                    func.extract("epoch", Invoice.paid_at - Invoice.issue_date) / 86400
                )
            ).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at.isnot(None),
                Invoice.issue_date.isnot(None),
            ).scalar() or 0
        )

        collection_rate = (paid_amount / total_amount * 100) if total_amount > 0 else 0

        return {
            "total_invoices": total_invoices,
            "status_counts": status_counts,
            "total_amount": total_amount,
            "outstanding_amount": outstanding_amount,
            "collected_amount": paid_amount,
            "this_month_revenue": this_month_revenue,
            "average_payment_days": round(avg_days, 1),
            "collection_rate": round(min(100, collection_rate), 1),
            "total_tax_collected": total_tax,
            "overdue_amount": overdue_amount,
        }

    def get_invoice_trend(self, organization_id: int, months: int = 12) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        cutoff = (now - timedelta(days=30 * months)).replace(day=1)
        rows = (
            self.db.query(
                extract("year", Invoice.created_at).label("yr"),
                extract("month", Invoice.created_at).label("mo"),
                func.count(Invoice.id).label("count"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("total"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= cutoff,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        lookup = {(int(r.yr), int(r.mo)): {"count": r.count, "total": float(r.total)} for r in rows}
        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1)
            key = (month_start.year, month_start.month)
            data = lookup.get(key, {"count": 0, "total": 0.0})
            results.append({
                "month": month_start.strftime("%b %Y"),
                "count": data["count"],
                "total": data["total"],
            })
        return results

    def get_revenue_trend(self, organization_id: int, months: int = 12) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        cutoff = (now - timedelta(days=30 * months)).replace(day=1)

        invoiced_rows = (
            self.db.query(
                extract("year", Invoice.created_at).label("yr"),
                extract("month", Invoice.created_at).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("invoiced"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= cutoff,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        invoiced_lookup = {(int(r.yr), int(r.mo)): float(r.invoiced) for r in invoiced_rows}

        collected_rows = (
            self.db.query(
                extract("year", Invoice.paid_at).label("yr"),
                extract("month", Invoice.paid_at).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("revenue"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at >= cutoff,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        collected_lookup = {(int(r.yr), int(r.mo)): float(r.revenue) for r in collected_rows}

        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1)
            key = (month_start.year, month_start.month)
            results.append({
                "month": month_start.strftime("%b %Y"),
                "revenue": collected_lookup.get(key, 0.0),
                "invoiced": invoiced_lookup.get(key, 0.0),
            })
        return results

    def get_payment_collection_trend(self, organization_id: int, months: int = 12) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        cutoff = (now - timedelta(days=30 * months)).replace(day=1)

        total_rows = (
            self.db.query(
                extract("year", Invoice.created_at).label("yr"),
                extract("month", Invoice.created_at).label("mo"),
                func.count(Invoice.id).label("total"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= cutoff,
            )
            .group_by("yr", "mo")
            .all()
        )
        total_lookup = {(int(r.yr), int(r.mo)): r.total for r in total_rows}

        paid_rows = (
            self.db.query(
                extract("year", Invoice.paid_at).label("yr"),
                extract("month", Invoice.paid_at).label("mo"),
                func.count(Invoice.id).label("paid"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at >= cutoff,
            )
            .group_by("yr", "mo")
            .all()
        )
        paid_lookup = {(int(r.yr), int(r.mo)): r.paid for r in paid_rows}

        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1)
            key = (month_start.year, month_start.month)
            total_inv = total_lookup.get(key, 0)
            paid_inv = paid_lookup.get(key, 0)
            rate = (paid_inv / total_inv * 100) if total_inv > 0 else 0
            results.append({
                "month": month_start.strftime("%b %Y"),
                "rate": round(rate, 1),
                "total": total_inv,
                "paid": paid_inv,
            })
        return results

    def get_status_distribution(self, organization_id: int) -> List[Dict[str, Any]]:
        results = self.db.query(
            Invoice.status,
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        ).group_by(Invoice.status).all()

        colors = {
            "draft": "#6b7280",
            "sent": "#3b82f6",
            "paid": "#10b981",
            "overdue": "#ef4444",
            "cancelled": "#f59e0b",
            "partially_paid": "#8b5cf6",
            "refunded": "#ec4899",
        }
        return [
            {"name": status.value.replace("_", " ").title(), "value": count, "amount": float(amount), "color": colors.get(status.value, "#6b7280")}
            for status, count, amount in results
        ]

    def get_monthly_revenue_stats(self, organization_id: int, months: int = 12) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        cutoff = (now - timedelta(days=30 * months)).replace(day=1)

        created_rows = (
            self.db.query(
                extract("year", Invoice.created_at).label("yr"),
                extract("month", Invoice.created_at).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("total"),
                func.coalesce(func.sum(Invoice.tax_amount), 0).label("tax"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= cutoff,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        created_lookup = {(int(r.yr), int(r.mo)): {"total": float(r.total), "tax": float(r.tax)} for r in created_rows}

        collected_rows = (
            self.db.query(
                extract("year", Invoice.paid_at).label("yr"),
                extract("month", Invoice.paid_at).label("mo"),
                func.coalesce(func.sum(Invoice.total_amount), 0).label("collected"),
            )
            .filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at >= cutoff,
            )
            .group_by("yr", "mo")
            .order_by("yr", "mo")
            .all()
        )
        collected_lookup = {(int(r.yr), int(r.mo)): float(r.collected) for r in collected_rows}

        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1)
            key = (month_start.year, month_start.month)
            data = created_lookup.get(key, {"total": 0.0, "tax": 0.0})
            results.append({
                "month": month_start.strftime("%b %Y"),
                "total": data["total"],
                "collected": collected_lookup.get(key, 0.0),
                "tax": data["tax"],
            })
        return results
        return results

    def get_recent_activity(self, organization_id: int, limit: int = 10) -> List[Dict[str, Any]]:
        history = self.db.query(InvoiceStatusHistory).filter(
            InvoiceStatusHistory.organization_id == organization_id,
        ).order_by(InvoiceStatusHistory.created_at.desc()).limit(limit).all()

        return [
            {
                "id": h.id,
                "invoice_id": h.invoice_id,
                "from_status": h.from_status,
                "to_status": h.to_status,
                "changed_by": h.changed_by,
                "reason": h.reason,
                "created_at": h.created_at.isoformat() if h.created_at else None,
                "action": f"Status changed from {h.from_status or 'new'} to {h.to_status}",
            }
            for h in history
        ]

    def bulk_delete(self, ids: List[int], organization_id: int) -> int:
        query = self.db.query(Invoice).filter(
            Invoice.id.in_(ids),
            Invoice.organization_id == organization_id,
        )
        deleted = query.delete(synchronize_session="fetch")
        self.db.commit()
        return deleted

    def _build_filtered_query(self, organization_id: int, active_only: bool = True, **filters: Any):
        query = self.db.query(Invoice)
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        if self._has_deleted_at:
            query = query.filter(Invoice.deleted_at.is_(None))
        for field, value in filters.items():
            if value is not None:
                query = self._apply_filter(query, field, value)
        return query

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "desc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        customer_id: Optional[int] = None,
        status: Optional[str] = None,
        invoice_type: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        currency: Optional[str] = None,
        min_amount: Optional[float] = None,
        max_amount: Optional[float] = None,
        payment_status: Optional[str] = None,
        is_overdue: Optional[bool] = None,
        owner_id: Optional[int] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        per_page = min(max(per_page, 1), 200)
        page = max(page, 1)
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        if invoice_type:
            filters["invoice_type"] = invoice_type
        if "contract_id" in filters and filters["contract_id"] is None:
            filters.pop("contract_id")
        if "subscription_id" in filters and filters["subscription_id"] is None:
            filters.pop("subscription_id")
        base_query = self._build_filtered_query(
            organization_id, active_only, **filters
        )
        if search_term:
            base_query = base_query.filter(
                or_(
                    Invoice.invoice_number.ilike(f"%{search_term}%"),
                    Invoice.po_number.ilike(f"%{search_term}%"),
                )
            )
        if date_from:
            base_query = base_query.filter(Invoice.issue_date >= date_from)
        if date_to:
            base_query = base_query.filter(Invoice.issue_date <= date_to)
        if currency:
            base_query = base_query.filter(Invoice.currency == currency)
        if min_amount is not None:
            base_query = base_query.filter(Invoice.total_amount >= min_amount)
        if max_amount is not None:
            base_query = base_query.filter(Invoice.total_amount <= max_amount)
        if is_overdue:
            base_query = base_query.filter(Invoice.status == "overdue")
        if owner_id:
            base_query = base_query.filter(Invoice.created_by == owner_id)
        total = base_query.count()
        if sort_by and hasattr(Invoice, sort_by):
            from sqlalchemy import asc as sa_asc, desc as sa_desc
            order_fn = sa_asc if sort_order == "asc" else sa_desc
            base_query = base_query.order_by(order_fn(getattr(Invoice, sort_by)))
        items = base_query.offset((page - 1) * per_page).limit(per_page).all()
        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if total else 0,
            "items": items,
        }


class InvoiceItemRepository(BaseRepository[InvoiceItem]):
    def __init__(self, db):
        super().__init__(db, InvoiceItem)

    def list_by_invoice(self, organization_id: int, invoice_id: int) -> List[InvoiceItem]:
        query = self.db.query(InvoiceItem).filter(
            InvoiceItem.invoice_id == invoice_id,
        )
        query = self._org_filter(query, organization_id)
        return query.order_by(InvoiceItem.line_number).all()

    def bulk_create_for_invoice(
        self,
        organization_id: int,
        invoice_id: int,
        items: List[Dict[str, Any]],
    ) -> List[InvoiceItem]:
        objs = [InvoiceItem(organization_id=organization_id, invoice_id=invoice_id, **item) for item in items]
        self.db.add_all(objs)
        self.db.commit()
        for obj in objs:
            self.db.refresh(obj)
        return objs

    def delete_by_invoice(self, organization_id: int, invoice_id: int) -> int:
        query = self.db.query(InvoiceItem).filter(
            InvoiceItem.invoice_id == invoice_id,
        )
        query = self._org_filter(query, organization_id)
        deleted = query.delete(synchronize_session="fetch")
        self.db.commit()
        return deleted


class InvoiceStatusHistoryRepository(BaseRepository[InvoiceStatusHistory]):
    def __init__(self, db):
        super().__init__(db, InvoiceStatusHistory)

    def list_by_invoice(self, organization_id: int, invoice_id: int) -> List[InvoiceStatusHistory]:
        query = self.db.query(InvoiceStatusHistory).filter(
            InvoiceStatusHistory.invoice_id == invoice_id,
        )
        query = self._org_filter(query, organization_id)
        return query.order_by(InvoiceStatusHistory.created_at.desc()).all()

    def log_status_change(
        self,
        organization_id: int,
        invoice_id: int,
        from_status: Optional[str],
        to_status: str,
        changed_by: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> InvoiceStatusHistory:
        entry = InvoiceStatusHistory(
            organization_id=organization_id,
            invoice_id=invoice_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            reason=reason,
        )
        self.db.add(entry)
        self.db.commit()
        self.db.refresh(entry)
        return entry
