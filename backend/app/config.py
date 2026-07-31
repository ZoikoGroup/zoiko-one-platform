"""
config.py
---------
Reads all environment variables from the .env file.
Uses pydantic-settings so every variable is validated on startup.
If a required variable is missing, the app will REFUSE to start — which
is exactly what you want so you catch config mistakes early.
"""


from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── JWT / Auth ────────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # default = 1 day

    # ── App Info ──────────────────────────────────────────────────────────
    APP_NAME: str = "Zoiko One Backend"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    @field_validator("DEBUG", mode="before")
    @classmethod
    def normalize_debug(cls, value):
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"release", "prod", "production"}:
                return False
            if normalized in {"dev", "development"}:
                return True
        return value

    # ── CORS ──────────────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5174,https://zoiko-one-platform-4wjm.vercel.app"

    # ── Recurring Billing Scheduler ───────────────────────────────────────
    ENABLE_RECURRING_BILLING_SCHEDULER: bool = True
    RECURRING_BILLING_INTERVAL_MINUTES: int = 60
    OVERDUE_INVOICE_CHECK_INTERVAL_MINUTES: int = 60

    # ── Email / SMTP ──────────────────────────────────────────────────────
    # Non-secret defaults match the platform's existing SMTP account so
    # behavior is unchanged for deployments that haven't set these in .env.
    # SMTP_PASSWORD has NO default — it must come from .env/environment or
    # the platform_settings DB row (see email_service._get_smtp_settings,
    # which falls back to this empty string, then logs and skips sending,
    # rather than authenticating with a stale credential compiled into source).
    SMTP_HOST: str = "smtpout.secureserver.net"
    SMTP_PORT: str = "465"
    SMTP_USERNAME: str = "Info@zoikoone.com"
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "Info@zoikoone.com"
    SMTP_USE_TLS: str = "true"

    # ── Payroll Leave-Request Mail Receiver (IMAP) ──────────────────────────
    # All empty/None by default — this module is a no-op until an org admin
    # enters real mailbox credentials via PUT /api/payroll/mail/settings
    # (per-org, stored in payroll_email_settings, never in this file/.env).
    # These platform-level fields exist only as an optional fallback default
    # and are never required to be set for the feature to work.
    IMAP_HOST: str = ""
    IMAP_PORT: str = "993"
    IMAP_USERNAME: str = ""
    IMAP_PASSWORD: str = ""
    IMAP_USE_SSL: bool = True
    PAYROLL_MAIL_POLL_INTERVAL_MINUTES: int = 15


# Create ONE global instance — import this everywhere you need settings
settings = Settings()
