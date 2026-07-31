"""
PDF generation for invoices and quotations, attached to outgoing billing emails.
Uses reportlab (already a project dependency — see payroll/service.py for the
payslip-generation precedent).
"""

from io import BytesIO
from typing import Any, List, Optional

from app.modules.billing.utils.currency_utils import get_currency_decimal_digits, round_money


def _fmt_money(value: Any, currency: str = "") -> str:
    try:
        digits = get_currency_decimal_digits(currency) if currency else 2
        amount = f"{round_money(value or 0, currency):,.{digits}f}"
    except (TypeError, ValueError, ArithmeticError):
        amount = "0.00"
    return f"{currency} {amount}".strip()


def _fmt_date(value: Any) -> str:
    if not value:
        return ""
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%d")
    return str(value)


def _fetch_logo_flowable(logo_url: Optional[str], max_width_mm: float = 35, max_height_mm: float = 18):
    """
    Best-effort fetch of the organization's logo (a plain external URL configured
    in Billing Settings) for the PDF header, scaled to fit within max_width/
    max_height while preserving aspect ratio. Returns a reportlab Image flowable,
    or None if there's no URL configured, the URL is unreachable, or the content
    isn't a valid image — PDF generation must never fail because of a broken
    logo URL (same fail-open policy already used for the rest of this module).
    """
    if not logo_url:
        return None
    try:
        import httpx
        from reportlab.lib.units import mm
        from reportlab.platypus import Image
        from PIL import Image as PILImage

        resp = httpx.get(logo_url, timeout=5.0, follow_redirects=True)
        resp.raise_for_status()
        raw = BytesIO(resp.content)
        pil_img = PILImage.open(raw)
        pil_img.load()
        width_px, height_px = pil_img.size
        if width_px <= 0 or height_px <= 0:
            return None

        max_w, max_h = max_width_mm * mm, max_height_mm * mm
        aspect = width_px / height_px
        draw_w, draw_h = max_w, max_w / aspect
        if draw_h > max_h:
            draw_h = max_h
            draw_w = max_h * aspect

        raw.seek(0)
        return Image(raw, width=draw_w, height=draw_h)
    except Exception:
        return None


def _build_document(
    title: str,
    document_number: str,
    accent_color: str,
    org_name: str,
    org_address_lines: List[str],
    customer_name: str,
    customer_address_lines: List[str],
    detail_rows: List[tuple],
    item_rows: List[tuple],
    currency: str,
    subtotal: Any,
    discount_amount: Any,
    tax_amount: Any,
    total_amount: Any,
    org_logo_url: Optional[str] = None,
    shipping_amount: Any = None,
    round_off: Any = None,
    notes: Optional[str] = None,
    footer_text: Optional[str] = None,
) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer,
    )

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        topMargin=20 * mm, bottomMargin=20 * mm, leftMargin=18 * mm, rightMargin=18 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("DocTitle", parent=styles["Title"], textColor=colors.HexColor(accent_color), fontSize=20)
    normal = styles["Normal"]
    small = ParagraphStyle("Small", parent=styles["Normal"], fontSize=9, textColor=colors.HexColor("#6b7280"))
    bold = ParagraphStyle("Bold", parent=styles["Normal"], fontSize=11, fontName="Helvetica-Bold")

    elements = []
    org_name_style = ParagraphStyle("OrgName", parent=bold, fontSize=14)
    org_text_block = [Paragraph(org_name or "Zoiko One", org_name_style)]
    for line in org_address_lines:
        if line:
            org_text_block.append(Paragraph(line, small))

    logo_flowable = _fetch_logo_flowable(org_logo_url)
    if logo_flowable is not None:
        # Logo on the right, org name/address text on the left — mirrors the
        # on-screen invoice preview's layout so the printed document isn't a
        # surprise. Text is always kept (not replaced by the logo) so the PDF
        # still identifies the org even if the logo fails to render for the
        # recipient's PDF viewer.
        logo_header = Table(
            [[org_text_block, logo_flowable]],
            colWidths=[120 * mm, 50 * mm],
        )
        logo_header.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ]))
        elements.append(logo_header)
    else:
        elements.extend(org_text_block)

    elements.append(Spacer(1, 10 * mm))
    elements.append(Paragraph(f"{title} {document_number}", title_style))
    elements.append(Spacer(1, 6 * mm))

    bill_to = [Paragraph("Bill To:", bold), Paragraph(customer_name or "", normal)]
    for line in customer_address_lines:
        if line:
            bill_to.append(Paragraph(line, small))

    detail_table_data = [[Paragraph(f"<b>{label}</b>", small), Paragraph(str(value), normal)] for label, value in detail_rows]
    header_table = Table(
        [[bill_to, detail_table_data]],
        colWidths=[90 * mm, 80 * mm],
    )
    header_table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP")]))
    elements.append(header_table)
    elements.append(Spacer(1, 8 * mm))

    item_header = ["Description", "Qty", "Unit Price", "Tax", "Total"]
    table_data = [item_header] + [
        [Paragraph(str(desc), normal), qty, _fmt_money(unit_price), _fmt_money(tax), _fmt_money(total)]
        for desc, qty, unit_price, tax, total in item_rows
    ]
    items_table = Table(table_data, colWidths=[70 * mm, 20 * mm, 30 * mm, 25 * mm, 25 * mm], repeatRows=1)
    items_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(accent_color)),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f9fafb")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(items_table)
    elements.append(Spacer(1, 6 * mm))

    totals_data = [
        ["Subtotal", _fmt_money(subtotal, currency)],
        ["Discount", _fmt_money(discount_amount, currency)],
        ["Tax", _fmt_money(tax_amount, currency)],
    ]
    if shipping_amount:
        totals_data.append(["Shipping", _fmt_money(shipping_amount, currency)])
    if round_off:
        totals_data.append(["Round Off", _fmt_money(round_off, currency)])
    totals_data.append(["Total", _fmt_money(total_amount, currency)])
    totals_table = Table(totals_data, colWidths=[130 * mm, 40 * mm], hAlign="RIGHT")
    totals_table.setStyle(TableStyle([
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold"),
        ("FONTSIZE", (0, -1), (-1, -1), 12),
        ("LINEABOVE", (0, -1), (-1, -1), 0.75, colors.HexColor(accent_color)),
        ("TOPPADDING", (0, -1), (-1, -1), 6),
    ]))
    elements.append(totals_table)

    if notes:
        elements.append(Spacer(1, 8 * mm))
        elements.append(Paragraph("<b>Notes</b>", small))
        elements.append(Paragraph(notes, normal))

    if footer_text:
        elements.append(Spacer(1, 10 * mm))
        elements.append(Paragraph(footer_text, small))

    doc.build(elements)
    return buffer.getvalue()


