from datetime import date
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func

from app.modules.billing.models import (
    Invoice,
    InvoiceItem,
    InvoiceStatusHistory,
)
from app.modules.billing.repositories.base import BaseRepository


class InvoiceRepository(BaseRepository[Invoice]):
    def __init__(self, db):
        super().__init__(db, Invoice)

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
        inv.status = "sent"
        inv.sent_at = func.now()
        self.db.commit()
        self.db.refresh(inv)
        return inv

    def mark_paid(self, id: int, organization_id: int, amount: float) -> Invoice:
        inv = self.get_by_id(id, organization_id)
        inv.paid_amount = amount
        inv.balance_due = inv.total_amount - amount
        inv.status = "paid" if inv.balance_due <= 0 else "partially_paid"
        inv.paid_at = func.now()
        self.db.commit()
        self.db.refresh(inv)
        return inv

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
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        if invoice_type:
            filters["invoice_type"] = invoice_type
        base_query = self._build_filtered_query(
            organization_id, active_only, **filters
        )
        if search_term:
            base_query = base_query.filter(
                Invoice.invoice_number.ilike(f"%{search_term}%")
            )
        if date_from:
            base_query = base_query.filter(Invoice.issue_date >= date_from)
        if date_to:
            base_query = base_query.filter(Invoice.issue_date <= date_to)
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

    def _build_filtered_query(self, organization_id, active_only, **filters):
        query = self.db.query(Invoice)
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        for field, value in filters.items():
            if value is not None:
                query = query.filter(getattr(Invoice, field) == value)
        return query

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


class InvoiceItemRepository(BaseRepository[InvoiceItem]):
    def __init__(self, db):
        super().__init__(db, InvoiceItem)

    def list_by_invoice(self, invoice_id: int) -> List[InvoiceItem]:
        return self.db.query(InvoiceItem).filter(
            InvoiceItem.invoice_id == invoice_id,
        ).order_by(InvoiceItem.line_number).all()

    def bulk_create_for_invoice(
        self,
        invoice_id: int,
        items: List[Dict[str, Any]],
    ) -> List[InvoiceItem]:
        objs = [InvoiceItem(invoice_id=invoice_id, **item) for item in items]
        self.db.add_all(objs)
        self.db.commit()
        for obj in objs:
            self.db.refresh(obj)
        return objs

    def delete_by_invoice(self, invoice_id: int) -> int:
        deleted = self.db.query(InvoiceItem).filter(
            InvoiceItem.invoice_id == invoice_id,
        ).delete(synchronize_session="fetch")
        self.db.commit()
        return deleted


class InvoiceStatusHistoryRepository(BaseRepository[InvoiceStatusHistory]):
    def __init__(self, db):
        super().__init__(db, InvoiceStatusHistory)

    def list_by_invoice(self, invoice_id: int) -> List[InvoiceStatusHistory]:
        return self.db.query(InvoiceStatusHistory).filter(
            InvoiceStatusHistory.invoice_id == invoice_id,
        ).order_by(InvoiceStatusHistory.created_at.desc()).all()

    def log_status_change(
        self,
        invoice_id: int,
        from_status: Optional[str],
        to_status: str,
        changed_by: Optional[int] = None,
        reason: Optional[str] = None,
    ) -> InvoiceStatusHistory:
        entry = InvoiceStatusHistory(
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
