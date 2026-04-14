# ================================================================
# SmartPayroll AI — AI Routes (all AI features via backend)
# ================================================================

from fastapi import APIRouter, HTTPException
from models import (
    AIChatRequest, AISalaryRequest, AIAttendanceRequest,
    AIPayrollReviewRequest, AIReportRequest,
)
from services import ai_service

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/chat")
async def ai_chat(data: AIChatRequest):
    """Chat with AI payroll assistant."""
    try:
        response = await ai_service.chat(data.message, data.history)
        return {"response": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/insights")
async def ai_insights():
    """Generate dashboard insights."""
    try:
        insights = await ai_service.generate_insights()
        return {"response": insights}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/salary-suggest")
async def ai_salary_suggest(data: AISalaryRequest):
    """AI salary structure suggestion."""
    try:
        suggestion = await ai_service.suggest_salary(data.role, data.department, data.budget)
        return {"response": suggestion}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/attendance-analyze")
async def ai_attendance_analyze(data: AIAttendanceRequest):
    """AI attendance anomaly detection."""
    try:
        analysis = await ai_service.analyze_attendance(data.employeeId, data.month)
        return {"response": analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payroll-review")
async def ai_payroll_review(data: AIPayrollReviewRequest):
    """AI payroll review."""
    try:
        review = await ai_service.review_payroll(data.payrollId)
        return {"response": review}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payslip-summary/{payroll_id}")
async def ai_payslip_summary(payroll_id: str):
    """Generate payslip AI summary."""
    try:
        summary = await ai_service.generate_payslip_summary(payroll_id)
        return {"response": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/report-summary")
async def ai_report_summary(data: AIReportRequest):
    """Generate report executive summary."""
    try:
        summary = await ai_service.generate_report_summary(data.reportType, data.data)
        return {"response": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bonus-recommend")
async def ai_bonus_recommend():
    """AI bonus recommendation."""
    try:
        recommendation = await ai_service.recommend_bonus()
        return {"response": recommendation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
