"""
core/scheduler.py
-----------------
APScheduler singleton for background periodic jobs.

Uses BackgroundScheduler (thread-based) — no Redis/Celery required.
Integrates with FastAPI startup/shutdown lifecycle.
"""

import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.executors.pool import ThreadPoolExecutor

logger = logging.getLogger("zoiko")

_scheduler: BackgroundScheduler | None = None


def get_scheduler() -> BackgroundScheduler | None:
    return _scheduler


def start_scheduler() -> None:
    """Start the global scheduler. Called once at application startup."""
    global _scheduler
    if _scheduler is not None:
        logger.warning("Scheduler already started — skipping")
        return

    jobstores = {"default": MemoryJobStore()}
    executors = {"default": ThreadPoolExecutor(max_workers=2)}
    job_defaults = {
        "coalesce": True,
        "max_instances": 1,
        "misfire_grace_time": 3600,
    }

    _scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
    )

    _register_billing_jobs(_scheduler)
    _register_payroll_mail_jobs(_scheduler)

    _scheduler.start()
    logger.info("Recurring billing scheduler started")


def shutdown_scheduler() -> None:
    """Gracefully shut down the scheduler. Called at application shutdown."""
    global _scheduler
    if _scheduler is None:
        return
    try:
        _scheduler.shutdown(wait=False)
        logger.info("Recurring billing scheduler shut down")
    except Exception as exc:
        logger.warning("Scheduler shutdown error: %s", exc)
    finally:
        _scheduler = None


def _register_billing_jobs(scheduler: BackgroundScheduler) -> None:
    """Register the recurring billing job and the overdue-invoice job."""
    from app.config import settings

    interval_minutes = settings.RECURRING_BILLING_INTERVAL_MINUTES

    scheduler.add_job(
        func="app.modules.billing.tasks.recurring_billing:run_recurring_billing_job",
        trigger="interval",
        minutes=interval_minutes,
        id="recurring_billing_job",
        name="Recurring Subscription Billing",
        replace_existing=True,
    )
    logger.info(
        "Registered recurring billing job (every %d minutes)", interval_minutes
    )

    overdue_interval_minutes = settings.OVERDUE_INVOICE_CHECK_INTERVAL_MINUTES

    scheduler.add_job(
        func="app.modules.billing.tasks.overdue_invoices:run_overdue_invoice_job",
        trigger="interval",
        minutes=overdue_interval_minutes,
        id="overdue_invoice_job",
        name="Overdue Invoice Detection",
        replace_existing=True,
    )
    logger.info(
        "Registered overdue invoice job (every %d minutes)", overdue_interval_minutes
    )


def _register_payroll_mail_jobs(scheduler: BackgroundScheduler) -> None:
    """Register the IMAP leave-request-mailbox poll job. A no-op at runtime
    until at least one organization enables IMAP via PUT /api/payroll/mail/
    settings — see app/modules/payroll/mail/service.py:poll_all_mailboxes."""
    from app.config import settings

    interval_minutes = settings.PAYROLL_MAIL_POLL_INTERVAL_MINUTES

    scheduler.add_job(
        func="app.modules.payroll.mail.tasks:run_poll_mailbox_job",
        trigger="interval",
        minutes=interval_minutes,
        id="payroll_mail_poll_job",
        name="Payroll Leave-Request Mailbox Poll",
        replace_existing=True,
    )
    logger.info(
        "Registered payroll mail poll job (every %d minutes)", interval_minutes
    )
