import sys
sys.path.insert(0, '.')
from app.database import SessionLocal
from decimal import Decimal
from datetime import date

payload = {
    'records': [
        {
            'employeeId': 204,
            'name': 'Aditya Rao',
            'date': '2026-07-21',
            'checkIn': '09:00',
            'checkOut': '18:00',
            'checkInPeriod': 'AM',
            'checkOutPeriod': 'PM',
            'breakMinutes': 60,
            'hours': '8.5',
            'status': 'present',
            'rewards': 0,
            'bonus': 0,
            'otherCompensation': 0,
            'notes': '',
        }
    ]
}

db = SessionLocal()
try:
    from app.modules.payroll.schemas import BulkAttendanceRequest
    from app.modules.payroll.service import bulk_save_attendance
    
    req = BulkAttendanceRequest(**payload)
    print('PARSED OK')
    d = req.records[0].model_dump()
    print(f'Dump keys: {list(d.keys())}')
    
    result = bulk_save_attendance(db, req, 1250)
    print('SUCCESS!')
    print(f'Result keys: {list(result[0].keys()) if result else "empty"}')
except Exception as e:
    import traceback
    traceback.print_exc()
finally:
    db.rollback()
    db.close()
