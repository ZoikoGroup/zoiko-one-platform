import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.modules.billing.models import BillingAuditAction, BillingAuditLog
from app.modules.billing.repositories.audit import BillingAuditLogRepository

logger = logging.getLogger("zoiko")


class BillingAuditService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = BillingAuditLogRepository(db)

    def log(
        self, organization_id: int, actor_id: Optional[int],
        action: BillingAuditAction, entity_type: str, entity_id: int,
        old_values: Optional[Dict[str, Any]] = None,
        new_values: Optional[Dict[str, Any]] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
    ) -> BillingAuditLog:
        return self.repo.create(
            organization_id,
            actor_id=actor_id, action=action,
            entity_type=entity_type, entity_id=entity_id,
            old_values=old_values, new_values=new_values,
            changes=changes, ip_address=ip_address,
            user_agent=user_agent, request_id=request_id,
        )

    def list_by_entity(
        self, organization_id: int, entity_type: str, entity_id: int, limit: int = 100,
    ) -> List[BillingAuditLog]:
        return self.repo.list_by_entity(organization_id, entity_type, entity_id, limit)

    def list_by_action(
        self, organization_id: int, action: str, limit: int = 100,
    ) -> List[BillingAuditLog]:
        return self.repo.list_by_action(organization_id, action, limit)

    def list_by_actor(
        self, organization_id: int, actor_id: int, limit: int = 100,
    ) -> List[BillingAuditLog]:
        return self.repo.list_by_actor(organization_id, actor_id, limit)

    def list_logs(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        entity_type: Optional[str] = None, entity_id: Optional[int] = None,
        action: Optional[str] = None, actor_id: Optional[int] = None,
        sort_by: str = "timestamp", sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            entity_type=entity_type, entity_id=entity_id,
            action=action, actor_id=actor_id,
        )
