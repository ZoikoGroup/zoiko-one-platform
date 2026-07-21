import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
    NotFoundException,
)
from app.modules.billing.models import (
    BillingAuditAction,
    Payment,
    PaymentAllocation,
    PaymentAttempt,
    PaymentMethod,
    PaymentStatus,
)
from app.modules.billing.repositories.payment import (
    PaymentAllocationRepository,
    PaymentAttemptRepository,
    PaymentMethodRepository,
    PaymentRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.customer_service import CustomerService
from app.modules.billing.services.invoice_service import InvoiceService

logger = logging.getLogger("zoiko")

METHOD_ALLOWED_FIELDS = {
    "payment_method_type", "provider", "last_four",
    "expiry_month", "expiry_year", "card_brand",
    "bank_name", "account_last_four", "is_default",
    "billing_address", "is_active",
}
PAYMENT_ALLOWED_FIELDS = {
    "payment_number", "customer_id", "amount", "net_amount",
    "payment_date", "payment_method_id", "transaction_id",
    "payment_type", "status", "notes", "currency",
    "exchange_rate", "gateway", "gateway_charge_id", "gateway_fee",
    "failure_reason", "failure_code", "receipt_sent",
}


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = PaymentRepository(db)
        self.method_repo = PaymentMethodRepository(db)
        self.allocation_repo = PaymentAllocationRepository(db)
        self.attempt_repo = PaymentAttemptRepository(db)
        self.customer_service = CustomerService(db)
        self.invoice_service = InvoiceService(db)
        self.audit = BillingAuditService(db)

    # ── Payment Methods ────────────────────────────────────────────────────

    def add_payment_method(self, organization_id: int, customer_id: int, created_by: int, **data: Any) -> PaymentMethod:
        data = filter_allowed(data, METHOD_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        method = self.method_repo.create(organization_id, customer_id=customer_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "PaymentMethod", method.id)
        return method

    def update_payment_method(self, method_id: int, organization_id: int, updated_by: int, **data: Any) -> PaymentMethod:
        data = filter_allowed(data, METHOD_ALLOWED_FIELDS)
        self.method_repo.get_by_id(method_id, organization_id)
        updated = self.method_repo.update(method_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "PaymentMethod", method_id)
        return updated

    def remove_payment_method(self, method_id: int, organization_id: int, updated_by: int) -> None:
        self.method_repo.soft_delete(method_id, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "PaymentMethod", method_id)

    def set_default_payment_method(self, organization_id: int, method_id: int, updated_by: int) -> PaymentMethod:
        method = self.method_repo.set_default(organization_id, method_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "PaymentMethod", method_id)
        return method

    def list_payment_methods(
        self, organization_id: int, customer_id: int, active_only: bool = True,
    ) -> List[PaymentMethod]:
        self.customer_service.get_customer(customer_id, organization_id)
        return self.method_repo.list_by_customer(organization_id, customer_id, active_only)

    def get_default_payment_method(self, organization_id: int, customer_id: int) -> Optional[PaymentMethod]:
        return self.method_repo.get_default(organization_id, customer_id)

    # ── Payments ───────────────────────────────────────────────────────────

    def record_payment(
        self, organization_id: int, customer_id: int, payment_number: str,
        amount: Decimal, payment_date: date, created_by: int,
        idempotency_key: Optional[str] = None, **data: Any,
    ) -> Payment:
        data = filter_allowed(data, PAYMENT_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        if self.repo.exists(organization_id, payment_number=payment_number):
            raise AlreadyExistsException("Payment", "payment_number")
        if idempotency_key:
            existing = self.repo.get_first(organization_id, transaction_id=idempotency_key)
            if existing:
                return existing
        data.pop("transaction_id", None)
        payment = self.repo.create(
            organization_id, customer_id=customer_id,
            payment_number=payment_number, amount=amount,
            payment_date=payment_date, net_amount=amount,
            transaction_id=idempotency_key,
            **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.PAY, "Payment", payment.id, new_values=data)
        return payment

    def update_payment_status(self, payment_id: int, organization_id: int, status: str, updated_by: int, **data: Any) -> Payment:
        data = filter_allowed(data, PAYMENT_ALLOWED_FIELDS)
        payment = self.repo.get_by_id(payment_id, organization_id)
        if status == PaymentStatus.CLEARED:
            payment.cleared_at = datetime.utcnow()
        payment.status = status
        for k, v in data.items():
            if hasattr(payment, k) and v is not None:
                setattr(payment, k, v)
        safe_commit_and_refresh(self.db, payment)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Payment", payment_id)
        return payment

    def get_payment(self, payment_id: int, organization_id: int) -> Payment:
        return self.repo.get_by_id(payment_id, organization_id)

    def get_by_transaction_id(self, organization_id: int, transaction_id: str) -> Optional[Payment]:
        return self.repo.get_by_transaction_id(organization_id, transaction_id)

    def list_payments(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, payment_type: Optional[str] = None,
        sort_by: str = "payment_date", sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, payment_type=payment_type,
        )

    def get_total_collected(
        self, organization_id: int, date_from: Optional[str] = None, date_to: Optional[str] = None,
    ) -> float:
        return self.repo.get_total_collected(organization_id, date_from, date_to)

    # ── Payment Allocation ─────────────────────────────────────────────────

    def allocate_payment(
        self, payment_id: int, organization_id: int, invoice_id: int,
        amount: Decimal, created_by: int,
    ) -> PaymentAllocation:
        payment = self.repo.get_by_id(payment_id, organization_id)
        invoice = self.invoice_service.get_invoice(invoice_id, organization_id)
        if payment.status != PaymentStatus.CLEARED:
            raise BadRequestException("Payment must be cleared before allocation")
        total_allocated = self.allocation_repo.get_total_allocated_to_invoice(organization_id, invoice_id)
        remaining = invoice.total_amount - total_allocated
        if amount > remaining:
            amount = remaining
        allocation = self.allocation_repo.create(organization_id, payment_id=payment_id, invoice_id=invoice_id, amount=amount)
        self.invoice_service.record_payment(invoice_id, organization_id, amount, created_by)
        self.audit.log(organization_id, created_by, BillingAuditAction.UPDATE, "PaymentAllocation", allocation.id)
        return allocation

    def allocate_to_multiple(
        self, payment_id: int, organization_id: int,
        allocations: List[Dict[str, Any]], created_by: int,
    ) -> List[PaymentAllocation]:
        results = []
        for alloc in allocations:
            result = self.allocate_payment(
                payment_id, organization_id,
                alloc["invoice_id"], Decimal(str(alloc["amount"])), created_by,
            )
            results.append(result)
        return results

    def list_allocations_by_payment(self, payment_id: int, organization_id: int) -> List[PaymentAllocation]:
        self.repo.get_by_id(payment_id, organization_id)
        return self.allocation_repo.list_by_payment(organization_id, payment_id)

    def list_allocations_by_invoice(self, invoice_id: int, organization_id: int) -> List[PaymentAllocation]:
        self.invoice_service.get_invoice(invoice_id, organization_id)
        return self.allocation_repo.list_by_invoice(organization_id, invoice_id)

    def get_total_allocated(self, invoice_id: int, organization_id: int) -> float:
        self.invoice_service.get_invoice(invoice_id, organization_id)
        return self.allocation_repo.get_total_allocated_to_invoice(organization_id, invoice_id)

    # ── Payment Attempts ───────────────────────────────────────────────────

    def record_attempt(self, payment_id: int, organization_id: int, attempt_number: int, status: str, **data: Any) -> PaymentAttempt:
        self.repo.get_by_id(payment_id, organization_id)
        attempt = self.attempt_repo.create(organization_id, payment_id=payment_id, attempt_number=attempt_number, status=status, **data)
        return attempt

    def list_attempts(self, payment_id: int, organization_id: int) -> List[PaymentAttempt]:
        self.repo.get_by_id(payment_id, organization_id)
        return self.attempt_repo.list_by_payment(organization_id, payment_id)

    def get_latest_attempt(self, payment_id: int, organization_id: int) -> Optional[PaymentAttempt]:
        self.repo.get_by_id(payment_id, organization_id)
        return self.attempt_repo.get_latest_attempt(organization_id, payment_id)

    def count_failed_attempts(self, payment_id: int, organization_id: int) -> int:
        self.repo.get_by_id(payment_id, organization_id)
        return self.attempt_repo.count_failed_attempts(organization_id, payment_id)

    # ── Reconciliation ─────────────────────────────────────────────────────

    def reconcile_payment(self, payment_id: int, organization_id: int, updated_by: int) -> Payment:
        payment = self.repo.get_by_id(payment_id, organization_id)
        if payment.status != PaymentStatus.CLEARED:
            raise BadRequestException("Only cleared payments can be reconciled")
        allocations = self.allocation_repo.list_by_payment(organization_id, payment_id)
        total_allocated = sum(Decimal(str(a.amount)) for a in allocations)
        if total_allocated > payment.amount:
            raise BadRequestException("Allocated amount exceeds payment amount")
        if total_allocated < payment.amount:
            logger.info(f"[BILLING] Payment {payment_id} under-allocated: {total_allocated} of {payment.amount}")
        return payment
