"""
test_pricing_flat_fee.py
-------------------------
Regression tests for BUG-003 (PricingPlan.flat_fee / PlanTier.flat_fee were
never applied by PriceResolver) and BUG-007 (QuotationItem did not persist
resolved_price_type, so QuoteService.recalculate_quote always assumed a
per-unit price and double-counted any lump-sum/graduated-total line the
moment a second item was added).
"""

from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.modules.hr.models import Organization
from app.modules.billing.models import (
    BillingCustomer as Customer,
    BillingPeriod,
    CustomerStatus,
    PlanTier,
    PricingModel,
    PricingPlan,
    Product,
)
from app.modules.billing.services.price_resolver import PriceResolver
from app.modules.billing.services.quote_service import QuoteService


@pytest.fixture(scope="function")
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def _make_org_product_plan(session):
    org = Organization(id=1, organization_name="Test Org FlatFee", organization_code="ORG-FF")
    session.add(org)
    session.flush()

    product = Product(
        organization_id=1, code="FF-PROD", name="FlatFee Product",
        default_price=Decimal("10.00"), currency="USD", is_active=True,
    )
    session.add(product)
    session.flush()

    plan = PricingPlan(
        organization_id=1, product_id=product.id, name="Volume FlatFee Plan",
        billing_period=BillingPeriod.MONTHLY, pricing_model=PricingModel.VOLUME,
        flat_fee=Decimal("25.00"), effective_from=date(2026, 1, 1), is_active=True,
    )
    session.add(plan)
    session.flush()

    tier = PlanTier(
        organization_id=1, pricing_plan_id=plan.id,
        from_quantity=1, to_quantity=100,
        unit_price=Decimal("10.00"), flat_fee=Decimal("50.00"),
    )
    session.add(tier)
    session.flush()

    return org, product, plan, tier


def _make_customer(session):
    customer = Customer(
        organization_id=1, customer_code="FF-CUST", company_name="FlatFee Co",
        display_name="FlatFee Co", email="flatfee@example.com", currency="USD",
        status=CustomerStatus.ACTIVE,
    )
    session.add(customer)
    session.flush()
    return customer


def test_price_resolver_applies_tier_and_plan_flat_fee(db_session):
    """BUG-003: resolved_price must include tier.flat_fee + plan.flat_fee, not just unit_price * qty."""
    _, product, plan, _ = _make_org_product_plan(db_session)

    resolver = PriceResolver(db_session)
    result = resolver.resolve(
        organization_id=1, product_id=product.id, pricing_plan_id=plan.id,
        quantity=Decimal("5"),
    )

    # 5 * 10 (tier unit_price) + 50 (tier flat_fee) + 25 (plan flat_fee) = 125
    assert result.resolved_price == Decimal("125")
    assert result.resolved_price_type == "lump_sum"


def test_price_resolver_zero_flat_fee_unchanged(db_session):
    """Backward compatibility: a plan/tier with flat_fee=0 (the default) behaves exactly as before."""
    org = Organization(id=1, organization_name="Test Org FlatFee", organization_code="ORG-FF")
    db_session.add(org)
    db_session.flush()
    product = Product(
        organization_id=1, code="FF-PROD-0", name="ZeroFee Product",
        default_price=Decimal("10.00"), currency="USD", is_active=True,
    )
    db_session.add(product)
    db_session.flush()
    plan = PricingPlan(
        organization_id=1, product_id=product.id, name="Volume ZeroFee Plan",
        billing_period=BillingPeriod.MONTHLY, pricing_model=PricingModel.VOLUME,
        effective_from=date(2026, 1, 1), is_active=True,
    )
    db_session.add(plan)
    db_session.flush()
    tier = PlanTier(
        organization_id=1, pricing_plan_id=plan.id,
        from_quantity=1, to_quantity=100, unit_price=Decimal("10.00"),
    )
    db_session.add(tier)
    db_session.flush()

    resolver = PriceResolver(db_session)
    result = resolver.resolve(
        organization_id=1, product_id=product.id, pricing_plan_id=plan.id,
        quantity=Decimal("5"),
    )
    assert result.resolved_price == Decimal("10")
    assert result.resolved_price_type == "unit"


def test_quote_item_flat_fee_survives_recalculation(db_session):
    """BUG-007: adding a second item (which triggers recalculate_quote) must not
    corrupt an already-added flat_fee line by re-multiplying its lump-sum total."""
    _, product, plan, _ = _make_org_product_plan(db_session)
    customer = _make_customer(db_session)

    svc = QuoteService(db_session)
    quote = svc.create_quote(
        organization_id=1, created_by=None, customer_id=customer.id,
        quote_number="Q-FF-001", currency="USD",
        valid_until=date(2026, 2, 1),
    )

    item1 = svc.add_item(
        quote.id, 1, product_id=product.id, pricing_plan_id=plan.id,
        quantity=Decimal("5"), unit_price=Decimal("10"),
        line_number=1, description="flat fee item",
    )
    assert item1.unit_price == Decimal("125.0000")
    assert item1.total_amount == Decimal("125.00")
    assert item1.resolved_price_type == "lump_sum"

    # Adding a second, unrelated plain-priced item forces recalculate_quote to
    # run again — item1 must remain exactly 125.00, not double to 625.00.
    svc.add_item(
        quote.id, 1, quantity=Decimal("1"), unit_price=Decimal("30"),
        line_number=2, description="plain item",
    )

    item1_reloaded = svc.item_repo.get_by_id(item1.id, 1)
    assert item1_reloaded.total_amount == Decimal("125.00")
    assert item1_reloaded.unit_price == Decimal("125.0000")
