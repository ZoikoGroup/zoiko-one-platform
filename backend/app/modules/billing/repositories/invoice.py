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

    def get_amount_summary(self, organization_id: int) -> Dict[str, Any]:
        base = self.db.query(
            func.coalesce(func.sum(Invoice.total_amount), 0),
            func.coalesce(func.sum(Invoice.balance_due), 0),
            func.count(Invoice.id),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        ).first()
        total_amount = float(base[0] or 0)
        total_balance = float(base[1] or 0)
        total_count = base[2] or 0
        paid = self.db.query(
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "paid",
        ).scalar() or 0
        overdue = self.db.query(
            func.coalesce(func.sum(Invoice.balance_due), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "overdue",
        ).scalar() or 0
        return {
            "total_revenue": total_amount,
            "paid_revenue": float(paid),
            "outstanding_amount": total_balance,
            "overdue_amount": float(overdue),
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

    def get_invoice_summary_by_status(self, organization_id: int) -> Dict[str, Any]:
        base = self.db.query(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        ).first()
        total_count = base[0] or 0
        total_amount = float(base[1] or 0)
        paid = self.db.query(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "paid",
        ).first()
        overdue = self.db.query(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.total_amount), 0),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "overdue",
        ).first()
        sent = self.db.query(
            func.count(Invoice.id),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "sent",
        ).scalar() or 0
        draft = self.db.query(
            func.count(Invoice.id),
        ).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
            Invoice.status == "draft",
        ).scalar() or 0
        return {
            "total_invoices": total_count,
            "total_amount": total_amount,
            "paid_count": paid[0] or 0,
            "paid_amount": float(paid[1] or 0),
            "overdue_count": overdue[0] or 0,
            "overdue_amount": float(overdue[1] or 0),
            "sent_count": sent,
            "draft_count": draft,
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

    def get_dashboard_stats(self, organization_id: int) -> Dict[str, Any]:
        base = self.db.query(Invoice).filter(
            Invoice.organization_id == organization_id,
            Invoice.is_active == True,
        )
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

        status_counts = {}
        for st in InvoiceStatus:
            cnt = base.filter(Invoice.status == st).count()
            status_counts[st.value] = cnt

        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_revenue = float(base.filter(
            Invoice.status == "paid",
            Invoice.paid_at >= month_start,
        ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)

        total_tax = float(base.with_entities(func.coalesce(func.sum(Invoice.tax_amount), 0)).scalar() or 0)

        paid_invoices = base.filter(Invoice.status == "paid", Invoice.paid_at.isnot(None), Invoice.issue_date.isnot(None)).all()
        if paid_invoices:
            avg_days = sum((inv.paid_at.date() - inv.issue_date).days for inv in paid_invoices if inv.paid_at and inv.issue_date) / len(paid_invoices)
        else:
            avg_days = 0

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
        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i > 0:
                next_month = (dt + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                next_month = now + timedelta(days=1)
            count = self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= month_start,
                Invoice.created_at < next_month,
            ).count()
            total = float(self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= month_start,
                Invoice.created_at < next_month,
            ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
            results.append({
                "month": month_start.strftime("%b %Y"),
                "count": count,
                "total": total,
            })
        return results

    def get_revenue_trend(self, organization_id: int, months: int = 12) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i > 0:
                next_month = (dt + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                next_month = now + timedelta(days=1)
            collected = float(self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at >= month_start,
                Invoice.paid_at < next_month,
            ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
            invoiced = float(self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= month_start,
                Invoice.created_at < next_month,
            ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
            results.append({
                "month": month_start.strftime("%b %Y"),
                "revenue": collected,
                "invoiced": invoiced,
            })
        return results

    def get_payment_collection_trend(self, organization_id: int, months: int = 12) -> List[Dict[str, Any]]:
        now = datetime.utcnow()
        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i > 0:
                next_month = (dt + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                next_month = now + timedelta(days=1)
            total_inv = self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= month_start,
                Invoice.created_at < next_month,
            ).count()
            paid_inv = self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at >= month_start,
                Invoice.paid_at < next_month,
            ).count()
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
        results = []
        for i in range(months - 1, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_start = dt.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if i > 0:
                next_month = (dt + timedelta(days=32)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            else:
                next_month = now + timedelta(days=1)
            total = float(self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= month_start,
                Invoice.created_at < next_month,
            ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
            collected = float(self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.status == "paid",
                Invoice.paid_at >= month_start,
                Invoice.paid_at < next_month,
            ).with_entities(func.coalesce(func.sum(Invoice.total_amount), 0)).scalar() or 0)
            tax = float(self.db.query(Invoice).filter(
                Invoice.organization_id == organization_id,
                Invoice.is_active == True,
                Invoice.created_at >= month_start,
                Invoice.created_at < next_month,
            ).with_entities(func.coalesce(func.sum(Invoice.tax_amount), 0)).scalar() or 0)
            results.append({
                "month": month_start.strftime("%b %Y"),
                "total": total,
                "collected": collected,
                "tax": tax,
            })
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
