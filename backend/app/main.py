# from datetime import date
# from typing import Optional
# from fastapi import FastAPI, Depends, Query, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from sqlalchemy.orm import Session

# from fastapi import FastAPI, Depends, Query, HTTPException
# from fastapi.security import OAuth2PasswordRequestForm
# from . import auth, models

# from .database import Base, engine, get_db
# from . import financial_engine as fe
# from . import ai_cfo
# from . import simulator
# from . import loan_engine
# from . import schemas
# from .schemas import (
#     DashboardOut, ChatRequest, ChatResponse, SimulateCustomRequest, SimulateResult,
#     ClientListItem, ClientDetailOut, InvoiceListOut, CashflowForecastOut, ScenarioPreset,
#     ExpenseOut, InvoiceCreate, InvoiceStatusUpdate, InvoiceOut, IncomeCreate,
#     ClientCreate, ClientCreated, LoanCreate, LoanOut, LoanMissedEmisUpdate,
#     LoanSimulateRequest, LoanSimulateResult,
# )
# from .seed import seed

# Base.metadata.create_all(bind=engine)
# seed()

# app = FastAPI(title="Freelancer Financial OS API")

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# # Add Auth routes
# @app.post("/api/auth/signup")
# def signup(req: schemas.UserCreate, db: Session = Depends(get_db)):
#     if db.query(models.User).filter(models.User.email == req.email).first():
#         raise HTTPException(status_code=400, detail="Email already registered")
    
#     hashed_pw = auth.get_password_hash(req.password)
#     new_user = models.User(email=req.email, hashed_password=hashed_pw)
#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)
    
#     # Initialize empty account for the new user
#     fe._account(db, new_user.id)
#     return {"msg": "User created successfully"}

# @app.post("/api/auth/login")
# def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
#     user = db.query(models.User).filter(models.User.email == form_data.username).first()
#     if not user or not auth.verify_password(form_data.password, user.hashed_password):
#         raise HTTPException(status_code=400, detail="Incorrect email or password")
    
#     access_token = auth.create_access_token(data={"sub": str(user.id)})
#     return {"access_token": access_token, "token_type": "bearer"}

# def _parse_date(s: str) -> date:
#     try:
#         return date.fromisoformat(s)
#     except (ValueError, TypeError):
#         raise HTTPException(status_code=422, detail=f"Invalid date: {s!r}. Expected YYYY-MM-DD.")


# @app.get("/api/dashboard", response_model=schemas.DashboardOut)
# def dashboard(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
#     return fe.get_financial_state(db, current_user.id)


# @app.get("/api/cashflow-forecast", response_model=CashflowForecastOut)
# def cashflow_forecast(history: int = 6, forecast: int = 6, db: Session = Depends(get_db)):
#     return fe.get_cashflow_forecast(db, history, forecast)


# @app.get("/api/clients", response_model=list[ClientListItem])
# def clients(db: Session = Depends(get_db)):
#     return fe.get_client_list(db)


# @app.post("/api/clients", response_model=ClientCreated)
# def create_client(req: ClientCreate, db: Session = Depends(get_db)):
#     client = fe.create_client(db, req.name, req.pay_probability, req.avg_delay_days, req.reliability_score)
#     return {"id": client.id, "name": client.name}


# @app.get("/api/clients/{client_id}", response_model=ClientDetailOut)
# def client_detail(client_id: int, db: Session = Depends(get_db)):
#     detail = fe.get_client_detail(db, client_id)
#     if not detail:
#         raise HTTPException(status_code=404, detail="Client not found")
#     return detail


# @app.get("/api/invoices", response_model=InvoiceListOut)
# def invoices(
#     status: Optional[str] = None,
#     search: Optional[str] = None,
#     page: int = Query(1, ge=1),
#     page_size: int = Query(5, ge=1, le=50),
#     db: Session = Depends(get_db),
# ):
#     return fe.get_invoice_list(db, status=status, search=search, page=page, page_size=page_size)


# @app.post("/api/invoices", response_model=InvoiceOut)
# def create_invoice(req: InvoiceCreate, db: Session = Depends(get_db)):
#     result = fe.create_invoice(
#         db, req.client_id, req.project_name, req.amount,
#         _parse_date(req.issue_date), _parse_date(req.due_date), req.status,
#     )
#     if not result:
#         raise HTTPException(status_code=404, detail="Client not found")
#     return result


