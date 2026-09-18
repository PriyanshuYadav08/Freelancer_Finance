import calendar
import random
from datetime import date, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from . import models

TAX_RATE = 0.15          # simplified flat estimate - NOT tax advice
OPERATING_RESERVE_RATE = 0.08


def _account(db: Session, user_id: Optional[int] = None) -> models.Account:
    if user_id is not None:
        acct = db.query(models.Account).filter(models.Account.user_id == user_id).first()
    else:
        acct = db.query(models.Account).first()
    if acct is None:
        acct = models.Account(user_id=user_id, current_cash=0.0)
        db.add(acct)
        db.commit()
        db.refresh(acct)
    return acct


def get_current_cash(db: Session, user_id: Optional[int] = None) -> float:
    return _account(db, user_id).current_cash


def get_outstanding_invoices(db: Session, user_id: Optional[int] = None):
    q = db.query(models.Invoice).filter(models.Invoice.status != "paid")
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    return q.all()


def get_client_totals(db: Session, user_id: Optional[int] = None):
    """Per-client outstanding + probability-adjusted receivable + revenue share."""
    q_clients = db.query(models.Client)
    q_all_invoices = db.query(models.Invoice)
    if user_id is not None:
        q_clients = q_clients.filter(models.Client.user_id == user_id)
        q_all_invoices = q_all_invoices.filter(models.Invoice.user_id == user_id)

    clients = q_clients.all()
    invoices = get_outstanding_invoices(db, user_id=user_id)
    all_invoices = q_all_invoices.all()

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


def get_adjusted_receivables(db: Session, user_id: Optional[int] = None) -> float:
    return round(sum(c["adjusted_receivable"] for c in get_client_totals(db, user_id=user_id)), 2)


def get_monthly_burn(db: Session, user_id: Optional[int] = None) -> float:
    """Approximate monthly essential burn from recurring essential expenses
    plus EMIs on any active loans (a loan payment is essential burn)."""
    q_expenses = db.query(models.Expense).filter(
        models.Expense.recurring == True,  # noqa: E712
        models.Expense.essential == True,  # noqa: E712
    )
    if user_id is not None:
        q_expenses = q_expenses.filter(models.Expense.user_id == user_id)
    expenses = q_expenses.all()
    return round(sum(e.amount for e in expenses) + get_total_loan_emi(db, user_id=user_id), 2)


def calc_emi(principal: float, annual_rate: float, tenure_months: int) -> float:
    """Standard reducing-balance EMI formula."""
    if tenure_months <= 0:
        return round(principal, 2)
    r = (annual_rate / 12.0) / 100.0
    if r == 0:
        return round(principal / tenure_months, 2)
    factor = (1 + r) ** tenure_months
    emi = principal * r * factor / (factor - 1)
    return round(emi, 2)


def calc_outstanding_balance(principal: float, annual_rate: float, tenure_months: int, months_paid: int) -> float:
    """Reducing balance after `months_paid` on-schedule EMIs."""
    months_paid = max(0, min(months_paid, tenure_months))
    r = (annual_rate / 12.0) / 100.0
    if r == 0:
        return round(max(0.0, principal - (principal / tenure_months) * months_paid), 2)
    factor_n = (1 + r) ** tenure_months
    factor_k = (1 + r) ** months_paid
    balance = principal * (factor_n - factor_k) / (factor_n - 1)
    return round(max(0.0, balance), 2)


def get_total_loan_emi(db: Session, user_id: Optional[int] = None) -> float:
    q = db.query(models.Loan).filter(models.Loan.status == "active")
    if user_id is not None:
        q = q.filter(models.Loan.user_id == user_id)
    loans = q.all()
    return round(sum(calc_emi(l.principal, l.annual_rate, l.tenure_months) for l in loans), 2)


def get_upcoming_essential_expenses(db: Session, days: int = 30, user_id: Optional[int] = None) -> float:
    monthly = get_monthly_burn(db, user_id=user_id)
    return round(monthly * (days / 30.0), 2)


def get_tax_reserve(db: Session, user_id: Optional[int] = None) -> float:
    today = date.today()
    q = db.query(models.Invoice).filter(
        models.Invoice.status == "paid",
        models.Invoice.paid_date >= today - timedelta(days=30),
    )
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    recent_paid = q.all()
    recent_income = sum(i.amount for i in recent_paid)
    return round(recent_income * TAX_RATE, 2)