def _org_address_lines(org_config) -> List[str]:
    if not org_config:
        return []
    return [
        getattr(org_config, "address_line1", None),
        getattr(org_config, "address_line2", None),
        ", ".join(filter(None, [
            getattr(org_config, "city", None),
            getattr(org_config, "state", None),
            getattr(org_config, "postal_code", None),
        ])),
        getattr(org_config, "country", None),
        getattr(org_config, "website", None),
        (getattr(org_config, "gst_number", None) or getattr(org_config, "vat_number", None)
         or getattr(org_config, "business_registration_number", None)),
    ]


def generate_invoice_pdf(invoice, customer, items, org_config=None) -> bytes:
    """Render a simple, clean invoice PDF. `items` is a list of InvoiceItem rows."""
    org_name = getattr(org_config, "company_name", None) or "Zoiko One"
    org_address_lines = _org_address_lines(org_config)
    org_logo_url = getattr(org_config, "invoice_logo_url", None) or getattr(org_config, "logo_url", None)

    customer_address_lines = [
        getattr(customer, "billing_address", None),
        getattr(customer, "billing_country", None),
        getattr(customer, "email", None),
    ]

    currency = invoice.currency or "USD"
    detail_rows = [
        ("Issue Date", _fmt_date(invoice.issue_date)),
        ("Due Date", _fmt_date(invoice.due_date)),
        ("Status", (invoice.status.value if hasattr(invoice.status, "value") else str(invoice.status)).title()),
    ]
    if getattr(invoice, "payment_terms", None):
        detail_rows.append(("Payment Terms", invoice.payment_terms.replace("_", " ").title()))
    if getattr(invoice, "po_number", None):
        detail_rows.append(("PO Number", invoice.po_number))
    item_rows = [
        (item.description, str(item.quantity), item.unit_price, item.tax_amount, item.total)
        for item in items
    ]
    footer = getattr(org_config, "invoice_footer", None) or getattr(org_config, "invoice_terms", None)

    return _build_document(
        title="Invoice",
        document_number=invoice.invoice_number or f"#{invoice.id}",
        accent_color="#7C3AED",
        org_name=org_name,
        org_address_lines=org_address_lines,
        org_logo_url=org_logo_url,
        customer_name=getattr(customer, "display_name", None) or getattr(customer, "company_name", ""),
        customer_address_lines=customer_address_lines,
        detail_rows=detail_rows,
        item_rows=item_rows,
        currency=currency,
        subtotal=invoice.subtotal,
        discount_amount=invoice.discount_amount,
        tax_amount=invoice.tax_amount,
        shipping_amount=getattr(invoice, "shipping_amount", None),
        round_off=getattr(invoice, "round_off", None),
        total_amount=invoice.total_amount,
        notes=getattr(invoice, "notes", None),
        footer_text=footer,
    )


