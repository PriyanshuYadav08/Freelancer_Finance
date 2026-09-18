from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)


class Account(Base):
    """Holds a user's current liquid cash."""
    __tablename__ = "account"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    current_cash = Column(Float, default=0.0)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, index=True)
    pay_probability = Column(Float, default=0.8)
    avg_delay_days = Column(Integer, default=0)
    reliability_score = Column(Float, default=5.0)

    invoices = relationship("Invoice", back_populates="client")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    invoice_number = Column(Integer, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"))
    project_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="sent")
    paid_date = Column(Date, nullable=True)

    client = relationship("Client", back_populates="invoices")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, default="other")
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    recurring = Column(Boolean, default=False)
    essential = Column(Boolean, default=True)


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    name = Column(String, nullable=False)
    principal = Column(Float, nullable=False)
    annual_rate = Column(Float, nullable=False)
    tenure_months = Column(Integer, nullable=False)
    start_date = Column(Date, nullable=False)
    missed_emis = Column(Integer, default=0)
    penal_rate_monthly = Column(Float, default=2.0)
    status = Column(String, default="active")