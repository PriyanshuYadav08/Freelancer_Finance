from pydantic import BaseModel
from typing import List, Optional, Dict

class UserCreate(BaseModel):
    email: str
    password: str

class UserSettingsOut(BaseModel):
    business_name: str
    currency_symbol: str
    tax_rate_pct: float
    target_buffer_months: float
    target_hourly_rate: float

class UserSettingsUpdate(BaseModel):
    business_name: Optional[str] = None
    currency_symbol: Optional[str] = None
    tax_rate_pct: Optional[float] = None
    target_buffer_months: Optional[float] = None
    target_hourly_rate: Optional[float] = None

class ClientOut(BaseModel):
    id: int
    name: str
    reliability_score: int
    avg_delay_days: int
    total_outstanding: float
    revenue_share_pct: float
    adjusted_receivable: float

    class Config:
        from_attributes = True


class TrendCard(BaseModel):
    trend: List[float]
    delta_label: str


class DashboardOut(BaseModel):
    current_cash: float
    outstanding_invoices: float
    adjusted_receivables: float
    upcoming_essential_expenses: float
    tax_reserve: float
    operating_reserve: float
    safe_to_spend: float
    monthly_burn: float
    runway_months: float
    revenue_concentration_pct: float
    top_client_name: Optional[str]
    financial_health: int
    overdue_invoice_count: int
    overdue_invoice_total: float
    clients: List[ClientOut]
    alerts: List[str]
    trends: Dict[str, TrendCard]


class ChatRequest(BaseModel):
    message: str


class ReasoningLine(BaseModel):
    label: str
    value: str


class ChatResponse(BaseModel):
    reply: str
    headline: Optional[str] = None
    reasoning: Optional[List[ReasoningLine]] = None
    note: Optional[str] = None


class ScenarioPreset(BaseModel):
    id: str
    label: str
    subtitle: str
    duration_months: float
    monthly_revenue_drop: float
    one_time_expense: float


class SimulateCustomRequest(BaseModel):
    label: Optional[str] = "Custom scenario"
    duration_months: float = 6
    monthly_revenue_drop: float = 0
    one_time_expense: float = 0


class SimulateResult(BaseModel):
    label: str
    duration_months: float
    monthly_revenue_drop: float
    revenue_drop_pct: float
    one_time_expense: float
    revenue_current: float
    revenue_scenario: float
    runway_current: float
    runway_scenario: float
    risk_current: str
    risk_scenario: str


class ClientListItem(BaseModel):
    id: int
    name: str
    status: str
    lifetime_revenue: float
    revenue_contribution_pct: float
    reliability_score: int
    avg_delay_days: int
    last_payment_date: Optional[str]
    outstanding: float


class InvoiceOut(BaseModel):
    id: int
    invoice_number: str
    client_id: int
    client_name: str
    project_id: Optional[int] = None
    project_name: str
    amount: float
    status: str
    issue_date: str
    due_date: str
    paid_date: Optional[str]


class ClientDetailOut(BaseModel):
    id: int
    name: str
    status: str
    last_payment_date: Optional[str]
    lifetime_revenue: float
    revenue_contribution_pct: float
    reliability_score: int
    avg_delay_days: int
    revenue_over_time: List[Dict]
    ai_insight: str
    invoices: List[InvoiceOut]


class InvoiceListOut(BaseModel):
    counts: Dict[str, int]
    total: int
    page: int
    page_size: int
    invoices: List[InvoiceOut]


class ExpenseOut(BaseModel):
    id: int
    name: str
    category: str
    amount: float
    date: str
    recurring: bool
    essential: bool


class CashflowPoint(BaseModel):
    month: str
    value: float
    kind: str


class MonthlyNet(BaseModel):
    month: str
    income: float
    expense: float
    net: float


class CashflowForecastOut(BaseModel):
    history: List[CashflowPoint]
    forecast: List[CashflowPoint]
    monthly_net: List[MonthlyNet]


