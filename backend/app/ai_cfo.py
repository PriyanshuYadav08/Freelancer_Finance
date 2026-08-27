"""
AI CFO
======
Deterministic intent-matching + the financial engine, wrapped in natural
language. This mirrors the architecture principle from the product spec:
the model should EXPLAIN numbers, never invent them.

Responses are shaped as {reply, headline?, reasoning?, note?}. When
headline/reasoning are present the frontend renders a structured card;
otherwise it just shows `reply` as plain text.

To upgrade this to a real LLM: keep get_financial_state() as the source of
truth, pass it plus the user's message to your model of choice, and have it
generate the reply text using the shipped numbers as tool output.
"""
import re
from sqlalchemy.orm import Session

from . import financial_engine as fe


def _extract_amount(text: str) -> float:
    """Pulls the first rupee amount out of free text, handling k/L/lakh suffixes."""
    text = text.lower().replace(",", "")
    m = re.search(r"(?:rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(l|lakh|lac|k)?", text)
    if not m:
        return None
    value = float(m.group(1))
    suffix = m.group(2)
    if suffix in ("l", "lakh", "lac"):
        value *= 100000
    elif suffix == "k":
        value *= 1000
    return value


def answer(db: Session, message: str) -> dict:
    msg = message.lower()
    state = fe.get_financial_state(db)

    # --- affordability / purchase questions ---
    if any(w in msg for w in ["afford", "buy", "spend", "purchase", "vacation", "laptop", "trip"]):
        amount = _extract_amount(msg)
        if amount:
            sts = state["safe_to_spend"]
            runway_before = state["runway_months"]
            cash_after = max(0, state["current_cash"] - amount)
            runway_after = fe.get_runway_months(db, cash_override=cash_after)
            next_receivable = fe.get_next_reliable_receivable(db)

            fits = amount <= sts
            headline = "You can, and it fits inside your safe-to-spend." if fits else \
                "You can, but I'd recommend waiting."

            reasoning = [
                {"label": "Current runway", "value": f"{runway_before} months"},
                {"label": "After purchase", "value": f"{runway_after} months"},
            ]
            if next_receivable:
                reasoning.append({
                    "label": f"{next_receivable['client_name']}'s ₹{next_receivable['amount']:,.0f}",
                    "value": f"expected in {next_receivable['days_until_due']} days",
                })

            if fits:
                note = "This still lowers your buffer, so check the runway above before committing."
            else:
                note = "Waiting for the receivable above keeps your preferred buffer intact."

            reply = (
                f"{headline}\n\nCurrent runway: {runway_before} months\n"
                f"After purchase: {runway_after} months\n\n{note}"
            )
            return {"reply": reply, "headline": headline, "reasoning": reasoning, "note": note}

        sts = state["safe_to_spend"]
        return {"reply": (
            f"Your current safe-to-spend is ₹{sts:,.0f}. That already accounts for upcoming "
            f"essential expenses, your tax reserve, and an operating buffer. "
            f"Tell me an amount (e.g. \"can I afford a ₹80k laptop\") and I'll run the numbers."
        )}

    # --- runway ---
    if "runway" in msg or "survive" in msg or "how long" in msg:
        runway = state["runway_months"]
        risk = fe.risk_label(runway)
        reply = (
            f"Your current runway is {runway} months at your average monthly burn of "
            f"₹{state['monthly_burn']:,.0f}. That puts your risk level at {risk}.\n\n"
            f"Current cash: ₹{state['current_cash']:,.0f}\n"
            f"Safe-to-spend: ₹{state['safe_to_spend']:,.0f}"
        )
        return {"reply": reply}

    # --- client risk / concentration ---
    if "client" in msg and ("risk" in msg or "concentration" in msg or "reliable" in msg or "reliability" in msg or "risky" in msg):
        clients = sorted(state["clients"], key=lambda c: c["revenue_share_pct"], reverse=True)
        if not clients:
            return {"reply": "No clients on file yet."}
        top = clients[0]
        risky = sorted(state["clients"], key=lambda c: c["reliability_score"])[0]
        reply = f"{top['name']} is your biggest revenue source at {top['revenue_share_pct']:.0f}% of total revenue. "
        if top["revenue_share_pct"] >= 40:
            reply += "That's a meaningful concentration risk - losing them would hurt disproportionately.\n\n"
        else:
            reply += "Your revenue is reasonably spread out.\n\n"
        reply += (
            f"{risky['name']} has your lowest reliability score ({risky['reliability_score']}/100), "
            f"averaging {risky['avg_delay_days']} days late on payment."
        )
        return {"reply": reply}

    # --- overdue invoices ---
    if "overdue" in msg or "unpaid" in msg or "invoice" in msg:
        if state["overdue_invoice_count"] == 0:
            reply = "No overdue invoices right now. Nice."
        else:
            reply = (
                f"You have {state['overdue_invoice_count']} overdue invoice(s) totaling "
                f"₹{state['overdue_invoice_total']:,.0f}. Chasing these down is your fastest way "
                f"to improve your safe-to-spend without cutting anything."
            )
        return {"reply": reply}

    # --- tax ---
    if "tax" in msg:
        reply = (
            f"Based on income received in the last 30 days, I'd set aside roughly "
            f"₹{state['tax_reserve']:,.0f} for taxes. This is a planning estimate at a flat rate, "
            f"not tax advice - swap in your real jurisdiction's rules before relying on it."
        )
        return {"reply": reply}

    # --- cash flow falling / general health ---
    if "falling" in msg or "cash flow" in msg or "cashflow" in msg:
        reply = (
            f"Cash is at ₹{state['current_cash']:,.0f} against a monthly burn of "
            f"₹{state['monthly_burn']:,.0f}. "
        )
        if state["overdue_invoice_count"] > 0:
            reply += f"₹{state['overdue_invoice_total']:,.0f} sitting in overdue invoices isn't helping - that's the fastest lever."
        else:
            reply += "Nothing overdue right now, so this is mostly a pacing issue rather than a collections one."
        return {"reply": reply}

    # --- default: daily briefing ---
    reply = (
        f"Good morning. Here's where things stand:\n\n"
        f"Cash: ₹{state['current_cash']:,.0f}\n"
        f"Safe-to-spend: ₹{state['safe_to_spend']:,.0f}\n"
        f"Runway: {state['runway_months']} months\n"
        f"Financial health: {state['financial_health']}/100\n"
    )
    if state["alerts"]:
        reply += "\nTop priority: " + state["alerts"][0]
    return {"reply": reply}
