"""
Loan Engine
===========
Standard reducing-balance EMI math, plus a missed-payment consequence
simulator and month-by-month amortization schedule generator.
"""
import calendar
from datetime import date
from typing import Optional
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
    missed_principal_interest = round(emi * missed_months, 2)
    rate = penal_rate_monthly / 100.0
    penalty = round(emi * rate * (missed_months * (missed_months + 1) / 2), 2)
    return {
        "missed_months": missed_months,
        "missed_principal_interest": missed_principal_interest,
        "penalty_accrued": penalty,
        "total_arrears": round(missed_principal_interest + penalty, 2),
    }


def simulate_missed_emis(db: Session, loan: models.Loan, missed_months: int, catchup_months: int, user_id: Optional[int] = None) -> dict:
    emi = fe.calc_emi(loan.principal, loan.annual_rate, loan.tenure_months)
    arrears = calc_arrears(emi, missed_months, loan.penal_rate_monthly)
    catchup_months = max(1, catchup_months)
    extra_per_month = round(arrears["total_arrears"] / catchup_months, 2)

    avg_revenue = fe.get_average_monthly_revenue(db, user_id=user_id)
    monthly_burn = fe.get_monthly_burn(db, user_id=user_id)
    monthly_surplus = round(avg_revenue - monthly_burn, 2)

    fits_surplus = extra_per_month <= monthly_surplus
    if fits_surplus:
        risk = "LOW"
    elif extra_per_month <= monthly_surplus + emi:
        risk = "MEDIUM"
    else:
        risk = "HIGH"

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


def get_amortization_schedule(db: Session, loan_id: int, user_id: Optional[int] = None) -> dict:
    q = db.query(models.Loan).filter(models.Loan.id == loan_id)
    if user_id is not None:
        q = q.filter(models.Loan.user_id == user_id)
    loan = q.first()
    if not loan:
        return None

    emi = fe.calc_emi(loan.principal, loan.annual_rate, loan.tenure_months)
    r = (loan.annual_rate / 12.0) / 100.0

    balance = loan.principal
    schedule = []
    total_interest = 0.0
    start_dt = loan.start_date

    for m in range(1, loan.tenure_months + 1):
        interest = round(balance * r, 2)
        principal_part = round(min(balance, emi - interest), 2)
        balance = round(max(0.0, balance - principal_part), 2)
        total_interest += interest
        pay_date = fe._add_months(start_dt, m - 1)

        schedule.append({
            "month_number": m,
            "date": pay_date.isoformat(),
            "emi": emi,
            "principal_paid": principal_part,
            "interest_paid": interest,
            "remaining_balance": balance,
        })

    return {
        "loan_id": loan.id,
        "loan_name": loan.name,
        "principal": loan.principal,
        "annual_rate": loan.annual_rate,
        "tenure_months": loan.tenure_months,
        "total_interest": round(total_interest, 2),
        "total_payment": round(loan.principal + total_interest, 2),
        "schedule": schedule,
    }


def list_loans(db: Session, user_id: Optional[int] = None):
    q = db.query(models.Loan)
    if user_id is not None:
        q = q.filter(models.Loan.user_id == user_id)
    loans = q.order_by(models.Loan.start_date.desc()).all()
    return [get_loan_summary(db, l) for l in loans]


def get_loan(db: Session, loan_id: int, user_id: Optional[int] = None):
    q = db.query(models.Loan).filter(models.Loan.id == loan_id)
    if user_id is not None:
        q = q.filter(models.Loan.user_id == user_id)
    loan = q.first()
    return get_loan_summary(db, loan) if loan else None


def create_loan(db: Session, name: str, principal: float, annual_rate: float,
                 tenure_months: int, start_date: date, penal_rate_monthly: float = 2.0, user_id: Optional[int] = None) -> dict:
    loan = models.Loan(
        user_id=user_id,
        name=name, principal=principal, annual_rate=annual_rate,
        tenure_months=tenure_months, start_date=start_date,
        penal_rate_monthly=penal_rate_monthly, missed_emis=0, status="active",
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return get_loan_summary(db, loan)


def set_missed_emis(db: Session, loan_id: int, missed_emis: int, user_id: Optional[int] = None) -> dict:
    q = db.query(models.Loan).filter(models.Loan.id == loan_id)
    if user_id is not None:
        q = q.filter(models.Loan.user_id == user_id)
    loan = q.first()
    if not loan:
        return None
    loan.missed_emis = max(0, missed_emis)
    db.commit()
    db.refresh(loan)
    return get_loan_summary(db, loan)


def delete_loan(db: Session, loan_id: int, user_id: Optional[int] = None) -> bool:
    q = db.query(models.Loan).filter(models.Loan.id == loan_id)
    if user_id is not None:
        q = q.filter(models.Loan.user_id == user_id)
    loan = q.first()
    if not loan:
        return False
    db.delete(loan)
    db.commit()
    return True
