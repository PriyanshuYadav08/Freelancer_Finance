# # from sqlalchemy import Column, Integer, String, Float, Date, Boolean, ForeignKey
# # from sqlalchemy.orm import relationship
# # from .database import Base

# # class User(Base):
# #     __tablename__ = "users"
# #     id = Column(Integer, primary_key=True, index=True)
# #     email = Column(String, unique=True, index=True, nullable=False)
# #     hashed_password = Column(String, nullable=False)
    
# #     account = relationship("Account", back_populates="user", uselist=False)
# #     clients = relationship("Client", back_populates="user")
# #     invoices = relationship("Invoice", back_populates="user")
# #     expenses = relationship("Expense", back_populates="user")
# #     loans = relationship("Loan", back_populates="user")

# # class Account(Base):
# #     """Single-row table holding the freelancer's current liquid cash."""
# #     __tablename__ = "account"

# #     id = Column(Integer, primary_key=True, index=True)
# #     current_cash = Column(Float, default=0.0)
# from sqlalchemy import Column, ForeignKey, Integer, String, Float, Text, Date, Boolean
# from sqlalchemy.orm import relationship
# from .database import Base


# class User(Base):
#   __tablename__ = "users"

#   id = Column(Integer, primary_key=True, index=True)
#   email = Column(String, unique=True, index=True)
#   hashed_password = Column(String)

#   # Link relationship back to Account
#   account = relationship("Account", back_populates="user", uselist=False)


# class Account(Base):
#   __tablename__ = "account"

#   id = Column(Integer, primary_key=True, index=True)

#   # CRITICAL: This foreign key tells SQLAlchemy how 'account' connects to 'users'
#   user_id = Column(Integer, ForeignKey("users.id"))

#   # Link relationship back to User
#   user = relationship("User", back_populates="account")


# class Client(Base):
#   __tablename__ = "clients"

#   id = Column(Integer, primary_key=True, index=True)
#   name = Column(String, index=True)

#   # 2. Change 'float' to 'Float' (capital F)
#   pay_probability = Column(Float, default=0.8)


# class Invoice(Base):
#     __tablename__ = "invoices"

#     id = Column(Integer, primary_key=True, index=True)
#     invoice_number = Column(Integer, nullable=False)  # displayed as #1048 etc
#     client_id = Column(Integer, ForeignKey("clients.id"))
#     project_name = Column(String, nullable=False)
#     amount = Column(Float, nullable=False)
#     issue_date = Column(Date, nullable=False)
#     due_date = Column(Date, nullable=False)
#     # stored status: draft, sent, paid (due/overdue are derived from due_date at read time)
#     status = Column(String, default="sent")
#     paid_date = Column(Date, nullable=True)

#     client = relationship("Client", back_populates="invoices")


# class Expense(Base):
#     __tablename__ = "expenses"

#     id = Column(Integer, primary_key=True, index=True)
#     name = Column(String, nullable=False)
#     category = Column(String, default="other")
#     amount = Column(Float, nullable=False)
#     date = Column(Date, nullable=False)
#     recurring = Column(Boolean, default=False)  # counts toward monthly burn
#     essential = Column(Boolean, default=True)


# class Loan(Base):
#     __tablename__ = "loans"

#     id = Column(Integer, primary_key=True, index=True)
#     name = Column(String, nullable=False)
#     principal = Column(Float, nullable=False)
#     annual_rate = Column(Float, nullable=False)       # e.g. 7.95 for 7.95%
#     tenure_months = Column(Integer, nullable=False)
#     start_date = Column(Date, nullable=False)
#     missed_emis = Column(Integer, default=0)          # actual, persisted count
#     penal_rate_monthly = Column(Float, default=2.0)   # % per month on overdue amount (assumption, editable)
#     status = Column(String, default="active")         # active, closed




from sqlalchemy import Boolean, Column, Date, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
  __tablename__ = "users"

  id = Column(Integer, primary_key=True, index=True)
  email = Column(String, unique=True, index=True)
  hashed_password = Column(String)

  # Link relationship back to Account
  account = relationship("Account", back_populates="user", uselist=False)


class Account(Base):
  __tablename__ = "account"

  id = Column(Integer, primary_key=True, index=True)

  # Foreign key connecting account to users
  user_id = Column(Integer, ForeignKey("users.id"))

  # Link relationship back to User
  user = relationship("User", back_populates="account")


class Client(Base):
  __tablename__ = "clients"

  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, index=True)
  pay_probability = Column(Float, default=0.8)
  avg_delay_days = Column(Integer, default=0)
  reliability_score = Column(Float, default=5.0)

  # Relationship back to Invoice to fix the mapper error
  invoices = relationship("Invoice", back_populates="client")


class Invoice(Base):
  __tablename__ = "invoices"

  id = Column(Integer, primary_key=True, index=True)
  invoice_number = Column(Integer, nullable=False)  # displayed as #1048 etc
  client_id = Column(Integer, ForeignKey("clients.id"))
  project_name = Column(String, nullable=False)
  amount = Column(Float, nullable=False)
  issue_date = Column(Date, nullable=False)
  due_date = Column(Date, nullable=False)
  # stored status: draft, sent, paid
  status = Column(String, default="sent")
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


class Loan(Base):
  __tablename__ = "loans"

  id = Column(Integer, primary_key=True, index=True)
  name = Column(String, nullable=False)
  principal = Column(Float, nullable=False)
  annual_rate = Column(Float, nullable=False)  # e.g. 7.95 for 7.95%
  tenure_months = Column(Integer, nullable=False)
  start_date = Column(Date, nullable=False)
  missed_emis = Column(Integer, default=0)  # actual, persisted count
  penal_rate_monthly = Column(
      Float, default=2.0
  )  # % per month on overdue amount
  status = Column(String, default="active")  # active, closed