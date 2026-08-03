"""
Email service for sending approval workflow notifications and Billing module emails.
Templates are stored in app/email_templates/ as HTML files.
Uses SMTP settings from PlatformSetting table (falls back to app.config.settings).
"""

import os
import re
import ssl
import smtplib
import logging
import certifi
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication

logger = logging.getLogger("zoiko")

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "email_templates")

_IF_BLOCK_RE = re.compile(r"\{\{#if (\w+)\}\}(.*?)\{\{/if\}\}", re.DOTALL)
_TAG_RE = re.compile(r"<[^>]+>")


def _load_template(name: str) -> str:
    """Load an HTML email template from the templates directory."""
    path = os.path.join(TEMPLATE_DIR, name)
    if not os.path.exists(path):
        logger.warning(f"Email template not found: {path}")
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _render_template(template: str, context: dict) -> str:
    """Template renderer: evaluates {{#if key}}...{{/if}} conditional blocks
    (rendered only when context[key] is truthy), then replaces {{key}} with
    the corresponding context value.
    """
    def _eval_if(match):
        key, inner = match.group(1), match.group(2)
        return inner if context.get(key) else ""

    result = _IF_BLOCK_RE.sub(_eval_if, template)
    for key, value in context.items():
        if value is None:
            value = ""
        result = result.replace("{{" + key + "}}", str(value))
    return result


def _html_to_text(html: str) -> str:
    """Small HTML->text conversion used for the multipart 'alternative' plain-text part."""
    text = re.sub(r"(?i)<br\s*/?>|</p>|</div>|</tr>|</li>", "\n", html)
    text = _TAG_RE.sub("", text)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n[ \t]+", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _get_smtp_settings(db=None) -> dict:
    """Read SMTP settings from PlatformSetting table. Returns dict with keys:
    host, port, username, password, from_email, use_tls.
    Falls back to app.config.settings (environment-configured) if the DB is
    unavailable or the platform_settings rows aren't populated.
    """
    from app.config import settings as _settings
    defaults = {
        "host": _settings.SMTP_HOST,
        "port": _settings.SMTP_PORT,
        "username": _settings.SMTP_USERNAME,
        "password": _settings.SMTP_PASSWORD,
        "from_email": _settings.SMTP_FROM_EMAIL,
        "use_tls": _settings.SMTP_USE_TLS,
    }
    try:
        from app.modules.super_admin.models import PlatformSetting

        own_session = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            own_session = True
        try:
            settings = db.query(PlatformSetting).filter(
                PlatformSetting.category == "email"
            ).all()
            mapping = {s.key: s.value for s in settings if s.value}
            return {
                "host": mapping.get("smtp_host", defaults["host"]),
                "port": mapping.get("smtp_port", defaults["port"]),
                "username": mapping.get("smtp_username", defaults["username"]),
                "password": mapping.get("smtp_password", defaults["password"]),
                "from_email": mapping.get("smtp_from_email", defaults["from_email"]),
                "use_tls": mapping.get("smtp_use_tls", defaults["use_tls"]),
            }
        finally:
            if own_session:
                db.close()
    except Exception as e:
        logger.warning(f"[email] Could not load SMTP settings from DB, using defaults: {e}")
        return defaults


_BRANDING_DEFAULTS = {
    "company_name": "Zoiko One",
    "support_email": "",
    "website": "",
    "logo_url": "",
    "invoice_footer": "",
}


def _get_org_branding(organization_id=None, db=None) -> dict:
    """Look up BillingConfiguration for organization_id and return the
    template-context branding fields, with safe fallbacks. Returns the
    platform defaults if organization_id is None or the lookup fails.
    """
    if not organization_id:
        return dict(_BRANDING_DEFAULTS)
    try:
        from app.modules.billing.services.settings_service import BillingConfigurationService

        own_session = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            own_session = True
        try:
            config = BillingConfigurationService(db).get_configuration(organization_id)
            return {
                "company_name": config.company_name or _BRANDING_DEFAULTS["company_name"],
                "support_email": config.billing_email or "",
                "website": config.website or "",
                "logo_url": config.logo_url or "",
                "invoice_footer": config.invoice_footer or "",
            }
        finally:
            if own_session:
                db.close()
    except Exception as e:
        logger.warning(f"[email] Could not load org branding for organization_id={organization_id}: {e}")
        return dict(_BRANDING_DEFAULTS)


