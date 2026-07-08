import logging
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import AlreadyExistsException, BadRequestException
from app.modules.billing.models import BillingAuditAction, Product, ProductCategory
from app.modules.billing.repositories.catalog import (
    ProductCategoryRepository,
    ProductRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import filter_allowed

PRODUCT_ALLOWED_FIELDS = {
    "name", "code", "description", "category_id",
    "default_price", "currency", "product_type",
    "is_subscribable", "is_usage_billable", "is_active",
    "cost_price", "unit_label", "tax_percentage", "tax_inclusive",
}
CATEGORY_ALLOWED_FIELDS = {
    "name", "code", "description", "parent_id",
    "sort_order", "is_active",
}

logger = logging.getLogger("zoiko")


class ProductService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ProductRepository(db)
        self.cat_repo = ProductCategoryRepository(db)
        self.audit = BillingAuditService(db)

    def create_product(self, organization_id: int, created_by: int, **data: Any) -> Product:
        data = filter_allowed(data, PRODUCT_ALLOWED_FIELDS)
        if self.repo.exists(organization_id, code=data.get("code")):
            raise AlreadyExistsException("Product", "code")
        if data.get("category_id"):
            self.cat_repo.get_by_id(data["category_id"], organization_id)
        product = self.repo.create(organization_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Product", product.id, new_values=data)
        return product

    def update_product(self, product_id: int, organization_id: int, updated_by: int, **data: Any) -> Product:
        data = filter_allowed(data, PRODUCT_ALLOWED_FIELDS)
        product = self.repo.get_by_id(product_id, organization_id)
        if data.get("code") and data["code"] != product.code:
            if self.repo.exists(organization_id, code=data["code"]):
                raise AlreadyExistsException("Product", "code")
        if data.get("category_id") and data["category_id"] != product.category_id:
            self.cat_repo.get_by_id(data["category_id"], organization_id)
        updated = self.repo.update(product_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Product", product_id, new_values=data)
        return updated

    def get_product(self, product_id: int, organization_id: int) -> Product:
        return self.repo.get_by_id(product_id, organization_id)

    def get_product_by_code(self, organization_id: int, code: str) -> Optional[Product]:
        return self.repo.get_by_code(organization_id, code)

    def list_products(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, category_id: Optional[int] = None,
        product_type: Optional[str] = None, status: Optional[str] = None,
        sort_by: str = "name", sort_order: str = "asc", active_only: bool = True,
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order, active_only=active_only,
            search_term=search_term, category_id=category_id, product_type=product_type,
            status=status,
        )

    def list_subscribable(self, organization_id: int) -> List[Product]:
        return self.repo.list_subscribable(organization_id)

    def list_usage_billable(self, organization_id: int) -> List[Product]:
        return self.repo.list_usage_billable(organization_id)

    def delete_product(self, product_id: int, organization_id: int, updated_by: int) -> None:
        self.repo.soft_delete(product_id, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "Product", product_id)

    # ── Categories ──────────────────────────────────────────────────────

    def create_category(self, organization_id: int, created_by: int, **data: Any) -> ProductCategory:
        data = filter_allowed(data, CATEGORY_ALLOWED_FIELDS)
        if self.cat_repo.exists(organization_id, code=data.get("code")):
            raise AlreadyExistsException("ProductCategory", "code")
        if data.get("parent_id"):
            self.cat_repo.get_by_id(data["parent_id"], organization_id)
        cat = self.cat_repo.create(organization_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "ProductCategory", cat.id)
        return cat

    def update_category(self, category_id: int, organization_id: int, updated_by: int, **data: Any) -> ProductCategory:
        data = filter_allowed(data, CATEGORY_ALLOWED_FIELDS)
        cat = self.cat_repo.get_by_id(category_id, organization_id)
        if data.get("code") and data["code"] != cat.code:
            if self.cat_repo.exists(organization_id, code=data["code"]):
                raise AlreadyExistsException("ProductCategory", "code")
        updated = self.cat_repo.update(category_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "ProductCategory", category_id)
        return updated

    def get_category(self, category_id: int, organization_id: int) -> ProductCategory:
        return self.cat_repo.get_by_id(category_id, organization_id)

    def list_root_categories(self, organization_id: int) -> List[ProductCategory]:
        return self.cat_repo.list_root(organization_id)

    def list_child_categories(self, organization_id: int, parent_id: int) -> List[ProductCategory]:
        self.cat_repo.get_by_id(parent_id, organization_id)
        return self.cat_repo.list_children(organization_id, parent_id)

    def delete_category(self, category_id: int, organization_id: int, updated_by: int) -> None:
        children = self.cat_repo.list_children(organization_id, category_id)
        if children:
            raise BadRequestException("Cannot delete category with child categories")
        products = self.repo.list_by_category(organization_id, category_id)
        if products:
            raise BadRequestException("Cannot delete category with associated products")
        self.cat_repo.soft_delete(category_id, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "ProductCategory", category_id)