def get_operating_reserve(db: Session, user_id: Optional[int] = None) -> float:
    return round(get_monthly_burn(db, user_id=user_id) * OPERATING_RESERVE_RATE, 2)


def get_safe_to_spend(db: Session, user_id: Optional[int] = None) -> float:
    cash = get_current_cash(db, user_id=user_id)
    upcoming = get_upcoming_essential_expenses(db, days=30, user_id=user_id)
    tax = get_tax_reserve(db, user_id=user_id)
    op_reserve = get_operating_reserve(db, user_id=user_id)
    reliable_soon = get_reliable_receivables_due_soon(db, days=30, user_id=user_id)
    return round(cash - upcoming - tax - op_reserve + reliable_soon, 2)


def get_reliable_receivables_due_soon(db: Session, days: int = 30, user_id: Optional[int] = None) -> float:
    today = date.today()
    invoices = get_outstanding_invoices(db, user_id=user_id)
    total = 0.0
    for inv in invoices:
        if inv.due_date <= today + timedelta(days=days) and inv.client.pay_probability >= 0.6:
            total += inv.amount * inv.client.pay_probability
    return round(total, 2)


def get_runway_months(db: Session, cash_override: float = None, user_id: Optional[int] = None) -> float:
    burn = get_monthly_burn(db, user_id=user_id)
    cash = get_current_cash(db, user_id=user_id) if cash_override is None else cash_override
    if burn <= 0:
        return 99.0
    return round(cash / burn, 1)


def get_revenue_concentration(db: Session, user_id: Optional[int] = None):
    totals = get_client_totals(db, user_id=user_id)
    if not totals:
        return 0.0, None
    top = max(totals, key=lambda c: c["revenue_share_pct"])
    return top["revenue_share_pct"], top["name"]


def get_overdue_invoices(db: Session, user_id: Optional[int] = None):
    today = date.today()
    q = db.query(models.Invoice).filter(
        models.Invoice.status != "paid",
        models.Invoice.due_date < today,
    )
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    return q.all()


def get_financial_health(db: Session, user_id: Optional[int] = None) -> int:
    runway = get_runway_months(db, user_id=user_id)
    runway_score = min(100, runway / 6.0 * 100)

    concentration_pct, _ = get_revenue_concentration(db, user_id=user_id)
    concentration_score = max(0, 100 - concentration_pct)

    clients = get_client_totals(db, user_id=user_id)
    avg_reliability = (sum(c["reliability_score"] for c in clients) / len(clients)) if clients else 80

    overdue_total = sum(i.amount for i in get_overdue_invoices(db, user_id=user_id))
    outstanding_total = sum(i.amount for i in get_outstanding_invoices(db, user_id=user_id)) or 1.0
    overdue_penalty = max(0, 100 - 100 * (overdue_total / outstanding_total))

    sts = get_safe_to_spend(db, user_id=user_id)
    cash = get_current_cash(db, user_id=user_id) or 1.0
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


def get_alerts(db: Session, user_id: Optional[int] = None):
    alerts = []
    overdue = get_overdue_invoices(db, user_id=user_id)
    for inv in overdue:
        days_late = (date.today() - inv.due_date).days
        alerts.append(f"₹{inv.amount:,.0f} invoice for \"{inv.project_name}\" is {days_late} days overdue.")

    concentration_pct, top_name = get_revenue_concentration(db, user_id=user_id)
    if concentration_pct >= 40 and top_name:
        alerts.append(f"{top_name} accounts for {concentration_pct:.0f}% of your revenue - concentration risk.")

    runway = get_runway_months(db, user_id=user_id)
    if runway < 3:
        alerts.append(f"Runway is {runway} months - below the 3-month safety line.")

    tax_reserve = get_tax_reserve(db, user_id=user_id)
    if tax_reserve > 0:
        alerts.append(f"Reserve roughly ₹{tax_reserve:,.0f} for taxes on income received in the last 30 days.")

    q_loans = db.query(models.Loan).filter(models.Loan.status == "active", models.Loan.missed_emis > 0)
    if user_id is not None:
        q_loans = q_loans.filter(models.Loan.user_id == user_id)
    for loan in q_loans.all():
        emi = calc_emi(loan.principal, loan.annual_rate, loan.tenure_months)
        arrears = round(emi * loan.missed_emis, 2)
        alerts.append(f"{loan.missed_emis} missed EMI(s) on \"{loan.name}\" - at least ₹{arrears:,.0f} in arrears is accruing penalty interest.")

    return alerts


