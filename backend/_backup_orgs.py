import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from app.config import settings
from sqlalchemy import create_engine, text

engine = create_engine(settings.DATABASE_URL, echo=False)
conn = engine.connect()
rows = conn.execute(text("SELECT * FROM organizations ORDER BY id")).mappings().all()
out = []
for r in rows:
    row = dict(r)
    for k, v in row.items():
        if hasattr(v, "isoformat"):
            row[k] = v.isoformat()
    out.append(row)
with open(os.path.join(os.path.dirname(__file__), "organizations_backup.json"), "w", encoding="utf-8") as f:
    json.dump(out, f, indent=2, ensure_ascii=False)
print(f"Backed up {len(out)} organizations to organizations_backup.json")
conn.close()
