"""
Financial Engine
================
Every number shown to the user, or handed to the AI CFO / simulator, is
computed here from raw ledger data. The AI layer explains these numbers,
it never invents them - see ai_cfo.py.
"""
from datetime import date, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from . import models

TAX_RATE = 0.15          # simplified flat estimate - NOT tax advice
OPERATING_RESERVE_RATE = 0.08


def _account(db: Session) -> models.Account:
    acct = db.query(models.Account).first()
    if acct is None:
        acct = models.Account(current_cash=0.0)
        db.add(acct)
        db.commit()
        db.refresh(acct)
    return acct


def get_current_cash(db: Session) -> float:
    return _account(db).current_cash


def get_outstanding_invoices(db: Session):
    return db.query(models.Invoice).filter(models.Invoice.status != "paid").all()


def get_client_totals(db: Session):
    """Per-client outstanding + probability-adjusted receivable + revenue share."""
    clients = db.query(models.Client).all()
    invoices = get_outstanding_invoices(db)
    all_invoices = db.query(models.Invoice).all()

    total_all_time = sum(i.amount for i in all_invoices) or 1.0

    out = []
    for c in clients:
        c_invoices = [i for i in invoices if i.client_id == c.id]
        outstanding = sum(i.amount for i in c_invoices)
        adjusted = outstanding * c.pay_probability
        c_all_time = sum(i.amount for i in all_invoices if i.client_id == c.id)
        share = round(100 * c_all_time / total_all_time, 1)
        out.append({
            "id": c.id,
            "name": c.name,
            "reliability_score": c.reliability_score,
            "avg_delay_days": c.avg_delay_days,
            "total_outstanding": round(outstanding, 2),
            "revenue_share_pct": share,
            "adjusted_receivable": round(adjusted, 2),
        })
    return out


def get_adjusted_receivables(db: Session) -> float:
    return round(sum(c["adjusted_receivable"] for c in get_client_totals(db)), 2)


def get_monthly_burn(db: Session) -> float:
    """Approximate monthly essential burn from recurring essential expenses."""
    expenses = db.query(models.Expense).filter(
        models.Expense.recurring == True,  # noqa: E712
        models.Expense.essential == True,  # noqa: E712
    ).all()
    return round(sum(e.amount for e in expenses), 2)


def get_upcoming_essential_expenses(db: Session, days: int = 30) -> float:
    """Recurring essential burn scaled to the window, used in safe-to-spend."""
    monthly = get_monthly_burn(db)
    return round(monthly * (days / 30.0), 2)


def get_tax_reserve(db: Session) -> float:
    """Simplified estimate: a flat rate held against income received in the
    last 30 days plus receivables likely to land in the next 30. This is a
    planning heuristic, not tax advice - a real deployment should replace
    this with a jurisdiction-specific deterministic tax engine."""
    today = date.today()
    recent_paid = db.query(models.Invoice).filter(
        models.Invoice.status == "paid",
        models.Invoice.paid_date >= today - timedelta(days=30),
    ).all()
    recent_income = sum(i.amount for i in recent_paid)
    return round(recent_income * TAX_RATE, 2)


def get_operating_reserve(db: Session) -> float:
    return round(get_monthly_burn(db) * OPERATING_RESERVE_RATE, 2)


def get_safe_to_spend(db: Session) -> float:
    cash = get_current_cash(db)
    upcoming = get_upcoming_essential_expenses(db)
    tax = get_tax_reserve(db)
    op_reserve = get_operating_reserve(db)
    reliable_soon = get_reliable_receivables_due_soon(db, days=30)
    return round(cash - upcoming - tax - op_reserve + reliable_soon, 2)


def get_reliable_receivables_due_soon(db: Session, days: int = 30) -> float:
    """Probability-adjusted receivables due within `days`, only counting
    clients with a decent pay probability so shaky money isn't spent."""
    today = date.today()
    invoices = get_outstanding_invoices(db)
    total = 0.0
    for inv in invoices:
        if inv.due_date <= today + timedelta(days=days) and inv.client.pay_probability >= 0.6:
            total += inv.amount * inv.client.pay_probability
    return round(total, 2)