def send_approval_email(
    email: str,
    template_name: str,
    context: dict,
    db=None,
    organization_id=None,
    attachments=None,
    from_email_override=None,
    from_display_name_override=None,
    template_body: str = None,
) -> bool:
    """Send an email via SMTP.

    attachments: optional list of (filename, bytes) tuples, attached as
    application/pdf parts.

    from_email_override / from_display_name_override: optional per-org
    "From" identity override (e.g. from Payroll's PayrollEmailSettings).
    Sent through this same shared SMTP connection — not a separate mail
    server. None (the default) preserves the existing platform-wide
    behavior for every current caller.
    template_body: optional raw HTML body that overrides the on-disk
    template. Used by billing flows whose org-level BillingConfiguration
    supplies a custom template (e.g. dunning_email_template /
    final_notice_template) — the branding/context rendering and SMTP
    delivery path stay identical.
    """
    if template_body is not None:
        template = template_body
    else:
        template = _load_template(template_name)
    if not template:
        logger.warning(f"Cannot send email to {email}: template {template_name} not found")
        return False

    branding = _get_org_branding(organization_id, db=db)
    full_context = {**branding, **context}
    body = _render_template(template, full_context)
    smtp = _get_smtp_settings(db=db)

    subject = context.get("subject", "Zoiko One — Notification")
    # Envelope sender (MAIL FROM) always stays the authenticated SMTP account —
    # most relays (incl. this one) reject or misdeliver mail whose envelope
    # sender doesn't match the logged-in account, and it keeps SPF aligned.
    # from_email_override only changes the visible "From" header, so a tenant
    # can look like the sender to recipients without new SMTP credentials.
    envelope_from = smtp["from_email"]
    header_from = from_email_override or envelope_from
    to_email = email
    sender_name = from_display_name_override or full_context.get("company_name") or "Zoiko One"
    reply_to = full_context.get("support_email")

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{sender_name} <{header_from}>"
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to
    # "alternative" parts are attached least-preferred first: plain text, then HTML.
    msg.attach(MIMEText(_html_to_text(body), "plain", "utf-8"))
    msg.attach(MIMEText(body, "html", "utf-8"))

    if attachments:
        for filename, data in attachments:
            part = MIMEApplication(data, _subtype="pdf")
            part.add_header("Content-Disposition", "attachment", filename=filename)
            msg.attach(part)

    try:
        port = int(smtp["port"])
        use_tls = str(smtp.get("use_tls", "true")).strip().lower() in ("1", "true", "yes")
        # Use certifi's CA bundle rather than the OS trust store: on several
        # deployment hosts (minimal containers, some Windows setups) the OS
        # store is missing the issuer chain for the SMTP host's certificate,
        # causing CERTIFICATE_VERIFY_FAILED on every send. That exception was
        # being caught below and swallowed to `False`, so invoices looked
        # "sent" while every email silently failed.
        context_ssl = ssl.create_default_context(cafile=certifi.where())

        if use_tls and port != 465:
            # STARTTLS (e.g. port 587): plain connection, then upgrade to TLS.
            with smtplib.SMTP(smtp["host"], port, timeout=30) as server:
                server.starttls(context=context_ssl)
                if smtp["username"] and smtp["password"]:
                    server.login(smtp["username"], smtp["password"])
                server.sendmail(envelope_from, to_email, msg.as_string())
        else:
            # Implicit TLS (e.g. port 465).
            with smtplib.SMTP_SSL(smtp["host"], port, context=context_ssl, timeout=30) as server:
                if smtp["username"] and smtp["password"]:
                    server.login(smtp["username"], smtp["password"])
                server.sendmail(envelope_from, to_email, msg.as_string())

        logger.info(f"[email] Sent to {to_email} | template={template_name}")
        return True
    except Exception as e:
        logger.error(f"[email] Failed to send to {to_email} | template={template_name} | error={e}")
        return False


def send_registration_received(email: str, org_name: str, db=None):
    return send_approval_email(email, "registration_received.html", {
        "subject": f"Registration Received — {org_name} | Zoiko One",
        "organization_name": org_name,
    }, db=db)


LOGIN_URL = "https://zoikoone.com/login"


