# ================================================================
# SmartPayroll AI — AI Service (Server-side API calls)
# ================================================================

import httpx
from database import get_db
from config import get_settings
from services.payroll_service import get_attendance_summary

settings = get_settings()


async def _call_ai(messages: list, max_tokens: int = 1024, temperature: float = 0.7) -> str:
    """Make an AI API call using the Gemini API key."""
    db = get_db()
    app_settings = await db.settings.find_one({"_type": "app_settings"})
    ai_config = app_settings.get("ai", {})

    api_url = ai_config.get("apiUrl", settings.AI_API_URL)
    model = ai_config.get("model", settings.AI_MODEL)
    api_key = settings.VITE_GEMINI_API_KEY

    if not api_key:
        raise ValueError("AI API key not configured. Set VITE_GEMINI_API_KEY in .env file.")

    # Convert message format from OpenAI to Gemini format
    # Combine all messages into a single text prompt
    prompt_text = ""
    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        prompt_text += f"{role.upper()}: {content}\n"

    body = {
        "contents": [
            {
                "parts": [
                    {"text": prompt_text}
                ]
            }
        ],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens,
        },
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        url = f"{api_url}/{model}:generateContent?key={api_key}"
        response = await client.post(
            url,
            json=body,
            headers={
                "Content-Type": "application/json",
            },
        )

        if response.status_code != 200:
            raise ValueError(f"Gemini API error {response.status_code}: {response.text}")

        data = response.json()
        return data.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "No response.")


async def _build_context() -> str:
    """Build context string from current database data."""
    db = get_db()
    employees = await db.employees.find().to_list(length=100)
    app_settings = await db.settings.find_one({"_type": "app_settings"})
    payroll_config = app_settings.get("payroll", {})
    currency = payroll_config.get("currency", "₹")

    from datetime import datetime
    now = datetime.utcnow()
    current_month = f"{now.year}-{str(now.month).zfill(2)}"
    payrolls = await db.payroll.find({"month": current_month}).to_list(length=100)

    festivals = app_settings.get("festivals", [])
    enabled_festivals = [f for f in festivals if f.get("enabled")]

    lines = [
        f"COMPANY DATA ({app_settings.get('company', {}).get('name', 'N/A')}):",
        f"- Total Employees: {len(employees)}",
        f"- Currency: {currency}",
        f"- PF Rate: {payroll_config.get('pfRate', 12)}%, ESI Rate: {payroll_config.get('esiRate', 0.75)}%",
        f"- Professional Tax: {currency}{payroll_config.get('professionalTax', 200)}",
        f"- TDS Rate: {payroll_config.get('tdsRate', 10)}%",
        f"- Working Days/Month: {payroll_config.get('workingDaysPerMonth', 26)}",
        f"- Overtime Multiplier: {payroll_config.get('overtimeMultiplier', 2)}x",
        "",
        "EMPLOYEES:",
    ]

    for e in employees:
        s = e.get("salary", {})
        l = e.get("leaves", {})
        el = l.get("earned", {})
        cl = l.get("casual", {})
        sl = l.get("sick", {})
        lines.append(
            f"- {e.get('name')} | {e.get('role')} | {e.get('department')} | "
            f"Gross: {currency}{s.get('gross', 0)} (Basic: {s.get('basic', 0)}, HRA: {s.get('hra', 0)}, "
            f"DA: {s.get('da', 0)}, Special: {s.get('specialAllowance', 0)}) | "
            f"Leaves - EL: {el.get('total', 0) - el.get('used', 0)}, "
            f"CL: {cl.get('total', 0) - cl.get('used', 0)}, "
            f"SL: {sl.get('total', 0) - sl.get('used', 0)}"
        )

    lines.append("")
    lines.append(f"CURRENT MONTH PAYROLL ({current_month}):")
    if payrolls:
        for p in payrolls:
            lines.append(
                f"- {p.get('employeeName')}: Gross: {currency}{p.get('earnings', {}).get('grossEarnings', 0)}, "
                f"Deductions: {currency}{p.get('deductions', {}).get('totalDeductions', 0)}, "
                f"Net: {currency}{p.get('netPay', 0)}, OT: {p.get('overtimeHours', 0)}h, "
                f"LOP: {p.get('lopDays', 0)}"
            )
    else:
        lines.append("No payroll processed yet.")

    lines.append("")
    lines.append("FESTIVAL BONUSES:")
    if enabled_festivals:
        for f in enabled_festivals:
            lines.append(f"- {f['name']}: {f['bonusPercentage']}% in month {f['month']}")
    else:
        lines.append("None enabled")

    return "\n".join(lines)


