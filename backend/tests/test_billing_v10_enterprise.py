"""
test_billing_v10_enterprise.py
-------------------------------
Unit tests for Zoiko Billing V10.0 Enterprise Business Logic & Workflow Hardening.
Tests ExpiryEngine, feature flags, data integrity constraints, summary aggregate KPIs,
renew eligibility rules, and invoice generation rules.
"""

from datetime import date, timedelta
from decimal import Decimal
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base
from app.modules.billing.models import (
    BillingCustomer as Customer,
    BillingSubscriptionStatus,
    Contract,
    ContractStatus,
    CustomerStatus,
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentStatus,
    Subscription,
    SubscriptionPlan,
    BillingPeriod,
)
from app.modules.billing.services.contract_service import ContractService
from app.modules.billing.services.expiry_service import ExpiryEngine
from app.modules.billing.services.subscription_service import SubscriptionService


@pytest.fixture(scope="module")
def db_engine():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    Session = sessionmaker(bind=connection)
    session = Session()

    yield session

    session.close()
    transaction.rollback()
    connection.close()


from app.modules.hr.models import Organization


def create_test_org(session):
    org = session.query(Organization).filter(Organization.id == 1).first()
    if not org:
        org = Organization(id=1, organization_name="Test Org V10", organization_code="ORG-V10")
        session.add(org)
        session.flush()
    return org


def create_test_customer(session, org_id=1):
    create_test_org(session)
    c = Customer(
        organization_id=org_id,
        customer_code="CUST-V10",
        company_name="Test Corp V10",
        display_name="Test Corp V10",
        email="v10@example.com",
        currency="USD",
        status=CustomerStatus.ACTIVE,
        created_by=1,
    )
    session.add(c)
    session.flush()
    return c


def create_test_plan(session, org_id=1):
    from app.modules.billing.models import PlanCategory
    p = SubscriptionPlan(
        organization_id=org_id,
        plan_code="ENT-PLAN",
        plan_name="Enterprise Plan",
        category=PlanCategory.SUBSCRIPTION,
        billing_period=BillingPeriod.MONTHLY,
        unit_price=Decimal("100.00"),
        is_active=True,
    )
    session.add(p)
    session.flush()
    return p


# ── Feature Flag & Expiry Engine Tests ──────────────────────────────────────────

def test_expiry_engine_feature_flag(db_session):
    engine = ExpiryEngine(db_session)
    assert engine.is_enabled() is True

    # Disable flag
    settings.BILLING_AUTO_EXPIRY_ENABLED = False
    assert engine.is_enabled() is False
    assert engine.process_expired_contracts() == 0
    assert engine.process_expired_subscriptions() == 0

    # Re-enable
    settings.BILLING_AUTO_EXPIRY_ENABLED = True
    assert engine.is_enabled() is True


def test_expiry_engine_contract_expiry_and_integrity(db_session):
    settings.BILLING_AUTO_EXPIRY_ENABLED = True
    cust = create_test_customer(db_session)
    today = date.today()
    past = today - timedelta(days=10)
    future = today + timedelta(days=10)

    # 1. Past active contract -> should expire
    c1 = Contract(
        organization_id=1, customer_id=cust.id, contract_number="CNT-PAST", contract_name="Past Contract",
        status=ContractStatus.ACTIVE, start_date=past - timedelta(days=30), end_date=past,
        value=Decimal("1000.00"), currency="USD", is_active=True, created_by=1,
    )
    # 2. Future active contract -> should stay ACTIVE
    c2 = Contract(
        organization_id=1, customer_id=cust.id, contract_number="CNT-FUTURE", contract_name="Future Contract",
        status=ContractStatus.ACTIVE, start_date=today, end_date=future,
        value=Decimal("2000.00"), currency="USD", is_active=True, created_by=1,
    )
    # 3. Terminated contract with past end_date -> should stay TERMINATED
    c3 = Contract(
        organization_id=1, customer_id=cust.id, contract_number="CNT-TERM", contract_name="Term Contract",
        status=ContractStatus.TERMINATED, start_date=past - timedelta(days=30), end_date=past,
        value=Decimal("3000.00"), currency="USD", is_active=True, created_by=1,
    )
    db_session.add_all([c1, c2, c3])
    db_session.flush()

    expiry_engine = ExpiryEngine(db_session)
    expired_count = expiry_engine.process_expired_contracts(organization_id=1)

    assert expired_count == 1
    assert c1.status == ContractStatus.EXPIRED
    assert c2.status == ContractStatus.ACTIVE
    assert c3.status == ContractStatus.TERMINATED  # Data Integrity: Terminated never converted!


