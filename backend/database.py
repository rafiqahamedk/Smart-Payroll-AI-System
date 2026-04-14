# ================================================================
# SmartPayroll AI — MongoDB Connection & Initialization
# ================================================================

from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, date
import calendar

from config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None
db = None


def _month_key(year: int, month: int) -> str:
    return f"{year}-{str(month).zfill(2)}"


def _shift_month(base: date, months_back: int) -> tuple[int, int]:
    year = base.year
    month = base.month - months_back
    while month <= 0:
        month += 12
        year -= 1
    return year, month


def _build_attendance_days(year: int, month: int, employee_index: int, month_index: int) -> dict[str, str]:
    days_in_month = calendar.monthrange(year, month)[1]
    days = {}
    for day in range(1, days_in_month + 1):
        weekday = date(year, month, day).weekday()
        if weekday >= 5:
            days[str(day)] = "weekend"
            continue

        seed = (employee_index * 37) + (month_index * 11) + day
        if seed % 29 == 0:
            status = "unpaid-leave"
        elif seed % 23 == 0:
            status = "paid-leave"
        elif seed % 17 == 0:
            status = "half-day"
        elif seed % 13 == 0:
            status = "absent"
        else:
            status = "present"
        days[str(day)] = status

    return days


async def _seed_employees_if_needed():
    sample_employees = [
        {
            "id": "emp_001",
            "name": "Rajesh Kumar",
            "email": "rajesh@company.com",
            "phone": "+91 98765 00001",
            "role": "Senior Developer",
            "department": "Engineering",
            "joinDate": "2024-03-15",
            "bankName": "State Bank of India",
            "bankAccount": "3456XXXX7890",
            "ifsc": "SBIN0001234",
            "salary": {"basic": 25000, "hra": 10000, "da": 5000, "specialAllowance": 5000, "gross": 45000},
            "leaves": {
                "earned": {"total": 15, "used": 3},
                "casual": {"total": 7, "used": 2},
                "sick": {"total": 7, "used": 1},
            },
        },
        {
            "id": "emp_002",
            "name": "Priya Sharma",
            "email": "priya@company.com",
            "phone": "+91 98765 00002",
            "role": "Accountant",
            "department": "Finance",
            "joinDate": "2024-06-01",
            "bankName": "HDFC Bank",
            "bankAccount": "1234XXXX5678",
            "ifsc": "HDFC0004567",
            "salary": {"basic": 20000, "hra": 8000, "da": 4000, "specialAllowance": 3000, "gross": 35000},
            "leaves": {
                "earned": {"total": 15, "used": 5},
                "casual": {"total": 7, "used": 1},
                "sick": {"total": 7, "used": 0},
            },
        },
        {
            "id": "emp_003",
            "name": "Arun Patel",
            "email": "arun@company.com",
            "phone": "+91 98765 00003",
            "role": "Store Manager",
            "department": "Operations",
            "joinDate": "2023-11-20",
            "bankName": "ICICI Bank",
            "bankAccount": "7890XXXX1234",
            "ifsc": "ICIC0005678",
            "salary": {"basic": 18000, "hra": 7200, "da": 3600, "specialAllowance": 3200, "gross": 32000},
            "leaves": {
                "earned": {"total": 15, "used": 8},
                "casual": {"total": 7, "used": 4},
                "sick": {"total": 7, "used": 2},
            },
        },
        {
            "id": "emp_004",
            "name": "Meena Devi",
            "email": "meena@company.com",
            "phone": "+91 98765 00004",
            "role": "Sales Executive",
            "department": "Sales",
            "joinDate": "2025-01-10",
            "bankName": "Axis Bank",
            "bankAccount": "4567XXXX8901",
            "ifsc": "UTIB0006789",
            "salary": {"basic": 15000, "hra": 6000, "da": 3000, "specialAllowance": 2000, "gross": 26000},
            "leaves": {
                "earned": {"total": 15, "used": 1},
                "casual": {"total": 7, "used": 0},
                "sick": {"total": 7, "used": 0},
            },
        },
        {
            "id": "emp_005",
            "name": "Sanjay Iyer",
            "email": "sanjay@company.com",
            "phone": "+91 98765 00005",
            "role": "Chef",
            "department": "Operations",
            "joinDate": "2024-10-18",
            "bankName": "Kotak Mahindra Bank",
            "bankAccount": "9087XXXX3456",
            "ifsc": "KKBK0002345",
            "salary": {"basic": 17000, "hra": 6800, "da": 3400, "specialAllowance": 2800, "gross": 30000},
            "leaves": {
                "earned": {"total": 15, "used": 2},
                "casual": {"total": 7, "used": 1},
                "sick": {"total": 7, "used": 1},
            },
        },
        {
            "id": "emp_006",
            "name": "Nisha Verma",
            "email": "nisha@company.com",
            "phone": "+91 98765 00006",
            "role": "HR Assistant",
            "department": "HR",
            "joinDate": "2025-02-03",
            "bankName": "Punjab National Bank",
            "bankAccount": "6543XXXX2109",
            "ifsc": "PUNB0004455",
            "salary": {"basic": 16000, "hra": 6400, "da": 3200, "specialAllowance": 2400, "gross": 28000},
            "leaves": {
                "earned": {"total": 15, "used": 0},
                "casual": {"total": 7, "used": 1},
                "sick": {"total": 7, "used": 0},
            },
        },
        {
            "id": "emp_007",
            "name": "Farhan Ali",
            "email": "farhan@company.com",
            "phone": "+91 98765 00007",
            "role": "Delivery Coordinator",
            "department": "Logistics",
            "joinDate": "2024-08-12",
            "bankName": "Canara Bank",
            "bankAccount": "1122XXXX3344",
            "ifsc": "CNRB0005566",
            "salary": {"basic": 15500, "hra": 6200, "da": 3100, "specialAllowance": 2200, "gross": 27000},
            "leaves": {
                "earned": {"total": 15, "used": 4},
                "casual": {"total": 7, "used": 2},
                "sick": {"total": 7, "used": 1},
            },
        },
        {
            "id": "emp_008",
            "name": "Kavya Rao",
            "email": "kavya@company.com",
            "phone": "+91 98765 00008",
            "role": "Support Executive",
            "department": "Customer Support",
            "joinDate": "2025-03-22",
            "bankName": "Bank of Baroda",
            "bankAccount": "7788XXXX9900",
            "ifsc": "BARB0006677",
            "salary": {"basic": 14500, "hra": 5800, "da": 2900, "specialAllowance": 1800, "gross": 25000},
            "leaves": {
                "earned": {"total": 15, "used": 0},
                "casual": {"total": 7, "used": 0},
                "sick": {"total": 7, "used": 0},
            },
        },
    ]

    existing = await db.employees.find({}, {"id": 1}).to_list(length=100)
    existing_ids = {row.get("id") for row in existing}
    missing = [emp for emp in sample_employees if emp["id"] not in existing_ids]

    if missing:
        await db.employees.insert_many(missing)


