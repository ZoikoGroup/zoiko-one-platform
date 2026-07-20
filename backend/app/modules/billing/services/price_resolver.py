"""
modules/billing/services/price_resolver.py
-------------------------------------------
Deterministic price resolution service.

Single backend boundary for resolving the authoritative unit_price
and provenance metadata for any billing line item.

Responsibilities:
  - Load Product, snapshot Product.default_price
  - If an explicit valid PricingPlan is supplied, resolve via that plan
  - Return provenance metadata: base_price, resolved_price, pricing_plan_id, price_source

NOT responsible for:
  - Tax calculation
  - Discount calculation
  - Currency conversion
  - Invoice total calculation
"""

import logging
from decimal import Decimal
from dataclasses import dataclass
from typing import Optional

from sqlalchemy.orm import Session

from app.core.exceptions import BadRequestException, NotFoundException
from app.modules.billing.models import PriceSource, PricingPlan, Product

logger = logging.getLogger("zoiko")


@dataclass
class PriceResolution:
    """Result of a price resolution."""
    base_price: Decimal
    resolved_price: Decimal
    pricing_plan_id: Optional[int]
    price_source: str


class PriceResolver:
    """
    Resolves the authoritative unit_price for a billing line item.

    Resolution precedence:
      1. Load Product within organization/tenant scope
      2. Snapshot Product.default_price as base_price
      3. If an EXPLICIT valid PricingPlan is supplied:
         - Validate plan belongs to product and organization
         - Use plan.unit_price as resolved_price
         - price_source = PRICING_PLAN
      4. If no plan is supplied:
         - resolved_price = base_price
         - price_source = CATALOG
    """

    def __init__(self, db: Session):
        self.db = db

    def resolve(
        self,
        organization_id: int,
        product_id: int,
        pricing_plan_id: Optional[int] = None,
    ) -> PriceResolution:
        """
        Resolve price for a line item.

        Args:
            organization_id: Tenant/organization scope
            product_id: The product being priced
            pricing_plan_id: Optional explicit pricing plan

        Returns:
            PriceResolution with base_price, resolved_price, pricing_plan_id, price_source

        Raises:
            NotFoundException: If product not found
            BadRequestException: If plan not found, not active, or mismatched
        """
        product = self._load_product(organization_id, product_id)
        base_price = Decimal(str(product.default_price or 0))

        if pricing_plan_id is not None:
            return self._resolve_with_plan(
                organization_id, product, base_price, pricing_plan_id
            )

        return PriceResolution(
            base_price=base_price,
            resolved_price=base_price,
            pricing_plan_id=None,
            price_source=PriceSource.CATALOG.value,
        )

    def _load_product(self, organization_id: int, product_id: int) -> Product:
        """Load and validate product within tenant scope."""
        product = (
            self.db.query(Product)
            .filter(
                Product.id == product_id,
                Product.organization_id == organization_id,
                Product.is_active == True,
            )
            .first()
        )
        if not product:
            raise NotFoundException("Product", product_id)
        return product

    def _resolve_with_plan(
        self,
        organization_id: int,
        product: Product,
        base_price: Decimal,
        pricing_plan_id: int,
    ) -> PriceResolution:
        """Resolve price using an explicit pricing plan."""
        plan = (
            self.db.query(PricingPlan)
            .filter(
                PricingPlan.id == pricing_plan_id,
                PricingPlan.organization_id == organization_id,
                PricingPlan.is_active == True,
            )
            .first()
        )
        if not plan:
            raise NotFoundException("PricingPlan", pricing_plan_id)

        if plan.product_id != product.id:
            raise BadRequestException(
                f"PricingPlan {pricing_plan_id} does not belong to Product {product.id}"
            )

        if plan.unit_price is None:
            logger.warning(
                "PricingPlan %d has NULL unit_price, falling back to Product base price",
                pricing_plan_id,
            )
            return PriceResolution(
                base_price=base_price,
                resolved_price=base_price,
                pricing_plan_id=pricing_plan_id,
                price_source=PriceSource.CATALOG.value,
            )

        resolved_price = Decimal(str(plan.unit_price))

        return PriceResolution(
            base_price=base_price,
            resolved_price=resolved_price,
            pricing_plan_id=pricing_plan_id,
            price_source=PriceSource.PRICING_PLAN.value,
        )


def resolve_from_context(
    db: Session,
    organization_id: int,
    product_id: Optional[int],
    pricing_plan_id: Optional[int] = None,
    unit_price: Optional[Decimal] = None,
    existing_base_price: Optional[Decimal] = None,
    existing_resolved_price: Optional[Decimal] = None,
    existing_price_source: Optional[str] = None,
) -> dict:
    """
    Convenience function: resolve price or preserve existing provenance.

    Used by services when adding items. Behavior:
      - If product_id is provided and no existing provenance: resolve from catalog/plan
      - If existing provenance is already set: preserve it
      - If unit_price is provided but no product_id: use unit_price as-is, no provenance

    Returns dict with keys: base_price, resolved_price, pricing_plan_id, price_source
    """
    if existing_price_source is not None:
        return {
            "base_price": existing_base_price,
            "resolved_price": existing_resolved_price,
            "pricing_plan_id": pricing_plan_id,
            "price_source": existing_price_source,
        }

    if product_id is not None:
        resolver = PriceResolver(db)
        result = resolver.resolve(
            organization_id=organization_id,
            product_id=product_id,
            pricing_plan_id=pricing_plan_id,
        )
        return {
            "base_price": result.base_price,
            "resolved_price": result.resolved_price,
            "pricing_plan_id": result.pricing_plan_id,
            "price_source": result.price_source,
        }

    return {
        "base_price": None,
        "resolved_price": None,
        "pricing_plan_id": None,
        "price_source": None,
    }
