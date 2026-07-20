from typing import Any, Dict, List, Optional
from decimal import Decimal

from sqlalchemy import func

from app.modules.billing.models import (
    CreditNote,
    CreditNoteApplication,
    Refund,
)
from app.modules.billing.repositories.base import BaseRepository


class CreditNoteRepository(BaseRepository[CreditNote]):
    def __init__(self, db):
        super().__init__(db, CreditNote)

    def get_by_number(self, organization_id: int, number: str) -> Optional[CreditNote]:
        return self.get_first(organization_id, credit_note_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[CreditNote]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_invoice(
        self,
        organization_id: int,
        invoice_id: int,
        active_only: bool = True,
    ) -> List[CreditNote]:
        return self.list_all(organization_id, active_only=active_only, invoice_id=invoice_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[CreditNote]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def get_outstanding_total(self, organization_id: int) -> float:
        result = self.db.query(
            func.coalesce(func.sum(CreditNote.remaining_amount), 0)
        ).filter(
            CreditNote.organization_id == organization_id,
            CreditNote.is_active == True,
            CreditNote.status.in_(["issued", "partially_applied"]),
        ).scalar()
        return float(result)

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
        credit_note_type: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        if credit_note_type:
            filters["credit_note_type"] = credit_note_type
        filters.pop("search_fields", None)
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=search_fields or ["credit_note_number", "reason"],
            **filters,
        )


class CreditNoteApplicationRepository(BaseRepository[CreditNoteApplication]):
    def __init__(self, db):
        super().__init__(db, CreditNoteApplication)

    def list_by_credit_note(self, organization_id: int, credit_note_id: int) -> List[CreditNoteApplication]:
        query = self.db.query(CreditNoteApplication).filter(
            CreditNoteApplication.credit_note_id == credit_note_id,
        )
        query = self._org_filter(query, organization_id)
        return query.all()

    def list_by_invoice(self, organization_id: int, invoice_id: int) -> List[CreditNoteApplication]:
        query = self.db.query(CreditNoteApplication).filter(
            CreditNoteApplication.invoice_id == invoice_id,
        )
        query = self._org_filter(query, organization_id)
        return query.all()

    def get_total_applied(self, organization_id: int, credit_note_id: int) -> float:
        query = self.db.query(
            func.coalesce(func.sum(CreditNoteApplication.amount), 0)
        ).filter(
            CreditNoteApplication.credit_note_id == credit_note_id,
        )
        query = self._org_filter(query, organization_id)
        result = query.scalar()
        return float(result)


class RefundRepository(BaseRepository[Refund]):
    def __init__(self, db):
        super().__init__(db, Refund)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Refund]:
        return self.get_first(organization_id, refund_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[Refund]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[Refund]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def get_by_payment(
        self,
        organization_id: int,
        payment_id: int,
    ) -> Optional[Refund]:
        return self.get_first(organization_id, payment_id=payment_id)

    def get_total_refunded_for_payment(
        self, organization_id: int, payment_id: int,
    ) -> Decimal:
        """Sum of refunds that financially reduce the payment (completed + processing).
        Failed, rejected, pending refunds do NOT count as they haven't moved money."""
        from sqlalchemy import and_
        from app.modules.billing.models import RefundStatus
        result = self.db.query(
            func.coalesce(func.sum(Refund.amount), 0)
        ).filter(
            and_(
                Refund.organization_id == organization_id,
                Refund.payment_id == payment_id,
                Refund.is_active == True,
                Refund.status.in_([
                    RefundStatus.COMPLETED,
                    RefundStatus.PROCESSING,
                ]),
            )
        ).scalar()
        return Decimal(str(result))

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
        refund_type: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        if refund_type:
            filters["refund_type"] = refund_type
        filters.pop("search_fields", None)
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=search_fields or ["refund_number", "reason"],
            **filters,
        )
