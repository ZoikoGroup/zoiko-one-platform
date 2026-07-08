from typing import Any, Dict, List, Optional

from app.modules.billing.models import (
    CollectionAction,
    CollectionsCase,
    DunningCase,
    DunningLevel,
)
from app.modules.billing.repositories.base import BaseRepository


class DunningLevelRepository(BaseRepository[DunningLevel]):
    def __init__(self, db):
        super().__init__(db, DunningLevel)

    def get_by_level(self, organization_id: int, level_number: int) -> Optional[DunningLevel]:
        return self.get_first(organization_id, level_number=level_number)

    def list_active(self, organization_id: int) -> List[DunningLevel]:
        return self.list_all(organization_id, active_only=True)

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        **filters: Any,
    ) -> Dict[str, Any]:
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "level_number",
            sort_order=sort_order,
            active_only=active_only,
            search_fields=["name", "action_type"],
            **filters,
        )


class DunningCaseRepository(BaseRepository[DunningCase]):
    def __init__(self, db):
        super().__init__(db, DunningCase)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[DunningCase]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_invoice(
        self,
        organization_id: int,
        invoice_id: int,
        active_only: bool = True,
    ) -> List[DunningCase]:
        return self.list_all(organization_id, active_only=active_only, invoice_id=invoice_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[DunningCase]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def list_active_cases(self, organization_id: int) -> List[DunningCase]:
        return self.list_all(organization_id, active_only=True, status="active")

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
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=["resolution_note"],
            **filters,
        )


class CollectionsCaseRepository(BaseRepository[CollectionsCase]):
    def __init__(self, db):
        super().__init__(db, CollectionsCase)

    def get_by_number(self, organization_id: int, number: str) -> Optional[CollectionsCase]:
        return self.get_first(organization_id, case_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[CollectionsCase]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[CollectionsCase]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def list_by_assignee(
        self,
        organization_id: int,
        assigned_to: int,
        active_only: bool = True,
    ) -> List[CollectionsCase]:
        return self.list_all(organization_id, active_only=active_only, assigned_to=assigned_to)

    def list_by_priority(
        self,
        organization_id: int,
        priority: str,
        active_only: bool = True,
    ) -> List[CollectionsCase]:
        return self.list_all(organization_id, active_only=active_only, priority=priority)

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
        assigned_to: Optional[int] = None,
        priority: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if status:
            filters["status"] = status
        if assigned_to:
            filters["assigned_to"] = assigned_to
        if priority:
            filters["priority"] = priority
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=["case_number", "notes", "resolution"],
            **filters,
        )


class CollectionActionRepository(BaseRepository[CollectionAction]):
    def __init__(self, db):
        super().__init__(db, CollectionAction)

    def list_by_case(self, organization_id: int, collection_id: int) -> List[CollectionAction]:
        query = self.db.query(CollectionAction).filter(
            CollectionAction.collection_id == collection_id,
        )
        query = self._org_filter(query, organization_id)
        return query.order_by(CollectionAction.performed_at.desc()).all()

    def log_action(
        self,
        organization_id: int,
        collection_id: int,
        action_type: str,
        description: Optional[str] = None,
        performed_by: Optional[int] = None,
        outcome: Optional[str] = None,
        follow_up_date: Optional[str] = None,
    ) -> CollectionAction:
        action = CollectionAction(
            organization_id=organization_id,
            collection_id=collection_id,
            action_type=action_type,
            description=description,
            performed_by=performed_by,
            outcome=outcome,
            follow_up_date=follow_up_date,
        )
        self.db.add(action)
        self.db.commit()
        self.db.refresh(action)
        return action
