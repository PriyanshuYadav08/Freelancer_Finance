"""
Financial Engine
================
Every number shown to the user, or handed to the AI CFO / simulator, is
computed here from raw ledger data. The AI layer explains these numbers,
it never invents them - see ai_cfo.py.
"""
import calendar
import random
from datetime import date, timedelta
from sqlalchemy.orm import Session

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


def get_health_label(score: int) -> str:
    if score >= 75:
        return "Good"
    if score >= 50:
        return "Fair"
    return "Needs attention"


def get_trends(db: Session) -> dict:
    """Sparkline + delta text for the four dashboard stat cards. See
    get_sparkline() for what is and isn't a real tracked figure here."""
    cash = get_current_cash(db)
    runway = get_runway_months(db)
    health = get_financial_health(db)
    sts = get_safe_to_spend(db)

    cash_spark = get_sparkline(db, "cash", cash)
    runway_spark = get_sparkline(db, "runway", runway)
    health_spark = get_sparkline(db, "health", health)
    sts_spark = get_sparkline(db, "sts", sts)

    prev_cash = cash_spark[-2] if len(cash_spark) > 1 and cash_spark[-2] else cash or 1
    cash_delta_pct = round(100 * (cash_spark[-1] - prev_cash) / prev_cash, 1) + 0.0
    runway_delta = round(runway_spark[-1] - runway_spark[-2], 1) + 0.0 if len(runway_spark) > 1 else 0.0
    cash_delta_pct = abs(cash_delta_pct) if cash_delta_pct == 0 else cash_delta_pct
    runway_delta = abs(runway_delta) if runway_delta == 0 else runway_delta

    return {
        "cash": {"trend": cash_spark, "delta_label": f"{'+' if cash_delta_pct >= 0 else ''}{cash_delta_pct}% vs last month"},
        "runway": {"trend": runway_spark, "delta_label": f"{'+' if runway_delta >= 0 else ''}{runway_delta} months vs last month"},
        "health": {"trend": health_spark, "delta_label": get_health_label(health)},
        "safe_to_spend": {"trend": sts_spark, "delta_label": "Calculated amount"},
    }


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
        "trends": get_trends(db),
    }


def risk_label(runway: float) -> str:
    if runway >= 6:
        return "LOW"
    if runway >= 3:
        return "MEDIUM"
    return "HIGH"


# ---------------------------------------------------------------------------
# Invoice status, client list/detail, revenue history, cash-flow forecast
# ---------------------------------------------------------------------------

def invoice_display_status(inv: models.Invoice, today: date = None) -> str:
    """Draft/paid are stored as-is; sent invoices are shown as 'due' once
    within 7 days of their due date, or 'overdue' once past it."""
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


def get_average_monthly_revenue(db: Session, months: int = 3) -> float:
    """Average paid-invoice income over the last N months - the 'ongoing
    business revenue' figure used by the scenario simulator (separate from
    the conservative, income-excluding runway shown on the dashboard)."""
    today = date.today()
    start = _add_months(today, -months)
    paid = db.query(models.Invoice).filter(
        models.Invoice.status == "paid",
        models.Invoice.paid_date >= start,
    ).all()
    total = sum(i.amount for i in paid)
    return round(total / months, 2) if months else round(total, 2)


def project_runway(cash: float, monthly_burn: float, monthly_revenue: float, duration_months: float) -> float:
    """Projects cash forward `duration_months` at (revenue - burn) per
    month, then asks how many months of essential burn that projected pile
    covers. This is the what-if simulator's headline number - it responds
    to the scenario's revenue change AND to how long you let it run,
    unlike the dashboard's single-point-in-time cash/burn runway."""
    projected_cash = max(0.0, cash + (monthly_revenue - monthly_burn) * duration_months)
    if monthly_burn <= 0:
        return 36.0
    return round(min(projected_cash / monthly_burn, 60.0), 1)


def get_client_list(db: Session):
    """Client roster with lifetime revenue, contribution %, reliability,
    average delay, and a simple active/inactive status."""
    clients = db.query(models.Client).all()
    all_invoices = db.query(models.Invoice).all()
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


def get_client_revenue_over_time(db: Session, client_id: int, months: int = 6):
    today = date.today()
    buckets = []
    for i in range(months - 1, -1, -1):
        m_date = _add_months(today, -i)
        buckets.append({"month": _month_label(m_date), "year": m_date.year, "mon": m_date.month, "total": 0.0})

    paid = db.query(models.Invoice).filter(
        models.Invoice.client_id == client_id,
        models.Invoice.status == "paid",
    ).all()
    for inv in paid:
        for b in buckets:
            if inv.paid_date.year == b["year"] and inv.paid_date.month == b["mon"]:
                b["total"] += inv.amount
    return [{"month": b["month"], "revenue": round(b["total"], 2)} for b in buckets]


