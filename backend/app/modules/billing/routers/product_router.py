"""
modules/billing/routers/product_router.py
-----------------------------------------
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import ProductService
from app.modules.billing.schemas import (
    ProductCategoryCreate,
    ProductCategoryUpdate,
    ProductCategoryResponse,
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/products", tags=["🧾 Products"])


@router.post(
    "/categories",
    response_model=ProductCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product category",
    dependencies=[Depends(get_current_org_admin)],
)
def create_category(
    data: ProductCategoryCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.create_category(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.get(
    "/categories",
    response_model=list[ProductCategoryResponse],
    summary="List root product categories",
)
def list_root_categories(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.list_root_categories(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/categories/{category_id}",
    response_model=ProductCategoryResponse,
    summary="Get a product category",
)
def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.get_category(
        category_id=category_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/categories/{category_id}",
    response_model=ProductCategoryResponse,
    summary="Update a product category",
    dependencies=[Depends(get_current_org_admin)],
)
def update_category(
    category_id: int,
    data: ProductCategoryUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.update_category(
        category_id=category_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.delete(
    "/categories/{category_id}",
    response_model=SuccessResponse,
    summary="Delete a product category",
    dependencies=[Depends(get_current_org_admin)],
)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    svc.delete_category(
        category_id=category_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )
    return SuccessResponse(message="Category deleted successfully")


@router.get(
    "/categories/{parent_id}/children",
    response_model=list[ProductCategoryResponse],
    summary="List child categories",
)
def list_child_categories(
    parent_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.list_child_categories(
        organization_id=current_user.organization_id,
        parent_id=parent_id,
    )


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a product",
    dependencies=[Depends(get_current_org_admin)],
)
def create_product(
    data: ProductCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.create_product(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.get(
    "",
    response_model=ProductListResponse,
    summary="List products",
)
def list_products(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    product_type: Optional[str] = Query(None),
):
    svc = ProductService(db)
    return svc.list_products(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        category_id=category_id,
        product_type=product_type,
    )


@router.get(
    "/subscribable",
    response_model=list[ProductResponse],
    summary="List subscribable products",
)
def list_subscribable(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.list_subscribable(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/usage-billable",
    response_model=list[ProductResponse],
    summary="List usage-billable products",
)
def list_usage_billable(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.list_usage_billable(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Get a product",
)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.get_product(
        product_id=product_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/{product_id}",
    response_model=ProductResponse,
    summary="Update a product",
    dependencies=[Depends(get_current_org_admin)],
)
def update_product(
    product_id: int,
    data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    return svc.update_product(
        product_id=product_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.delete(
    "/{product_id}",
    response_model=SuccessResponse,
    summary="Delete a product",
    dependencies=[Depends(get_current_org_admin)],
)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ProductService(db)
    svc.delete_product(
        product_id=product_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )
    return SuccessResponse(message="Product deleted successfully")