def get_health_label(score: int) -> str:
    if score >= 75:
        return "Good"
    if score >= 50:
        return "Fair"
    return "Needs attention"


def get_trends(db: Session, user_id: Optional[int] = None) -> dict:
    cash = get_current_cash(db, user_id=user_id)
    runway = get_runway_months(db, user_id=user_id)
    health = get_financial_health(db, user_id=user_id)
    sts = get_safe_to_spend(db, user_id=user_id)

    cash_spark = get_sparkline(db, "cash", cash)
    runway_spark = get_sparkline(db, "runway", runway)
    health_spark = get_sparkline(db, "health", health)
    sts_spark = get_sparkline(db, "sts", sts)

    prev_cash = cash_spark[-2] if len(cash_spark) > 1 and cash_spark[-2] else cash or 1
    cash_delta_pct = round(100 * (cash_spark[-1] - prev_cash) / prev_cash, 1) + 0.0
    runway_delta = round(runway_spark[-1] - runway_spark[-2], 1) + 0.0 if len(runway_spark) > 1 else 0.0

    return {
        "cash": {"trend": cash_spark, "delta_label": f"{'+' if cash_delta_pct >= 0 else ''}{cash_delta_pct}% vs last month"},
        "runway": {"trend": runway_spark, "delta_label": f"{'+' if runway_delta >= 0 else ''}{runway_delta} months vs last month"},
        "health": {"trend": health_spark, "delta_label": get_health_label(health)},
        "safe_to_spend": {"trend": sts_spark, "delta_label": "Calculated amount"},
    }


def get_financial_state(db: Session, user_id: Optional[int] = None) -> dict:
    clients = get_client_totals(db, user_id=user_id)
    concentration_pct, top_client = get_revenue_concentration(db, user_id=user_id)
    overdue = get_overdue_invoices(db, user_id=user_id)
    return {
        "current_cash": get_current_cash(db, user_id=user_id),
        "outstanding_invoices": round(sum(i.amount for i in get_outstanding_invoices(db, user_id=user_id)), 2),
        "adjusted_receivables": get_adjusted_receivables(db, user_id=user_id),
        "reliable_receivables_30d": get_reliable_receivables_due_soon(db, 30, user_id=user_id),
        "upcoming_essential_expenses": get_upcoming_essential_expenses(db, user_id=user_id),
        "tax_reserve": get_tax_reserve(db, user_id=user_id),
        "operating_reserve": get_operating_reserve(db, user_id=user_id),
        "safe_to_spend": get_safe_to_spend(db, user_id=user_id),
        "monthly_burn": get_monthly_burn(db, user_id=user_id),
        "runway_months": get_runway_months(db, user_id=user_id),
        "revenue_concentration_pct": concentration_pct,
        "top_client_name": top_client,
        "financial_health": get_financial_health(db, user_id=user_id),
        "overdue_invoice_count": len(overdue),
        "overdue_invoice_total": round(sum(i.amount for i in overdue), 2),
        "clients": clients,
        "alerts": get_alerts(db, user_id=user_id),
        "trends": get_trends(db, user_id=user_id),
    }


def risk_label(runway: float) -> str:
    if runway >= 6:
        return "LOW"
    if runway >= 3:
        return "MEDIUM"
    return "HIGH"


def invoice_display_status(inv: models.Invoice, today: date = None) -> str:
    today = today or date.today()
    if inv.status in ("draft", "paid"):
        return inv.status
    if inv.due_date < today:
        return "overdue"
    if (inv.due_date - today).days <= 7:
        return "due"
    return "sent"


def _month_label(d: date) -> str:
    return calendar.month_abbr[d.month]