# ── Public AI Features ────────────────────────────────────────

async def chat(user_message: str, history: list = []) -> str:
    """Chat with AI payroll assistant."""
    context = await _build_context()
    db = get_db()
    app_settings = await db.settings.find_one({"_type": "app_settings"})
    currency = app_settings.get("payroll", {}).get("currency", "₹")

    messages = [
        {
            "role": "system",
            "content": f"""You are SmartPayroll AI Assistant — an intelligent payroll management assistant for small businesses (under 10 employees). You help with payroll calculations, leave management, salary queries, compliance questions, and provide actionable insights.

Your expertise includes:
- Indian payroll regulations (PF, ESI, Professional Tax, TDS)
- Salary structure optimization (Basic, HRA, DA, Special Allowances)
- Overtime calculations (Factories Act compliant)
- Leave management (Earned Leave, Casual Leave, Sick Leave)
- Festival bonus planning, Cost analysis and budget optimization

CURRENT BUSINESS DATA:
{context}

Guidelines:
- Be concise but thorough. Use {currency} for all amounts.
- Provide specific numbers. Suggest optimizations proactively.
- Flag compliance concerns. Use bullet points.""",
        },
        *[{"role": m.get("role", "user"), "content": m.get("content", "")} for m in history[-10:]],
        {"role": "user", "content": user_message},
    ]

    return await _call_ai(messages)


async def generate_insights() -> str:
    """Generate dashboard insights."""
    context = await _build_context()
    messages = [
        {"role": "system", "content": "You are SmartPayroll AI. Generate a brief, insightful monthly payroll summary for the business owner."},
        {"role": "user", "content": f"Based on this data, provide 3-4 key payroll insights. Be specific and actionable. Under 150 words.\n\n{context}"},
    ]
    return await _call_ai(messages, max_tokens=300)


async def suggest_salary(role: str, department: str, budget: float) -> str:
    """Suggest salary structure."""
    db = get_db()
    app_settings = await db.settings.find_one({"_type": "app_settings"})
    currency = app_settings.get("payroll", {}).get("currency", "₹")

    messages = [
        {"role": "system", "content": "You are a payroll expert. Suggest an optimal salary structure for Indian small businesses that minimizes tax burden while remaining compliant."},
        {"role": "user", "content": f"Suggest salary structure for:\n- Role: {role}\n- Department: {department}\n- Monthly Budget (CTC): {currency}{budget}\n\nBreak down into: Basic, HRA, DA, Special Allowance. Under 200 words."},
    ]
    return await _call_ai(messages, max_tokens=400)


async def analyze_attendance(employee_id: str, month: str) -> str:
    """Detect attendance anomalies."""
    db = get_db()
    employee = await db.employees.find_one({"id": employee_id})
    if not employee:
        raise ValueError("Employee not found")

    summary = await get_attendance_summary(employee_id, month)
    attendance = await db.attendance.find_one({"employee_id": employee_id, "month": month})
    days = attendance.get("days", {}) if attendance else {}

    leaves = employee.get("leaves", {})
    messages = [
        {"role": "system", "content": "You are an HR analytics AI. Analyze attendance patterns and flag anomalies."},
        {"role": "user", "content": f"Analyze attendance for {employee['name']} ({employee['role']}) in {month}:\n\nSummary: Present: {summary['present']}, Absent: {summary['absent']}, Half-Day: {summary['halfDay']}, Paid Leave: {summary['paidLeave']}, Unpaid Leave: {summary['unpaidLeave']}\n\nLeave Balance: EL: {leaves.get('earned', {}).get('total', 0) - leaves.get('earned', {}).get('used', 0)}, CL: {leaves.get('casual', {}).get('total', 0) - leaves.get('casual', {}).get('used', 0)}, SL: {leaves.get('sick', {}).get('total', 0) - leaves.get('sick', {}).get('used', 0)}\n\nBrief analysis under 100 words."},
    ]
    return await _call_ai(messages, max_tokens=250)


