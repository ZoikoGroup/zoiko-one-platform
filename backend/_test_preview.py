"""Test if preview endpoint logic works."""
import os
from pathlib import Path
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.database import SessionLocal
from app.modules.payroll import service

db = SessionLocal()
try:
    result = service.preview_payroll_run(
        db, organization_id=2, employee_ids=[1], country="IN",
        period_start="2026-06-01", period_end="2026-06-30",
    )
    print("SUCCESS:", result.get("calculationMode"))
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.close()
