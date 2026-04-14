# ================================================================
# SmartPayroll AI — Pydantic Models
# ================================================================

from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ── Salary Structure ───────────────────────────────────────────
class SalaryStructure(BaseModel):
    basic: float = 0
    hra: float = 0
    da: float = 0
    specialAllowance: float = 0
    gross: float = 0


# ── Leave Balance ──────────────────────────────────────────────
class LeaveUnit(BaseModel):
    total: int = 0
    used: int = 0


class LeaveBalance(BaseModel):
    earned: LeaveUnit = LeaveUnit()
    casual: LeaveUnit = LeaveUnit()
    sick: LeaveUnit = LeaveUnit()


# ── Employee ───────────────────────────────────────────────────
class EmployeeCreate(BaseModel):
    name: str
    email: str = ""
    phone: str = ""
    role: str
    department: str = "Other"
    joinDate: str = ""
    bankName: str = ""
    bankAccount: str = ""
    ifsc: str = ""
    salary: SalaryStructure = SalaryStructure()
    leaves: LeaveBalance = LeaveBalance()


class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None
    joinDate: Optional[str] = None
    bankName: Optional[str] = None
    bankAccount: Optional[str] = None
    ifsc: Optional[str] = None
    salary: Optional[SalaryStructure] = None
    leaves: Optional[LeaveBalance] = None


class Employee(EmployeeCreate):
    id: str


# ── Attendance ─────────────────────────────────────────────────
class AttendanceDay(BaseModel):
    day: int
    status: str  # present, absent, half-day, paid-leave, unpaid-leave, holiday, weekend


class AttendanceBulk(BaseModel):
    days: dict[str, str]  # {"1": "present", "2": "absent", ...}


class AttendanceSummary(BaseModel):
    present: int = 0
    absent: int = 0
    halfDay: int = 0
    paidLeave: int = 0
    unpaidLeave: int = 0
    holiday: int = 0
    weekend: int = 0
    totalWorking: float = 0


# ── Payroll ────────────────────────────────────────────────────
class PayrollEarnings(BaseModel):
    basic: float = 0
    hra: float = 0
    da: float = 0
    specialAllowance: float = 0
    overtimePay: float = 0
    festivalBonus: float = 0
    otherBonus: float = 0
    leaveEncashment: float = 0
    grossEarnings: float = 0


class PayrollDeductions(BaseModel):
    pf: float = 0
    esi: float = 0
    professionalTax: float = 0
    tds: float = 0
    otherDeductions: float = 0
    totalDeductions: float = 0


class PayrollRecord(BaseModel):
    id: str = ""
    employeeId: str
    employeeName: str = ""
    employeeRole: str = ""
    month: str
    processedDate: str = ""
    workingDays: int = 0
    presentDays: int = 0
    paidLeaveDays: int = 0
    unpaidLeaveDays: int = 0
    halfDays: int = 0
    lopDays: float = 0
    overtimeHours: float = 0
    earnings: PayrollEarnings = PayrollEarnings()
    deductions: PayrollDeductions = PayrollDeductions()
    netPay: float = 0
    aiSummary: str = ""
    status: str = "processed"


class ProcessPayrollRequest(BaseModel):
    month: str
    overtimeHours: float = 0
    festivalBonus: float = 0
    otherBonus: float = 0


class ProcessAllRequest(BaseModel):
    month: str
    overrides: dict = {}  # {employee_id: {overtimeHours, festivalBonus, otherBonus}}


# ── Settings ───────────────────────────────────────────────────
class CompanySettings(BaseModel):
    name: str = "My Company"
    address: str = ""
    email: str = ""
    phone: str = ""
    fiscalYearStart: str = "April"


class PayrollPolicy(BaseModel):
    pfRate: float = 12
    esiRate: float = 0.75
    professionalTax: float = 200
    tdsRate: float = 10
    overtimeMultiplier: float = 2
    workingHoursPerDay: int = 8
    workingDaysPerMonth: int = 26
    currency: str = "₹"


class Festival(BaseModel):
    id: str
    name: str
    month: int
    bonusPercentage: float
    enabled: bool = False


class LeavePolicy(BaseModel):
    earnedPerYear: int = 15
    casualPerYear: int = 7
    sickPerYear: int = 7


class AIConfig(BaseModel):
    apiUrl: str = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    model: str = "gemini-2.0-flash"


class AppSettings(BaseModel):
    company: CompanySettings = CompanySettings()
    payroll: PayrollPolicy = PayrollPolicy()
    festivals: list[Festival] = []
    leaves: LeavePolicy = LeavePolicy()
    ai: AIConfig = AIConfig()


class SettingsUpdate(BaseModel):
    company: Optional[CompanySettings] = None
    payroll: Optional[PayrollPolicy] = None
    festivals: Optional[list[Festival]] = None
    leaves: Optional[LeavePolicy] = None
    ai: Optional[AIConfig] = None


# ── AI ─────────────────────────────────────────────────────────
class AIChatRequest(BaseModel):
    message: str
    history: list[dict] = []


class AISalaryRequest(BaseModel):
    role: str
    department: str
    budget: float


class AIAttendanceRequest(BaseModel):
    employeeId: str
    month: str


class AIPayrollReviewRequest(BaseModel):
    payrollId: str


class AIReportRequest(BaseModel):
    reportType: str
    data: dict = {}


# ── Export/Import ──────────────────────────────────────────────
class ImportData(BaseModel):
    employees: list[dict] = []
    attendance: dict = {}
    payroll: list[dict] = []
    settings: Optional[dict] = None
