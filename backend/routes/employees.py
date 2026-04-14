# ================================================================
# SmartPayroll AI — Employee Routes
# ================================================================

from fastapi import APIRouter, HTTPException
from database import get_db
from models import EmployeeCreate, EmployeeUpdate
import time

router = APIRouter(prefix="/api/employees", tags=["Employees"])


@router.get("")
async def list_employees():
    """Get all employees."""
    db = get_db()
    employees = await db.employees.find({}, {"_id": 0}).to_list(length=100)
    return employees


@router.get("/{employee_id}")
async def get_employee(employee_id: str):
    """Get single employee."""
    db = get_db()
    emp = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp


@router.post("")
async def create_employee(employee: EmployeeCreate):
    """Create a new employee."""
    db = get_db()
    count = await db.employees.count_documents({})
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 employees allowed for micro business plan")

    emp_dict = employee.model_dump()
    emp_dict["id"] = "emp_" + hex(int(time.time()))[2:]

    # Ensure gross is computed
    salary = emp_dict.get("salary", {})
    salary["gross"] = salary.get("basic", 0) + salary.get("hra", 0) + salary.get("da", 0) + salary.get("specialAllowance", 0)
    emp_dict["salary"] = salary

    await db.employees.insert_one(emp_dict)

    # Return without _id
    emp_dict.pop("_id", None)
    return emp_dict


@router.put("/{employee_id}")
async def update_employee(employee_id: str, updates: EmployeeUpdate):
    """Update an employee."""
    db = get_db()
    emp = await db.employees.find_one({"id": employee_id})
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")

    update_data = {k: v for k, v in updates.model_dump(exclude_none=True).items()}

    # Recompute gross if salary changed
    if "salary" in update_data:
        s = update_data["salary"]
        s["gross"] = s.get("basic", 0) + s.get("hra", 0) + s.get("da", 0) + s.get("specialAllowance", 0)

    if update_data:
        await db.employees.update_one({"id": employee_id}, {"$set": update_data})

    updated = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    return updated


@router.delete("/{employee_id}")
async def delete_employee(employee_id: str):
    """Delete an employee."""
    db = get_db()
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Employee not found")
    return {"message": "Employee deleted", "id": employee_id}
