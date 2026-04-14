# ================================================================
# SmartPayroll AI — Settings Routes
# ================================================================

from fastapi import APIRouter
from database import get_db
from models import SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["Settings"])


@router.get("")
async def get_settings():
    """Get application settings."""
    db = get_db()
    settings = await db.settings.find_one({"_type": "app_settings"}, {"_id": 0, "_type": 0})
    return settings or {}


@router.put("")
async def update_settings(updates: SettingsUpdate):
    """Update application settings (partial merge)."""
    db = get_db()
    update_data = {}

    if updates.company:
        for k, v in updates.company.model_dump().items():
            update_data[f"company.{k}"] = v

    if updates.payroll:
        for k, v in updates.payroll.model_dump().items():
            update_data[f"payroll.{k}"] = v

    if updates.festivals is not None:
        update_data["festivals"] = [f.model_dump() for f in updates.festivals]

    if updates.leaves:
        for k, v in updates.leaves.model_dump().items():
            update_data[f"leaves.{k}"] = v

    if updates.ai:
        for k, v in updates.ai.model_dump().items():
            update_data[f"ai.{k}"] = v

    if update_data:
        await db.settings.update_one(
            {"_type": "app_settings"}, {"$set": update_data}
        )

    return await get_settings()
