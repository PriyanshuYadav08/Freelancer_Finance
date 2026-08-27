from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base


class Account(Base):
    """Single-row table holding the freelancer's current liquid cash."""
    __tablename__ = "account"

    id = Column(Integer, primary_key=True, index=True)
    current_cash = Column(Float, default=0.0)


class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    # 0-1: modeled probability that an outstanding invoice from this client
    # gets paid roughly on time, derived from history
    pay_probability = Column(Float, default=0.8)
    avg_delay_days = Column(Integer, default=0)
    reliability_score = Column(Integer, default=80)  # 0-100 display score

    invoices = relationship("Invoice", back_populates="client")


class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    project_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    issue_date = Column(Date, nullable=False)
    due_date = Column(Date, nullable=False)
    status = Column(String, default="sent")  # draft, sent, overdue, paid
    paid_date = Column(Date, nullable=True)

    client = relationship("Client", back_populates="invoices")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, default="other")
    amount = Column(Float, nullable=False)
    date = Column(Date, nullable=False)
    recurring = Column(Boolean, default=False)  # counts toward monthly burn
    essential = Column(Boolean, default=True)
