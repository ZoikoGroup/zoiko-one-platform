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
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    InvoiceType,
    PricingPlan,
    Product,
    QuoteStatus,
    Quotation,
    QuotationItem,
)
from app.modules.billing.repositories.sales import (
    QuotationItemRepository,
    QuotationRepository,
)
from app.modules.billing.services.audit_service import BillingAuditService
from app.modules.billing.services.base import safe_commit_and_refresh, filter_allowed
from app.modules.billing.services.customer_service import CustomerService

logger = logging.getLogger("zoiko")

QUOTE_ALLOWED_FIELDS = {
    "customer_id", "quote_number", "valid_until",
    "discount_percentage", "currency", "notes",
    "terms", "status", "quote_version", "subject",
}
ITEM_ALLOWED_FIELDS = {
    "quotation_id", "line_number", "description", "quantity",
    "unit_price", "discount_percentage", "tax_percentage",
    "total_amount", "discount_amount", "tax_amount", "product_id",
    "is_tax_inclusive",
}


class QuoteService:
    def __init__(self, db: Session):
        self.db = db
        self.repo = QuotationRepository(db)
        self.item_repo = QuotationItemRepository(db)
        self.customer_service = CustomerService(db)
        self.audit = BillingAuditService(db)

    def create_quote(
        self, organization_id: int, created_by: int, customer_id: int,
        quote_number: str, **data: Any,
    ) -> Quotation:
        data = filter_allowed(data, QUOTE_ALLOWED_FIELDS)
        self.customer_service.get_customer(customer_id, organization_id)
        if self.repo.exists(organization_id, quote_number=quote_number):
            raise AlreadyExistsException("Quotation", "quote_number")
        quote = self.repo.create(
            organization_id,
            customer_id=customer_id, quote_number=quote_number,
            status=QuoteStatus.DRAFT, **data,
        )
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Quotation", quote.id, new_values=data)
        return quote

    def update_quote(self, quote_id: int, organization_id: int, updated_by: int, **data: Any) -> Quotation:
        data = filter_allowed(data, QUOTE_ALLOWED_FIELDS)
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status != QuoteStatus.DRAFT:
            raise BadRequestException("Only draft quotes can be edited")
        updated = self.repo.update(quote_id, organization_id, **data)
        self.audit.log(organization_id, updated_by, BillingAuditAction.UPDATE, "Quotation", quote_id)
        return updated

    def get_quote(self, quote_id: int, organization_id: int) -> Quotation:
        return self.repo.get_by_id(quote_id, organization_id)

    def get_quote_by_number(self, organization_id: int, number: str) -> Optional[Quotation]:
        return self.repo.get_by_number(organization_id, number)

    def list_quotes(
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

    # ── Items ─────────────────────────────────────────────────────────────

    def add_item(self, quote_id: int, organization_id: int, **data: Any) -> QuotationItem:
        data = filter_allowed(data, ITEM_ALLOWED_FIELDS)
        self.repo.get_by_id(quote_id, organization_id)
        return self.item_repo.create(organization_id, quotation_id=quote_id, **data)

    def bulk_set_items(self, quote_id: int, organization_id: int, items: List[Dict[str, Any]]) -> List[QuotationItem]:
        self.repo.get_by_id(quote_id, organization_id)
        self.item_repo.delete_by_quotation(organization_id, quote_id)
        result = self.item_repo.bulk_create_for_quotation(organization_id, quote_id, items)
        self.recalculate_quote(quote_id, organization_id)
        return result

    def duplicate_quote(self, quote_id: int, organization_id: int, created_by: int) -> Quotation:
        source = self.repo.get_by_id(quote_id, organization_id)
        new_number = f"{source.quote_number}-COPY"
        n = 1
        while self.repo.exists(organization_id, quote_number=new_number):
            n += 1
            new_number = f"{source.quote_number}-COPY-{n}"
        new_quote = self.repo.create(
            organization_id,
            customer_id=source.customer_id,
            quote_number=new_number,
            status=QuoteStatus.DRAFT,
            quote_version=1,
            subject=source.subject,
            currency=source.currency,
            discount_percentage=source.discount_percentage,
            notes=source.notes,
            terms=source.terms,
            valid_until=source.valid_until,
        )
        for item in source.items:
            self.item_repo.create(
                organization_id,
                quotation_id=new_quote.id,
                line_number=item.line_number,
                product_id=item.product_id,
                description=item.description,
                quantity=item.quantity,
                unit_price=item.unit_price,
                discount_percentage=item.discount_percentage,
                tax_percentage=item.tax_percentage,
                is_tax_inclusive=item.is_tax_inclusive,
                total_amount=item.total_amount,
                discount_amount=item.discount_amount,
                tax_amount=item.tax_amount,
            )
        self.recalculate_quote(new_quote.id, organization_id)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Quotation", new_quote.id,
                       new_values={"duplicated_from": quote_id})
        return self.repo.get_by_id(new_quote.id, organization_id)

    def list_items(self, quote_id: int, organization_id: int) -> List[QuotationItem]:
        self.repo.get_by_id(quote_id, organization_id)
        return self.item_repo.list_by_quotation(organization_id, quote_id)

    # ── Calculations ───────────────────────────────────────────────────────

    def calculate_totals(
        self, items: List[Dict[str, Any]],
        discount_percentage: Decimal = Decimal("0"),
    ) -> Dict[str, Decimal]:
        from app.modules.billing.services.base import calculate_line_item_totals
        return calculate_line_item_totals(items, discount_percentage)

    def recalculate_quote(self, quote_id: int, organization_id: int) -> Quotation:
        quote = self.repo.get_by_id(quote_id, organization_id)
        items_data = [
            {
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "discount_percentage": item.discount_percentage,
                "tax_percentage": item.tax_percentage,
            }
            for item in quote.items
        ]
        totals = self.calculate_totals(items_data, quote.discount_percentage)
        quote.subtotal = totals["subtotal"]
        quote.discount_amount = totals["discount_amount"]
        quote.tax_amount = totals["tax_amount"]
        quote.total_amount = totals["total_amount"]
        for ci in totals.get("items", []):
            idx = ci["index"]
            if idx < len(quote.items):
                quote.items[idx].total_amount = ci["total_amount"]
                quote.items[idx].discount_amount = ci["discount_amount"]
                quote.items[idx].tax_amount = ci["tax_amount"]
        safe_commit_and_refresh(self.db, quote)
        return quote

    # ── Status Transitions ─────────────────────────────────────────────────

    def send_quote(self, quote_id: int, organization_id: int, updated_by: int) -> Quotation:
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status != QuoteStatus.DRAFT:
            raise BadRequestException("Only draft quotes can be sent")
        quote.status = QuoteStatus.SENT
        safe_commit_and_refresh(self.db, quote)
        self.audit.log(organization_id, updated_by, BillingAuditAction.SEND, "Quotation", quote_id)
        return quote

    def accept_quote(self, quote_id: int, organization_id: int, updated_by: int) -> Quotation:
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status != QuoteStatus.SENT:
            raise BadRequestException("Only sent quotes can be accepted")
        quote.status = QuoteStatus.ACCEPTED
        quote.accepted_at = datetime.utcnow()
        safe_commit_and_refresh(self.db, quote)
        self.audit.log(organization_id, updated_by, BillingAuditAction.APPROVE, "Quotation", quote_id)
        return quote

    def reject_quote(self, quote_id: int, organization_id: int, reason: str, updated_by: int) -> Quotation:
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status not in (QuoteStatus.SENT, QuoteStatus.DRAFT):
            raise BadRequestException("Quote cannot be rejected in its current status")
        quote.status = QuoteStatus.REJECTED
        quote.rejected_reason = reason
        safe_commit_and_refresh(self.db, quote)
        self.audit.log(organization_id, updated_by, BillingAuditAction.REJECT, "Quotation", quote_id)
        return quote

    def cancel_quote(self, quote_id: int, organization_id: int, updated_by: int) -> Quotation:
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status in (QuoteStatus.CONVERTED, QuoteStatus.CANCELLED):
            raise BadRequestException("Quote cannot be cancelled")
        quote.status = QuoteStatus.CANCELLED
        safe_commit_and_refresh(self.db, quote)
        self.audit.log(organization_id, updated_by, BillingAuditAction.CANCEL, "Quotation", quote_id)
        return quote

    def check_expired(self, quote_id: int, organization_id: int) -> bool:
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status != QuoteStatus.SENT:
            return False
        if quote.valid_until and quote.valid_until < date.today():
            quote.status = QuoteStatus.EXPIRED
            safe_commit_and_refresh(self.db, quote)
            return True
        return False

    # ── Convert to Invoice ─────────────────────────────────────────────────

    def convert_to_invoice(
        self, quote_id: int, organization_id: int, created_by: int,
        invoice_number: str, issue_date: date, due_date: date,
    ) -> Invoice:
        quote = self.repo.get_by_id(quote_id, organization_id)
        if quote.status != QuoteStatus.ACCEPTED:
            raise BadRequestException("Only accepted quotes can be converted to invoices")
        from app.modules.billing.services.invoice_service import InvoiceService
        inv_service = InvoiceService(self.db)
        inv = inv_service.create_invoice(
            organization_id=organization_id, created_by=created_by,
            customer_id=quote.customer_id, invoice_number=invoice_number,
            _skip_recalculate=True,
            invoice_type=InvoiceType.STANDARD, issue_date=issue_date,
            due_date=due_date,
            discount_percentage=quote.discount_percentage,
            currency=quote.currency, quotation_id=quote_id,
        )
        for item in quote.items:
            inv_service.add_item(
                invoice_id=inv.id, organization_id=organization_id,
                line_number=item.line_number,
                description=item.description, quantity=item.quantity,
                unit_price=item.unit_price,
                discount_percentage=item.discount_percentage,
                discount_amount=item.discount_amount,
                tax_percentage=item.tax_percentage, tax_amount=item.tax_amount,
                total=item.total_amount,
            )
        inv_service.recalculate_invoice(inv.id, organization_id)
        quote.status = QuoteStatus.CONVERTED
        quote.converted_to_invoice_id = inv.id
        safe_commit_and_refresh(self.db, quote)
        self.audit.log(organization_id, created_by, BillingAuditAction.CREATE, "Invoice", inv.id)
        return inv
