from pydantic import BaseModel
from typing import List, Optional


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


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
    data: Optional[dict] = None


class SimulateRequest(BaseModel):
    scenario: str  # lose_top_client | income_drop_30 | expense_shock | payment_delay_45 | custom_purchase
    amount: Optional[float] = None  # for expense_shock / custom_purchase


class SimulateResult(BaseModel):
    label: str
    before: dict
    after: dict
    risk_before: str
    risk_after: str
    explanation: str
