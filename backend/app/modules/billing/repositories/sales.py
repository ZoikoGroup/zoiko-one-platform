from typing import Any, Dict, List, Optional

from app.modules.billing.models import (
    Contract,
    Quotation,
    QuotationItem,
)
from app.modules.billing.repositories.base import BaseRepository


class QuotationRepository(BaseRepository[Quotation]):
    def __init__(self, db):
        super().__init__(db, Quotation)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Quotation]:
        return self.get_first(organization_id, quote_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[Quotation]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[Quotation]:
        return self.list_all(organization_id, active_only=active_only, status=status)

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
        status: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order or "desc",
            active_only=active_only,
            search_term=search_term,
            search_fields=["quote_number", "subject", "notes"],
            **filters,
        )


class QuotationItemRepository(BaseRepository[QuotationItem]):
    def __init__(self, db):
        super().__init__(db, QuotationItem)

    def list_by_quotation(self, quotation_id: int) -> List[QuotationItem]:
        return self.db.query(QuotationItem).filter(
            QuotationItem.quotation_id == quotation_id,
        ).order_by(QuotationItem.line_number).all()

    def bulk_create_for_quotation(
        self,
        quotation_id: int,
        items: List[Dict[str, Any]],
    ) -> List[QuotationItem]:
        objs = [QuotationItem(quotation_id=quotation_id, **item) for item in items]
        self.db.add_all(objs)
        self.db.commit()
        for obj in objs:
            self.db.refresh(obj)
        return objs

    def delete_by_quotation(self, quotation_id: int) -> int:
        deleted = self.db.query(QuotationItem).filter(
            QuotationItem.quotation_id == quotation_id,
        ).delete(synchronize_session="fetch")
        self.db.commit()
        return deleted


class ContractRepository(BaseRepository[Contract]):
    def __init__(self, db):
        super().__init__(db, Contract)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Contract]:
        return self.get_first(organization_id, contract_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[Contract]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[Contract]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def list_active(self, organization_id: int) -> List[Contract]:
        return self.list_all(organization_id, active_only=True, status="active")

    def list_expiring(
        self,
        organization_id: int,
        within_days: int = 30,
    ) -> List[Contract]:
        from sqlalchemy import and_
        from datetime import date, timedelta
        cutoff = date.today() + timedelta(days=within_days)
        return self.db.query(Contract).filter(
            Contract.organization_id == organization_id,
            Contract.is_active == True,
            Contract.status == "active",
            Contract.end_date.isnot(None),
            Contract.end_date <= cutoff,
        ).all()

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
        status: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order or "desc",
            active_only=active_only,
            search_term=search_term,
            search_fields=["contract_number", "contract_name", "notes"],
            **filters,
        )
