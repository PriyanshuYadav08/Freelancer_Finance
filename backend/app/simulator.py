from sqlalchemy.orm import Session
from . import financial_engine as fe


def _snapshot(db: Session, cash: float, monthly_burn: float, label_note: str = "") -> dict:
    runway = round(cash / monthly_burn, 1) if monthly_burn > 0 else 99.0
    return {
        "cash": round(cash, 2),
        "monthly_burn": round(monthly_burn, 2),
        "runway_months": runway,
        "note": label_note,
    }


def run_scenario(db: Session, scenario: str, amount: float = None) -> dict:
    state = fe.get_financial_state(db)
    cash = state["current_cash"]
    burn = state["monthly_burn"]

    before = _snapshot(db, cash, burn)
    risk_before = fe.risk_label(before["runway_months"])

    if scenario == "lose_top_client":
        clients = state["clients"]
        if not clients:
            after_cash, after_burn, explanation, label = cash, burn, "No clients on file.", "Lose top client"
        else:
            top = max(clients, key=lambda c: c["revenue_share_pct"])
            revenue_loss_monthly = burn * (top["revenue_share_pct"] / 100.0) if burn else 0
            after_cash = cash - top["total_outstanding"] * (1 - 0.5)  # assume 50% of open invoices still collected
            after_burn = burn  # costs don't change, only income capacity - reflected via runway on remaining cash
            label = f"Lose {top['name']} (your largest client)"
            explanation = (
                f"{top['name']} represents {top['revenue_share_pct']:.0f}% of your revenue. "
                f"If they disappeared, you'd still likely collect some of their ₹{top['total_outstanding']:,.0f} "
                f"outstanding balance, but future income from them drops to zero. "
                f"Your monthly burn stays the same, so runway shrinks fast unless you replace that income."
            )

    elif scenario == "income_drop_30":
        after_cash = cash  # cash today doesn't change, but future receivables shrink
        after_burn = burn
        # Approximate impact: reduce reliable near-term receivables by 30%, subtract shortfall from cash cushion
        shortfall = state["reliable_receivables_30d"] * 0.30
        after_cash = cash - shortfall
        label = "Income drops 30%"
        explanation = (
            f"A 30% drop in expected income removes roughly ₹{shortfall:,.0f} from what you can safely count on "
            f"over the next 30 days, on top of your current burn of ₹{burn:,.0f}/month."
        )

    elif scenario == "expense_shock":
        amt = amount or 0
        after_cash = cash - amt
        after_burn = burn
        label = f"₹{amt:,.0f} emergency expense"
        explanation = (
            f"A one-time ₹{amt:,.0f} expense comes straight out of current cash. "
            f"Your monthly burn is unaffected, so the runway hit is purely from the lower starting cash."
        )

    elif scenario == "payment_delay_45":
        # near-term safe cash shrinks because reliable receivables are pushed out past 30 days
        after_cash = cash - state["reliable_receivables_30d"]
        after_burn = burn
        label = "Client payments delayed 45 days"
        explanation = (
            f"If invoices due soon slip by 45 days, the ₹{state['reliable_receivables_30d']:,.0f} you were "
            f"counting on in the next 30 days no longer arrives on schedule, tightening your near-term cash."
        )

    elif scenario == "custom_purchase":
        amt = amount or 0
        after_cash = cash - amt
        after_burn = burn
        label = f"Buy something for ₹{amt:,.0f}"
        sts = state["safe_to_spend"]
        if amt <= sts:
            explanation = (
                f"This fits inside your current safe-to-spend of ₹{sts:,.0f}. "
                f"It still lowers your buffer, so check the new runway below before committing."
            )
        else:
            explanation = (
                f"This exceeds your current safe-to-spend of ₹{sts:,.0f} by ₹{amt - sts:,.0f}. "
                f"You'd be dipping into your tax or operating reserve to cover it."
            )

    else:
        after_cash, after_burn, label, explanation = cash, burn, "Unknown scenario", "Scenario not recognized."

    after = _snapshot(db, max(after_cash, 0), after_burn)
    risk_after = fe.risk_label(after["runway_months"])

    return {
        "label": label,
        "before": before,
        "after": after,
        "risk_before": risk_before,
        "risk_after": risk_after,
        "explanation": explanation,
    }