def get_runway_months(db: Session, cash_override: float = None) -> float:
    burn = get_monthly_burn(db)
    cash = get_current_cash(db) if cash_override is None else cash_override
    if burn <= 0:
        return 99.0
    return round(cash / burn, 1)


def get_revenue_concentration(db: Session):
    totals = get_client_totals(db)
    if not totals:
        return 0.0, None
    top = max(totals, key=lambda c: c["revenue_share_pct"])
    return top["revenue_share_pct"], top["name"]


def get_overdue_invoices(db: Session):
    today = date.today()
    return db.query(models.Invoice).filter(
        models.Invoice.status != "paid",
        models.Invoice.due_date < today,
    ).all()


def get_financial_health(db: Session) -> int:
    """0-100 composite score from five weighted sub-scores."""
    runway = get_runway_months(db)
    runway_score = min(100, runway / 6.0 * 100)  # 6mo+ = full marks

    concentration_pct, _ = get_revenue_concentration(db)
    concentration_score = max(0, 100 - concentration_pct)  # lower concentration = better

    clients = get_client_totals(db)
    avg_reliability = (sum(c["reliability_score"] for c in clients) / len(clients)) if clients else 80

    overdue_total = sum(i.amount for i in get_overdue_invoices(db))
    outstanding_total = sum(i.amount for i in get_outstanding_invoices(db)) or 1.0
    overdue_penalty = max(0, 100 - 100 * (overdue_total / outstanding_total))

    sts = get_safe_to_spend(db)
    cash = get_current_cash(db) or 1.0
    liquidity_score = max(0, min(100, 100 * sts / cash))

    weights = {
        "runway": 0.3,
        "concentration": 0.2,
        "reliability": 0.2,
        "overdue": 0.15,
        "liquidity": 0.15,
    }
    score = (
        runway_score * weights["runway"]
        + concentration_score * weights["concentration"]
        + avg_reliability * weights["reliability"]
        + overdue_penalty * weights["overdue"]
        + liquidity_score * weights["liquidity"]
    )
    return round(score)


def get_alerts(db: Session):
    alerts = []
    overdue = get_overdue_invoices(db)
    for inv in overdue:
        days_late = (date.today() - inv.due_date).days
        alerts.append(f"₹{inv.amount:,.0f} invoice for \"{inv.project_name}\" is {days_late} days overdue.")

    concentration_pct, top_name = get_revenue_concentration(db)
    if concentration_pct >= 40 and top_name:
        alerts.append(f"{top_name} accounts for {concentration_pct:.0f}% of your revenue - concentration risk.")

    runway = get_runway_months(db)
    if runway < 3:
        alerts.append(f"Runway is {runway} months - below the 3-month safety line.")

    tax_reserve = get_tax_reserve(db)
    if tax_reserve > 0:
        alerts.append(f"Reserve roughly ₹{tax_reserve:,.0f} for taxes on income received in the last 30 days.")

    return alerts


def get_financial_state(db: Session) -> dict:
    """Single snapshot object - this is what the AI CFO and simulator both read."""
    clients = get_client_totals(db)
    concentration_pct, top_client = get_revenue_concentration(db)
    overdue = get_overdue_invoices(db)
    return {
        "current_cash": get_current_cash(db),
        "outstanding_invoices": round(sum(i.amount for i in get_outstanding_invoices(db)), 2),
        "adjusted_receivables": get_adjusted_receivables(db),
        "reliable_receivables_30d": get_reliable_receivables_due_soon(db, 30),
        "upcoming_essential_expenses": get_upcoming_essential_expenses(db),
        "tax_reserve": get_tax_reserve(db),
        "operating_reserve": get_operating_reserve(db),
        "safe_to_spend": get_safe_to_spend(db),
        "monthly_burn": get_monthly_burn(db),
        "runway_months": get_runway_months(db),
        "revenue_concentration_pct": concentration_pct,
        "top_client_name": top_client,
        "financial_health": get_financial_health(db),
        "overdue_invoice_count": len(overdue),
        "overdue_invoice_total": round(sum(i.amount for i in overdue), 2),
        "clients": clients,
        "alerts": get_alerts(db),
    }


def risk_label(runway: float) -> str:
    if runway >= 6:
        return "LOW"
    if runway >= 3:
        return "MEDIUM"
    return "HIGH"
