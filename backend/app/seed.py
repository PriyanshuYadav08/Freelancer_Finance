import calendar
import random
from datetime import date, timedelta
from .database import SessionLocal, engine, Base
from . import models

random.seed(42)

CLIENTS = [
    {"name": "Acme Corp", "pay_probability": 0.95, "avg_delay_days": 2, "reliability_score": 94, "base_amount": 80000},
    {"name": "Nova Retail", "pay_probability": 0.72, "avg_delay_days": 14, "reliability_score": 61, "base_amount": 55000},
    {"name": "Pixel Studios", "pay_probability": 0.41, "avg_delay_days": 28, "reliability_score": 38, "base_amount": 70000},
    {"name": "Bright Labs", "pay_probability": 0.88, "avg_delay_days": 5, "reliability_score": 85, "base_amount": 45000},
    {"name": "Meridian Co", "pay_probability": 0.65, "avg_delay_days": 10, "reliability_score": 70, "base_amount": 38000},
]

PROJECTS = [
    "Website redesign", "Brand refresh", "Product photography", "Landing page copy",
    "Social media pack", "Quarterly retainer", "Illustration set", "Marketing site",
    "App redesign", "Content strategy", "Email campaign", "Ad creatives",
]


def _add_months(d: date, n: int) -> date:
    month = d.month - 1 + n
    year = d.year + month // 12
    month = month % 12 + 1
    day = min(d.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Client).first():
            return  # already seeded

        today = date.today()
        db.add(models.Account(current_cash=420000))

        client_rows = {}
        for c in CLIENTS:
            row = models.Client(
                name=c["name"], pay_probability=c["pay_probability"],
                avg_delay_days=c["avg_delay_days"], reliability_score=c["reliability_score"],
            )
            db.add(row)
            client_rows[c["name"]] = row
        db.flush()

        invoice_number = 1000

        def make_invoice(client_key, project, amount, issue_date, due_date, status, paid_date=None):
            nonlocal invoice_number
            invoice_number += 1
            db.add(models.Invoice(
                invoice_number=invoice_number,
                client=client_rows[client_key],
                project_name=project,
                amount=amount,
                issue_date=issue_date,
                due_date=due_date,
                status=status,
                paid_date=paid_date,
            ))

        # --- 6 months of paid invoice history per client ---
        for c in CLIENTS:
            for m in range(6, 0, -1):
                month_date = _add_months(today, -m)
                amount = round(c["base_amount"] * random.uniform(0.75, 1.3) / 1000) * 1000
                issue_day = random.randint(3, 18)
                issue_date = date(month_date.year, month_date.month, min(issue_day, calendar.monthrange(month_date.year, month_date.month)[1]))
                due_date = issue_date + timedelta(days=15)
                delay = max(0, int(random.gauss(c["avg_delay_days"], 4)))
                paid_date = min(due_date + timedelta(days=delay), today - timedelta(days=1))
                make_invoice(c["name"], random.choice(PROJECTS), amount, issue_date, due_date, "paid", paid_date)

        # --- current cycle: open invoices in various states ---
        make_invoice("Acme Corp", "Q3 maintenance retainer", 80000,
                     today - timedelta(days=20), today + timedelta(days=10), "sent")
        make_invoice("Nova Retail", "Product photography", 120000,
                     today - timedelta(days=45), today - timedelta(days=15), "sent")  # -> overdue
        make_invoice("Nova Retail", "Landing page copy", 45000,
                     today - timedelta(days=12), today + timedelta(days=3), "sent")  # -> due
        make_invoice("Pixel Studios", "Brand illustration set", 200000,
                     today - timedelta(days=60), today - timedelta(days=25), "sent")  # -> overdue
        make_invoice("Bright Labs", "New brand identity", 50000,
                     today, today + timedelta(days=20), "draft")
        make_invoice("Meridian Co", "Email campaign", 38000,
                     today - timedelta(days=10), today + timedelta(days=5), "sent")  # -> due
        make_invoice("Meridian Co", "Content strategy sprint", 30000,
                     today, today + timedelta(days=18), "draft")

        # --- recurring essential monthly bills (one template row each) ---
        expenses = [
            ("Rent (home office share)", "rent", 25000, True, True),
            ("Software subscriptions", "software", 8000, True, True),
            ("Internet + phone", "utilities", 3000, True, True),
            ("Health insurance", "insurance", 6000, True, True),
            ("Personal living expenses", "personal", 35000, True, True),
        ]
        for name, category, amount, recurring, essential in expenses:
            db.add(models.Expense(name=name, category=category, amount=amount,
                                   date=today - timedelta(days=random.randint(1, 5)),
                                   recurring=recurring, essential=essential))

        # --- a couple of one-off, non-essential expenses for cash-flow texture ---
        db.add(models.Expense(name="New camera lens", category="equipment", amount=42000,
                               date=today - timedelta(days=12), recurring=False, essential=False))
        db.add(models.Expense(name="Conference ticket", category="professional development",
                               amount=18000, date=_add_months(today, -2), recurring=False, essential=False))

        # --- loans: one under stress (matches the "missed 3 EMIs" scenario
        # this feature is built around), one healthy for contrast ---
        db.add(models.Loan(
            name="Home Loan - HDFC", principal=3000000, annual_rate=7.95, tenure_months=240,
            start_date=_add_months(today, -18), missed_emis=3, penal_rate_monthly=2.0, status="active",
        ))
        db.add(models.Loan(
            name="Equipment Loan - Bajaj Finserv", principal=250000, annual_rate=11.5, tenure_months=36,
            start_date=_add_months(today, -8), missed_emis=0, penal_rate_monthly=2.0, status="active",
        ))

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seeded freelancer_cfo.db")