# @app.patch("/api/invoices/{invoice_id}", response_model=InvoiceOut)
# def update_invoice(invoice_id: int, req: InvoiceStatusUpdate, db: Session = Depends(get_db)):
#     result = fe.update_invoice_status(
#         db, invoice_id, req.status, _parse_date(req.paid_date) if req.paid_date else None
#     )
#     if not result:
#         raise HTTPException(status_code=404, detail="Invoice not found")
#     return result


# @app.delete("/api/invoices/{invoice_id}")
# def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
#     ok = fe.delete_invoice(db, invoice_id)
#     if not ok:
#         raise HTTPException(status_code=404, detail="Invoice not found")
#     return {"deleted": True}


# @app.post("/api/income", response_model=InvoiceOut)
# def add_income(req: IncomeCreate, db: Session = Depends(get_db)):
#     result = fe.create_income(db, req.client_id, req.amount, req.description, _parse_date(req.date))
#     if not result:
#         raise HTTPException(status_code=404, detail="Client not found")
#     return result


# @app.post("/api/ai-cfo/chat", response_model=ChatResponse)
# def chat(req: ChatRequest, db: Session = Depends(get_db)):
#     return ai_cfo.answer(db, req.message)


# @app.get("/api/simulate/presets", response_model=list[ScenarioPreset])
# def simulate_presets(db: Session = Depends(get_db)):
#     return simulator.get_presets(db)


# @app.post("/api/simulate", response_model=SimulateResult)
# def simulate(req: SimulateCustomRequest, db: Session = Depends(get_db)):
#     return simulator.run_custom_scenario(
#         db, req.duration_months, req.monthly_revenue_drop, req.one_time_expense, req.label
#     )


# @app.get("/api/expenses", response_model=list[ExpenseOut])
# def expenses(db: Session = Depends(get_db)):
#     return fe.get_expense_list(db)


# @app.get("/api/loans", response_model=list[LoanOut])
# def loans(db: Session = Depends(get_db)):
#     return loan_engine.list_loans(db)


# @app.post("/api/loans", response_model=LoanOut)
# def create_loan(req: LoanCreate, db: Session = Depends(get_db)):
#     return loan_engine.create_loan(
#         db, req.name, req.principal, req.annual_rate, req.tenure_months,
#         _parse_date(req.start_date), req.penal_rate_monthly,
#     )


# @app.get("/api/loans/{loan_id}", response_model=LoanOut)
# def loan_detail(loan_id: int, db: Session = Depends(get_db)):
#     result = loan_engine.get_loan(db, loan_id)
#     if not result:
#         raise HTTPException(status_code=404, detail="Loan not found")
#     return result


# @app.patch("/api/loans/{loan_id}/missed-emis", response_model=LoanOut)
# def update_missed_emis(loan_id: int, req: LoanMissedEmisUpdate, db: Session = Depends(get_db)):
#     result = loan_engine.set_missed_emis(db, loan_id, req.missed_emis)
#     if not result:
#         raise HTTPException(status_code=404, detail="Loan not found")
#     return result


# @app.delete("/api/loans/{loan_id}")
# def delete_loan(loan_id: int, db: Session = Depends(get_db)):
#     ok = loan_engine.delete_loan(db, loan_id)
#     if not ok:
#         raise HTTPException(status_code=404, detail="Loan not found")
#     return {"deleted": True}


# @app.post("/api/loans/{loan_id}/simulate", response_model=LoanSimulateResult)
# def simulate_loan(loan_id: int, req: LoanSimulateRequest, db: Session = Depends(get_db)):
#     from . import models
#     loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
#     if not loan:
#         raise HTTPException(status_code=404, detail="Loan not found")
#     return loan_engine.simulate_missed_emis(db, loan, req.missed_months, req.catchup_months)


# @app.get("/api/health")
# def health():
#     return {"status": "ok"}



from datetime import date
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from dotenv import load_dotenv
load_dotenv()

from . import ai_cfo, auth, financial_engine as fe, loan_engine, models, schemas, simulator
from .database import Base, engine, get_db
from .schemas import (
    CashflowForecastOut,
    ChatRequest,
    ChatResponse,
    ClientCreate,
    ClientCreated,
    ClientDetailOut,
    ClientListItem,
    ExpenseOut,
    IncomeCreate,
    InvoiceCreate,
    InvoiceListOut,
    InvoiceOut,
    InvoiceStatusUpdate,
    LoanCreate,
    LoanMissedEmisUpdate,
    LoanOut,
    LoanSimulateRequest,
    LoanSimulateResult,
    ScenarioPreset,
    SimulateCustomRequest,
    SimulateResult,
)
from .seed import seed

Base.metadata.create_all(bind=engine)
seed()

