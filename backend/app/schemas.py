from pydantic import BaseModel
from typing import List, Optional, Dict


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
