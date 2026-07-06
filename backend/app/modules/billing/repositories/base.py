"""
modules/billing/repositories/base.py
-------------------------------------
Generic base repository with common CRUD operations.
All billing repositories inherit from this class.
"""

from typing import Any, Dict, Generic, List, Optional, Sequence, Tuple, Type, TypeVar

from sqlalchemy import asc, desc, func, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
    NotFoundException,
)

ModelType = TypeVar("ModelType")


class BaseRepository(Generic[ModelType]):
    def __init__(self, db: Session, model: Type[ModelType]):
        self.db = db
        self.model = model

    # ── Helpers ──────────────────────────────────────────────────────────────

    @property
    def _has_organization_id(self) -> bool:
        return hasattr(self.model, "organization_id")

    @property
    def _has_is_active(self) -> bool:
        return hasattr(self.model, "is_active")

    @property
    def _has_deleted_at(self) -> bool:
        return hasattr(self.model, "deleted_at")

    @property
    def _has_created_by(self) -> bool:
        return hasattr(self.model, "created_by")

    def _org_filter(self, query, organization_id: int):
        if self._has_organization_id:
            return query.filter(self.model.organization_id == organization_id)
        return query

    def _active_filter(self, query, active_only: bool = True):
        if active_only and self._has_is_active:
            return query.filter(self.model.is_active == True)
        return query

    def _apply_filter(self, query, field: str, value: Any):
        """Apply a filter, supporting comma-separated values as IN clauses."""
        col = getattr(self.model, field, None)
        if col is None:
            return query
        if isinstance(value, str) and "," in value:
            parts = [v.strip() for v in value.split(",") if v.strip()]
            if parts:
                return query.filter(col.in_(parts))
        return query.filter(col == value)

    # ── Exists / Count ───────────────────────────────────────────────────────

    def exists(self, organization_id: int, **filters: Any) -> bool:
        query = self.db.query(self.model)
        query = self._org_filter(query, organization_id)
        for field, value in filters.items():
            query = self._apply_filter(query, field, value)
        return query.first() is not None

    def count(
        self,
        organization_id: int,
        active_only: bool = True,
        **filters: Any,
    ) -> int:
        query = self.db.query(func.count(self.model.id))
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        for field, value in filters.items():
            if value is not None:
                query = self._apply_filter(query, field, value)
        return query.scalar() or 0

    # ── Create ───────────────────────────────────────────────────────────────

    def create(self, organization_id: int, **data: Any) -> ModelType:
        if self._has_organization_id:
            obj = self.model(organization_id=organization_id, **data)
        else:
            obj = self.model(**data)
        self.db.add(obj)
        try:
            self.db.commit()
        except IntegrityError as e:
            self.db.rollback()
            raise AlreadyExistsException(self.model.__name__, str(e))
        self.db.refresh(obj)
        return obj

    def bulk_create(self, organization_id: int, items: List[Dict[str, Any]]) -> List[ModelType]:
        if self._has_organization_id:
            objs = [self.model(organization_id=organization_id, **item) for item in items]
        else:
            objs = [self.model(**item) for item in items]
        self.db.add_all(objs)
        try:
            self.db.commit()
        except IntegrityError as e:
            self.db.rollback()
            raise AlreadyExistsException(self.model.__name__, str(e))
        for obj in objs:
            self.db.refresh(obj)
        return objs

    # ── Read ─────────────────────────────────────────────────────────────────

    def get_by_id(self, id: int, organization_id: int) -> ModelType:
        query = self.db.query(self.model).filter(self.model.id == id)
        query = self._org_filter(query, organization_id)
        obj = query.first()
        if not obj:
            raise NotFoundException(self.model.__name__, id)
        return obj

    def get_by_ids(self, ids: List[int], organization_id: int) -> List[ModelType]:
        query = self.db.query(self.model).filter(self.model.id.in_(ids))
        query = self._org_filter(query, organization_id)
        return query.all()

    def get_first(self, organization_id: int, **filters: Any) -> Optional[ModelType]:
        query = self.db.query(self.model)
        query = self._org_filter(query, organization_id)
        for field, value in filters.items():
            query = self._apply_filter(query, field, value)
        return query.first()

    def list_all(
        self,
        organization_id: int,
        active_only: bool = True,
        **filters: Any,
    ) -> List[ModelType]:
        query = self.db.query(self.model)
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        for field, value in filters.items():
            if value is not None:
                query = self._apply_filter(query, field, value)
        return query.all()

    # ── Paginated List —───────────────────────────────────────────────────────

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
        **filters: Any,
    ) -> Dict[str, Any]:
        per_page = min(max(per_page, 1), 100)
        page = max(page, 1)

        base_query = self.db.query(self.model)
        base_query = self._org_filter(base_query, organization_id)
        base_query = self._active_filter(base_query, active_only)

        for field, value in filters.items():
            if value is not None:
                base_query = self._apply_filter(base_query, field, value)

        if search_term and search_fields:
            conditions = []
            for field in search_fields:
                conditions.append(
                    getattr(self.model, field).ilike(f"%{search_term}%")
                )
            base_query = base_query.filter(or_(*conditions))

        total = base_query.count()

        if sort_by and hasattr(self.model, sort_by):
            order_fn = asc if sort_order == "asc" else desc
            base_query = base_query.order_by(order_fn(getattr(self.model, sort_by)))

        items = (
            base_query.offset((page - 1) * per_page).limit(per_page).all()
        )

        return {
            "total": total,
            "page": page,
            "per_page": per_page,
            "pages": (total + per_page - 1) // per_page if total else 0,
            "items": items,
        }

    # ── Update ───────────────────────────────────────────────────────────────

    def update(self, id: int, organization_id: int, **data: Any) -> ModelType:
        obj = self.get_by_id(id, organization_id)
        for field, value in data.items():
            if hasattr(obj, field) and value is not None:
                setattr(obj, field, value)
        try:
            self.db.commit()
        except IntegrityError as e:
            self.db.rollback()
            raise AlreadyExistsException(self.model.__name__, str(e))
        self.db.refresh(obj)
        return obj

    def bulk_update(self, items: List[Dict[str, Any]]) -> List[ModelType]:
        updated = []
        for item in items:
            obj_id = item.pop("id", None)
            if not obj_id:
                continue
            obj = self.db.query(self.model).filter(self.model.id == obj_id).first()
            if not obj:
                continue
            for field, value in item.items():
                if hasattr(obj, field):
                    setattr(obj, field, value)
            updated.append(obj)
        try:
            self.db.commit()
        except IntegrityError as e:
            self.db.rollback()
            raise BadRequestException(f"Bulk update failed: {e}")
        for obj in updated:
            self.db.refresh(obj)
        return updated

    # ── Delete ───────────────────────────────────────────────────────────────

    def soft_delete(self, id: int, organization_id: int) -> ModelType:
        obj = self.get_by_id(id, organization_id)
        if self._has_is_active:
            obj.is_active = False
        if self._has_deleted_at:
            obj.deleted_at = func.now()
        self.db.commit()
        self.db.refresh(obj)
        return obj

    def hard_delete(self, id: int, organization_id: int) -> None:
        obj = self.get_by_id(id, organization_id)
        self.db.delete(obj)
        self.db.commit()

    def bulk_hard_delete(self, ids: List[int], organization_id: int) -> int:
        query = self.db.query(self.model).filter(self.model.id.in_(ids))
        query = self._org_filter(query, organization_id)
        deleted = query.delete(synchronize_session="fetch")
        self.db.commit()
        return deleted

    # ── Search ───────────────────────────────────────────────────────────────

    def search_by_name(
        self,
        organization_id: int,
        term: str,
        name_field: str = "name",
        active_only: bool = True,
        limit: int = 20,
    ) -> List[ModelType]:
        query = self.db.query(self.model)
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        query = query.filter(getattr(self.model, name_field).ilike(f"%{term}%"))
        return query.limit(limit).all()

    def search_by_status(
        self,
        organization_id: int,
        status_value: str,
        status_field: str = "status",
        active_only: bool = True,
    ) -> List[ModelType]:
        query = self.db.query(self.model)
        query = self._org_filter(query, organization_id)
        query = self._active_filter(query, active_only)
        query = self._apply_filter(query, status_field, status_value)
        return query.all()
