from typing import Any, Dict, List, Optional

from sqlalchemy import func

from app.modules.billing.models import (
    Subscription,
    SubscriptionEvent,
    SubscriptionPlan,
)
from app.modules.billing.repositories.base import BaseRepository


class SubscriptionPlanRepository(BaseRepository[SubscriptionPlan]):
    def __init__(self, db):
        super().__init__(db, SubscriptionPlan)

    def get_by_code(self, organization_id: int, code: str) -> Optional[SubscriptionPlan]:
        return self.get_first(organization_id, plan_code=code)

    def list_public(self, organization_id: int, active_only: bool = True) -> List[SubscriptionPlan]:
        return self.list_all(organization_id, active_only=active_only, is_public=True)

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        active_only: bool = True,
        search_term: Optional[str] = None,
        category: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if category:
            filters["category"] = category
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "sort_order",
            sort_order=sort_order,
            active_only=active_only,
            search_term=search_term,
            search_fields=["plan_name", "plan_code", "description"],
            **filters,
        )


class SubscriptionRepository(BaseRepository[Subscription]):
    def __init__(self, db):
        super().__init__(db, Subscription)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Subscription]:
        return self.get_first(organization_id, subscription_number=number)

    def list_by_customer(
        self,
        organization_id: int,
        customer_id: int,
        active_only: bool = True,
    ) -> List[Subscription]:
        return self.list_all(organization_id, active_only=active_only, customer_id=customer_id)

    def list_by_plan(
        self,
        organization_id: int,
        plan_id: int,
        active_only: bool = True,
    ) -> List[Subscription]:
        return self.list_all(organization_id, active_only=active_only, plan_id=plan_id)

    def list_by_status(
        self,
        organization_id: int,
        status: str,
        active_only: bool = True,
    ) -> List[Subscription]:
        return self.list_all(organization_id, active_only=active_only, status=status)

    def list_active(self, organization_id: int) -> List[Subscription]:
        return self.list_all(organization_id, active_only=True, status="active")

    def count_by_status(self, organization_id: int, active_only: bool = True) -> Dict[str, int]:
        from app.modules.billing.models import BillingSubscriptionStatus
        result = {}
        for status in BillingSubscriptionStatus:
            cnt = self.count(organization_id, active_only=active_only, status=status.value)
            result[status.value] = cnt
        return result

    def list_due_for_billing(self, organization_id: int, billing_date: str) -> List[Subscription]:
        return self.db.query(Subscription).filter(
            Subscription.organization_id == organization_id,
            Subscription.is_active == True,
            Subscription.status == "active",
            Subscription.next_billing_at <= billing_date,
        ).all()

    def cancel(self, id: int, organization_id: int, reason: Optional[str] = None) -> Subscription:
        sub = self.get_by_id(id, organization_id)
        sub.status = "cancelled"
        sub.is_active = False
        sub.cancelled_at = func.now()
        sub.cancellation_reason = reason
        self.db.commit()
        self.db.refresh(sub)
        return sub

    def pause(self, id: int, organization_id: int) -> Subscription:
        sub = self.get_by_id(id, organization_id)
        sub.status = "paused"
        sub.paused_at = func.now()
        self.db.commit()
        self.db.refresh(sub)
        return sub

    def resume(self, id: int, organization_id: int) -> Subscription:
        sub = self.get_by_id(id, organization_id)
        sub.status = "active"
        sub.paused_at = None
        self.db.commit()
        self.db.refresh(sub)
        return sub

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
        plan_id: Optional[int] = None,
        status: Optional[str] = None,
        **filters: Any,
    ) -> Dict[str, Any]:
        if customer_id:
            filters["customer_id"] = customer_id
        if plan_id:
            filters["plan_id"] = plan_id
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
            search_fields=["subscription_number"],
            **filters,
        )


class SubscriptionEventRepository(BaseRepository[SubscriptionEvent]):
    def __init__(self, db):
        super().__init__(db, SubscriptionEvent)

    def list_by_subscription(
        self,
        organization_id: int,
        subscription_id: int,
        limit: int = 50,
    ) -> List[SubscriptionEvent]:
        query = self.db.query(SubscriptionEvent).filter(
            SubscriptionEvent.subscription_id == subscription_id,
        )
        query = self._org_filter(query, organization_id)
        return query.order_by(SubscriptionEvent.created_at.desc()).limit(limit).all()

    def log_event(
        self,
        organization_id: int,
        subscription_id: int,
        event_type: str,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        reason: Optional[str] = None,
        created_by: Optional[int] = None,
    ) -> SubscriptionEvent:
        event = SubscriptionEvent(
            organization_id=organization_id,
            subscription_id=subscription_id,
            event_type=event_type,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            created_by=created_by,
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event
