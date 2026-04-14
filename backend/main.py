# ================================================================
# SmartPayroll AI — FastAPI Main Application
# ================================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from config import get_settings
from database import connect_db, close_db

# Import route modules
from routes.employees import router as employees_router
from routes.attendance import router as attendance_router
from routes.payroll import router as payroll_router
from routes.settings import router as settings_router
from routes.ai import router as ai_router
from routes.reports import router as reports_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifecycle — connect/disconnect MongoDB."""
    await connect_db()
    yield
    await close_db()


# ── Create App ────────────────────────────────────────────────
app = FastAPI(
    title="SmartPayroll AI",
    description="AI-Enabled Payroll Management API for Micro Businesses",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register Routes ──────────────────────────────────────────
app.include_router(employees_router)
app.include_router(attendance_router)
app.include_router(payroll_router)
app.include_router(settings_router)
app.include_router(ai_router)
app.include_router(reports_router)


# ── Health Check ──────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "app": "SmartPayroll AI",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    from database import get_db
    db = get_db()
    try:
        await db.command("ping")
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}


# ── Run ───────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