def send_approved(email: str, org_name: str, login_url: str = LOGIN_URL, db=None):
    return send_approval_email(email, "approved.html", {
        "subject": f"Registration Approved — {org_name} | Zoiko One",
        "organization_name": org_name,
        "login_url": login_url,
    }, db=db)


def send_rejected(email: str, org_name: str, reason: str, db=None):
    return send_approval_email(email, "rejected.html", {
        "subject": f"Registration Rejected — {org_name} | Zoiko One",
        "organization_name": org_name,
        "reason": reason,
    }, db=db)


def send_suspended(email: str, org_name: str, db=None):
    return send_approval_email(email, "suspended.html", {
        "subject": f"Account Suspended — {org_name} | Zoiko One",
        "organization_name": org_name,
    }, db=db)


def send_reactivated(email: str, org_name: str, login_url: str = LOGIN_URL, db=None):
    return send_approval_email(email, "reactivated.html", {
        "subject": f"Account Reactivated — {org_name} | Zoiko One",
        "organization_name": org_name,
        "login_url": login_url,
    }, db=db)


def send_password_reset(email: str, temp_password: str, first_name: str, db=None):
    return send_approval_email(email, "password_reset.html", {
        "subject": "Password Reset — Zoiko One",
        "first_name": first_name,
        "temporary_password": temp_password,
        "login_url": LOGIN_URL,
    }, db=db)


def send_invoice_email(
    email: str,
    customer_name: str,
    invoice_number: str,
    issue_date: str,
    due_date: str,
    total_amount: str,
    currency: str = "USD",
    notes: str = "",
    organization_id=None,
    db=None,
    pdf_bytes: bytes = None,
    pdf_filename: str = None,
) -> bool:
    attachments = [(pdf_filename or f"{invoice_number}.pdf", pdf_bytes)] if pdf_bytes else None
    return send_approval_email(email, "invoice_sent.html", {
        "subject": f"Invoice {invoice_number} — Zoiko One",
        "customer_name": customer_name,
        "invoice_number": invoice_number,
        "issue_date": issue_date,
        "due_date": due_date,
        "total_amount": total_amount,
        "currency": currency,
        "notes": notes,
    }, db=db, organization_id=organization_id, attachments=attachments)


# ── Billing Module Emails ────────────────────────────────────────────────


def send_quote_email(
    email: str,
    customer_name: str,
    quote_number: str,
    issue_date: str,
    valid_until: str,
    total_amount: str,
    currency: str = "USD",
    notes: str = "",
    organization_id=None,
    db=None,
    pdf_bytes: bytes = None,
    pdf_filename: str = None,
) -> bool:
    attachments = [(pdf_filename or f"{quote_number}.pdf", pdf_bytes)] if pdf_bytes else None
    return send_approval_email(email, "quote_sent.html", {
        "subject": f"Quotation {quote_number} — Zoiko One",
        "customer_name": customer_name,
        "quote_number": quote_number,
        "issue_date": issue_date,
        "valid_until": valid_until,
        "total_amount": total_amount,
        "currency": currency,
        "notes": notes,
    }, db=db, organization_id=organization_id, attachments=attachments)


def send_dunning_reminder_email(
    email: str,
    customer_name: str,
    invoice_number: str,
    days_overdue: str,
    overdue_amount: str,
    currency: str = "USD",
    late_fee: str = "0",
    organization_id=None,
    db=None,
    template_name: str = "dunning_reminder.html",
    custom_body: str = None,
    subject_override: str = None,
) -> bool:
    return send_approval_email(email, template_name, {
        "subject": subject_override or f"Payment Reminder — Invoice {invoice_number} | Zoiko One",
        "customer_name": customer_name,
        "invoice_number": invoice_number,
        "days_overdue": days_overdue,
        "overdue_amount": overdue_amount,
        "currency": currency,
        "late_fee": late_fee,
    }, db=db, organization_id=organization_id, template_body=custom_body)


def send_contract_activated_email(
    email: str,
    customer_name: str,
    contract_number: str,
    start_date: str,
    end_date: str,
    total_amount: str,
    currency: str = "USD",
    organization_id=None,
    db=None,
) -> bool:
    return send_approval_email(email, "contract_activated.html", {
        "subject": f"Contract Activated — {contract_number} | Zoiko One",
        "customer_name": customer_name,
        "contract_number": contract_number,
        "start_date": start_date,
        "end_date": end_date,
        "total_amount": total_amount,
        "currency": currency,
    }, db=db, organization_id=organization_id)


