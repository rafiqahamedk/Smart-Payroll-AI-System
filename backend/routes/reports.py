# ================================================================
# SmartPayroll AI — Reports / Export Routes
# ================================================================

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from database import get_db
from models import ImportData
from datetime import datetime

router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.get("/export")
async def export_data():
    """Export all data as JSON."""
    db = get_db()

    employees = await db.employees.find({}, {"_id": 0}).to_list(length=100)
    payroll = await db.payroll.find({}, {"_id": 0}).to_list(length=5000)
    settings = await db.settings.find_one({"_type": "app_settings"}, {"_id": 0, "_type": 0})

    # Gather all attendance records
    attendance_records = await db.attendance.find({}, {"_id": 0}).to_list(length=5000)
    attendance = {}
    for rec in attendance_records:
        key = f"{rec.get('employee_id', '')}_{rec.get('month', '')}"
        attendance[key] = rec.get("days", {})

    return {
        "employees": employees,
        "attendance": attendance,
        "payroll": payroll,
        "settings": settings,
        "exportedAt": datetime.utcnow().isoformat(),
    }


@router.post("/import")
async def import_data(data: ImportData):
    """Import data from JSON (replaces existing)."""
    db = get_db()

    imported = {"employees": 0, "attendance": 0, "payroll": 0, "settings": False}

    if data.employees:
        await db.employees.delete_many({})
        await db.employees.insert_many(data.employees)
        imported["employees"] = len(data.employees)

    if data.attendance:
        await db.attendance.delete_many({})
        docs = []
        for key, days in data.attendance.items():
            parts = key.rsplit("_", 1)
            if len(parts) == 2:
                docs.append({
                    "employee_id": parts[0],
                    "month": parts[1],
                    "days": days,
                })
        if docs:
            await db.attendance.insert_many(docs)
            imported["attendance"] = len(docs)

    if data.payroll:
        await db.payroll.delete_many({})
        await db.payroll.insert_many(data.payroll)
        imported["payroll"] = len(data.payroll)

    if data.settings:
        await db.settings.update_one(
            {"_type": "app_settings"},
            {"$set": data.settings},
            upsert=True,
        )
        imported["settings"] = True

    return {"message": "Data imported successfully", "imported": imported}


@router.post("/reset")
async def reset_data():
    """Reset all data to defaults."""
    db = get_db()
    await db.employees.delete_many({})
    await db.attendance.delete_many({})
    await db.payroll.delete_many({})
    await db.settings.delete_many({})

    # Re-initialize defaults
    from database import connect_db
    await connect_db()

    return {"message": "All data reset to defaults"}
