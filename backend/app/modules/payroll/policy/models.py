from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Text, Boolean, JSON, ForeignKey, UniqueConstraint, Index,
)
from sqlalchemy.sql import func
from app.database import Base


class PayrollPolicy(Base):
    __tablename__ = "payroll_policies"

    id                = Column(Integer, primary_key=True, index=True)
    organization_id   = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)
    name              = Column(String(120), nullable=False)
    description       = Column(Text, nullable=True)
    status            = Column(String(20), nullable=False, server_default="active")
    effective_date    = Column(Date, nullable=False)
    is_default        = Column(Boolean, nullable=False, server_default="false")
    calculation_mode  = Column(String(20), nullable=False, server_default="standard")
    created_at        = Column(DateTime(timezone=True), server_default=func.now())
    updated_at        = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_payroll_policies_org_status", "organization_id", "status"),
        UniqueConstraint("organization_id", "is_default", name="uq_one_default_per_org"),
    )


class PayrollPolicyEmployeeCategory(Base):
    __tablename__ = "payroll_policy_employee_categories"

    id                   = Column(Integer, primary_key=True, index=True)
    policy_id            = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)
    category             = Column(String(20), nullable=False)
    working_days         = Column(Integer, nullable=False, server_default="5")
    weekly_off           = Column(JSON, nullable=True)
    expected_hours       = Column(Integer, nullable=False, server_default="8")
    minimum_hours        = Column(Integer, nullable=False, server_default="4")
    paid_leave_eligible  = Column(Boolean, nullable=False, server_default="true")
    grace_time_minutes   = Column(Integer, nullable=False, server_default="10")
    half_day_rule        = Column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("policy_id", "category", name="uq_policy_category"),
    )


class PayrollPolicyLeaveRule(Base):
    __tablename__ = "payroll_policy_leave_rules"

    id         = Column(Integer, primary_key=True, index=True)
    policy_id  = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)
    rule_type  = Column(String(20), nullable=False)
    config     = Column(JSON, nullable=True)

    __table_args__ = (
        UniqueConstraint("policy_id", "rule_type", name="uq_policy_leave_rule_type"),
    )


class PayrollPolicyOvertimeRule(Base):
    __tablename__ = "payroll_policy_overtime_rules"

    id                        = Column(Integer, primary_key=True, index=True)
    policy_id                 = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, unique=True, index=True)
    enabled                   = Column(Boolean, nullable=False, server_default="false")
    minimum_overtime_minutes  = Column(Integer, nullable=False, server_default="30")
    approval_required         = Column(Boolean, nullable=False, server_default="true")


class PayrollPolicyIntegration(Base):
    __tablename__ = "payroll_policy_integrations"

    id            = Column(Integer, primary_key=True, index=True)
    policy_id     = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)
    category      = Column(String(20), nullable=False)
    provider_key  = Column(String(50), nullable=False)
    enabled       = Column(Boolean, nullable=False, server_default="false")

    __table_args__ = (
        UniqueConstraint("policy_id", "category", "provider_key", name="uq_policy_integration"),
    )


class PayrollPolicyFeatureFlag(Base):
    __tablename__ = "payroll_policy_feature_flags"

    id        = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)
    flag_key  = Column(String(40), nullable=False)
    enabled   = Column(Boolean, nullable=False, server_default="false")

    __table_args__ = (
        UniqueConstraint("policy_id", "flag_key", name="uq_policy_feature_flag"),
    )
