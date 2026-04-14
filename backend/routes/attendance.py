# ================================================================
# SmartPayroll AI — Attendance Routes
# ================================================================

from fastapi import APIRouter, HTTPException
from database import get_db
from models import AttendanceDay, AttendanceBulk
from services.payroll_service import get_attendance_summary

router = APIRouter(prefix="/api/attendance", tags=["Attendance"])


@router.get("/{employee_id}/{month}")
async def get_attendance(employee_id: str, month: str):
    """Get attendance record for employee and month."""
    db = get_db()
    record = await db.attendance.find_one(
        {"employee_id": employee_id, "month": month}, {"_id": 0}
    )
    return record.get("days", {}) if record else {}


@router.put("/{employee_id}/{month}/bulk")
async def bulk_set_attendance(employee_id: str, month: str, data: AttendanceBulk):
    """Bulk set attendance for a month."""
    db = get_db()

    emp = await db.employees.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_fields = {f"days.{k}": v for k, v in data.days.items()}

    await db.attendance.update_one(
        {"employee_id": employee_id, "month": month},
        {"$set": update_fields},
        upsert=True,
    )

    return {"message": "Bulk attendance updated", "count": len(data.days)}


@router.get("/{employee_id}/{month}/summary")
async def get_summary(employee_id: str, month: str):
    """Get attendance summary for employee and month."""
    summary = await get_attendance_summary(employee_id, month)
    return summary


@router.put("/{employee_id}/{month}/{day}")
async def set_attendance_day(employee_id: str, month: str, day: int, data: AttendanceDay):
    """Set attendance for a specific day."""
    db = get_db()

    # Verify employee exists
    emp = await db.employees.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    await db.attendance.update_one(
        {"employee_id": employee_id, "month": month},
        {"$set": {f"days.{day}": data.status}},
        upsert=True,
    )

    return {"message": "Attendance updated", "day": day, "status": data.status}