def _add_months(d: date, n: int) -> date:
    month = d.month - 1 + n
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def get_average_monthly_revenue(db: Session, months: int = 3, user_id: Optional[int] = None) -> float:
    today = date.today()
    start = _add_months(today, -months)
    q = db.query(models.Invoice).filter(
        models.Invoice.status == "paid",
        models.Invoice.paid_date >= start,
    )
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    paid = q.all()
    total = sum(i.amount for i in paid)
    return round(total / months, 2) if months else round(total, 2)


def project_runway(cash: float, monthly_burn: float, monthly_revenue: float, duration_months: float) -> float:
    projected_cash = max(0.0, cash + (monthly_revenue - monthly_burn) * duration_months)
    if monthly_burn <= 0:
        return 36.0
    return round(min(projected_cash / monthly_burn, 60.0), 1)


def get_client_list(db: Session, user_id: Optional[int] = None):
    q_clients = db.query(models.Client)
    q_all_invoices = db.query(models.Invoice)
    if user_id is not None:
        q_clients = q_clients.filter(models.Client.user_id == user_id)
        q_all_invoices = q_all_invoices.filter(models.Invoice.user_id == user_id)

    clients = q_clients.all()
    all_invoices = q_all_invoices.all()
    total_lifetime = sum(i.amount for i in all_invoices if i.status == "paid") or 1.0
    today = date.today()

    out = []
    for c in clients:
        c_invoices = [i for i in all_invoices if i.client_id == c.id]
        paid = [i for i in c_invoices if i.status == "paid"]
        lifetime_revenue = sum(i.amount for i in paid)
        last_payment = max((i.paid_date for i in paid), default=None)
        is_active = bool(last_payment and (today - last_payment).days <= 120)
        out.append({
            "id": c.id,
            "name": c.name,
            "status": "active" if is_active else "inactive",
            "lifetime_revenue": round(lifetime_revenue, 2),
            "revenue_contribution_pct": round(100 * lifetime_revenue / total_lifetime, 1),
            "reliability_score": c.reliability_score,
            "avg_delay_days": c.avg_delay_days,
            "last_payment_date": last_payment.isoformat() if last_payment else None,
            "outstanding": round(sum(i.amount for i in c_invoices if i.status != "paid"), 2),
        })
    return sorted(out, key=lambda c: c["lifetime_revenue"], reverse=True)


def get_client_revenue_over_time(db: Session, client_id: int, months: int = 6, user_id: Optional[int] = None):
    today = date.today()
    buckets = []
    for i in range(months - 1, -1, -1):
        m_date = _add_months(today, -i)
        buckets.append({"month": _month_label(m_date), "year": m_date.year, "mon": m_date.month, "total": 0.0})

    q = db.query(models.Invoice).filter(
        models.Invoice.client_id == client_id,
        models.Invoice.status == "paid",
    )
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    paid = q.all()
    for inv in paid:
        for b in buckets:
            if inv.paid_date and inv.paid_date.year == b["year"] and inv.paid_date.month == b["mon"]:
                b["total"] += inv.amount
    return [{"month": b["month"], "revenue": round(b["total"], 2)} for b in buckets]


def get_client_detail(db: Session, client_id: int, user_id: Optional[int] = None):
    q_client = db.query(models.Client).filter(models.Client.id == client_id)
    if user_id is not None:
        q_client = q_client.filter(models.Client.user_id == user_id)
    client = q_client.first()
    if not client:
        return None
    roster_entry = next((c for c in get_client_list(db, user_id=user_id) if c["id"] == client_id), None)
    invoices = db.query(models.Invoice).filter(models.Invoice.client_id == client_id).order_by(
        models.Invoice.issue_date.desc()
    ).all()

    if client.avg_delay_days >= 14:
        insight = (
            f"Payment times for {client.name} average {client.avg_delay_days} days late. "
            f"Consider shorter payment terms or an upfront deposit on new projects."
        )
    elif roster_entry and roster_entry["revenue_contribution_pct"] >= 30:
        insight = (
            f"{client.name} makes up {roster_entry['revenue_contribution_pct']:.0f}% of your lifetime revenue. "
            f"That's valuable, but worth balancing with at least one more client of similar size."
        )
    else:
        insight = f"{client.name} has a reliability score of {client.reliability_score}/100 - no major flags right now."

    return {
        "id": client.id,
        "name": client.name,
        "status": roster_entry["status"] if roster_entry else "active",
        "last_payment_date": roster_entry["last_payment_date"] if roster_entry else None,
        "lifetime_revenue": roster_entry["lifetime_revenue"] if roster_entry else 0,
        "revenue_contribution_pct": roster_entry["revenue_contribution_pct"] if roster_entry else 0,
        "reliability_score": client.reliability_score,
        "avg_delay_days": client.avg_delay_days,
        "revenue_over_time": get_client_revenue_over_time(db, client_id, user_id=user_id),
        "ai_insight": insight,
        "invoices": [_invoice_out(i) for i in invoices],
    }


