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

from sqlalchemy import create_engine, exc, inspect, text  # type: ignore[import]
from sqlalchemy.orm import declarative_base, sessionmaker  # type: ignore[import]
from sqlalchemy.types import (
    Boolean, Date, DateTime, Float, Integer, JSON, Numeric, String, Text,
)

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
    # Neon requires SSL. Pass it explicitly so psycopg2 doesn't skip the
    # TLS handshake even if the URL-level param gets lost during parsing.
    engine = create_engine(
        resolved_database_url,
        connect_args={"sslmode": "require"},
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

    # SQLite-only defensive sync: add columns that models define but the
    # SQLite file lacks.  create_all only creates missing *tables*; it never
    # adds columns to existing tables.  Columns added after the SQLite file
    # was first created would otherwise remain missing.
    #
    # IMPORTANT: Alembic remains the authoritative schema migration
    # mechanism.  This SQLite synchronization is ONLY for local
    # development / test compatibility and must NEVER run against
    # PostgreSQL or production databases.
    if str(engine.url).startswith("sqlite"):
        _sync_sqlite_columns()


def _sa_type_to_sqlite_type(sa_type) -> str:
    """Map a SQLAlchemy column type to a SQLite-compatible type string."""
    type_map = {
        Boolean: "BOOLEAN",
        Date: "DATE",
        DateTime: "DATETIME",
        Float: "FLOAT",
        Integer: "INTEGER",
        JSON: "TEXT",
        String: "TEXT",
        Text: "TEXT",
    }
    for sa_cls, sqlite_str in type_map.items():
        if isinstance(sa_type, sa_cls):
            return sqlite_str
    # Numeric types
    if isinstance(sa_type, Numeric):
        return "NUMERIC"
    # CaseInsensitiveEnum and other custom types that impl VARCHAR
    if hasattr(sa_type, "impl"):
        return "TEXT"
    return "TEXT"


def _sync_sqlite_columns() -> None:
    """Detect columns that SQLAlchemy models define but the SQLite database
    lacks, and ALTER TABLE ADD COLUMN for each missing one.

    ARCHITECTURE NOTE:
        Alembic remains the authoritative schema migration mechanism for
        production (PostgreSQL).  This SQLite synchronization exists ONLY
        for local development / test compatibility where Alembic is not
        run against a disposable SQLite database.

        This function must NEVER:
          - Execute against PostgreSQL (guarded by dialect check at call site)
          - Replace Alembic in production
          - Drop, rename, or modify existing columns
          - Remove constraints or indexes
          - Recreate tables destructively

    This is safe because:
      - ALTER TABLE ADD COLUMN only *adds* — it never drops or modifies
        existing data.
      - All new columns are created nullable (SQLite does not support
        adding NOT NULL columns without a DEFAULT).
      - Columns with server_default or Column default get a SQL DEFAULT
        so existing rows receive a sensible value.
    """
    try:
        inspector = inspect(engine)
        db_tables = set(inspector.get_table_names())
    except exc.SQLAlchemyError as exc_info:
        logger.warning("Could not inspect SQLite database for column sync: %s", exc_info)
        return

    added_count = 0
    for table_name, table in Base.metadata.tables.items():
        if table_name not in db_tables:
            continue  # create_all already handles new tables

        existing_cols = {c["name"] for c in inspector.get_columns(table_name)}

        for col in table.columns:
            if col.name in existing_cols:
                continue

            sqlite_type = _sa_type_to_sqlite_type(col.type)
            nullable = col.nullable if col.nullable is not None else True

            # Build the ADD COLUMN DDL
            ddl = f'ALTER TABLE "{table_name}" ADD COLUMN "{col.name}" {sqlite_type}'

            # Add NOT NULL only if column is explicitly non-nullable AND has a default
            if not nullable and col.server_default is not None:
                ddl += " NOT NULL"

            # Add DEFAULT if present
            if col.server_default is not None:
                # server_default.arg is the raw SQL string (e.g. "'USD'" or "now()")
                default_val = col.server_default.arg
                if default_val is not None:
                    default_str = str(default_val).strip()
                    # If it's a bare string (not already quoted or a SQL func),
                    # wrap in single quotes for SQLite
                    if (not default_str.startswith("'") and
                        not default_str.startswith('"') and
                        not "(" in default_str and
                        default_str.upper() not in ("NULL", "CURRENT_TIMESTAMP", "CURRENT_DATE", "CURRENT_TIME")):
                        default_str = f"'{default_str}'"
                    ddl += f" DEFAULT {default_str}"
            elif col.default is not None and col.default.arg is not None:
                # Python-level default — translate to SQLite DEFAULT
                default_val = col.default.arg
                if callable(default_val):
                    # e.g. default=list → DEFAULT '[]'
                    try:
                        default_val = default_val()
                    except TypeError:
                        # Built-in types like list require context;
                        # fall back to a sensible SQLite DEFAULT.
                        if default_val is list:
                            default_val = "[]"
                        elif default_val is dict:
                            default_val = "{}"
                        else:
                            default_val = None
                if default_val is None:
                    ddl += " DEFAULT NULL"
                elif isinstance(default_val, str):
                    ddl += f" DEFAULT '{default_val}'"
                elif isinstance(default_val, (int, float)):
                    ddl += f" DEFAULT {default_val}"
                elif isinstance(default_val, bool):
                    ddl += f" DEFAULT {int(default_val)}"
                else:
                    ddl += f" DEFAULT '{default_val}'"
            else:
                # Nullable column with no default — use NULL
                if nullable:
                    ddl += " DEFAULT NULL"

            try:
                with engine.connect() as conn:
                    conn.execute(text(ddl))
                    conn.commit()
                added_count += 1
                logger.info("SQLite sync: added column %s.%s (%s)", table_name, col.name, sqlite_type)
            except exc.OperationalError as op_err:
                # Column may already exist (race condition) or other issue
                logger.warning(
                    "SQLite sync: could not add column %s.%s — %s",
                    table_name, col.name, op_err,
                )
            except Exception as e:
                logger.warning(
                    "SQLite sync: unexpected error adding %s.%s — %s",
                    table_name, col.name, e,
                )

    if added_count:
        logger.info("SQLite sync complete: added %d missing column(s).", added_count)
    else:
        logger.debug("SQLite sync: all columns up to date.")


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