async def _seed_attendance_if_needed():
    count = await db.attendance.count_documents({})
    if count > 0:
        return

    employees = await db.employees.find({}, {"id": 1}).sort("id", 1).to_list(length=20)
    if not employees:
        return

    base_month = datetime.utcnow().date().replace(day=1)
    months = [_shift_month(base_month, idx) for idx in range(3)]

    docs = []
    for month_index, (year, month) in enumerate(months):
        month_str = _month_key(year, month)
        for emp_index, employee in enumerate(employees, start=1):
            docs.append(
                {
                    "employee_id": employee["id"],
                    "month": month_str,
                    "days": _build_attendance_days(year, month, emp_index, month_index),
                }
            )

    if docs:
        await db.attendance.insert_many(docs)


async def _seed_payroll_if_needed():
    count = await db.payroll.count_documents({})
    if count > 0:
        return

    employees = await db.employees.find({}, {"id": 1, "salary.basic": 1}).sort("id", 1).to_list(length=20)
    if not employees:
        return

    from services.payroll_service import process_all_payroll

    base_month = datetime.utcnow().date().replace(day=1)
    current_year, current_month = base_month.year, base_month.month
    prev_year, prev_month = _shift_month(base_month, 1)

    current_month_str = _month_key(current_year, current_month)
    prev_month_str = _month_key(prev_year, prev_month)

    prev_overrides = {}
    current_overrides = {}
    for idx, employee in enumerate(employees, start=1):
        emp_id = employee["id"]
        basic = employee.get("salary", {}).get("basic", 0)

        prev_overrides[emp_id] = {
            "overtimeHours": float((idx % 4) * 2),
            "festivalBonus": round(basic * 0.03) if idx % 3 == 0 else 0,
            "otherBonus": 500 if idx % 5 == 0 else 0,
        }
        current_overrides[emp_id] = {
            "overtimeHours": float((idx % 3) * 1.5),
            "festivalBonus": round(basic * 0.02) if idx % 2 == 0 else 0,
            "otherBonus": 0,
        }

    await process_all_payroll(prev_month_str, prev_overrides)
    await process_all_payroll(current_month_str, current_overrides)

    await db.payroll.update_many({"month": prev_month_str}, {"$set": {"status": "paid"}})

    current_rows = await db.payroll.find({"month": current_month_str}, {"id": 1}).sort("employeeId", 1).to_list(length=20)
    paid_count = max(1, len(current_rows) // 3)
    paid_ids = [row["id"] for row in current_rows[:paid_count]]
    if paid_ids:
        await db.payroll.update_many({"id": {"$in": paid_ids}}, {"$set": {"status": "paid"}})


async def connect_db():
    """Connect to MongoDB and initialize collections."""
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB]

    # Create indexes
    await db.employees.create_index("id", unique=True)
    await db.attendance.create_index([("employee_id", 1), ("month", 1)], unique=True)
    # Migrate old incorrect payroll index if it exists.
    payroll_indexes = await db.payroll.index_information()
    if "employee_id_1_month_1" in payroll_indexes:
        await db.payroll.drop_index("employee_id_1_month_1")

    await db.payroll.create_index([("employeeId", 1), ("month", 1)], unique=True)
    await db.payroll.create_index("id", unique=True)

    # Initialize default settings if not present
    existing = await db.settings.find_one({"_type": "app_settings"})
    if not existing:
        await db.settings.insert_one({
            "_type": "app_settings",
            "company": {
                "name": "My Company",
                "address": "123 Business Street, City",
                "email": "admin@company.com",
                "phone": "+91 98765 43210",
                "fiscalYearStart": "April",
            },
            "payroll": {
                "pfRate": 12,
                "esiRate": 0.75,
                "professionalTax": 200,
                "tdsRate": 10,
                "overtimeMultiplier": 2,
                "workingHoursPerDay": 8,
                "workingDaysPerMonth": 26,
                "currency": "₹",
            },
            "festivals": [
                {"id": "diwali", "name": "Diwali Bonus", "month": 10, "bonusPercentage": 8.33, "enabled": True},
                {"id": "pongal", "name": "Pongal Bonus", "month": 1, "bonusPercentage": 5, "enabled": False},
                {"id": "christmas", "name": "Christmas Bonus", "month": 12, "bonusPercentage": 5, "enabled": False},
                {"id": "onam", "name": "Onam Bonus", "month": 8, "bonusPercentage": 5, "enabled": False},
            ],
            "leaves": {
                "earnedPerYear": 15,
                "casualPerYear": 7,
                "sickPerYear": 7,
            },
            "ai": {
                "apiUrl": settings.AI_API_URL,
                "model": settings.AI_MODEL,
            },
        })

    # Seed richer mock data for testing if collections are empty
    await _seed_employees_if_needed()
    await _seed_attendance_if_needed()
    await _seed_payroll_if_needed()

    print(f"[OK] Connected to MongoDB: {settings.MONGODB_URI}/{settings.MONGODB_DB}")


async def close_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("[INFO] MongoDB connection closed")


def get_db():
    """Get database instance."""
    return db