def test_expiry_engine_subscription_expiry_and_integrity(db_session):
    settings.BILLING_AUTO_EXPIRY_ENABLED = True
    cust = create_test_customer(db_session)
    plan = create_test_plan(db_session)
    today = date.today()
    past = today - timedelta(days=5)

    s1 = Subscription(
        organization_id=1, customer_id=cust.id, plan_id=plan.id, subscription_number="SUB-PAST",
        status=BillingSubscriptionStatus.ACTIVE,
        start_date=past - timedelta(days=30), current_term_start=past - timedelta(days=30), current_term_end=past,
        unit_price=Decimal("100.00"), quantity=1, currency="USD", is_active=True, created_by=1,
    )
    s2 = Subscription(
        organization_id=1, customer_id=cust.id, plan_id=plan.id, subscription_number="SUB-CANCELLED",
        status=BillingSubscriptionStatus.CANCELLED,
        start_date=past - timedelta(days=30), current_term_start=past - timedelta(days=30), current_term_end=past,
        unit_price=Decimal("100.00"), quantity=1, currency="USD", is_active=True, created_by=1,
    )
    db_session.add_all([s1, s2])
    db_session.flush()

    expiry_engine = ExpiryEngine(db_session)
    expired_count = expiry_engine.process_expired_subscriptions(organization_id=1)

    assert expired_count == 1
    assert s1.status == BillingSubscriptionStatus.EXPIRED
    assert s2.status == BillingSubscriptionStatus.CANCELLED  # Data Integrity: Cancelled never converted!


# ── Summary Aggregate KPI Tests ──────────────────────────────────────────────────

def test_contract_summary_aggregate_kpis(db_session):
    cust = create_test_customer(db_session)
    today = date.today()
    svc = ContractService(db_session)

    c1 = Contract(
        organization_id=1, customer_id=cust.id, contract_number="SUM-CNT-1", contract_name="Sum Contract 1",
        status=ContractStatus.ACTIVE, start_date=today, end_date=today + timedelta(days=20),
        billing_period="monthly", value=Decimal("1200.00"), currency="USD", is_active=True, created_by=1,
    )
    c2 = Contract(
        organization_id=1, customer_id=cust.id, contract_number="SUM-CNT-2", contract_name="Sum Contract 2",
        status=ContractStatus.EXPIRED, start_date=today - timedelta(days=60), end_date=today - timedelta(days=5),
        billing_period="annual", value=Decimal("2400.00"), currency="USD", is_active=True, created_by=1,
    )
    db_session.add_all([c1, c2])
    db_session.flush()

    summary = svc.get_contract_summary(organization_id=1)
    assert summary["total"] == 2
    assert summary["active_count"] == 1
    assert summary["expired_count"] == 1
    assert summary["expiring_count"] == 1  # end_date in 20 days
    assert summary["mrr"] == 1200.00
    assert summary["arr"] == 14400.00


def test_subscription_summary_aggregate_kpis(db_session):
    cust = create_test_customer(db_session)
    plan = create_test_plan(db_session)
    today = date.today()
    svc = SubscriptionService(db_session)

    s1 = Subscription(
        organization_id=1, customer_id=cust.id, plan_id=plan.id, subscription_number="SUM-SUB-1",
        status=BillingSubscriptionStatus.ACTIVE,
        start_date=today, current_term_start=today, current_term_end=today + timedelta(days=15),
        unit_price=Decimal("150.00"), quantity=2, currency="USD", is_active=True, created_by=1,
    )
    db_session.add(s1)
    db_session.flush()

    summary = svc.get_subscription_summary(organization_id=1)
    assert summary["total"] == 1
    assert summary["active_count"] == 1
    assert summary["mrr"] == 300.00  # 150 * 2
    assert summary["arr"] == 3600.00


# ── Renew Eligibility Tests ──────────────────────────────────────────────────────

def test_renew_eligibility_contract(db_session):
    cust = create_test_customer(db_session)
    today = date.today()
    svc = ContractService(db_session)

    c_active = Contract(
        organization_id=1, customer_id=cust.id, contract_number="REN-ACTIVE", contract_name="Renew Active Contract",
        status=ContractStatus.ACTIVE, start_date=today, end_date=today + timedelta(days=10),
        value=Decimal("500.00"), currency="USD", auto_renew=True, renewal_term_days=30, is_active=True, created_by=1,
    )
    c_draft = Contract(
        organization_id=1, customer_id=cust.id, contract_number="REN-DRAFT", contract_name="Renew Draft Contract",
        status=ContractStatus.DRAFT, start_date=today, value=Decimal("500.00"), currency="USD", is_active=True, created_by=1,
    )
    db_session.add_all([c_active, c_draft])
    db_session.flush()

    # Renew active -> succeeds
    renewed = svc.renew_contract(c_active.id, organization_id=1, updated_by=1)
    assert renewed.status == ContractStatus.ACTIVE

    # Renew draft -> raises BadRequestException
    with pytest.raises(Exception):
        svc.renew_contract(c_draft.id, organization_id=1, updated_by=1)
