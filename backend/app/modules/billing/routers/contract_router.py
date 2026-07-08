"""
modules/billing/routers/contract_router.py
------------------------------------------
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.dependencies import get_current_user, get_current_org_admin
from app.modules.billing.services import ContractService
from app.modules.billing.schemas import (
    ContractCreate,
    ContractUpdate,
    ContractResponse,
    ContractListResponse,
    SuccessResponse,
)

router = APIRouter(prefix="/contracts", tags=["🧾 Contracts"])


@router.post(
    "",
    response_model=ContractResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a contract",
    dependencies=[Depends(get_current_org_admin)],
)
def create_contract(
    data: ContractCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.create_contract(
        organization_id=current_user.organization_id,
        created_by=current_user.id,
        customer_id=data.customer_id,
        contract_number=data.contract_number,
        **data.model_dump(exclude={"customer_id", "contract_number"}, exclude_unset=True),
    )


@router.get(
    "",
    response_model=ContractListResponse,
    summary="List contracts",
)
def list_contracts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1),
    search_term: Optional[str] = Query(None),
    customer_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
):
    svc = ContractService(db)
    return svc.list_contracts(
        organization_id=current_user.organization_id,
        page=page,
        per_page=per_page,
        search_term=search_term,
        customer_id=customer_id,
        status=status,
    )


@router.get(
    "/active",
    response_model=list[ContractResponse],
    summary="List active contracts",
)
def list_active_contracts(
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.list_active_contracts(
        organization_id=current_user.organization_id,
    )


@router.get(
    "/expiring",
    response_model=list[ContractResponse],
    summary="List expiring contracts",
)
def list_expiring_contracts(
    within_days: int = Query(30, ge=1),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.list_expiring_contracts(
        organization_id=current_user.organization_id,
        within_days=within_days,
    )


@router.get(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="Get a contract",
)
def get_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.get_contract(
        contract_id=contract_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/{contract_id}",
    response_model=ContractResponse,
    summary="Update a contract",
    dependencies=[Depends(get_current_org_admin)],
)
def update_contract(
    contract_id: int,
    data: ContractUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.update_contract(
        contract_id=contract_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        **data.model_dump(exclude_unset=True),
    )


@router.put(
    "/{contract_id}/activate",
    response_model=ContractResponse,
    summary="Activate a contract",
    dependencies=[Depends(get_current_org_admin)],
)
def activate_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.activate_contract(
        contract_id=contract_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.put(
    "/{contract_id}/terminate",
    response_model=ContractResponse,
    summary="Terminate a contract",
    dependencies=[Depends(get_current_org_admin)],
)
def terminate_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.terminate_contract(
        contract_id=contract_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.put(
    "/{contract_id}/cancel",
    response_model=ContractResponse,
    summary="Cancel a contract",
    dependencies=[Depends(get_current_org_admin)],
)
def cancel_contract(
    contract_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.cancel_contract(
        contract_id=contract_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
    )


@router.put(
    "/{contract_id}/renew",
    response_model=ContractResponse,
    summary="Renew a contract",
    dependencies=[Depends(get_current_org_admin)],
)
def renew_contract(
    contract_id: int,
    new_end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    svc = ContractService(db)
    return svc.renew_contract(
        contract_id=contract_id,
        organization_id=current_user.organization_id,
        updated_by=current_user.id,
        new_end_date=new_end_date,
    )
