from typing import Optional
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user
from app.modules.payroll.policy import service
from app.modules.payroll.policy.schemas import PolicyUpdate

policy_router = APIRouter(prefix="/policy", tags=["Payroll Policy"])


@policy_router.get("/active")
def get_active_policy(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    policy = service.get_active_policy(db, current_user.organization_id)
    return service._assemble_policy_response(db, policy)


@policy_router.put("/{policy_id}")
def update_policy(
    policy_id: int,
    payload: PolicyUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    policy = service.update_policy(db, policy_id, current_user.organization_id, payload)
    return service._assemble_policy_response(db, policy)


@policy_router.post("/{policy_id}/integrations/{category}/{provider_key}/enable")
def enable_integration(
    policy_id: int,
    category: str,
    provider_key: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = service.enable_integration(db, policy_id, current_user.organization_id, category, provider_key)
    return {
        "success": True,
        "category": result.category,
        "providerKey": result.provider_key,
        "enabled": result.enabled,
        "message": f"{provider_key} enabled.",
    }


@policy_router.post("/{policy_id}/integrations/{category}/{provider_key}/disable")
def disable_integration(
    policy_id: int,
    category: str,
    provider_key: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = service.disable_integration(db, policy_id, current_user.organization_id, category, provider_key)
    return {
        "success": True,
        "category": result.category,
        "providerKey": result.provider_key,
        "enabled": result.enabled,
        "message": f"{provider_key} disabled.",
    }
