import logging
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.exceptions import (
    AlreadyExistsException,
    BadRequestException,
    NotFoundException,
)
from app.modules.billing.models import (
    BillingAuditAction,
    BillingCustomer,
    CustomerContact,
    CustomerStatus,
)
from app.modules.billing.repositories.customer import (
    CustomerContactRepository,
    CustomerRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed

logger = logging.getLogger("zoiko")


def _sanitize_audit_data(data: Dict[str, Any]) -> Dict[str, Any]:
    return {
        k: float(v) if isinstance(v, Decimal) else v
        for k, v in data.items()
    }


CUSTOMER_ALLOWED_FIELDS = {
    "customer_code", "company_name", "display_name", "legal_name",
    "first_name", "last_name", "email", "alternate_email",
    "mobile", "phone", "website",
    "designation", "industry", "employee_count",
    "gst_number", "vat_number", "pan", "tin", "tax_category",
    "tax_id", "tax_id_type",
    "billing_address", "shipping_address", "payment_terms",
    "currency", "credit_limit", "credit_days", "price_list",
    "customer_type", "status", "is_active", "notes",
    "tags", "custom_fields",
}
CONTACT_ALLOWED_FIELDS = {
    "first_name", "last_name", "email", "phone", "mobile",
    "job_title", "department", "is_primary", "notes",
}


class CustomerService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = CustomerRepository(db)
        self.contact_repo = CustomerContactRepository(db)
        self.audit = BillingAuditService(db)

    def _validate_duplicate(
        self, organization_id: int, email: Optional[str] = None,
        code: Optional[str] = None, company_name: Optional[str] = None,
        exclude_id: Optional[int] = None,
    ) -> None:
        if email:
            existing = self.repo.get_first(organization_id, email=email)
            if existing and (exclude_id is None or existing.id != exclude_id):
                raise AlreadyExistsException("Customer", "email")
        if code:
            existing = self.repo.get_first(organization_id, customer_code=code)
            if existing and (exclude_id is None or existing.id != exclude_id):
                raise AlreadyExistsException("Customer", "customer_code")
        if company_name:
            existing = self.repo.get_first(organization_id, company_name=company_name)
            if existing and (exclude_id is None or existing.id != exclude_id):
                raise AlreadyExistsException("Customer", "company_name")

    def create_customer(
        self, organization_id: int, created_by: int, **data: Any,
    ) -> BillingCustomer:
        data = filter_allowed(data, CUSTOMER_ALLOWED_FIELDS)
        self._validate_duplicate(
            organization_id,
            email=data.get("email"),
            code=data.get("customer_code"),
            company_name=data.get("company_name"),
        )
        customer = self.repo.create(organization_id, **data)
        self.audit.log(
            organization_id, created_by, BillingAuditAction.CREATE,
            "BillingCustomer", customer.id,
            new_values=_sanitize_audit_data(data),
        )
        logger.info(f"[BILLING] Customer created: org={organization_id} id={customer.id}")
        return customer

    def update_customer(
        self, customer_id: int, organization_id: int, updated_by: int, **data: Any,
    ) -> BillingCustomer:
        data = filter_allowed(data, CUSTOMER_ALLOWED_FIELDS)
        customer = self.repo.get_by_id(customer_id, organization_id)
        old_values = {
            "company_name": customer.company_name,
            "email": customer.email,
            "customer_code": customer.customer_code,
            "status": customer.status.value if customer.status else None,
        }
        if data.get("email") and data["email"] != customer.email:
            self._validate_duplicate(organization_id, email=data["email"], exclude_id=customer_id)
        if data.get("customer_code") and data["customer_code"] != customer.customer_code:
            self._validate_duplicate(organization_id, code=data["customer_code"], exclude_id=customer_id)
        if data.get("company_name") and data["company_name"] != customer.company_name:
            self._validate_duplicate(organization_id, company_name=data["company_name"], exclude_id=customer_id)
        updated = self.repo.update(customer_id, organization_id, **data)
        self.audit.log(
            organization_id, updated_by, BillingAuditAction.UPDATE,
            "BillingCustomer", customer_id,
            old_values=_sanitize_audit_data(old_values), new_values=_sanitize_audit_data(data),
        )
        return updated

    def get_customer(self, customer_id: int, organization_id: int) -> BillingCustomer:
        return self.repo.get_by_id(customer_id, organization_id)

    def get_customer_by_code(self, organization_id: int, code: str) -> Optional[BillingCustomer]:
        return self.repo.get_by_code(organization_id, code)

    def list_customers(
        self, organization_id: int, page: int = 1, per_page: int = 20,
        search_term: Optional[str] = None, customer_type: Optional[str] = None,
        status: Optional[str] = None, sort_by: str = "company_name",
        sort_order: str = "asc", active_only: bool = True,
    ) -> Dict[str, Any]:
        return self.repo.list_paginated(
            organization_id=organization_id, page=page, per_page=per_page,
            sort_by=sort_by, sort_order=sort_order, active_only=active_only,
            search_term=search_term, customer_type=customer_type, status=status,
        )

    def search_customers(self, organization_id: int, term: str, limit: int = 20) -> List[BillingCustomer]:
        return self.repo.search_by_company(organization_id, term, limit=limit)

    def activate_customer(self, customer_id: int, organization_id: int, updated_by: int) -> BillingCustomer:
        customer = self.repo.get_by_id(customer_id, organization_id)
        if customer.status == CustomerStatus.ACTIVE:
            raise BadRequestException("Customer is already active")
        customer.status = CustomerStatus.ACTIVE
        customer.is_active = True
        safe_commit_and_refresh(self.db, customer)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "BillingCustomer", customer_id)
        return customer

    def deactivate_customer(self, customer_id: int, organization_id: int, updated_by: int) -> BillingCustomer:
        customer = self.repo.get_by_id(customer_id, organization_id)
        if customer.status == CustomerStatus.INACTIVE:
            raise BadRequestException("Customer is already inactive")
        customer.status = CustomerStatus.INACTIVE
        customer.is_active = False
        safe_commit_and_refresh(self.db, customer)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "BillingCustomer", customer_id)
        return customer

    def suspend_customer(self, customer_id: int, organization_id: int, updated_by: int) -> BillingCustomer:
        customer = self.repo.get_by_id(customer_id, organization_id)
        customer.status = CustomerStatus.SUSPENDED
        customer.is_active = False
        safe_commit_and_refresh(self.db, customer)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "BillingCustomer", customer_id)
        return customer

    # ── Contacts ─────────────────────────────────────────────────────────

    def add_contact(self, organization_id: int, customer_id: int, created_by: int, **data: Any) -> CustomerContact:
        data = filter_allowed(data, CONTACT_ALLOWED_FIELDS)
        self.repo.get_by_id(customer_id, organization_id)
        contact = self.contact_repo.create(organization_id, customer_id=customer_id, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "CustomerContact", contact.id)
        return contact

    def update_contact(self, contact_id: int, organization_id: int, updated_by: int, **data: Any) -> CustomerContact:
        data = filter_allowed(data, CONTACT_ALLOWED_FIELDS)
        contact = self.contact_repo.get_by_id(contact_id, organization_id)
        for field, value in data.items():
            if hasattr(contact, field) and value is not None:
                setattr(contact, field, value)
        safe_commit_and_refresh(self.db, contact)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CustomerContact", contact_id)
        return contact

    def remove_contact(self, contact_id: int, organization_id: int, updated_by: int) -> None:
        self.contact_repo.soft_delete(contact_id, organization_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.DELETE, "CustomerContact", contact_id)

    def set_primary_contact(self, organization_id: int, contact_id: int, updated_by: int) -> CustomerContact:
        contact = self.contact_repo.set_primary(organization_id, contact_id)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CustomerContact", contact_id)
        return contact

    def list_contacts(self, organization_id: int, customer_id: int) -> List[CustomerContact]:
        self.repo.get_by_id(customer_id, organization_id)
        return self.contact_repo.list_by_customer(organization_id, customer_id)

    # ── Counts ──────────────────────────────────────────────────────────

    def count_customers(self, organization_id: int, active_only: bool = True) -> int:
        return self.repo.count(organization_id, active_only=active_only)

    def exists_by_email(self, organization_id: int, email: str) -> bool:
        return self.repo.exists(organization_id, email=email)

    # ── Hard Delete ───────────────────────────────────────────────────────

    def hard_delete_customer(self, customer_id: int, organization_id: int) -> None:
        self.repo.hard_delete(customer_id, organization_id)
        logger.info(f"[BILLING] Customer hard-deleted: org={organization_id} id={customer_id}")

    def bulk_delete_customers(self, organization_id: int, ids: List[int]) -> int:
        deleted = self.repo.bulk_hard_delete(ids, organization_id)
        logger.info(f"[BILLING] Bulk hard-delete: org={organization_id} ids={ids} count={deleted}")
        return deleted

    # ── Bulk Status Update ────────────────────────────────────────────────

    def bulk_update_status(self, organization_id: int, ids: List[int], status: str, updated_by: int) -> int:
        customers = self.repo.get_by_ids(ids, organization_id)
        now = datetime.utcnow()
        for customer in customers:
            customer.status = CustomerStatus(status)
            customer.updated_at = now
        safe_commit_and_refresh(self.db, *customers)
        for customer in customers:
            self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "BillingCustomer", customer.id)
        logger.info(f"[BILLING] Bulk status update: org={organization_id} status={status} count={len(customers)}")
        return len(customers)

    # ── Activity / Audit ──────────────────────────────────────────────────

    def get_customer_activity(self, organization_id: int, customer_id: int, limit: int = 100) -> List[Any]:
        from app.modules.billing.models import BillingAuditLog
        return self.db.query(BillingAuditLog).filter(
            BillingAuditLog.organization_id == organization_id,
            BillingAuditLog.entity_type == "BillingCustomer",
            BillingAuditLog.entity_id == customer_id,
        ).order_by(BillingAuditLog.timestamp.desc()).limit(limit).all()

    # ── Export ────────────────────────────────────────────────────────────

    def export_customers(self, organization_id: int, fmt: str = "json") -> List[BillingCustomer]:
        return self.repo.list_all(organization_id, active_only=False)

    # ── KPI Dashboard ─────────────────────────────────────────────────────

    def get_kpi_data(self, organization_id: int) -> Dict[str, Any]:
        from app.modules.billing.repositories.document import CustomerDocumentRepository
        total = self.repo.count(organization_id, active_only=False)
        active = self.repo.count(organization_id, active_only=True)
        inactive = total - active
        now = datetime.utcnow()
        first_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        new_this_month = self.db.query(func.count(self.repo.model.id)).filter(
            self.repo.model.organization_id == organization_id,
            self.repo.model.created_at >= first_of_month,
        ).scalar() or 0
        from app.modules.billing.models import Invoice, Payment
        total_revenue = self.db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(
            Payment.organization_id == organization_id,
        ).scalar() or 0
        outstanding = self.db.query(func.coalesce(func.sum(Invoice.total_amount - Invoice.paid_amount), 0)).filter(
            Invoice.organization_id == organization_id,
            Invoice.status.in_(["sent", "overdue", "partially_paid"]),
        ).scalar() or 0
        outstanding = float(outstanding)
        total_revenue = float(total_revenue)
        return {
            "total_customers": total,
            "active_customers": active,
            "inactive_customers": inactive,
            "new_this_month": new_this_month,
            "total_revenue": total_revenue,
            "outstanding_balance": outstanding,
            "credit_utilization": round((outstanding / total_revenue * 100) if total_revenue else 0, 2),
            "avg_collection_time_days": 0,
        }

    # ── Credit Balance ────────────────────────────────────────────────────

    def adjust_credit_balance(
        self, customer_id: int, organization_id: int, amount: float,
        adj_type: str, reason: str, updated_by: int,
    ) -> Dict[str, Any]:
        customer = self.repo.get_by_id(customer_id, organization_id)
        prev = float(customer.credit_balance or 0)
        if adj_type == "increase":
            customer.credit_balance = prev + amount
        elif adj_type == "decrease":
            new_val = prev - amount
            if new_val < 0:
                raise BadRequestException("Credit balance cannot be negative")
            customer.credit_balance = new_val
        else:
            if amount < 0:
                raise BadRequestException("Adjusted balance cannot be negative")
            customer.credit_balance = amount
        safe_commit_and_refresh(self.db, customer)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "BillingCustomer", customer_id)
        return {
            "customer_id": customer_id,
            "previous_balance": prev,
            "new_balance": float(customer.credit_balance or 0),
            "adjustment": amount,
            "type": adj_type,
            "message": f"Credit balance {adj_type} of {amount} completed",
        }

    # ── Customer Documents ────────────────────────────────────────────────

    def list_documents(self, organization_id: int, customer_id: int) -> List[Any]:
        from app.modules.billing.repositories.document import CustomerDocumentRepository
        repo = CustomerDocumentRepository(self.db)
        self.repo.get_by_id(customer_id, organization_id)
        return repo.list_by_customer(organization_id, customer_id)

    def add_document(self, organization_id: int, customer_id: int, uploaded_by: int, **data: Any) -> Any:
        from app.modules.billing.repositories.document import CustomerDocumentRepository
        from app.modules.billing.models import CustomerDocument
        repo = CustomerDocumentRepository(self.db)
        self.repo.get_by_id(customer_id, organization_id)
        doc = repo.create(organization_id, customer_id=customer_id, uploaded_by=uploaded_by, **data)
        self.audit.log(organization_id, uploaded_by, BillingAuditAction.CREATE, "CustomerDocument", doc.id)
        return doc

    def delete_document(self, document_id: int, customer_id: int, organization_id: int) -> None:
        from app.modules.billing.repositories.document import CustomerDocumentRepository
        repo = CustomerDocumentRepository(self.db)
        self.repo.get_by_id(customer_id, organization_id)
        repo.hard_delete(document_id, organization_id)

    # ── Customer Notes ────────────────────────────────────────────────────

    def list_notes(self, organization_id: int, customer_id: int) -> List[Any]:
        from app.modules.billing.repositories.notes import CustomerNoteRepository
        repo = CustomerNoteRepository(self.db)
        self.repo.get_by_id(customer_id, organization_id)
        return repo.list_by_customer(organization_id, customer_id)

    def add_note(self, organization_id: int, customer_id: int, created_by: int, **data: Any) -> Any:
        from app.modules.billing.repositories.notes import CustomerNoteRepository
        repo = CustomerNoteRepository(self.db)
        self.repo.get_by_id(customer_id, organization_id)
        note = repo.create(organization_id, customer_id=customer_id, created_by=created_by, **data)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "CustomerNote", note.id)
        return note

    def update_note(self, note_id: int, customer_id: int, organization_id: int, updated_by: int, **data: Any) -> Any:
        from app.modules.billing.repositories.notes import CustomerNoteRepository
        repo = CustomerNoteRepository(self.db)
        note = repo.get_by_id(note_id, organization_id)
        for field, value in data.items():
            if hasattr(note, field) and value is not None:
                setattr(note, field, value)
        note.updated_by = updated_by
        safe_commit_and_refresh(self.db, note)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "CustomerNote", note_id)
        return note

    def delete_note(self, note_id: int, customer_id: int, organization_id: int) -> None:
        from app.modules.billing.repositories.notes import CustomerNoteRepository
        repo = CustomerNoteRepository(self.db)
        repo.hard_delete(note_id, organization_id)

    # ── Import ────────────────────────────────────────────────────────────

    def import_customers(self, organization_id: int, created_by: int, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        from sqlalchemy.exc import IntegrityError
        imported = 0
        skipped = 0
        errors = []
        for item in items:
            try:
                data = filter_allowed(item, CUSTOMER_ALLOWED_FIELDS)
                if not data.get("customer_code") or not data.get("company_name"):
                    skipped += 1
                    errors.append(f"Row missing customer_code or company_name: {item}")
                    continue
                existing = self.repo.get_first(organization_id, customer_code=data["customer_code"])
                if existing:
                    skipped += 1
                    errors.append(f"Duplicate customer_code: {data['customer_code']}")
                    continue
                self.repo.create(organization_id, **data)
                imported += 1
            except (IntegrityError, ValueError, TypeError, AlreadyExistsException) as e:
                self.db.rollback()
                skipped += 1
                errors.append(str(e))
                logger.warning(f"[BILLING] Import row skipped: {e}")
            except Exception as e:
                self.db.rollback()
                skipped += 1
                errors.append(f"Unexpected error importing row: {e}")
                logger.error(f"[BILLING] Import unexpected error: {e}", exc_info=True)
        if imported:
            self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "BillingCustomer", 0)
        return {"success": len(errors) == 0, "imported": imported, "skipped": skipped, "errors": errors}
