from datetime import date, datetime
from typing import Optional, List
from sqlalchemy.orm import Session
from fastapi import HTTPException

from app.modules.payroll.policy.models import (
    PayrollPolicy,
    PayrollPolicyEmployeeCategory,
    PayrollPolicyLeaveRule,
    PayrollPolicyOvertimeRule,
    PayrollPolicyIntegration,
    PayrollPolicyFeatureFlag,
)
from app.modules.payroll.policy.schemas import PolicyUpdate, EmployeeCategorySchema, OvertimeRuleSchema


def _get_policy_or_404(db: Session, policy_id: int, org_id: int) -> PayrollPolicy:
    policy = db.query(PayrollPolicy).filter(
        PayrollPolicy.id == policy_id,
        PayrollPolicy.organization_id == org_id,
    ).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


def get_active_policy(db: Session, org_id: int) -> PayrollPolicy:
    policy = db.query(PayrollPolicy).filter(
        PayrollPolicy.organization_id == org_id,
        PayrollPolicy.status == "active",
        PayrollPolicy.is_default.is_(True),
    ).first()
    if not policy:
        policy = db.query(PayrollPolicy).filter(
            PayrollPolicy.organization_id == org_id,
            PayrollPolicy.status == "active",
        ).order_by(PayrollPolicy.created_at.desc()).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active policy found for this organization")
    return policy


def update_policy(db: Session, policy_id: int, org_id: int, payload: PolicyUpdate) -> PayrollPolicy:
    policy = _get_policy_or_404(db, policy_id, org_id)

    update_data = payload.model_dump(exclude_none=True, exclude={"employee_categories", "overtime_rule", "integrations", "feature_flags"})
    if update_data:
        for key, value in update_data.items():
            setattr(policy, key, value)
        policy.updated_at = datetime.utcnow()

    if payload.employee_categories is not None:
        _replace_categories(db, policy.id, payload.employee_categories)

    if payload.overtime_rule is not None:
        _upsert_overtime(db, policy.id, payload.overtime_rule)

    if payload.integrations is not None:
        _replace_integrations(db, policy.id, payload.integrations)

    if payload.feature_flags is not None:
        _replace_feature_flags(db, policy.id, payload.feature_flags)

    db.commit()
    db.refresh(policy)
    return policy


def enable_integration(db: Session, policy_id: int, org_id: int, category: str, provider_key: str) -> PayrollPolicyIntegration:
    _get_policy_or_404(db, policy_id, org_id)
    integration = db.query(PayrollPolicyIntegration).filter(
        PayrollPolicyIntegration.policy_id == policy_id,
        PayrollPolicyIntegration.category == category,
        PayrollPolicyIntegration.provider_key == provider_key,
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail=f"Integration {category}/{provider_key} not found")
    integration.enabled = True
    db.commit()
    db.refresh(integration)
    return integration


def disable_integration(db: Session, policy_id: int, org_id: int, category: str, provider_key: str) -> PayrollPolicyIntegration:
    _get_policy_or_404(db, policy_id, org_id)
    integration = db.query(PayrollPolicyIntegration).filter(
        PayrollPolicyIntegration.policy_id == policy_id,
        PayrollPolicyIntegration.category == category,
        PayrollPolicyIntegration.provider_key == provider_key,
    ).first()
    if not integration:
        raise HTTPException(status_code=404, detail=f"Integration {category}/{provider_key} not found")
    integration.enabled = False
    db.commit()
    db.refresh(integration)
    return integration


def _replace_categories(db: Session, policy_id: int, categories: List[EmployeeCategorySchema]):
    db.query(PayrollPolicyEmployeeCategory).filter(
        PayrollPolicyEmployeeCategory.policy_id == policy_id
    ).delete()
    for cat in categories:
        db.add(PayrollPolicyEmployeeCategory(
            policy_id=policy_id,
            category=cat.category,
            working_days=cat.working_days,
            expected_hours=cat.expected_hours,
            minimum_hours=cat.minimum_hours,
            paid_leave_eligible=cat.paid_leave_eligible,
            grace_time_minutes=cat.grace_time_minutes,
        ))