def send_contract_renewed_email(
    email: str,
    customer_name: str,
    contract_number: str,
    new_end_date: str,
    total_amount: str,
    currency: str = "USD",
    organization_id=None,
    db=None,
) -> bool:
    return send_approval_email(email, "contract_renewed.html", {
        "subject": f"Contract Renewed — {contract_number} | Zoiko One",
        "customer_name": customer_name,
        "contract_number": contract_number,
        "new_end_date": new_end_date,
        "total_amount": total_amount,
        "currency": currency,
    }, db=db, organization_id=organization_id)


def send_subscription_renewed_email(
    email: str,
    customer_name: str,
    subscription_number: str,
    plan_name: str,
    term_start: str,
    term_end: str,
    amount: str,
    currency: str = "USD",
    organization_id=None,
    db=None,
) -> bool:
    return send_approval_email(email, "subscription_renewed.html", {
        "subject": f"Subscription Renewed — {subscription_number} | Zoiko One",
        "customer_name": customer_name,
        "subscription_number": subscription_number,
        "plan_name": plan_name,
        "term_start": term_start,
        "term_end": term_end,
        "amount": amount,
        "currency": currency,
    }, db=db, organization_id=organization_id)


def send_past_due_notice_email(
    email: str,
    customer_name: str,
    subscription_number: str,
    plan_name: str,
    days_overdue: str,
    overdue_amount: str,
    currency: str = "USD",
    organization_id=None,
    db=None,
) -> bool:
    return send_approval_email(email, "past_due_notice.html", {
        "subject": f"Subscription Past Due — {subscription_number} | Zoiko One",
        "customer_name": customer_name,
        "subscription_number": subscription_number,
        "plan_name": plan_name,
        "days_overdue": days_overdue,
        "overdue_amount": overdue_amount,
        "currency": currency,
    }, db=db, organization_id=organization_id)


def send_collections_notice_email(
    email: str,
    customer_name: str,
    invoice_number: str,
    days_overdue: str,
    overdue_amount: str,
    currency: str = "USD",
    late_fee: str = "0",
    organization_id=None,
    db=None,
    custom_body: str = None,
) -> bool:
    """Final-stage notice used when a debt is escalated to collections. Uses
    the same invoice-friendly reminder layout as dunning (optionally
    overridden by BillingConfiguration.final_notice_template) but under a
    clear 'collections' subject."""
    return send_approval_email(email, "dunning_reminder.html", {
        "subject": f"Collections Notice — Invoice {invoice_number} | Zoiko One",
        "customer_name": customer_name,
        "invoice_number": invoice_number,
        "days_overdue": days_overdue,
        "overdue_amount": overdue_amount,
        "currency": currency,
        "late_fee": late_fee,
    }, db=db, organization_id=organization_id, template_body=custom_body)


def send_payment_receipt_email(
    email: str,
    customer_name: str,
    payment_number: str,
    payment_date: str,
    amount: str,
    currency: str = "USD",
    payment_method: str = "",
    organization_id=None,
    db=None,
) -> bool:
    return send_approval_email(email, "payment_received.html", {
        "subject": f"Payment Received — {payment_number} | Zoiko One",
        "customer_name": customer_name,
        "payment_number": payment_number,
        "payment_date": payment_date,
        "amount": amount,
        "currency": currency,
        "payment_method": payment_method,
    }, db=db, organization_id=organization_id)


def send_refund_email(
    email: str,
    customer_name: str,
    refund_number: str,
    refund_date: str,
    amount: str,
    currency: str = "USD",
    reason: str = "",
    organization_id=None,
    db=None,
    pdf_bytes: bytes = None,
    pdf_filename: str = None,
) -> bool:
    attachments = [(pdf_filename or f"{refund_number}.pdf", pdf_bytes)] if pdf_bytes else None
    return send_approval_email(email, "refund_processed.html", {
        "subject": f"Refund Processed — {refund_number} | Zoiko One",
        "customer_name": customer_name,
        "refund_number": refund_number,
        "refund_date": refund_date,
        "amount": amount,
        "currency": currency,
        "reason": reason,
    }, db=db, organization_id=organization_id, attachments=attachments)