def generate_credit_note_pdf(credit_note, customer, org_config=None) -> bytes:
    """Render a simple, clean credit note PDF. Credit notes have no line
    items (a single lump-sum amount, unlike invoices/quotes) so the "items"
    table gets one synthetic row summarizing the credit."""
    org_name = getattr(org_config, "company_name", None) or "Zoiko One"
    org_address_lines = _org_address_lines(org_config)
    org_logo_url = getattr(org_config, "invoice_logo_url", None) or getattr(org_config, "logo_url", None)

    customer_address_lines = [
        getattr(customer, "billing_address", None),
        getattr(customer, "billing_country", None),
        getattr(customer, "email", None),
    ]

    currency = credit_note.currency or "USD"
    credit_note_type = credit_note.credit_note_type
    type_label = (credit_note_type.value if hasattr(credit_note_type, "value") else str(credit_note_type)).replace("_", " ").title()
    status = credit_note.status
    status_label = (status.value if hasattr(status, "value") else str(status)).replace("_", " ").title()

    detail_rows = [
        ("Issue Date", _fmt_date(credit_note.issue_date)),
        ("Type", type_label),
        ("Status", status_label),
    ]
    if getattr(credit_note, "invoice_id", None):
        detail_rows.append(("Against Invoice", f"#{credit_note.invoice_id}"))

    item_rows = [
        (credit_note.reason or "Credit note", "1", credit_note.subtotal, credit_note.tax_amount, credit_note.subtotal + (credit_note.tax_amount or 0) - (credit_note.discount_amount or 0)),
    ]

    return _build_document(
        title="Credit Note",
        document_number=credit_note.credit_note_number or f"#{credit_note.id}",
        accent_color="#DC2626",
        org_name=org_name,
        org_address_lines=org_address_lines,
        org_logo_url=org_logo_url,
        customer_name=getattr(customer, "display_name", None) or getattr(customer, "company_name", ""),
        customer_address_lines=customer_address_lines,
        detail_rows=detail_rows,
        item_rows=item_rows,
        currency=currency,
        subtotal=credit_note.subtotal,
        discount_amount=getattr(credit_note, "discount_amount", None),
        tax_amount=credit_note.tax_amount,
        total_amount=credit_note.total_amount,
        notes=getattr(credit_note, "reason", None),
        footer_text=getattr(org_config, "invoice_footer", None),
    )


def generate_refund_pdf(refund, customer, org_config=None) -> bytes:
    """Render a simple, clean refund receipt PDF. Refunds have no line items
    (a single lump-sum amount, like credit notes) so the "items" table gets
    one synthetic row summarizing the refund."""
    org_name = getattr(org_config, "company_name", None) or "Zoiko One"
    org_address_lines = _org_address_lines(org_config)
    org_logo_url = getattr(org_config, "invoice_logo_url", None) or getattr(org_config, "logo_url", None)

    customer_address_lines = [
        getattr(customer, "billing_address", None),
        getattr(customer, "billing_country", None),
        getattr(customer, "email", None),
    ]

    currency = refund.currency or "USD"
    refund_type = refund.refund_type
    type_label = (refund_type.value if hasattr(refund_type, "value") else str(refund_type)).replace("_", " ").title()
    refund_status = refund.status
    status_label = (refund_status.value if hasattr(refund_status, "value") else str(refund_status)).replace("_", " ").title()
    refund_method = getattr(refund, "refund_method", None)
    method_label = (refund_method.value if hasattr(refund_method, "value") else str(refund_method)).replace("_", " ").title() if refund_method else None

    detail_rows = [
        ("Refund Date", _fmt_date(refund.completed_at) or _fmt_date(refund.created_at)),
        ("Type", type_label),
        ("Status", status_label),
    ]
    if method_label:
        detail_rows.append(("Method", method_label))
    if getattr(refund, "payment_id", None):
        detail_rows.append(("Against Payment", f"#{refund.payment_id}"))
    if getattr(refund, "invoice_id", None):
        detail_rows.append(("Against Invoice", f"#{refund.invoice_id}"))
    if getattr(refund, "credit_note_id", None):
        detail_rows.append(("Against Credit Note", f"#{refund.credit_note_id}"))
    if getattr(refund, "reference_number", None):
        detail_rows.append(("Reference #", refund.reference_number))

    item_rows = [
        (refund.reason or "Refund", "1", refund.amount, 0, refund.amount),
    ]

    return _build_document(
        title="Refund Receipt",
        document_number=refund.refund_number or f"#{refund.id}",
        accent_color="#0EA5E9",
        org_name=org_name,
        org_address_lines=org_address_lines,
        org_logo_url=org_logo_url,
        customer_name=getattr(customer, "display_name", None) or getattr(customer, "company_name", ""),
        customer_address_lines=customer_address_lines,
        detail_rows=detail_rows,
        item_rows=item_rows,
        currency=currency,
        subtotal=refund.amount,
        discount_amount=0,
        tax_amount=0,
        total_amount=refund.amount,
        notes=getattr(refund, "reason", None),
        footer_text=getattr(org_config, "invoice_footer", None),
    )


