from typing import Any, Dict, Optional, List

from app.modules.billing.models import BillingSetting, BillingConfiguration
from app.modules.billing.repositories.base import BaseRepository


class BillingConfigurationRepository(BaseRepository[BillingConfiguration]):
    def __init__(self, db):
        super().__init__(db, BillingConfiguration)

    def get_by_organization(self, organization_id: int) -> Optional[BillingConfiguration]:
        return self.db.query(BillingConfiguration).filter(
            BillingConfiguration.organization_id == organization_id,
        ).first()

    def upsert(self, organization_id: int, updated_by: Optional[int] = None, **data: Any) -> BillingConfiguration:
        existing = self.get_by_organization(organization_id)
        if existing:
            for field, value in data.items():
                if hasattr(existing, field):
                    setattr(existing, field, value)
            if updated_by is not None:
                existing.updated_by = updated_by
            self.db.commit()
            self.db.refresh(existing)
            return existing
        config = self.create(
            organization_id,
            created_by=updated_by,
            updated_by=updated_by,
            **data,
        )
        return config

    def reset_to_defaults(self, organization_id: int, updated_by: Optional[int] = None, **defaults: Any) -> BillingConfiguration:
        existing = self.get_by_organization(organization_id)
        if existing:
            self.db.delete(existing)
            self.db.flush()
        data = dict(defaults)
        if updated_by is not None:
            data["updated_by"] = updated_by
        config = self.create(organization_id, **data)
        return config

    def validate(self, organization_id: int) -> Dict[str, Any]:
        config = self.get_by_organization(organization_id)
        if not config:
            return {"valid": False, "errors": ["No configuration found"]}
        errors = []
        if not config.default_currency:
            errors.append("default_currency is required")
        if not config.invoice_prefix:
            errors.append("invoice_prefix is required")
        if not config.quote_prefix:
            errors.append("quote_prefix is required")
        if config.default_due_days is None or config.default_due_days < 0 or config.default_due_days > 365:
            errors.append("default_due_days must be between 0 and 365")
        if config.late_payment_fee_percentage is not None and (config.late_payment_fee_percentage < 0 or config.late_payment_fee_percentage > 100):
            errors.append("late_payment_fee_percentage must be between 0 and 100")
        if config.dunning_level_count is not None and (config.dunning_level_count < 1 or config.dunning_level_count > 10):
            errors.append("dunning_level_count must be between 1 and 10")
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "field_count": len([c for c in BillingConfiguration.__table__.columns if hasattr(config, c.name)]),
        }


class BillingSettingRepository(BaseRepository[BillingSetting]):
    def __init__(self, db):
        super().__init__(db, BillingSetting)

    def get_by_organization(self, organization_id: int) -> Optional[BillingSetting]:
        return self.db.query(BillingSetting).filter(
            BillingSetting.organization_id == organization_id,
        ).first()

    def upsert(self, organization_id: int, **data: Any) -> BillingSetting:
        existing = self.get_by_organization(organization_id)
        if existing:
            for field, value in data.items():
                if hasattr(existing, field) and value is not None:
                    setattr(existing, field, value)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        return self.create(organization_id, **data)

    def list_paginated(
        self,
        organization_id: int,
        page: int = 1,
        per_page: int = 20,
        sort_by: Optional[str] = None,
        sort_order: str = "asc",
        **filters: Any,
    ) -> Dict[str, Any]:
        return super().list_paginated(
            organization_id=organization_id,
            page=page,
            per_page=per_page,
            sort_by=sort_by or "created_at",
            sort_order=sort_order,
            active_only=False,
            search_fields=["billing_email", "billing_phone"],
            **filters,
        )
