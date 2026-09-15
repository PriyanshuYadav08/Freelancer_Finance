"""
Loan Engine
===========
Standard reducing-balance EMI math, plus a missed-payment consequence
simulator. Every figure here is a deterministic formula or a clearly
labeled assumption (penal rate, catch-up window) - there is no LLM
involved in these numbers. The "what to do" text at the end is generic
financial-literacy guidance grounded in the numbers actually computed,
not personalized professional advice - see the disclaimer returned with
every simulation result.
"""
import calendar
from datetime import date
from sqlalchemy.orm import Session

from . import models
from . import financial_engine as fe


def _months_elapsed(start: date, today: date) -> int:
    months = (today.year - start.year) * 12 + (today.month - start.month)
    if today.day < start.day:
        months -= 1
    return max(0, months)


def get_loan_summary(db: Session, loan: models.Loan) -> dict:
    today = date.today()
    emi = fe.calc_emi(loan.principal, loan.annual_rate, loan.tenure_months)
    elapsed = _months_elapsed(loan.start_date, today)
    months_paid = max(0, min(elapsed - loan.missed_emis, loan.tenure_months))
    outstanding = fe.calc_outstanding_balance(loan.principal, loan.annual_rate, loan.tenure_months, months_paid)
    months_remaining = max(0, loan.tenure_months - months_paid)

    arrears = None
    if loan.missed_emis > 0:
        arrears = calc_arrears(emi, loan.missed_emis, loan.penal_rate_monthly)

    return {
        "id": loan.id,
        "name": loan.name,
        "principal": loan.principal,
        "annual_rate": loan.annual_rate,
        "tenure_months": loan.tenure_months,
        "start_date": loan.start_date.isoformat(),
        "status": loan.status,
        "penal_rate_monthly": loan.penal_rate_monthly,
        "emi": emi,
        "months_elapsed": elapsed,
        "months_remaining": months_remaining,
        "outstanding_balance": outstanding,
        "missed_emis": loan.missed_emis,
        "arrears": arrears,
    }


def calc_arrears(emi: float, missed_months: int, penal_rate_monthly: float) -> dict:
    """Missed principal+interest plus accrued penal interest. Penalty is
    modeled as a triangular accrual: the k-th missed EMI has been overdue
    for k months by today (worst case - nothing paid toward it since), so
    it has accrued k months of penal interest at `penal_rate_monthly`%."""
    missed_principal_interest = round(emi * missed_months, 2)
    rate = penal_rate_monthly / 100.0
    penalty = round(emi * rate * (missed_months * (missed_months + 1) / 2), 2)
    return {
        "missed_months": missed_months,
        "missed_principal_interest": missed_principal_interest,
        "penalty_accrued": penalty,
        "total_arrears": round(missed_principal_interest + penalty, 2),
    }


def simulate_missed_emis(db: Session, loan: models.Loan, missed_months: int, catchup_months: int) -> dict:
    """The core 'what happens if I miss N EMIs, and how do I stop it from
    snowballing' calculation. Compares the extra monthly payment needed to
    clear arrears in `catchup_months` against the freelancer's real
    monthly surplus (average revenue minus essential burn, which already
    includes this loan's EMI)."""
    emi = fe.calc_emi(loan.principal, loan.annual_rate, loan.tenure_months)
    arrears = calc_arrears(emi, missed_months, loan.penal_rate_monthly)
    catchup_months = max(1, catchup_months)
    extra_per_month = round(arrears["total_arrears"] / catchup_months, 2)

    avg_revenue = fe.get_average_monthly_revenue(db)
    monthly_burn = fe.get_monthly_burn(db)  # already includes this loan's EMI, see financial_engine
    monthly_surplus = round(avg_revenue - monthly_burn, 2)

    fits_surplus = extra_per_month <= monthly_surplus
    if fits_surplus:
        risk = "LOW"
    elif extra_per_month <= monthly_surplus + emi:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

    # if nothing is paid toward arrears, penalty compounds monthly - show
    # what 3 more months of inaction would look like as a concrete warning
    projected_if_ignored = round(
        arrears["total_arrears"] * ((1 + loan.penal_rate_monthly / 100.0) ** 3), 2
    )

    actions = []
    actions.append(
        f"Clear ₹{arrears['total_arrears']:,.0f} in arrears over {catchup_months} month(s) by paying an "
        f"extra ₹{extra_per_month:,.0f}/month on top of your regular EMI of ₹{emi:,.0f}."
    )
    if fits_surplus:
        actions.append(
            f"Your average monthly surplus (₹{monthly_surplus:,.0f}) covers this, so catching up shouldn't "
            f"require cutting into other essentials - prioritize it over discretionary spending until cleared."
        )
    else:
        shortfall = round(extra_per_month - monthly_surplus, 2)
        actions.append(
            f"Your average monthly surplus (₹{monthly_surplus:,.0f}) falls short by ₹{shortfall:,.0f}/month at "
            f"this pace. Contact your lender proactively about restructuring or a formal moratorium before any "
            f"further EMIs are missed - penal interest compounds monthly and the shortfall will keep growing."
        )
    actions.append(
        f"If no payment is made toward the arrears at all, penalty compounding alone could grow it to roughly "
        f"₹{projected_if_ignored:,.0f} after 3 more months - acting sooner is materially cheaper than waiting."
    )
    actions.append("Avoid taking on new debt until this loan's arrears are fully cleared.")
    actions.append(
        "This is a planning estimate based on the numbers above, not financial or legal advice - for actual "
        "restructuring, talk to your lender or a licensed financial advisor."
    )

    return {
        "loan_id": loan.id,
        "loan_name": loan.name,
        "emi": emi,
        "missed_months": missed_months,
        "catchup_months": catchup_months,
        "arrears": arrears,
        "extra_per_month": extra_per_month,
        "monthly_surplus": monthly_surplus,
        "fits_surplus": fits_surplus,
        "risk": risk,
        "projected_arrears_if_ignored_3mo": projected_if_ignored,
        "actions": actions,
    }


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_loans(db: Session):
    loans = db.query(models.Loan).order_by(models.Loan.start_date.desc()).all()
    return [get_loan_summary(db, l) for l in loans]


def get_loan(db: Session, loan_id: int):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    return get_loan_summary(db, loan) if loan else None


def create_loan(db: Session, name: str, principal: float, annual_rate: float,
                 tenure_months: int, start_date: date, penal_rate_monthly: float = 2.0) -> dict:
    loan = models.Loan(
        name=name, principal=principal, annual_rate=annual_rate,
        tenure_months=tenure_months, start_date=start_date,
        penal_rate_monthly=penal_rate_monthly, missed_emis=0, status="active",
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return get_loan_summary(db, loan)


def set_missed_emis(db: Session, loan_id: int, missed_emis: int) -> dict:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        return None
    loan.missed_emis = max(0, missed_emis)
    db.commit()
    db.refresh(loan)
    return get_loan_summary(db, loan)


def delete_loan(db: Session, loan_id: int) -> bool:
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        return False
    db.delete(loan)
    db.commit()
    return True