app = FastAPI(title="Freelancer Financial OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/api/auth/signup")
def signup(req: schemas.UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_pw = auth.get_password_hash(req.password)
    new_user = models.User(email=req.email, hashed_password=hashed_pw)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    fe._account(db, new_user.id)
    return {"msg": "User created successfully"}


@app.post("/api/auth/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(models.User)
        .filter(models.User.email == form_data.username)
        .first()
    )

    if not user or not auth.verify_password(
        form_data.password,
        user.hashed_password,
    ):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


def _parse_date(value: str) -> date:
    try:
        return date.fromisoformat(value)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=422,
            detail=f"Invalid date: {value!r}. Expected YYYY-MM-DD.",
        )


@app.get("/api/dashboard", response_model=schemas.DashboardOut)
def dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return fe.get_financial_state(db, current_user.id)


@app.get("/api/cashflow-forecast", response_model=CashflowForecastOut)
def cashflow_forecast(
    history: int = 6,
    forecast: int = 6,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return fe.get_cashflow_forecast(db, history, forecast)


@app.get("/api/clients", response_model=list[ClientListItem])
def clients(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return fe.get_client_list(db)


@app.post("/api/clients", response_model=ClientCreated)
def create_client(
    req: ClientCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    client = fe.create_client(
        db,
        req.name,
        req.pay_probability,
        req.avg_delay_days,
        req.reliability_score,
    )
    return {"id": client.id, "name": client.name}


@app.get("/api/clients/{client_id}", response_model=ClientDetailOut)
def client_detail(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    detail = fe.get_client_detail(db, client_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Client not found")
    return detail


@app.get("/api/invoices", response_model=InvoiceListOut)
def invoices(
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(5, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return fe.get_invoice_list(
        db,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
    )


@app.post("/api/invoices", response_model=InvoiceOut)
def create_invoice(
    req: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = fe.create_invoice(
        db,
        req.client_id,
        req.project_name,
        req.amount,
        _parse_date(req.issue_date),
        _parse_date(req.due_date),
        req.status,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    return result


@app.patch("/api/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    req: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = fe.update_invoice_status(
        db,
        invoice_id,
        req.status,
        _parse_date(req.paid_date) if req.paid_date else None,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not fe.delete_invoice(db, invoice_id):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"deleted": True}


@app.post("/api/income", response_model=InvoiceOut)
def add_income(
    req: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = fe.create_income(
        db,
        req.client_id,
        req.amount,
        req.description,
        _parse_date(req.date),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    return result


@app.post("/api/ai-cfo/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return ai_cfo.answer(db, req.message)


@app.get("/api/simulate/presets", response_model=list[ScenarioPreset])
def simulate_presets(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return simulator.get_presets(db)


@app.post("/api/simulate", response_model=SimulateResult)
def simulate(
    req: SimulateCustomRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return simulator.run_custom_scenario(
        db,
        req.duration_months,
        req.monthly_revenue_drop,
        req.one_time_expense,
        req.label,
    )


@app.get("/api/expenses", response_model=list[ExpenseOut])
def expenses(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return fe.get_expense_list(db)


@app.get("/api/loans", response_model=list[LoanOut])
def loans(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return loan_engine.list_loans(db)


@app.post("/api/loans", response_model=LoanOut)
def create_loan(
    req: LoanCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    return loan_engine.create_loan(
        db,
        req.name,
        req.principal,
        req.annual_rate,
        req.tenure_months,
        _parse_date(req.start_date),
        req.penal_rate_monthly,
    )


@app.get("/api/loans/{loan_id}", response_model=LoanOut)
def loan_detail(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = loan_engine.get_loan(db, loan_id)
    if not result:
        raise HTTPException(status_code=404, detail="Loan not found")
    return result


@app.patch("/api/loans/{loan_id}/missed-emis", response_model=LoanOut)
def update_missed_emis(
    loan_id: int,
    req: LoanMissedEmisUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    result = loan_engine.set_missed_emis(db, loan_id, req.missed_emis)
    if not result:
        raise HTTPException(status_code=404, detail="Loan not found")
    return result


@app.delete("/api/loans/{loan_id}")
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    if not loan_engine.delete_loan(db, loan_id):
        raise HTTPException(status_code=404, detail="Loan not found")
    return {"deleted": True}


@app.post("/api/loans/{loan_id}/simulate", response_model=LoanSimulateResult)
def simulate_loan(
    loan_id: int,
    req: LoanSimulateRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user),
):
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    return loan_engine.simulate_missed_emis(
        db,
        loan,
        req.missed_months,
        req.catchup_months,
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}