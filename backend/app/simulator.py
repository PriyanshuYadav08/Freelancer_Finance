from sqlalchemy.orm import Session
from . import financial_engine as fe

PRESETS = [
    {"id": "lose_top_client", "label": "Lose my biggest client"},
    {"id": "income_drop_30", "label": "Income drops 30%"},
    {"id": "payment_delay_45", "label": "Payments delayed 45 days"},
    {"id": "emergency_expense", "label": "Sudden emergency expense"},
]


def get_presets(db: Session):
    """Each preset ships sensible defaults computed from real data, so the
    simulator opens pre-filled rather than blank."""
    state = fe.get_financial_state(db)
    avg_revenue = fe.get_average_monthly_revenue(db)
    clients = state["clients"]
    top = max(clients, key=lambda c: c["revenue_share_pct"]) if clients else None

    out = []
    for p in PRESETS:
        if p["id"] == "lose_top_client" and top:
            drop = round(avg_revenue * (top["revenue_share_pct"] / 100.0), 2)
            out.append({**p, "duration_months": 6, "monthly_revenue_drop": drop, "one_time_expense": 0,
                        "subtitle": f"{top['name']} is {top['revenue_share_pct']:.0f}% of your revenue"})
        elif p["id"] == "income_drop_30":
            out.append({**p, "duration_months": 6, "monthly_revenue_drop": round(avg_revenue * 0.3, 2), "one_time_expense": 0,
                        "subtitle": "Across all clients"})
        elif p["id"] == "payment_delay_45":
            out.append({**p, "duration_months": 3, "monthly_revenue_drop": round(avg_revenue * 0.5, 2), "one_time_expense": 0,
                        "subtitle": "Near-term cash gets tighter"})
        elif p["id"] == "emergency_expense":
            out.append({**p, "duration_months": 6, "monthly_revenue_drop": 0, "one_time_expense": round(state["monthly_burn"] * 3, 2),
                        "subtitle": "A one-time cash hit"})
    return out


def run_custom_scenario(db: Session, duration_months: float, monthly_revenue_drop: float, one_time_expense: float, label: str = "Custom scenario"):
    cash = fe.get_current_cash(db)
    burn = fe.get_monthly_burn(db)
    avg_revenue = fe.get_average_monthly_revenue(db)

    revenue_scenario = max(0, avg_revenue - (monthly_revenue_drop or 0))
    duration_months = duration_months or 6

    runway_current = fe.project_runway(cash, burn, avg_revenue, duration_months)
    runway_scenario = fe.project_runway(cash - (one_time_expense or 0), burn, revenue_scenario, duration_months)

    drop_pct = round(100 * (monthly_revenue_drop or 0) / avg_revenue, 1) if avg_revenue else 0

    return {
        "label": label,
        "duration_months": duration_months,
        "monthly_revenue_drop": monthly_revenue_drop or 0,
        "revenue_drop_pct": drop_pct,
        "one_time_expense": one_time_expense or 0,
        "revenue_current": round(avg_revenue, 2),
        "revenue_scenario": round(revenue_scenario, 2),
        "runway_current": runway_current,
        "runway_scenario": runway_scenario,
        "risk_current": fe.risk_label(runway_current),
        "risk_scenario": fe.risk_label(runway_scenario),
    }
