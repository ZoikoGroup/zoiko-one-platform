import logging
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
)
from app.modules.billing.models import (
    BillingAuditAction,
    Contract,
    ContractStatus,
)
from app.modules.billing.repositories.sales import ContractRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh
from app.modules.billing.services.customer_service import CustomerService

logger = logging.getLogger("zoiko")


class ContractService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = ContractRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)

    def create_contract(
        self, organization_id: int, created_by: int, customer_id: int,
        contract_number: str, **data: Any,
    ) -> Contract:
        self.customer_service.get_customer(customer_id, organization_id)
        if self.repo.exists(organization_id, contract_number=contract_number):
            raise AlreadyExistsException("Contract", "contract_number")
        contract = self.repo.create(
            organization_id, customer_id=customer_id,
            contract_number=contract_number, **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Contract", contract.id, new_values=data)
        return contract

    def update_contract(self, contract_id: int, organization_id: int, updated_by: int, **data: Any) -> Contract:
        contract = self.repo.get_by_id(contract_id, organization_id)
        if contract.status not in (ContractStatus.DRAFT, ContractStatus.ACTIVE):
            raise BadRequestException("Contract cannot be modified in its current status")
        if data.get("contract_number") and data["contract_number"] != contract.contract_number:
            if self.repo.exists(organization_id, contract_number=data["contract_number"]):
                raise AlreadyExistsException("Contract", "contract_number")
        updated = self.repo.update(contract_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Contract", contract_id)
        return updated

    def get_contract(self, contract_id: int, organization_id: int) -> Contract:
        return self.repo.get_by_id(contract_id, organization_id)

    def get_contract_by_number(self, organization_id: int, number: str) -> Optional[Contract]:
        return self.repo.get_by_number(organization_id, number)

    def list_contracts(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, sort_by: str = "created_at",
        sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id, status=status,
        )

    def list_active_contracts(self, organization_id: int) -> List[Contract]:
        return self.repo.list_active(organization_id)

    def list_expiring_contracts(self, organization_id: int, within_days: int = 30) -> List[Contract]:
        return self.repo.list_expiring(organization_id, within_days)

    def activate_contract(self, contract_id: int, organization_id: int, updated_by: int) -> Contract:
        contract = self.repo.get_by_id(contract_id, organization_id)
        if contract.status != ContractStatus.DRAFT:
            raise BadRequestException("Only draft contracts can be activated")
        contract.status = ContractStatus.ACTIVE
        contract.start_date = date.today()
        safe_commit_and_refresh(self.db, contract)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Contract", contract_id)
        return contract

    def terminate_contract(self, contract_id: int, organization_id: int, updated_by: int) -> Contract:
        contract = self.repo.get_by_id(contract_id, organization_id)
        if contract.status != ContractStatus.ACTIVE:
            raise BadRequestException("Only active contracts can be terminated")
        contract.status = ContractStatus.TERMINATED
        contract.end_date = date.today()
        safe_commit_and_refresh(self.db, contract)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Contract", contract_id)
        return contract

    def renew_contract(self, contract_id: int, organization_id: int, updated_by: int, new_end_date: Optional[date] = None) -> Contract:
        contract = self.repo.get_by_id(contract_id, organization_id)
        if contract.status != ContractStatus.ACTIVE and contract.status != ContractStatus.EXPIRED:
            raise BadRequestException("Contract cannot be renewed")
        if contract.auto_renew and contract.renewal_term_days:
            contract.end_date = date.today() + timedelta(days=contract.renewal_term_days)
        elif new_end_date:
            contract.end_date = new_end_date
        else:
            raise BadRequestException("No renewal terms configured and no end date provided")
        contract.status = ContractStatus.ACTIVE
        safe_commit_and_refresh(self.db, contract)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Contract", contract_id)
        return contract

    def cancel_contract(self, contract_id: int, organization_id: int, updated_by: int) -> Contract:
        contract = self.repo.get_by_id(contract_id, organization_id)
        if contract.status in (ContractStatus.CANCELLED, ContractStatus.TERMINATED):
            raise BadRequestException("Contract is already ended")
        contract.status = ContractStatus.CANCELLED
        safe_commit_and_refresh(self.db, contract)
        self.audit.log(organization_id, updated_by, BillingAuditAction.CANCEL, "Contract", contract_id)
        return contract
