# ================================================================
# SmartPayroll AI — Payroll Routes
# ================================================================

from fastapi import APIRouter, HTTPException
from database import get_db
from models import ProcessPayrollRequest, ProcessAllRequest
from services.payroll_service import calculate_payroll, process_all_payroll, get_payroll_trend

router = APIRouter(prefix="/api/payroll", tags=["Payroll"])


@router.get("")
async def list_payroll(month: str = None):
    """Get payroll records, optionally filtered by month."""
    db = get_db()
    query = {}
    if month:
        query["month"] = month
    payrolls = await db.payroll.find(query, {"_id": 0}).sort("processedDate", -1).to_list(length=500)
    return payrolls


@router.get("/trend")
async def payroll_trend(months: int = 6):
    """Get payroll total trend for recent months."""
    trend = await get_payroll_trend(months)
    return trend


@router.get("/stats")
async def payroll_stats():
    """Get current month payroll stats."""
    db = get_db()
    from datetime import datetime
    now = datetime.utcnow()
    current_month = f"{now.year}-{str(now.month).zfill(2)}"

    payrolls = await db.payroll.find({"month": current_month}, {"_id": 0}).to_list(length=100)
    total_employees = await db.employees.count_documents({})

    total_net = sum(p.get("netPay", 0) for p in payrolls)
    total_gross = sum(p.get("earnings", {}).get("grossEarnings", 0) for p in payrolls)
    total_deductions = sum(p.get("deductions", {}).get("totalDeductions", 0) for p in payrolls)
    pending = total_employees - len(payrolls)

    return {
        "month": current_month,
        "processed": len(payrolls),
        "totalEmployees": total_employees,
        "pending": pending,
        "totalNet": total_net,
        "totalGross": total_gross,
        "totalDeductions": total_deductions,
    }


@router.post("/process/{employee_id}")
async def process_single(employee_id: str, data: ProcessPayrollRequest):
    """Process payroll for a single employee."""
    try:
        payroll = await calculate_payroll(
            employee_id,
            data.month,
            data.overtimeHours,
            data.festivalBonus,
            data.otherBonus,
        )
        return payroll
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/process-all")
async def process_all(data: ProcessAllRequest):
    """Process payroll for all employees at once."""
    results = await process_all_payroll(data.month, data.overrides)
    success = [r for r in results if "error" not in r]
    errors = [r for r in results if "error" in r]
    return {
        "total": len(results),
        "success": len(success),
        "errors": len(errors),
        "results": results,
    }


@router.put("/{payroll_id}/status")
async def update_status(payroll_id: str, status: str):
    """Update payroll status (processed/paid)."""
    db = get_db()
    result = await db.payroll.update_one(
        {"id": payroll_id}, {"$set": {"status": status}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return {"message": "Status updated", "status": status}


@router.get("/{payroll_id}")
async def get_payroll(payroll_id: str):
    """Get a specific payroll record."""
    db = get_db()
    payroll = await db.payroll.find_one({"id": payroll_id}, {"_id": 0})
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return payroll