# Projects
class ProjectCreate(BaseModel):
    client_id: Optional[int] = None
    name: str
    budget: float = 0.0
    hours_logged: float = 0.0
    target_hourly_rate: float = 1500.0
    status: str = "in_progress"  # in_progress | completed | on_hold
    deadline: Optional[str] = None


class ProjectUpdate(BaseModel):
    client_id: Optional[int] = None
    name: Optional[str] = None
    budget: Optional[float] = None
    hours_logged: Optional[float] = None
    target_hourly_rate: Optional[float] = None
    status: Optional[str] = None
    deadline: Optional[str] = None


class ProjectOut(BaseModel):
    id: int
    client_id: Optional[int] = None
    client_name: str = "Unassigned"
    name: str
    budget: float
    hours_logged: float
    target_hourly_rate: float
    status: str
    deadline: Optional[str] = None
    effective_hourly_rate: float
    invoiced_total: float


# Goals
class GoalCreate(BaseModel):
    name: str
    category: str = "emergency_fund"
    target_amount: float
    current_amount: float = 0.0
    target_date: Optional[str] = None


class GoalOut(BaseModel):
    id: int
    name: str
    category: str
    target_amount: float
    current_amount: float
    target_date: Optional[str] = None
    progress_pct: float
    remaining_amount: float


# Tax Analysis
class TaxDeductionItem(BaseModel):
    category: str
    total_amount: float

class TaxAnalysisOut(BaseModel):
    taxable_income_30d: float
    deductible_expenses_30d: float
    standard_tax_reserve: float
    presumptive_44ada_tax_reserve: float
    recommended_reserve: float
    deductions_breakdown: List[TaxDeductionItem]


# Amortization Schedule
class AmortizationScheduleEntry(BaseModel):
    month_number: int
    date: str
    emi: float
    principal_paid: float
    interest_paid: float
    remaining_balance: float

class AmortizationScheduleOut(BaseModel):
    loan_id: int
    loan_name: str
    principal: float
    annual_rate: float
    tenure_months: int
    total_interest: float
    total_payment: float
    schedule: List[AmortizationScheduleEntry]


# Writes: invoices, income, clients
class InvoiceCreate(BaseModel):
    client_id: int
    project_id: Optional[int] = None
    project_name: str
    amount: float
    issue_date: str
    due_date: str
    status: str = "sent"


class InvoiceStatusUpdate(BaseModel):
    status: str
    paid_date: Optional[str] = None


class IncomeCreate(BaseModel):
    client_id: int
    amount: float
    description: str = "Income"
    date: str


class ClientCreate(BaseModel):
    name: str
    pay_probability: float = 0.8
    avg_delay_days: int = 0
    reliability_score: int = 75


class ClientCreated(BaseModel):
    id: int
    name: str


# Loans
class LoanCreate(BaseModel):
    name: str
    principal: float
    annual_rate: float
    tenure_months: int
    start_date: str
    penal_rate_monthly: float = 2.0


class LoanMissedEmisUpdate(BaseModel):
    missed_emis: int


class ArrearsOut(BaseModel):
    missed_months: int
    missed_principal_interest: float
    penalty_accrued: float
    total_arrears: float


class LoanOut(BaseModel):
    id: int
    name: str
    principal: float
    annual_rate: float
    tenure_months: int
    start_date: str
    status: str
    penal_rate_monthly: float
    emi: float
    months_elapsed: int
    months_remaining: int
    outstanding_balance: float
    missed_emis: int
    arrears: Optional[ArrearsOut] = None


class LoanSimulateRequest(BaseModel):
    missed_months: int
    catchup_months: int = 3


class LoanSimulateResult(BaseModel):
    loan_id: int
    loan_name: str
    emi: float
    missed_months: int
    catchup_months: int
    arrears: ArrearsOut
    extra_per_month: float
    monthly_surplus: float
    fits_surplus: bool
    risk: str
    projected_arrears_if_ignored_3mo: float
    actions: List[str]
