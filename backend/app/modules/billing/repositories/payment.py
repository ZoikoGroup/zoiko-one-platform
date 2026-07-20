from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func

from app.modules.billing.models import (
    Payment,
    PaymentAllocation,
    PaymentAttempt,
    PaymentMethod,
)
from app.modules.billing.repositories.base import BaseRepository


class PaymentMethodRepository(BaseRepository[PaymentMethod]):
    def __init__(self, db):
        super().__init__(db, PaymentMethod)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[PaymentMethod]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def get_default(self, organization_id: int, customer_id: int) -> Optional[PaymentMethod]:
        return self.get_first(
            organization_id,
            customer_id=customer_id,
            is_default=True,
        )

    def set_default(self, organization_id: int, method_id: int) -> PaymentMethod:
        method = self.get_by_id(method_id, organization_id)
        self.db.query(PaymentMethod).filter(
            PaymentMethod.customer_id == method.customer_id,
            PaymentMethod.organization_id == organization_id,
        ).update({"is_default": False})
        method.is_default = True
        self.db.commit()
        self.db.refresh(method)
        return method

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        customer_id: Optional[int] = None,
        payment_type: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if payment_type:
            filters["payment_type"] = payment_type
        filters.pop("search_fields", None)
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order or "desc",
            active_only=active_only,
            search_term=search_term,
            search_fields=search_fields or ["card_brand", "bank_name", "gateway"],
            **filters,
        )


class PaymentRepository(BaseRepository[Payment]):
    def __init__(self, db):
        super().__init__(db, Payment)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Payment]:
        return self.get_first(organization_id, payment_number=number)

    def get_by_transaction_id(self, organization_id: int, transaction_id: str) -> Optional[Payment]:
        return self.get_first(organization_id, transaction_id=transaction_id)

    def get_by_id_for_update(self, id: int, organization_id: int) -> Payment:
        """Row-level lock for preventing concurrent over-refund/over-allocation.
        Falls back to plain read on SQLite (local dev) where FOR UPDATE is unsupported."""
        query = self.db.query(Payment).filter(Payment.id == id)
        try:
            query = query.with_for_update(nowait=False)
        except NotImplementedError:
            pass  # SQLite does not support row-level locking
        query = self._org_filter(query, organization_id)
        obj = query.first()
        if not obj:
            from app.core.exceptions import NotFoundException
            raise NotFoundException("Payment", id)
        return obj

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[Payment]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[Payment]:
        return self.list_all(organization_id, active_only=active_only, status=status)

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
        payment_type: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        if payment_type:
            filters["payment_type"] = payment_type
        filters.pop("search_fields", None)
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "payment_date",
            sort_order=sort_order or "desc",
            active_only=active_only,
            search_term=search_term,
            search_fields=search_fields or ["payment_number", "transaction_id", "notes"],
            **filters,
        )

    def get_total_collected(
        self,
        organization_id: int,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ) -> float:
        query = self.db.query(
            func.coalesce(func.sum(Payment.amount), 0)
        ).filter(
            Payment.organization_id == organization_id,
            Payment.status == "cleared",
        )
        if date_from:
            query = query.filter(Payment.payment_date >= date_from)
        if date_to:
            query = query.filter(Payment.payment_date <= date_to)
        return float(query.scalar())


class PaymentAllocationRepository(BaseRepository[PaymentAllocation]):
    def __init__(self, db):
        super().__init__(db, PaymentAllocation)

    def list_by_payment(self, organization_id: int, payment_id: int) -> List[PaymentAllocation]:
        query = self.db.query(PaymentAllocation).filter(
            PaymentAllocation.payment_id == payment_id,
        )
        query = self._org_filter(query, organization_id)
        return query.all()

    def list_by_invoice(self, organization_id: int, invoice_id: int) -> List[PaymentAllocation]:
        query = self.db.query(PaymentAllocation).filter(
            PaymentAllocation.invoice_id == invoice_id,
        )
        query = self._org_filter(query, organization_id)
        return query.all()

    def get_total_allocated_to_invoice(self, organization_id: int, invoice_id: int) -> Decimal:
        query = self.db.query(
            func.coalesce(func.sum(PaymentAllocation.amount), 0)
        ).filter(
            PaymentAllocation.invoice_id == invoice_id,
        )
        query = self._org_filter(query, organization_id)
        result = query.scalar()
        return Decimal(str(result))


class PaymentAttemptRepository(BaseRepository[PaymentAttempt]):
    def __init__(self, db):
        super().__init__(db, PaymentAttempt)

    def list_by_payment(self, organization_id: int, payment_id: int) -> List[PaymentAttempt]:
        query = self.db.query(PaymentAttempt).filter(
            PaymentAttempt.payment_id == payment_id,
        )
        query = self._org_filter(query, organization_id)
        return query.order_by(PaymentAttempt.attempt_number.asc()).all()

    def get_latest_attempt(self, organization_id: int, payment_id: int) -> Optional[PaymentAttempt]:
        query = self.db.query(PaymentAttempt).filter(
            PaymentAttempt.payment_id == payment_id,
        )
        query = self._org_filter(query, organization_id)
        return query.order_by(PaymentAttempt.attempt_number.desc()).first()

    def count_failed_attempts(self, organization_id: int, payment_id: int) -> int:
        query = self.db.query(PaymentAttempt).filter(
            PaymentAttempt.payment_id == payment_id,
            PaymentAttempt.status == "failed",
        )
        query = self._org_filter(query, organization_id)
        return query.count()
