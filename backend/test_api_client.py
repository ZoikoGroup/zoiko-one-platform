import sys
sys.path.insert(0, '.')
from fastapi.testclient import TestClient
from app.main import app
from app.database import SessionLocal
from app.modules.payroll.models import PayrollEmployee
from datetime import date

# Let's find an employee and organization ID
db = SessionLocal()
emp = db.query(PayrollEmployee).filter(PayrollEmployee.organization_id.isnot(None)).first()
if not emp:
    print("No employee found in database!")
    sys.exit(1)

org_id = emp.organization_id
emp_id = emp.id
print(f"Using emp_id={emp_id}, org_id={org_id}")
db.close()

# We need to simulate the authentication for Depends(get_current_org_admin) / Depends(get_current_user)
# Let's check how authentication dependencies can be overridden or if we can find a user who has ADMIN role.
from app.modules.employee.models import Employee, UserRole
db = SessionLocal()
admin_user = db.query(Employee).filter(Employee.organization_id == org_id, Employee.role == UserRole.ADMIN).first()
if not admin_user:
    # Let's check if any admin exists at all
    admin_user = db.query(Employee).filter(Employee.role == UserRole.ADMIN).first()
if not admin_user:
    # Check if superadmin exists
    admin_user = db.query(Employee).filter(Employee.role == UserRole.SUPER_ADMIN).first()

if not admin_user:
    print("No admin user found for authentication!")
    sys.exit(1)

print(f"Using admin_user: {admin_user.email}, role={admin_user.role}, org_id={admin_user.organization_id}")
db.close()

# Let's create a JWT token for this user
from app.core.security import create_access_token
token = create_access_token(data={"sub": admin_user.email})

client = TestClient(app)
headers = {"Authorization": f"Bearer {token}"}

payload = {
    "records": [
        {
            "employeeId": emp_id,
            "name": f"{emp.first_name} {emp.last_name}",
            "date": "2026-07-21",
            "checkIn": "09:00",
            "checkOut": "18:00",
            "checkInPeriod": "AM",
            "checkOutPeriod": "PM",
            "breakMinutes": 60,
            "hours": "8.5",
            "status": "present",
            "rewards": 0,
            "bonus": 0,
            "otherCompensation": 0,
            "notes": ""
        }
    ]
}

print("Sending POST request...")
response = client.post("/api/payroll/attendance/bulk", json=payload, headers=headers)
print(f"Response status: {response.status_code}")
print(f"Response content: {response.text}")
