from app.config import settings
from sqlalchemy import create_engine, text
engine = create_engine(settings.DATABASE_URL)
c = engine.connect()
r = c.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='employees' AND column_name='emergency_contacts'"))
print('exists:', r.fetchone() is not None)
c.close()
