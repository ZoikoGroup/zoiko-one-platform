import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Import DB config
try:
    with open(".env") as f:
        for line in f:
            if line.strip().startswith("DATABASE_URL"):
                DATABASE_URL = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                break
except Exception as e:
    DATABASE_URL = None

if not DATABASE_URL:
    DATABASE_URL = os.environ.get("DATABASE_URL")

print("DATABASE_URL:", DATABASE_URL)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

# Query HrDocument table
from sqlalchemy import text
try:
    res = db.execute(text("SELECT id, title, category, is_deleted FROM hr_documents")).fetchall()
    print("Found documents:")
    for r in res:
        print(r)
except Exception as e:
    print("Error:", e)
db.close()
