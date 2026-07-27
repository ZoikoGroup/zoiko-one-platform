"""
modules/payroll/policy/models.py
---------------------------------
SQLAlchemy ORM models for Payroll Policy Management.

This is an ADDITIVE submodule — it does not modify any table in
app/modules/payroll/models.py. Every table here is new and org-scoped.

Tables:
  - PayrollPolicy                     -> one row per named policy per org
  - PolicyEmployeeCategory             -> per-category rules (Full Time, Part Time, Intern, ...)
  - PolicyLeaveRule                    -> per policy leave-type config
  - PolicyOvertimeRule                 -> per policy overtime config
  - PolicyIntegration                  -> per policy provider enable/disable
  - PolicyFeatureFlag                  -> per policy feature toggles

If no PayrollPolicy row exists for an organization, the payroll engine falls
back to today's exact behavior (see service.py dispatch in Step 3) — this
submodule is safe to deploy with zero behavior change until an org is
explicitly switched onto a non-default policy.
"""

import enum
from sqlalchemy import (
    Column, Integer, String, Date, DateTime, Boolean,
    ForeignKey, Text, UniqueConstraint, Index, JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class CalculationMode(str, enum.Enum):
    SIMPLE     = "simple"       # Frontend label: "Simple Payroll"
    STANDARD   = "standard"     # Frontend label: "Standard Payroll" (today's engine)
    ENTERPRISE = "enterprise"   # Frontend label: "Enterprise Payroll"


class EmployeeCategoryType(str, enum.Enum):
    FULL_TIME  = "full_time"
    PART_TIME  = "part_time"
    INTERN     = "intern"
    CONTRACT   = "contract"
    CONSULTANT = "consultant"
    FREELANCER = "freelancer"


class IntegrationCategory(str, enum.Enum):
    ATTENDANCE    = "attendance"
    BANKING       = "banking"
    ACCOUNTING    = "accounting"
    NOTIFICATIONS = "notifications"
    IDENTITY      = "identity"


class LeaveRuleType(str, enum.Enum):
    PAID_LEAVE    = "paid_leave"
    UNPAID_LEAVE  = "unpaid_leave"
    HALF_DAY      = "half_day"
    ABSENT        = "absent"
    HOLIDAY       = "holiday"
    WEEK_OFF      = "week_off"
    INTERN_LEAVE  = "intern_leave"


# ── Policy (General section) ────────────────────────────────────────────

class PayrollPolicy(Base):
    __tablename__ = "payroll_policies"

    id              = Column(Integer, primary_key=True, index=True)
    organization_id = Column(Integer, ForeignKey("organizations.id"), nullable=False, index=True)

    name            = Column(String(120), nullable=False)
    description     = Column(Text, nullable=True)
    status          = Column(String(20), default="active", nullable=False)   # active | inactive | draft
    effective_date  = Column(Date, nullable=False, server_default=func.now())
    is_default      = Column(Boolean, default=False, nullable=False)

    calculation_mode = Column(String(20), default=CalculationMode.STANDARD.value, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    employee_categories = relationship("PolicyEmployeeCategory", back_populates="policy", cascade="all, delete-orphan")
    leave_rules          = relationship("PolicyLeaveRule", back_populates="policy", cascade="all, delete-orphan")
    overtime_rule        = relationship("PolicyOvertimeRule", back_populates="policy", uselist=False, cascade="all, delete-orphan")
    integrations         = relationship("PolicyIntegration", back_populates="policy", cascade="all, delete-orphan")
    feature_flags        = relationship("PolicyFeatureFlag", back_populates="policy", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_payroll_policies_org_status", "organization_id", "status"),
        # Only one default policy per organization:
        UniqueConstraint("organization_id", "is_default", name="uq_one_default_per_org",
                          sqlite_on_conflict=None),
    )

    def __repr__(self):
        return f"<PayrollPolicy id={self.id} org={self.organization_id} mode={self.calculation_mode}>"


# ── Employee Categories ──────────────────────────────────────────────────

class PolicyEmployeeCategory(Base):
    __tablename__ = "payroll_policy_employee_categories"

    id        = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)

    category         = Column(String(20), nullable=False)   # EmployeeCategoryType value
    working_days     = Column(Integer, nullable=False, default=5)
    weekly_off       = Column(JSON, nullable=True)           # e.g. ["Saturday", "Sunday"]
    expected_hours   = Column(Integer, nullable=False, default=8)
    minimum_hours    = Column(Integer, nullable=False, default=4)
    paid_leave_eligible = Column(Boolean, nullable=False, default=True)
    grace_time_minutes  = Column(Integer, nullable=False, default=10)
    half_day_rule       = Column(JSON, nullable=True)        # e.g. {"thresholdHours": 4}

    policy = relationship("PayrollPolicy", back_populates="employee_categories")

    __table_args__ = (
        UniqueConstraint("policy_id", "category", name="uq_policy_category"),
    )


# ── Leave Rules ───────────────────────────────────────────────────────────

class PolicyLeaveRule(Base):
    __tablename__ = "payroll_policy_leave_rules"

    id        = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)

    rule_type = Column(String(20), nullable=False)   # LeaveRuleType value
    config    = Column(JSON, nullable=True)

    policy = relationship("PayrollPolicy", back_populates="leave_rules")

    __table_args__ = (
        UniqueConstraint("policy_id", "rule_type", name="uq_policy_leave_rule_type"),
    )


# ── Overtime Rules ────────────────────────────────────────────────────────

class PolicyOvertimeRule(Base):
    __tablename__ = "payroll_policy_overtime_rules"

    id        = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, unique=True, index=True)

    enabled              = Column(Boolean, nullable=False, default=False)
    minimum_overtime_minutes = Column(Integer, nullable=False, default=30)
    approval_required    = Column(Boolean, nullable=False, default=True)

    policy = relationship("PayrollPolicy", back_populates="overtime_rule")


# ── Integrations ──────────────────────────────────────────────────────────

class PolicyIntegration(Base):
    __tablename__ = "payroll_policy_integrations"

    id        = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)

    category     = Column(String(20), nullable=False)   # IntegrationCategory value
    provider_key = Column(String(50), nullable=False)   # e.g. "zoiko_time", "manual_transfer", "email"
    enabled      = Column(Boolean, nullable=False, default=False)

    policy = relationship("PayrollPolicy", back_populates="integrations")

    __table_args__ = (
        UniqueConstraint("policy_id", "category", "provider_key", name="uq_policy_integration"),
    )


# ── Feature Flags ─────────────────────────────────────────────────────────

class PolicyFeatureFlag(Base):
    __tablename__ = "payroll_policy_feature_flags"

    id        = Column(Integer, primary_key=True, index=True)
    policy_id = Column(Integer, ForeignKey("payroll_policies.id"), nullable=False, index=True)

    flag_key = Column(String(40), nullable=False)   # e.g. "tax", "multi_currency"
    enabled  = Column(Boolean, nullable=False, default=False)

    policy = relationship("PayrollPolicy", back_populates="feature_flags")

    __table_args__ = (
        UniqueConstraint("policy_id", "flag_key", name="uq_policy_feature_flag"),
    )