def _invoice_out(inv: models.Invoice):
    return {
        "id": inv.id,
        "invoice_number": f"#{inv.invoice_number}",
        "client_id": inv.client_id,
        "client_name": inv.client.name if inv.client else "Unknown",
        "project_name": inv.project_name,
        "amount": inv.amount,
        "status": invoice_display_status(inv),
        "issue_date": inv.issue_date.isoformat(),
        "due_date": inv.due_date.isoformat(),
        "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
    }


def get_invoice_list(db: Session, status: str = None, search: str = None, page: int = 1, page_size: int = 5, user_id: Optional[int] = None):
    q = db.query(models.Invoice)
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    invoices = q.order_by(models.Invoice.issue_date.desc()).all()
    display = [_invoice_out(i) for i in invoices]

    counts = {"draft": 0, "sent": 0, "due": 0, "overdue": 0, "paid": 0}
    for d in display:
        counts[d["status"]] = counts.get(d["status"], 0) + 1

    filtered = display
    if status and status != "all":
        filtered = [d for d in filtered if d["status"] == status]
    if search:
        query_str = search.lower()
        filtered = [d for d in filtered if query_str in d["client_name"].lower() or query_str in d["invoice_number"].lower() or query_str in d["project_name"].lower()]

    total = len(filtered)
    start = (page - 1) * page_size
    page_items = filtered[start:start + page_size]

    return {
        "counts": counts,
        "total": total,
        "page": page,
        "page_size": page_size,
        "invoices": page_items,
    }


def get_monthly_net_history(db: Session, months: int = 6, user_id: Optional[int] = None):
    today = date.today()
    buckets = []
    for i in range(months - 1, -1, -1):
        m_date = _add_months(today, -i)
        buckets.append({"month": _month_label(m_date), "year": m_date.year, "mon": m_date.month, "income": 0.0, "expense": 0.0})

    q_paid = db.query(models.Invoice).filter(models.Invoice.status == "paid")
    if user_id is not None:
        q_paid = q_paid.filter(models.Invoice.user_id == user_id)
    paid = q_paid.all()
    for inv in paid:
        for b in buckets:
            if inv.paid_date and inv.paid_date.year == b["year"] and inv.paid_date.month == b["mon"]:
                b["income"] += inv.amount

    recurring_burn = get_monthly_burn(db, user_id=user_id)
    q_one_offs = db.query(models.Expense).filter(models.Expense.recurring == False)  # noqa: E712
    if user_id is not None:
        q_one_offs = q_one_offs.filter(models.Expense.user_id == user_id)
    one_offs = q_one_offs.all()
    for b in buckets:
        b["expense"] = recurring_burn
    for e in one_offs:
        for b in buckets:
            if e.date.year == b["year"] and e.date.month == b["mon"]:
                b["expense"] += e.amount

    return [{"month": b["month"], "income": round(b["income"], 2), "expense": round(b["expense"], 2), "net": round(b["income"] - b["expense"], 2)} for b in buckets]


def get_cashflow_forecast(db: Session, history_months: int = 6, forecast_months: int = 6, user_id: Optional[int] = None):
    history_net = get_monthly_net_history(db, history_months, user_id=user_id)
    current_cash = get_current_cash(db, user_id=user_id)

    total_swing = sum(e["net"] for e in history_net)
    max_swing = current_cash * 0.5
    scale = min(1.0, max_swing / abs(total_swing)) if total_swing else 1.0

    running = current_cash
    ending_balances = []
    for entry in reversed(history_net):
        ending_balances.append(round(running, 2))
        running -= entry["net"] * scale
    ending_balances.reverse()

    history = [{"month": history_net[i]["month"], "value": ending_balances[i], "kind": "actual"} for i in range(len(history_net))]
    recent_nets = [e["net"] for e in history_net[-3:]] or [0]
    avg_net = sum(recent_nets) / len(recent_nets)

    today = date.today()
    forecast = []
    running = current_cash
    for i in range(1, forecast_months + 1):
        running += avg_net
        m_date = _add_months(today, i)
        forecast.append({"month": _month_label(m_date), "value": round(running, 2), "kind": "forecast"})

    return {"history": history, "forecast": forecast, "monthly_net": history_net}


