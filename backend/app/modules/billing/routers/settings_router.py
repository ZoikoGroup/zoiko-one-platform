"""
modules/billing/routers/settings_router.py
------------------------------------------
Enterprise billing configuration endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import BillingConfigurationService
from app.modules.billing.services.validation_service import BillingValidationService
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
    summary="Validate billing configuration (enterprise-grade)",
    dependencies=[Depends(get_current_org_admin)],
)
def validate_configuration(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("GET /billing/settings/config/validate for organization_id=%s", current_user.organization_id)
    validation_svc = BillingValidationService(db)
    try:
        result = validation_svc.validate(
            organization_id=current_user.organization_id,
        )
        logger.info(
            "GET /billing/settings/config/validate -> 200 for organization_id=%s, valid=%s, score=%d",
            current_user.organization_id, result.get("valid"), result.get("readiness_score", 0),
        )
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


# ── Exchange Rate Management ──────────────────────────────────────────────


@router.post(
    "/exchange-rates/refresh",
    summary="Refresh exchange rates from live API",
    dependencies=[Depends(get_current_org_admin)],
)
def refresh_exchange_rates(
    base_currency: Optional[str] = Query(None, description="Base currency code (e.g. USD)"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    from fastapi.responses import JSONResponse
    from fastapi import status as http_status

    logger.info("POST /billing/settings/exchange-rates/refresh for org=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.refresh_exchange_rates(
            organization_id=current_user.organization_id,
            base_currency=base_currency,
        )
        logger.info("POST /billing/settings/exchange-rates/refresh -> 200, count=%s", result.get("count"))
        return result
    except Exception as e:
        error_msg = str(e)
        logger.error("POST /billing/settings/exchange-rates/refresh failed: %s", error_msg, exc_info=True)

        if "billing configuration" in error_msg.lower() and "not found" in error_msg.lower():
            return JSONResponse(
                status_code=http_status.HTTP_404_NOT_FOUND,
                content={
                    "success": False,
                    "error": "BILLING_CONFIGURATION_MISSING",
                    "message": "No billing configuration found. Please save your billing settings first.",
                    "details": error_msg,
                },
            )
        if "network" in error_msg.lower() or "connect" in error_msg.lower() or "timeout" in error_msg.lower() or "http" in error_msg.lower():
            return JSONResponse(
                status_code=http_status.HTTP_502_BAD_GATEWAY,
                content={
                    "success": False,
                    "error": "NETWORK_ERROR",
                    "message": "Unable to reach the exchange rate API. Please check your network connection and try again.",
                    "details": error_msg,
                },
            )
        if "no billing configuration" in error_msg.lower():
            return JSONResponse(
                status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
                content={
                    "success": False,
                    "error": "CONFIGURATION_MISSING",
                    "message": "Billing configuration not found. Please save your billing settings first.",
                    "details": error_msg,
                },
            )
        return JSONResponse(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "REFRESH_FAILED",
                "message": "Failed to refresh exchange rates. Please try again later.",
                "details": error_msg,
            },
        )


@router.get(
    "/exchange-rates",
    summary="Get cached exchange rates",
    dependencies=[Depends(get_current_user)],
)
def get_exchange_rates(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("GET /billing/settings/exchange-rates for org=%s", current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.get_cached_exchange_rates(
            organization_id=current_user.organization_id,
        )
        logger.info("GET /billing/settings/exchange-rates -> 200")
        return result
    except Exception as e:
        logger.error("GET /billing/settings/exchange-rates failed: %s", str(e), exc_info=True)
        raise


@router.get(
    "/exchange-rates/pair",
    summary="Get exchange rate for a specific currency pair",
    dependencies=[Depends(get_current_user)],
)
def get_exchange_rate_pair(
    from_currency: str = Query(..., description="Source currency code"),
    to_currency: str = Query(..., description="Target currency code"),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    logger.info("GET /billing/settings/exchange-rates/pair from=%s to=%s org=%s", from_currency, to_currency, current_user.organization_id)
    svc = BillingConfigurationService(db)
    try:
        result = svc.get_exchange_rate_for_pair(
            organization_id=current_user.organization_id,
            from_currency=from_currency,
            to_currency=to_currency,
        )
        logger.info("GET /billing/settings/exchange-rates/pair -> 200 rate=%s", result.get("rate"))
        return result
    except Exception as e:
        logger.error("GET /billing/settings/exchange-rates/pair failed: %s", str(e), exc_info=True)
        raise


@router.get(
    "/exchange-rates/supported",
    summary="Get list of currencies supported by the exchange rate API",
    dependencies=[Depends(get_current_user)],
)
def get_supported_currencies():
    from app.modules.billing.services.exchange_rate_service import ExchangeRateService
    return {"currencies": ExchangeRateService.get_supported_currencies(None)}