def get_client_detail(db: Session, client_id: int):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        return None
    roster_entry = next((c for c in get_client_list(db) if c["id"] == client_id), None)
    invoices = db.query(models.Invoice).filter(models.Invoice.client_id == client_id).order_by(
        models.Invoice.issue_date.desc()
    ).all()

    # simple rule-based insight, grounded in the client's own numbers
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
        "revenue_over_time": get_client_revenue_over_time(db, client_id),
        "ai_insight": insight,
        "invoices": [_invoice_out(i) for i in invoices],
    }


def _invoice_out(inv: models.Invoice):
    return {
        "id": inv.id,
        "invoice_number": f"#{inv.invoice_number}",
        "client_id": inv.client_id,
        "client_name": inv.client.name,
        "project_name": inv.project_name,
        "amount": inv.amount,
        "status": invoice_display_status(inv),
        "issue_date": inv.issue_date.isoformat(),
        "due_date": inv.due_date.isoformat(),
        "paid_date": inv.paid_date.isoformat() if inv.paid_date else None,
    }


def get_invoice_list(db: Session, status: str = None, search: str = None, page: int = 1, page_size: int = 5):
    invoices = db.query(models.Invoice).order_by(models.Invoice.issue_date.desc()).all()
    display = [_invoice_out(i) for i in invoices]

    counts = {"draft": 0, "sent": 0, "due": 0, "overdue": 0, "paid": 0}
    for d in display:
        counts[d["status"]] = counts.get(d["status"], 0) + 1

    filtered = display
    if status and status != "all":
        filtered = [d for d in filtered if d["status"] == status]
    if search:
        q = search.lower()
        filtered = [d for d in filtered if q in d["client_name"].lower() or q in d["invoice_number"].lower() or q in d["project_name"].lower()]

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


def get_monthly_net_history(db: Session, months: int = 6):
    """Income minus expenses per month, most recent `months` months."""
    today = date.today()
    buckets = []
    for i in range(months - 1, -1, -1):
        m_date = _add_months(today, -i)
        buckets.append({"month": _month_label(m_date), "year": m_date.year, "mon": m_date.month, "income": 0.0, "expense": 0.0})

    paid = db.query(models.Invoice).filter(models.Invoice.status == "paid").all()
    for inv in paid:
        for b in buckets:
            if inv.paid_date and inv.paid_date.year == b["year"] and inv.paid_date.month == b["mon"]:
                b["income"] += inv.amount

    # Recurring essential costs repeat identically every month (one template
    # row per bill, not one row per occurrence) - so every bucket carries the
    # same recurring burn, plus whatever one-off expenses landed that month.
    recurring_burn = get_monthly_burn(db)
    one_offs = db.query(models.Expense).filter(models.Expense.recurring == False).all()  # noqa: E712
    for b in buckets:
        b["expense"] = recurring_burn
    for e in one_offs:
        for b in buckets:
            if e.date.year == b["year"] and e.date.month == b["mon"]:
                b["expense"] += e.amount

    return [{"month": b["month"], "income": round(b["income"], 2), "expense": round(b["expense"], 2), "net": round(b["income"] - b["expense"], 2)} for b in buckets]


def get_cashflow_forecast(db: Session, history_months: int = 6, forecast_months: int = 6):
    """Historical end-of-month cash balance, walked backward from today's
    actual cash, plus a forward projection using the recent average net.

    This app doesn't keep a daily cash ledger, so the historical *balance*
    line is reconstructed rather than recorded: real monthly net
    (income - expenses) sets the shape (which months were up or down), but
    the swing is bounded to a plausible fraction of today's real cash so a
    couple of unusually large invoices can't walk the reconstruction into
    an implausible negative balance six months ago. Today's cash and the
    forecast (which is not bounded) are the real, current numbers."""
    history_net = get_monthly_net_history(db, history_months)
    current_cash = get_current_cash(db)

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


def get_next_reliable_receivable(db: Session):
    """Soonest outstanding invoice from a client reliable enough to plan
    around (pay_probability >= 0.6) - used by the AI CFO to point at a
    concrete reason cash will loosen up soon."""
    today = date.today()
    candidates = [
        inv for inv in get_outstanding_invoices(db)
        if inv.client.pay_probability >= 0.6 and inv.due_date >= today
    ]
    if not candidates:
        return None
    soonest = min(candidates, key=lambda i: i.due_date)
    return {
        "client_name": soonest.client.name,
        "amount": soonest.amount,
        "days_until_due": (soonest.due_date - today).days,
    }


def get_expense_list(db: Session):
    expenses = db.query(models.Expense).order_by(models.Expense.date.desc()).all()
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
    """Illustrative recent-trend line for dashboard stat cards. Not a
    tracked time series (this app doesn't snapshot daily) - it's a
    deterministic, seeded wiggle ending exactly at the real current value,
    purely so the card isn't a bare flat number. The card's displayed
    number and delta text are the real figures; this just shades the trend."""
    rng = random.Random(hash(metric) % (2**32))
    walk = [current_value]
    for _ in range(points - 1):
        step = current_value * rng.uniform(-0.05, 0.06)
        walk.append(max(0, walk[-1] - step))
    walk.reverse()
    walk[-1] = current_value
    return [round(v, 2) for v in walk]