def get_expense_list(db: Session, user_id: Optional[int] = None):
    q = db.query(models.Expense)
    if user_id is not None:
        q = q.filter(models.Expense.user_id == user_id)
    expenses = q.order_by(models.Expense.date.desc()).all()
    return [{
        "id": e.id,
        "name": e.name,
        "category": e.category,
        "amount": e.amount,
        "date": e.date.isoformat(),
        "recurring": e.recurring,
        "essential": e.essential,
    } for e in expenses]


def get_sparkline(db: Session, metric: str, current_value: float, points: int = 7):
    rng = random.Random(hash(metric) % (2**32))
    walk = [current_value]
    for _ in range(points - 1):
        step = current_value * rng.uniform(-0.05, 0.06)
        walk.append(max(0, walk[-1] - step))
    walk.reverse()
    walk[-1] = current_value
    return [round(v, 2) for v in walk]


def _next_invoice_number(db: Session, user_id: Optional[int] = None) -> int:
    q = db.query(models.Invoice)
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    highest = q.order_by(models.Invoice.invoice_number.desc()).first()
    return (highest.invoice_number + 1) if highest else 1001


def create_invoice(db: Session, client_id: int, project_name: str, amount: float,
                    issue_date: date, due_date: date, status: str = "sent", user_id: Optional[int] = None) -> dict:
    q_client = db.query(models.Client).filter(models.Client.id == client_id)
    if user_id is not None:
        q_client = q_client.filter(models.Client.user_id == user_id)
    client = q_client.first()
    if not client:
        return None
    inv = models.Invoice(
        user_id=user_id,
        invoice_number=_next_invoice_number(db, user_id=user_id),
        client_id=client_id,
        project_name=project_name,
        amount=amount,
        issue_date=issue_date,
        due_date=due_date,
        status=status,
        paid_date=(due_date if status == "paid" else None),
    )
    db.add(inv)

    if status == "paid":
        acct = _account(db, user_id=user_id)
        acct.current_cash += amount

    db.commit()
    db.refresh(inv)
    return _invoice_out(inv)


def create_income(db: Session, client_id: int, amount: float, description: str, received_date: date, user_id: Optional[int] = None) -> dict:
    return create_invoice(
        db, client_id, description or "Income", amount,
        issue_date=received_date, due_date=received_date, status="paid", user_id=user_id,
    )


def update_invoice_status(db: Session, invoice_id: int, status: str, paid_date: date = None, user_id: Optional[int] = None) -> dict:
    q = db.query(models.Invoice).filter(models.Invoice.id == invoice_id)
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    inv = q.first()
    if not inv:
        return None

    acct = _account(db, user_id=user_id)
    if status == "paid" and inv.status != "paid":
        acct.current_cash += inv.amount
        inv.paid_date = paid_date or date.today()
    elif status != "paid" and inv.status == "paid":
        acct.current_cash -= inv.amount
        inv.paid_date = None

    inv.status = status
    db.commit()
    db.refresh(inv)
    return _invoice_out(inv)


def delete_invoice(db: Session, invoice_id: int, user_id: Optional[int] = None) -> bool:
    q = db.query(models.Invoice).filter(models.Invoice.id == invoice_id)
    if user_id is not None:
        q = q.filter(models.Invoice.user_id == user_id)
    inv = q.first()
    if not inv:
        return False
    db.delete(inv)
    db.commit()
    return True


def create_client(db: Session, name: str, pay_probability: float = 0.8,
                   avg_delay_days: int = 0, reliability_score: int = 75, user_id: Optional[int] = None) -> models.Client:
    client = models.Client(
        user_id=user_id,
        name=name, pay_probability=pay_probability,
        avg_delay_days=avg_delay_days, reliability_score=reliability_score,
    )
    db.add(client)
    db.commit()
    db.refresh(client)
    return client