async def review_payroll(payroll_id: str) -> str:
    """Review a payroll record."""
    db = get_db()
    payroll = await db.payroll.find_one({"id": payroll_id})
    if not payroll:
        raise ValueError("Payroll record not found")

    app_settings = await db.settings.find_one({"_type": "app_settings"})
    ps = app_settings.get("payroll", {})
    c = ps.get("currency", "₹")
    e = payroll.get("earnings", {})
    d = payroll.get("deductions", {})

    messages = [
        {"role": "system", "content": "You are a payroll auditor AI. Review calculations for accuracy."},
        {"role": "user", "content": f"Review payroll for {payroll['employeeName']}:\nEarnings - Basic: {c}{e.get('basic')}, HRA: {c}{e.get('hra')}, DA: {c}{e.get('da')}, Special: {c}{e.get('specialAllowance')}, OT({payroll.get('overtimeHours')}h): {c}{e.get('overtimePay')}, Festival: {c}{e.get('festivalBonus')}, Gross: {c}{e.get('grossEarnings')}\nDeductions - PF({ps.get('pfRate')}%): {c}{d.get('pf')}, ESI({ps.get('esiRate')}%): {c}{d.get('esi')}, PT: {c}{d.get('professionalTax')}, TDS({ps.get('tdsRate')}%): {c}{d.get('tds')}, Total: {c}{d.get('totalDeductions')}\nNet: {c}{payroll.get('netPay')}, Days: {payroll.get('presentDays')}/{payroll.get('workingDays')}, LOP: {payroll.get('lopDays')}\n\nBrief review under 100 words."},
    ]
    return await _call_ai(messages, max_tokens=250)


async def generate_payslip_summary(payroll_id: str) -> str:
    """Generate payslip AI summary."""
    db = get_db()
    payroll = await db.payroll.find_one({"id": payroll_id})
    if not payroll:
        return ""

    app_settings = await db.settings.find_one({"_type": "app_settings"})
    c = app_settings.get("payroll", {}).get("currency", "₹")
    e = payroll.get("earnings", {})

    messages = [
        {"role": "system", "content": "Write a brief professional salary summary for a payslip. 2-3 sentences, under 50 words."},
        {"role": "user", "content": f"Payslip summary for {payroll['employeeName']}: Gross {c}{e.get('grossEarnings')}, Net {c}{payroll.get('netPay')}, Days {payroll.get('presentDays')}/{payroll.get('workingDays')}, OT {payroll.get('overtimeHours')}h, LOP {payroll.get('lopDays')}, Festival Bonus {c}{e.get('festivalBonus')}"},
    ]
    summary = await _call_ai(messages, max_tokens=100)

    # Save to payroll record
    await db.payroll.update_one({"id": payroll_id}, {"$set": {"aiSummary": summary}})
    return summary


async def generate_report_summary(report_type: str, data: dict) -> str:
    """Generate report executive summary."""
    context = await _build_context()
    messages = [
        {"role": "system", "content": "You are SmartPayroll AI. Generate a concise executive summary for a payroll report."},
        {"role": "user", "content": f"Executive summary for {report_type} report:\n\n{context}\n\nAdditional: {str(data)[:500]}\n\nKeep under 150 words with key metrics."},
    ]
    return await _call_ai(messages, max_tokens=300)


async def recommend_bonus() -> str:
    """AI bonus recommendations."""
    context = await _build_context()
    messages = [
        {"role": "system", "content": "You are an HR compensation advisor. Recommend bonus amounts based on attendance, tenure, and role."},
        {"role": "user", "content": f"Recommend bonuses for each employee:\n\n{context}\n\nSpecific amounts per employee. Under 200 words."},
    ]
    return await _call_ai(messages, max_tokens=400)
