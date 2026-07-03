"""
modules/billing/routers/settings_router.py
------------------------------------------
Enterprise billing configuration endpoints.
"""

import logging

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import BillingConfigurationService
from app.modules.billing.schemas import (
    BillingConfigurationUpdate,
    BillingConfigurationResponse,
    BillingConfigurationResetResponse,
    TestEmailRequest,
    TestEmailResponse,
    SyncExchangeRatesResponse,
)

logger = logging.getLogger("zoiko")
router = APIRouter(prefix="/settings", tags=["🧾 Settings"])


@router.get(
    "/config",
    response_model=BillingConfigurationResponse,
    summary="Get enterprise billing configuration",
    dependencies=[Depends(get_current_user)],
)
def get_configuration(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("GET /billing/settings/config for organization_id=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.get_configuration(organization_id=current_user.organization_id)
        logger.info("GET /billing/settings/config -> 200 for organization_id=%s", current_user.organization_id)
        return result
    except Exception as e:
        logger.error("GET /billing/settings/config failed for organization_id=%s: %s", current_user.organization_id, str(e), exc_info=True)
        raise


@router.put(
    "/config",
    response_model=BillingConfigurationResponse,
    summary="Update enterprise billing configuration",
    dependencies=[Depends(get_current_org_admin)],
)
def update_configuration(
    data: BillingConfigurationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("PUT /billing/settings/config for organization_id=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.update_configuration(
            organization_id=current_user.organization_id,
            updated_by=current_user.id,
            **data.model_dump(exclude_unset=True),
        )
        logger.info("PUT /billing/settings/config -> 200 for organization_id=%s", current_user.organization_id)
        return result
    except Exception as e:
        logger.error("PUT /billing/settings/config failed for organization_id=%s: %s", current_user.organization_id, str(e), exc_info=True)
        raise


@router.post(
    "/config/reset",
    response_model=BillingConfigurationResetResponse,
    summary="Reset billing configuration to defaults",
    dependencies=[Depends(get_current_org_admin)],
)
def reset_configuration(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("POST /billing/settings/config/reset for organization_id=%s by user_id=%s", current_user.organization_id, current_user.id)
    svc = BillingConfigurationService(db)
    try:
        config = svc.reset_configuration(
            organization_id=current_user.organization_id,
            updated_by=current_user.id,
        )
        logger.info("POST /billing/settings/config/reset -> 200 for organization_id=%s, config_id=%s", current_user.organization_id, config.id)
        return BillingConfigurationResetResponse(
            message="Billing configuration has been reset to defaults",
            configuration=config,
        )
    except Exception as e:
        logger.error("POST /billing/settings/config/reset failed for organization_id=%s: %s", current_user.organization_id, str(e), exc_info=True)
        raise


@router.get(
    "/config/validate",
    summary="Validate billing configuration",
    dependencies=[Depends(get_current_org_admin)],
)
def validate_configuration(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("GET /billing/settings/config/validate for organization_id=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.validate_configuration(
            organization_id=current_user.organization_id,
        )
        logger.info("GET /billing/settings/config/validate -> 200 for organization_id=%s, valid=%s", current_user.organization_id, result.get("valid"))
        return result
    except Exception as e:
        logger.error("GET /billing/settings/config/validate failed for organization_id=%s: %s", current_user.organization_id, str(e), exc_info=True)
        raise


@router.get(
    "",
    response_model=BillingConfigurationResponse,
    summary="Get billing configuration (alias)",
    dependencies=[Depends(get_current_user)],
)
def get_settings(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("GET /billing/settings for organization_id=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.get_configuration(organization_id=current_user.organization_id)
        logger.info("GET /billing/settings -> 200 for organization_id=%s", current_user.organization_id)
        return result
    except Exception as e:
        logger.error("GET /billing/settings failed for organization_id=%s: %s", current_user.organization_id, str(e), exc_info=True)
        raise


@router.put(
    "",
    response_model=BillingConfigurationResponse,
    summary="Update billing configuration (alias)",
    dependencies=[Depends(get_current_org_admin)],
)
def update_settings(
    data: BillingConfigurationUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("PUT /billing/settings for organization_id=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.update_configuration(
            organization_id=current_user.organization_id,
            updated_by=current_user.id,
            **data.model_dump(exclude_unset=True),
        )
        logger.info("PUT /billing/settings -> 200 for organization_id=%s", current_user.organization_id)
        return result
    except Exception as e:
        logger.error("PUT /billing/settings failed for organization_id=%s: %s", current_user.organization_id, str(e), exc_info=True)
        raise