def _upsert_overtime(db: Session, policy_id: int, rule: OvertimeRuleSchema):
    existing = db.query(PayrollPolicyOvertimeRule).filter(
        PayrollPolicyOvertimeRule.policy_id == policy_id
    ).first()
    if existing:
        existing.enabled = rule.enabled
        existing.approval_required = rule.approval_required
        existing.minimum_overtime_minutes = rule.minimum_overtime_minutes
    else:
        db.add(PayrollPolicyOvertimeRule(
            policy_id=policy_id,
            enabled=rule.enabled,
            approval_required=rule.approval_required,
            minimum_overtime_minutes=rule.minimum_overtime_minutes,
        ))


def _replace_integrations(db: Session, policy_id: int, integrations: list):
    db.query(PayrollPolicyIntegration).filter(
        PayrollPolicyIntegration.policy_id == policy_id
    ).delete()
    for i in integrations:
        db.add(PayrollPolicyIntegration(
            policy_id=policy_id,
            category=i.category,
            provider_key=i.provider_key,
            enabled=i.enabled,
        ))


def _replace_feature_flags(db: Session, policy_id: int, flags: list):
    db.query(PayrollPolicyFeatureFlag).filter(
        PayrollPolicyFeatureFlag.policy_id == policy_id
    ).delete()
    for f in flags:
        db.add(PayrollPolicyFeatureFlag(
            policy_id=policy_id,
            flag_key=f.flag_key,
            enabled=f.enabled,
        ))


def _fetch_employee_categories(db: Session, policy_id: int) -> list:
    return db.query(PayrollPolicyEmployeeCategory).filter(
        PayrollPolicyEmployeeCategory.policy_id == policy_id
    ).all()


def _fetch_overtime_rule(db: Session, policy_id: int):
    return db.query(PayrollPolicyOvertimeRule).filter(
        PayrollPolicyOvertimeRule.policy_id == policy_id
    ).first()


def _fetch_integrations(db: Session, policy_id: int) -> list:
    return db.query(PayrollPolicyIntegration).filter(
        PayrollPolicyIntegration.policy_id == policy_id
    ).all()


def _fetch_feature_flags(db: Session, policy_id: int) -> list:
    return db.query(PayrollPolicyFeatureFlag).filter(
        PayrollPolicyFeatureFlag.policy_id == policy_id
    ).all()


def _fetch_leave_rules(db: Session, policy_id: int) -> list:
    return db.query(PayrollPolicyLeaveRule).filter(
        PayrollPolicyLeaveRule.policy_id == policy_id
    ).all()


def _assemble_policy_response(db: Session, policy: PayrollPolicy) -> dict:
    categories = []
    for ec in _fetch_employee_categories(db, policy.id):
        categories.append({
            "category": ec.category,
            "workingDays": ec.working_days,
            "expectedHours": ec.expected_hours,
            "minimumHours": ec.minimum_hours,
            "paidLeaveEligible": ec.paid_leave_eligible,
            "graceTimeMinutes": ec.grace_time_minutes,
            "halfDayRule": ec.half_day_rule,
        })

    overtime = None
    ot = _fetch_overtime_rule(db, policy.id)
    if ot:
        overtime = {
            "enabled": ot.enabled,
            "approvalRequired": ot.approval_required,
            "minimumOvertimeMinutes": ot.minimum_overtime_minutes,
        }

    integrations = []
    for i in _fetch_integrations(db, policy.id):
        integrations.append({
            "category": i.category,
            "providerKey": i.provider_key,
            "enabled": i.enabled,
        })

    flags = []
    for f in _fetch_feature_flags(db, policy.id):
        flags.append({
            "flagKey": f.flag_key,
            "enabled": f.enabled,
        })

    leave_rules = []
    for lr in _fetch_leave_rules(db, policy.id):
        leave_rules.append({
            "ruleType": lr.rule_type,
            "config": lr.config,
        })

    return {
        "id": policy.id,
        "name": policy.name,
        "description": policy.description,
        "status": policy.status,
        "effectiveDate": str(policy.effective_date) if policy.effective_date else None,
        "isDefault": policy.is_default,
        "calculationMode": policy.calculation_mode,
        "createdAt": policy.created_at.isoformat() if policy.created_at else None,
        "updatedAt": policy.updated_at.isoformat() if policy.updated_at else None,
        "employeeCategories": categories,
        "overtimeRule": overtime,
        "integrations": integrations,
        "featureFlags": flags,
        "leaveRules": leave_rules,
    }
