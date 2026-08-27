from datetime import date, timedelta
from .database import SessionLocal, engine, Base
from . import models


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Client).first():
            return  # already seeded

        acct = models.Account(current_cash=420000)
        db.add(acct)

        acme = models.Client(name="Acme Corp", pay_probability=0.95, avg_delay_days=2, reliability_score=94)
        nova = models.Client(name="Nova Retail", pay_probability=0.72, avg_delay_days=14, reliability_score=61)
        pixel = models.Client(name="Pixel Studios", pay_probability=0.41, avg_delay_days=28, reliability_score=38)
        db.add_all([acme, nova, pixel])
        db.flush()

        today = date.today()

        invoices = [
            # Acme - mostly paid on time, one still open
            models.Invoice(client=acme, project_name="Website redesign", amount=240000,
                            issue_date=today - timedelta(days=70), due_date=today - timedelta(days=40),
                            status="paid", paid_date=today - timedelta(days=38)),
            models.Invoice(client=acme, project_name="Q3 maintenance retainer", amount=80000,
                            issue_date=today - timedelta(days=20), due_date=today + timedelta(days=10),
                            status="sent"),
            # Nova - one overdue
            models.Invoice(client=nova, project_name="Product photography", amount=120000,
                            issue_date=today - timedelta(days=45), due_date=today - timedelta(days=15),
                            status="overdue"),
            models.Invoice(client=nova, project_name="Landing page copy", amount=45000,
                            issue_date=today - timedelta(days=10), due_date=today + timedelta(days=20),
                            status="sent"),
            # Pixel - unreliable, big overdue balance
            models.Invoice(client=pixel, project_name="Brand illustration set", amount=200000,
                            issue_date=today - timedelta(days=60), due_date=today - timedelta(days=25),
                            status="overdue"),
            # some paid history for tax reserve calc
            models.Invoice(client=nova, project_name="Social media pack", amount=60000,
                            issue_date=today - timedelta(days=25), due_date=today - timedelta(days=10),
                            status="paid", paid_date=today - timedelta(days=8)),
        ]
        db.add_all(invoices)

        expenses = [
            models.Expense(name="Rent (home office share)", category="rent", amount=25000,
                            date=today - timedelta(days=5), recurring=True, essential=True),
            models.Expense(name="Software subscriptions", category="software", amount=8000,
                            date=today - timedelta(days=3), recurring=True, essential=True),
            models.Expense(name="Internet + phone", category="utilities", amount=3000,
                            date=today - timedelta(days=4), recurring=True, essential=True),
            models.Expense(name="Health insurance", category="insurance", amount=6000,
                            date=today - timedelta(days=2), recurring=True, essential=True),
            models.Expense(name="Personal living expenses", category="personal", amount=35000,
                            date=today - timedelta(days=1), recurring=True, essential=True),
            models.Expense(name="New camera lens", category="equipment", amount=42000,
                            date=today - timedelta(days=12), recurring=False, essential=False),
        ]
        db.add_all(expenses)

        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
    print("Seeded freelancer_cfo.db")
