"""
Email service for sending approval workflow notifications.
Templates are stored in app/email_templates/ as HTML files.
Uses SMTP settings from PlatformSetting table.
"""

import os
import ssl
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger("zoiko")

TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "email_templates")


def _load_template(name: str) -> str:
    """Load an HTML email template from the templates directory."""
    path = os.path.join(TEMPLATE_DIR, name)
    if not os.path.exists(path):
        logger.warning(f"Email template not found: {path}")
        return ""
    with open(path, "r", encoding="utf-8") as f:
        return f.read()


def _render_template(template: str, context: dict) -> str:
    """Simple template renderer replacing {{key}} with context values."""
    result = template
    for key, value in context.items():
        if value is None:
            value = ""
        result = result.replace("{{" + key + "}}", str(value))
    return result


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


def send_approval_email(email: str, template_name: str, context: dict, db=None) -> bool:
    """Send an approval workflow email via SMTP."""
    template = _load_template(template_name)
    if not template:
        logger.warning(f"Cannot send email to {email}: template {template_name} not found")
        return False

    body = _render_template(template, context)
    smtp = _get_smtp_settings(db=db)

    subject = context.get("subject", "Zoiko One — Notification")
    from_email = smtp["from_email"]
    to_email = email

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"Zoiko One <{from_email}>"
    msg["To"] = to_email
    msg.attach(MIMEText(body, "html", "utf-8"))

    try:
        port = int(smtp["port"])
        context_ssl = ssl.create_default_context()

        with smtplib.SMTP_SSL(smtp["host"], port, context=context_ssl, timeout=30) as server:
            if smtp["username"] and smtp["password"]:
                server.login(smtp["username"], smtp["password"])
            server.sendmail(from_email, to_email, msg.as_string())

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
    db=None,
) -> bool:
    return send_approval_email(email, "invoice_sent.html", {
        "subject": f"Invoice {invoice_number} — Zoiko One",
        "customer_name": customer_name,
        "invoice_number": invoice_number,
        "issue_date": issue_date,
        "due_date": due_date,
        "total_amount": total_amount,
        "currency": currency,
        "notes": notes,
    }, db=db)


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
    db=None,
) -> bool:
    return send_approval_email(email, "quote_sent.html", {
        "subject": f"Quotation {quote_number} — Zoiko One",
        "customer_name": customer_name,
        "quote_number": quote_number,
        "issue_date": issue_date,
        "valid_until": valid_until,
        "total_amount": total_amount,
        "currency": currency,
        "notes": notes,
    }, db=db)


def send_dunning_reminder_email(
    email: str,
    customer_name: str,
    invoice_number: str,
    days_overdue: str,
    overdue_amount: str,
    currency: str = "USD",
    late_fee: str = "0",
    db=None,
) -> bool:
    return send_approval_email(email, "dunning_reminder.html", {
        "subject": f"Payment Reminder — Invoice {invoice_number} | Zoiko One",
        "customer_name": customer_name,
        "invoice_number": invoice_number,
        "days_overdue": days_overdue,
        "overdue_amount": overdue_amount,
        "currency": currency,
        "late_fee": late_fee,
    }, db=db)


def send_contract_activated_email(
    email: str,
    customer_name: str,
    contract_number: str,
    start_date: str,
    end_date: str,
    total_amount: str,
    currency: str = "USD",
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
    }, db=db)


def send_contract_renewed_email(
    email: str,
    customer_name: str,
    contract_number: str,
    new_end_date: str,
    total_amount: str,
    currency: str = "USD",
    db=None,
) -> bool:
    return send_approval_email(email, "contract_renewed.html", {
        "subject": f"Contract Renewed — {contract_number} | Zoiko One",
        "customer_name": customer_name,
        "contract_number": contract_number,
        "new_end_date": new_end_date,
        "total_amount": total_amount,
        "currency": currency,
    }, db=db)


def send_subscription_renewed_email(
    email: str,
    customer_name: str,
    subscription_number: str,
    plan_name: str,
    term_start: str,
    term_end: str,
    amount: str,
    currency: str = "USD",
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
    }, db=db)


def send_past_due_notice_email(
    email: str,
    customer_name: str,
    subscription_number: str,
    plan_name: str,
    days_overdue: str,
    overdue_amount: str,
    currency: str = "USD",
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
    }, db=db)


def send_payment_receipt_email(
    email: str,
    customer_name: str,
    payment_number: str,
    payment_date: str,
    amount: str,
    currency: str = "USD",
    payment_method: str = "",
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
    }, db=db)
