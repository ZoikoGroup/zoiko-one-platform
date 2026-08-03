"""Consolidate duplicated Organization columns.

Makes organization_code / organization_name the single source of truth by
backfilling them (idempotent) and then dropping the legacy `name` and `code`
columns from the organizations table.

Safe to re-run: if the legacy columns are already gone it does nothing.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from sqlalchemy import create_engine, inspect, text

from app.config import settings


def _generate_org_code(name: str, used: set) -> str:
    words = (name or "").strip().split()
    significant = [w for w in words if len(w) >= 3]
    if len(significant) >= 3:
        base = "".join(w[0].upper() for w in significant[:3])
    elif len(significant) >= 2:
        base = "".join(w[0].upper() for w in significant)
    else:
        base = (name or "").strip()[:3].upper()
    if not base:
        base = "UNK"
    code = base
    suffix = 1
    while code in used:
        code = f"{base}_{suffix}"
        suffix += 1
    used.add(code)
    return code


def main() -> None:
    engine = create_engine(settings.DATABASE_URL, echo=False)
    conn = engine.connect()
    try:
        insp = inspect(engine)
        cols = {c["name"] for c in insp.get_columns("organizations")}
        if "name" not in cols and "code" not in cols:
            print("Legacy columns already removed. Nothing to do.")
            return

        # 1. Backfill organization_name from legacy name
        conn.execute(
            text("UPDATE organizations SET organization_name = name "
                 "WHERE organization_name IS NULL OR organization_name = ''")
        )

        # 2. Backfill organization_code from legacy name (dedup against existing)
        used = {
            r["organization_code"]
            for r in conn.execute(
                text("SELECT organization_code FROM organizations "
                     "WHERE organization_code IS NOT NULL AND organization_code != ''")
            ).mappings()
        }
        missing = conn.execute(
            text("SELECT id, name FROM organizations "
                 "WHERE organization_code IS NULL OR organization_code = '' "
                 "ORDER BY id")
        ).mappings().all()
        for org in missing:
            code = _generate_org_code(org["name"], used)
            conn.execute(
                text("UPDATE organizations SET organization_code = :c WHERE id = :i"),
                {"c": code, "i": org["id"]},
            )
        conn.commit()
        print(f"[backfill] organization_name/organization_code ensured for all rows "
              f"(new codes generated for {len(missing)} rows)")

        # 3. Drop the legacy columns
        for col in ("code", "name"):
            if col in {c["name"] for c in insp.get_columns("organizations")}:
                conn.execute(text(f'ALTER TABLE organizations DROP COLUMN IF EXISTS "{col}"'))
        conn.commit()
        print("Dropped organizations.code and organizations.name.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