def send_write_off_email(
    email: str,
    customer_name: str,
    write_off_number: str,
    write_off_date: str,
    amount: str,
    currency: str = "USD",
    reason: str = "",
    organization_id=None,
    db=None,
    pdf_bytes: bytes = None,
    pdf_filename: str = None,
) -> bool:
    attachments = [(pdf_filename or f"{write_off_number}.pdf", pdf_bytes)] if pdf_bytes else None
    return send_approval_email(email, "write_off_executed.html", {
        "subject": f"Account Adjustment — {write_off_number} | Zoiko One",
        "customer_name": customer_name,
        "write_off_number": write_off_number,
        "write_off_date": write_off_date,
        "amount": amount,
        "currency": currency,
        "reason": reason,
    }, db=db, organization_id=organization_id, attachments=attachments)


# ── Payroll Module Emails ────────────────────────────────────────────────


def _resolve_payroll_send_identity(organization_id, db=None):
    """Look up this org's PayrollEmailSettings from-identity override, if
    any. Returns (from_email, from_display_name), both None when the org
    hasn't configured one (i.e. keep using the platform default)."""
    if not organization_id:
        return None, None
    try:
        from app.modules.payroll.mail.service import resolve_send_identity

        own_session = False
        if db is None:
            from app.database import SessionLocal
            db = SessionLocal()
            own_session = True
        try:
            return resolve_send_identity(db, organization_id)
        finally:
            if own_session:
                db.close()
    except Exception as e:
        logger.warning(f"[email] Could not resolve payroll send identity for org={organization_id}: {e}")
        return None, None


def send_payslip_ready_email(
    email: str,
    employee_name: str,
    pay_period: str,
    organization_id=None,
    db=None,
    pdf_bytes: bytes = None,
    pdf_filename: str = None,
) -> bool:
    from_email, from_display_name = _resolve_payroll_send_identity(organization_id, db=db)
    attachments = [(pdf_filename or "payslip.pdf", pdf_bytes)] if pdf_bytes else None
    return send_approval_email(email, "payslip_ready.html", {
        "subject": f"Your Payslip is Ready — {pay_period} | Zoiko One",
        "employee_name": employee_name,
        "pay_period": pay_period,
    }, db=db, organization_id=organization_id, attachments=attachments,
        from_email_override=from_email, from_display_name_override=from_display_name)


def send_payroll_run_approved_email(
    email: str,
    employee_name: str,
    pay_period: str,
    organization_id=None,
    db=None,
) -> bool:
    from_email, from_display_name = _resolve_payroll_send_identity(organization_id, db=db)
    return send_approval_email(email, "payroll_run_approved.html", {
        "subject": f"Payroll Approved — {pay_period} | Zoiko One",
        "employee_name": employee_name,
        "pay_period": pay_period,
    }, db=db, organization_id=organization_id,
        from_email_override=from_email, from_display_name_override=from_display_name)


def send_leave_request_received_email(
    email: str,
    employee_name: str,
    start_date: str,
    end_date: str,
    request_code: str,
    organization_id=None,
    db=None,
) -> bool:
    from_email, from_display_name = _resolve_payroll_send_identity(organization_id, db=db)
    return send_approval_email(email, "leave_request_received.html", {
        "subject": f"Leave Request Received — {request_code} | Zoiko One",
        "employee_name": employee_name,
        "start_date": start_date,
        "end_date": end_date,
        "request_code": request_code,
    }, db=db, organization_id=organization_id,
        from_email_override=from_email, from_display_name_override=from_display_name)


def send_credit_note_email(
    email: str,
    customer_name: str,
    credit_note_number: str,
    issue_date: str,
    total_amount: str,
    currency: str = "USD",
    reason: str = "",
    organization_id=None,
    db=None,
    pdf_bytes: bytes = None,
    pdf_filename: str = None,
) -> bool:
    attachments = [(pdf_filename or f"{credit_note_number}.pdf", pdf_bytes)] if pdf_bytes else None
    return send_approval_email(email, "credit_note_issued.html", {
        "subject": f"Credit Note {credit_note_number} — Zoiko One",
        "customer_name": customer_name,
        "credit_note_number": credit_note_number,
        "issue_date": issue_date,
        "total_amount": total_amount,
        "currency": currency,
        "reason": reason,
    }, db=db, organization_id=organization_id, attachments=attachments)
