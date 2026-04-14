# ================================================================
# SmartPayroll AI — Payroll Calculation Service
# ================================================================

from database import get_db
from datetime import datetime
import time
import random
import string


def generate_id(prefix="pay"):
    """Generate a unique ID."""
    ts = hex(int(time.time()))[2:]
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{prefix}_{ts}_{rand}"


async def get_attendance_summary(employee_id: str, month: str) -> dict:
    """Calculate attendance summary for an employee in a given month."""
    db = get_db()
    record = await db.attendance.find_one(
        {"employee_id": employee_id, "month": month}
    )

    summary = {
        "present": 0, "absent": 0, "halfDay": 0,
        "paidLeave": 0, "unpaidLeave": 0, "holiday": 0,
        "weekend": 0, "totalWorking": 0,
    }

    if not record or "days" not in record:
        return summary

    for day, status in record["days"].items():
        if status == "present":
            summary["present"] += 1
        elif status == "absent":
            summary["absent"] += 1
        elif status == "half-day":
            summary["halfDay"] += 1
        elif status == "paid-leave":
            summary["paidLeave"] += 1
        elif status == "unpaid-leave":
            summary["unpaidLeave"] += 1
        elif status == "holiday":
            summary["holiday"] += 1
        elif status == "weekend":
            summary["weekend"] += 1

    summary["totalWorking"] = summary["present"] + summary["paidLeave"] + (summary["halfDay"] * 0.5)
    return summary


async def calculate_payroll(
    employee_id: str,
    month: str,
    overtime_hours: float = 0,
    festival_bonus: float = 0,
    other_bonus: float = 0,
) -> dict:
    """Calculate payroll for a single employee."""
    db = get_db()

    # Get employee
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise ValueError(f"Employee not found: {employee_id}")

    # Get settings
    settings_doc = await db.settings.find_one({"_type": "app_settings"})
    payroll_settings = settings_doc.get("payroll", {})

    # Get attendance summary
    summary = await get_attendance_summary(employee_id, month)

    salary = employee.get("salary", {})
    total_working_days = payroll_settings.get("workingDaysPerMonth", 26)
    effective_days = summary["present"] + summary["paidLeave"] + (summary["halfDay"] * 0.5)
    lop_days = max(0, total_working_days - effective_days - summary["holiday"])

    # Pro-rate salary
    daily_basic = salary.get("basic", 0) / total_working_days
    daily_hra = salary.get("hra", 0) / total_working_days
    daily_da = salary.get("da", 0) / total_working_days
    daily_special = salary.get("specialAllowance", 0) / total_working_days

    pro_rated_days = min(effective_days, total_working_days)

    # Earnings
    basic = round(daily_basic * pro_rated_days)
    hra = round(daily_hra * pro_rated_days)
    da = round(daily_da * pro_rated_days)
    special_allowance = round(daily_special * pro_rated_days)

    # Overtime
    hourly_rate = (salary.get("basic", 0) + salary.get("da", 0)) / (
        total_working_days * payroll_settings.get("workingHoursPerDay", 8)
    )
    overtime_pay = round(
        overtime_hours * hourly_rate * payroll_settings.get("overtimeMultiplier", 2)
    )

    gross_earnings = basic + hra + da + special_allowance + overtime_pay + festival_bonus + other_bonus

    # Deductions
    pf = round(basic * (payroll_settings.get("pfRate", 12) / 100))
    esi = round(gross_earnings * (payroll_settings.get("esiRate", 0.75) / 100))
    professional_tax = payroll_settings.get("professionalTax", 200)
    tds = round(gross_earnings * (payroll_settings.get("tdsRate", 10) / 100))
    total_deductions = pf + esi + professional_tax + tds

    net_pay = gross_earnings - total_deductions

    payroll_record = {
        "id": generate_id("pay"),
        "employeeId": employee_id,
        "employeeName": employee.get("name", ""),
        "employeeRole": employee.get("role", ""),
        "month": month,
        "processedDate": datetime.utcnow().isoformat(),
        "workingDays": total_working_days,
        "presentDays": summary["present"],
        "paidLeaveDays": summary["paidLeave"],
        "unpaidLeaveDays": summary["unpaidLeave"],
        "halfDays": summary["halfDay"],
        "lopDays": lop_days,
        "overtimeHours": overtime_hours,
        "earnings": {
            "basic": basic,
            "hra": hra,
            "da": da,
            "specialAllowance": special_allowance,
            "overtimePay": overtime_pay,
            "festivalBonus": festival_bonus,
            "otherBonus": other_bonus,
            "leaveEncashment": 0,
            "grossEarnings": gross_earnings,
        },
        "deductions": {
            "pf": pf,
            "esi": esi,
            "professionalTax": professional_tax,
            "tds": tds,
            "otherDeductions": 0,
            "totalDeductions": total_deductions,
        },
        "netPay": net_pay,
        "aiSummary": "",
        "status": "processed",
    }

    # Upsert into database (replace if same employee + month)
    await db.payroll.delete_many({"employeeId": employee_id, "month": month})

    # Insert a copy so MongoDB-generated _id does not mutate API response payload.
    db_payload = dict(payroll_record)
    await db.payroll.insert_one(db_payload)

    return payroll_record


async def process_all_payroll(month: str, overrides: dict = {}) -> list:
    """Process payroll for all employees."""
    db = get_db()
    employees = await db.employees.find().to_list(length=100)
    results = []

    for emp in employees:
        emp_id = emp["id"]
        override = overrides.get(emp_id, {})
        try:
            payroll = await calculate_payroll(
                emp_id,
                month,
                override.get("overtimeHours", 0),
                override.get("festivalBonus", 0),
                override.get("otherBonus", 0),
            )
            results.append(payroll)
        except Exception as e:
            results.append({"employeeId": emp_id, "error": str(e)})

    return results


async def get_payroll_trend(months: int = 6) -> list:
    """Get payroll total trend for recent months."""
    db = get_db()
    now = datetime.utcnow()
    trend = []

    for i in range(months - 1, -1, -1):
        month_val = now.month - i
        year_val = now.year
        while month_val <= 0:
            month_val += 12
            year_val -= 1
        month_str = f"{year_val}-{str(month_val).zfill(2)}"

        pipeline = [
            {"$match": {"month": month_str}},
            {"$group": {"_id": None, "total": {"$sum": "$netPay"}}},
        ]
        result = await db.payroll.aggregate(pipeline).to_list(length=1)
        total = result[0]["total"] if result else 0

        from datetime import date
        d = date(year_val, month_val, 1)
        label = d.strftime("%b '%y")

        trend.append({"month": month_str, "label": label, "total": total})

    return trend