def generate_write_off_pdf(write_off, customer, org_config=None) -> bytes:
    """Render a simple, clean write-off notice PDF. Write-offs have no line
    items (a single lump-sum amount, like credit notes/refunds) so the
    "items" table gets one synthetic row summarizing the write-off."""
    org_name = getattr(org_config, "company_name", None) or "Zoiko One"
    org_address_lines = _org_address_lines(org_config)
    org_logo_url = getattr(org_config, "invoice_logo_url", None) or getattr(org_config, "logo_url", None)

    customer_address_lines = [
        getattr(customer, "billing_address", None),
        getattr(customer, "billing_country", None),
        getattr(customer, "email", None),
    ]

    currency = write_off.currency or "USD"
    write_off_type = write_off.write_off_type
    type_label = (write_off_type.value if hasattr(write_off_type, "value") else str(write_off_type)).replace("_", " ").title()
    wo_status = write_off.status
    status_label = (wo_status.value if hasattr(wo_status, "value") else str(wo_status)).replace("_", " ").title()
    adjustment_type = getattr(write_off, "adjustment_type", None)
    adjustment_label = (adjustment_type.value if hasattr(adjustment_type, "value") else str(adjustment_type)).replace("_", " ").title() if adjustment_type else None

    detail_rows = [
        ("Write-off Date", _fmt_date(write_off.executed_at) or _fmt_date(write_off.created_at)),
        ("Type", type_label),
        ("Status", status_label),
    ]
    if adjustment_label:
        detail_rows.append(("Adjustment Type", adjustment_label))
    if getattr(write_off, "invoice_id", None):
        detail_rows.append(("Against Invoice", f"#{write_off.invoice_id}"))

    item_rows = [
        (write_off.reason or "Write-off", "1", write_off.amount, 0, write_off.amount),
    ]

    return _build_document(
        title="Write-off Notice",
        document_number=write_off.write_off_number or f"#{write_off.id}",
        accent_color="#B45309",
        org_name=org_name,
        org_address_lines=org_address_lines,
        org_logo_url=org_logo_url,
        customer_name=getattr(customer, "display_name", None) or getattr(customer, "company_name", ""),
        customer_address_lines=customer_address_lines,
        detail_rows=detail_rows,
        item_rows=item_rows,
        currency=currency,
        subtotal=write_off.amount,
        discount_amount=0,
        tax_amount=0,
        total_amount=write_off.amount,
        notes=getattr(write_off, "notes", None) or getattr(write_off, "reason", None),
        footer_text=getattr(org_config, "invoice_footer", None),
    )


def generate_quote_pdf(quote, customer, items, org_config=None) -> bytes:
    """Render a simple, clean quotation PDF. `items` is a list of QuotationItem rows."""
    org_name = getattr(org_config, "company_name", None) or "Zoiko One"
    org_address_lines = _org_address_lines(org_config)
    org_logo_url = getattr(org_config, "invoice_logo_url", None) or getattr(org_config, "logo_url", None)

    customer_address_lines = [
        getattr(customer, "billing_address", None),
        getattr(customer, "billing_country", None),
        getattr(customer, "email", None),
    ]

    currency = quote.currency or "USD"
    detail_rows = [
        ("Issue Date", _fmt_date(quote.created_at)),
        ("Valid Until", _fmt_date(quote.valid_until) or "N/A"),
    ]
    item_rows = [
        (item.description, str(item.quantity), item.unit_price, item.tax_amount, item.total_amount)
        for item in items
    ]
    footer = getattr(org_config, "invoice_footer", None) or getattr(quote, "terms", None)

    return _build_document(
        title="Quotation",
        document_number=quote.quote_number,
        accent_color="#7C3AED",
        org_name=org_name,
        org_address_lines=org_address_lines,
        org_logo_url=org_logo_url,
        customer_name=getattr(customer, "display_name", None) or getattr(customer, "company_name", ""),
        customer_address_lines=customer_address_lines,
        detail_rows=detail_rows,
        item_rows=item_rows,
        currency=currency,
        subtotal=quote.subtotal,
        discount_amount=quote.discount_amount,
        tax_amount=quote.tax_amount,
        total_amount=quote.total_amount,
        notes=getattr(quote, "notes", None),
        footer_text=footer,
    )
