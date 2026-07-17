import logging
from datetime import datetime
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
    PaymentStatus,
    Refund,
    RefundStatus,
    RefundType,
)
from app.modules.billing.repositories.credit import RefundRepository
from app.modules.billing.repositories.payment import PaymentRepository
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.models import Refund as RefundModel
from app.modules.billing.models import NumberFormat, SequenceReset
from app.modules.billing.services.customer_service import CustomerService
from app.modules.billing.services.invoice_service import InvoiceService

logger = logging.getLogger("zoiko")

REFUND_ALLOWED_FIELDS = {
    "customer_id", "refund_number", "refund_type", "amount",
    "payment_id", "invoice_id", "reason", "notes",
    "gateway_refund_id", "currency", "exchange_rate",
}


class RefundService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = RefundRepository(db)
        self.payment_repo = PaymentRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)
        self.invoice_service = InvoiceService(db)

    def _generate_refund_number(self, organization_id: int) -> str:
        from app.modules.billing.services.settings_service import BillingConfigurationService
        from sqlalchemy import func
        config_svc = BillingConfigurationService(self.db)
        config = config_svc.get_configuration(organization_id)
        prefix = config.refund_prefix or "RF-"
        fmt = config.refund_number_format or NumberFormat.PREFIX_YYYY_SEQ
        reset = getattr(config, "invoice_sequence_reset", SequenceReset.ANNUALLY)

        now = datetime.utcnow()
        year = now.strftime("%Y")
        month = now.strftime("%m")

        if reset == SequenceReset.MONTHLY:
            seq_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif reset == SequenceReset.QUARTERLY:
            quarter = (now.month - 1) // 3 + 1
            seq_start = now.replace(month=(quarter - 1) * 3 + 1, day=1, hour=0, minute=0, second=0, microsecond=0)
        elif reset == SequenceReset.ANNUALLY:
            seq_start = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            seq_start = None

        query = self.db.query(func.count(RefundModel.id)).filter(
            RefundModel.organization_id == organization_id,
        )
        if seq_start:
            query = query.filter(RefundModel.created_at >= seq_start)
        count = query.scalar() or 0
        seq = str(count + 1).zfill(5)

        fmt_map = {
            NumberFormat.PREFIX_SEQ: f"{prefix}{{SEQ}}",
            NumberFormat.PREFIX_YYYY_SEQ: f"{prefix}{year}-{{SEQ}}",
            NumberFormat.PREFIX_YYYYMM_SEQ: f"{prefix}{year}{month}-{{SEQ}}",
            NumberFormat.PREFIX_YYYY_MM_SEQ: f"{prefix}{year}-{month}-{{SEQ}}",
            NumberFormat.PREFIX_MM_YYYY_SEQ: f"{prefix}{month}-{year}-{{SEQ}}",
        }
        template = fmt_map.get(fmt, f"{prefix}{year}-{{SEQ}}")
        return template.replace("{SEQ}", seq)

    def create_refund(
        self, organization_id: int, created_by: int,
        customer_id: int, refund_number: str,
        refund_type: str, amount: Decimal, **data: Any,
    ) -> Refund:
        from app.modules.billing.services.settings_service import BillingConfigurationService

        data = filter_allowed(data, REFUND_ALLOWED_FIELDS)

        # ── Validate amount > 0 ──────────────────────────────────────────
        if amount <= 0:
            raise BadRequestException("Refund amount must be greater than zero")

        # ── Validate refund_number ───────────────────────────────────────
        self.customer_service.get_customer(customer_id, organization_id)
        if not refund_number or refund_number.strip().lower() in ("auto", "auto-generated", ""):
            refund_number = self._generate_refund_number(organization_id)
        if self.repo.exists(organization_id, refund_number=refund_number):
            raise AlreadyExistsException("Refund", "refund_number")

        # ── Payment validation with row lock (prevents concurrent over-refund) ──
        payment = None
        if data.get("payment_id"):
            payment = self.payment_repo.get_by_id_for_update(data["payment_id"], organization_id)
            if payment.customer_id != customer_id:
                raise BadRequestException("Payment does not belong to this customer")

        # ── Resolve currency ─────────────────────────────────────────────
        if not data.get("currency"):
            if data.get("invoice_id"):
                invoice = self.invoice_service.get_invoice(data["invoice_id"], organization_id)
                if invoice:
                    data["currency"] = invoice.currency
            elif payment and hasattr(payment, 'currency') and payment.currency:
                data["currency"] = payment.currency

        if not data.get("currency"):
            config_svc = BillingConfigurationService(self.db)
            data["currency"] = config_svc.get_default_currency(organization_id)

        # ── Currency must match the payment being refunded ────────────────
        if payment and data.get("currency") and payment.currency and data["currency"] != payment.currency:
            raise BadRequestException(
                f"Refund currency ({data['currency']}) must match the payment's currency "
                f"({payment.currency}). Cross-currency refunds are not yet supported."
            )

        # ── Cumulative refundable protection ───────────────────────────────
        if payment:
            already_refunded = self.repo.get_total_refunded_for_payment(organization_id, payment.id)
            remaining_refundable = Decimal(str(payment.amount)) - already_refunded
            if amount > remaining_refundable:
                raise BadRequestException(
                    f"Refund amount {amount} exceeds remaining refundable amount {remaining_refundable} "
                    f"(payment: {payment.amount}, already refunded: {already_refunded})"
                )

        data.pop("exchange_rate", None)
        refund = self.repo.create(
            organization_id, customer_id=customer_id,
            refund_number=refund_number, refund_type=refund_type,
            amount=amount, **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Refund", refund.id, new_values=data)
        return refund

    def process_refund(
        self, refund_id: int, organization_id: int, updated_by: int,
        gateway_refund_id: Optional[str] = None,
    ) -> Refund:
        refund = self.repo.get_by_id(refund_id, organization_id)
        if refund.status != RefundStatus.PENDING:
            raise BadRequestException("Refund must be in PENDING status to process")
        refund.status = RefundStatus.PROCESSING
        if gateway_refund_id:
            refund.gateway_refund_id = gateway_refund_id
        safe_commit_and_refresh(self.db, refund)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Refund", refund_id)
        return refund

    def complete_refund(self, refund_id: int, organization_id: int, updated_by: int) -> Refund:
        refund = self.repo.get_by_id(refund_id, organization_id)
        if refund.status != RefundStatus.PROCESSING:
            raise BadRequestException("Refund must be in PROCESSING status to complete")
        refund.status = RefundStatus.COMPLETED
        refund.completed_at = datetime.utcnow()
        safe_commit_and_refresh(self.db, refund)

        # ── Payment status sync: transition to REFUNDED if fully refunded ──
        if refund.payment_id:
            payment = self.payment_repo.get_by_id(refund.payment_id, organization_id)
            already_refunded = self.repo.get_total_refunded_for_payment(
                organization_id, refund.payment_id,
            )
            if already_refunded >= Decimal(str(payment.amount)):
                payment.status = PaymentStatus.REFUNDED
                safe_commit_and_refresh(self.db, payment)
                logger.info(
                    f"[BILLING] Payment {payment.id} fully refunded ({already_refunded}), "
                    f"transitioned to REFUNDED"
                )

        self.audit.log(organization_id, updated_by, BillingAuditAction.REFUND, "Refund", refund_id)
        return refund

    def fail_refund(self, refund_id: int, organization_id: int, failure_reason: str, updated_by: int) -> Refund:
        refund = self.repo.get_by_id(refund_id, organization_id)
        refund.status = RefundStatus.FAILED
        refund.failure_reason = failure_reason
        safe_commit_and_refresh(self.db, refund)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Refund", refund_id)
        return refund

    def get_refund(self, refund_id: int, organization_id: int) -> Refund:
        return self.repo.get_by_id(refund_id, organization_id)

    def get_by_number(self, organization_id: int, number: str) -> Optional[Refund]:
        return self.repo.get_by_number(organization_id, number)

    def list_refunds(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_id: Optional[int] = None,
        status: Optional[str] = None, refund_type: Optional[str] = None,
        sort_by: str = "created_at", sort_order: str = "desc",
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order,
            search_term=search_term, customer_id=customer_id,
            status=status, refund_type=refund_type,
        )