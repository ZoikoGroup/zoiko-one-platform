from typing import Any, Dict, List, Optional

from sqlalchemy import func

from app.modules.billing.models import BillingCustomer, CustomerContact
from app.modules.billing.repositories.base import BaseRepository


class CustomerRepository(BaseRepository[BillingCustomer]):
    def __init__(self, db):
        super().__init__(db, BillingCustomer)

    def get_by_code(self, organization_id: int, code: str) -> Optional[BillingCustomer]:
        return self.get_first(organization_id, customer_code=code)

    def search_by_company(
        self,
        organization_id: int,
        term: str,
        active_only: bool = True,
        limit: int = 20,
    ) -> List[BillingCustomer]:
        from sqlalchemy import or_
        from sqlalchemy.orm import Query
        
        query: Query[BillingCustomer] = self.db.query(self.model)
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        query = query.filter(self.model.deleted_at.is_(None))
        
        conditions = []
        
        searchable_fields = [
            "display_name",
            "company_name",
            "customer_code",
            "email",
            "phone",
            "mobile",
            "gst_number",
            "vat_number",
            "pan",
            "tin",
            "tax_id",
        ]
        
        for field_name in searchable_fields:
            if hasattr(self.model, field_name):
                conditions.append(
                    getattr(self.model, field_name).ilike(f"%{term}%")
                )
        
        if not conditions:
            query = query.filter(self.model.company_name.ilike(f"%{term}%"))
        else:
            query = query.filter(or_(*conditions))
            
        return query.limit(limit).all()

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        customer_type: Optional[str] = None,
        status: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_type:
            filters["customer_type"] = customer_type
        if status:
            filters["status"] = status
        if search_fields:
            filters.pop("search_fields", None)
        else:
            search_fields = ["company_name", "display_name", "email", "customer_code", "phone", "mobile", "gst_number", "vat_number", "pan", "tin", "tax_id"]
        filters.pop("search_fields", None)
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "company_name",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=search_fields,
            **filters,
        )

    def count_by_status(self, organization_id: int) -> Dict[str, int]:
        from app.modules.billing.models import CustomerStatus
        query = self.db.query(
            BillingCustomer.status,
            func.count(BillingCustomer.id),
        ).filter(
            BillingCustomer.organization_id == organization_id,
            BillingCustomer.deleted_at.is_(None),
        ).group_by(BillingCustomer.status)
        rows = {row[0]: row[1] for row in query.all()}
        return {s.value: rows.get(s.value, 0) for s in CustomerStatus}


class CustomerContactRepository(BaseRepository[CustomerContact]):
    def __init__(self, db):
        super().__init__(db, CustomerContact)

    def get_primary(self, organization_id: int, customer_id: int) -> Optional[CustomerContact]:
        return self.get_first(
            organization_id,
            customer_id=customer_id,
            is_primary=True,
        )

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[CustomerContact]:
        return self.list_all(
            organization_id,
            active_only=active_only,
            customer_id=customer_id,
        )

    def set_primary(self, organization_id: int, contact_id: int) -> CustomerContact:
        contact = self.get_by_id(contact_id, organization_id)
        self.db.query(CustomerContact).filter(
            CustomerContact.customer_id == contact.customer_id,
            CustomerContact.organization_id == organization_id,
        ).update({"is_primary": False})
        contact.is_primary = True
        self.db.commit()
        self.db.refresh(contact)
        return contact

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        search_fields: Optional[List[str]] = None,
        customer_id: Optional[int] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if search_fields:
            filters.pop("search_fields", None)
        else:
            search_fields = ["first_name", "last_name", "email", "phone"]
        filters.pop("search_fields", None)
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "last_name",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=search_fields,
            **filters,
        )
