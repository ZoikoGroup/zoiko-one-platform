"""
database.py
-----------
Sets up the database connection for SQLAlchemy and keeps the bootstrap logic
production-safe while remaining useful for local development.
"""

import logging
import os
import socket
from pathlib import Path
from urllib.parse import urlparse

from sqlalchemy import create_engine, exc, inspect  # type: ignore[import]
from sqlalchemy.orm import declarative_base, sessionmaker  # type: ignore[import]

from app.config import settings

logger = logging.getLogger("zoiko")


def _is_development_environment() -> bool:
    env_name = (os.getenv("ENVIRONMENT") or os.getenv("APP_ENV") or "").strip().lower()
    debug_flag = str(getattr(settings, "DEBUG", False)).strip().lower()
    return env_name == "development" or debug_flag in {"1", "true", "yes", "on"}


def resolve_database_url(raw_url: str | None = None) -> str:
    """Return the configured Postgres URL or a local SQLite path for development only."""
    candidate_url = (raw_url or settings.DATABASE_URL or "").strip()
    if not candidate_url:
        candidate_url = "sqlite:///./zoiko_dev.sqlite3"

    parsed = urlparse(candidate_url)
    if parsed.scheme in {"postgresql", "postgres"}:
        hostname = parsed.hostname or ""
        if hostname:
            try:
                socket.getaddrinfo(hostname, parsed.port or 5432)
                return candidate_url
            except OSError as exc:
                if _is_development_environment():
                    logger.warning(
                        "Database host '%s' could not be resolved (%s). Using local SQLite fallback.",
                        hostname,
                        exc,
                    )
                    fallback_path = Path(__file__).resolve().parent / "data" / "zoiko_dev.sqlite3"
                    fallback_path.parent.mkdir(parents=True, exist_ok=True)
                    return f"sqlite:///{fallback_path.resolve()}"
                raise RuntimeError(
                    "Production database unavailable. SQLite fallback is disabled in production. "
                    "Please verify DATABASE_URL, network, DNS, and PostgreSQL availability."
                ) from exc
        else:
            if _is_development_environment():
                logger.warning("Database URL is missing a hostname. Using local SQLite fallback.")
                fallback_path = Path(__file__).resolve().parent / "data" / "zoiko_dev.sqlite3"
                fallback_path.parent.mkdir(parents=True, exist_ok=True)
                return f"sqlite:///{fallback_path.resolve()}"
            raise RuntimeError(
                "Production database unavailable. SQLite fallback is disabled in production. "
                "Please verify DATABASE_URL, network, DNS, and PostgreSQL availability."
            )

    if candidate_url.startswith("sqlite"):
        return candidate_url

    if _is_development_environment():
        fallback_path = Path(__file__).resolve().parent / "data" / "zoiko_dev.sqlite3"
        fallback_path.parent.mkdir(parents=True, exist_ok=True)
        return f"sqlite:///{fallback_path.resolve()}"

    raise RuntimeError(
        "Production database unavailable. SQLite fallback is disabled in production. "
        "Please verify DATABASE_URL, network, DNS, and PostgreSQL availability."
    )


# -- 1. Create the Engine ----------------------------------------------------
resolved_database_url = resolve_database_url()

if resolved_database_url.startswith("sqlite"):
    engine = create_engine(
        resolved_database_url,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        resolved_database_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=1800,
    )


# -- 2. Create the Session Factory -------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


# -- 3. Base Class for All Models -------------------------------------------
Base = declarative_base()

# Import all model modules so Base.metadata includes tables from the implemented modules.
import app.modules.billing.models  # noqa: F401
import app.modules.comply.models  # noqa: F401
import app.modules.employee.models  # noqa: F401
import app.modules.hr.models  # noqa: F401
import app.modules.insights.models  # noqa: F401
import app.modules.payroll.models  # noqa: F401
import app.modules.super_admin.models  # noqa: F401
import app.modules.time.models  # noqa: F401


def initialize_database() -> None:
    """Create tables in development or when using SQLite; rely on Alembic elsewhere."""
    if not _is_development_environment() and not str(engine.url).startswith("sqlite"):
        logger.info("Production database initialization skipped; Alembic migrations are expected.")
        return

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except exc.SQLAlchemyError as exc_info:
        logger.error("Database initialization failed: %s", exc_info)
        raise


# -- 4. Helper: get list of tables from the database -------------------------
def get_table_names() -> list[str]:
    try:
        inspector = inspect(engine)
        return inspector.get_table_names()
    except exc.SQLAlchemyError as exc_info:
        logger.warning("Could not inspect database tables: %s", exc_info)
        return []


# -- 5. Dependency: get_db ---------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()