from datetime import date
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, status
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

# Migration helper for SQLite schema evolution
with engine.connect() as conn:
    try:
        from sqlalchemy import text
        conn.execute(text("ALTER TABLE invoices ADD COLUMN project_id INTEGER REFERENCES projects(id)"))
        conn.commit()
    except Exception:
        pass

seed()

app = FastAPI(title="Freelancer Financial OS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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

    # Initialize empty cash account for new user
    fe._account(db, user_id=new_user.id)

    access_token = auth.create_access_token(data={"sub": str(new_user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": new_user.id, "email": new_user.email},
    }


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

    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect email or password")

    access_token = auth.create_access_token(data={"sub": str(user.id)})
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {"id": user.id, "email": user.email},
    }


@app.get("/api/auth/me")
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"id": current_user.id, "email": current_user.email}


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
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_financial_state(db, user_id=user_id)


@app.get("/api/cashflow-forecast", response_model=CashflowForecastOut)
def cashflow_forecast(
    history: int = 6,
    forecast: int = 6,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_cashflow_forecast(db, history, forecast, user_id=user_id)


@app.get("/api/clients", response_model=list[ClientListItem])
def clients(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_client_list(db, user_id=user_id)


@app.post("/api/clients", response_model=ClientCreated)
def create_client(
    req: ClientCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    client = fe.create_client(
        db,
        req.name,
        req.pay_probability,
        req.avg_delay_days,
        req.reliability_score,
        user_id=user_id,
    )
    return {"id": client.id, "name": client.name}


@app.get("/api/clients/{client_id}", response_model=ClientDetailOut)
def client_detail(
    client_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    detail = fe.get_client_detail(db, client_id, user_id=user_id)
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
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_invoice_list(
        db,
        status=status,
        search=search,
        page=page,
        page_size=page_size,
        user_id=user_id,
    )


@app.post("/api/invoices", response_model=InvoiceOut)
def create_invoice(
    req: InvoiceCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    result = fe.create_invoice(
        db,
        req.client_id,
        req.project_name,
        req.amount,
        _parse_date(req.issue_date),
        _parse_date(req.due_date),
        req.status,
        user_id=user_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    return result


@app.patch("/api/invoices/{invoice_id}", response_model=InvoiceOut)
def update_invoice(
    invoice_id: int,
    req: InvoiceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    result = fe.update_invoice_status(
        db,
        invoice_id,
        req.status,
        _parse_date(req.paid_date) if req.paid_date else None,
        user_id=user_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result


@app.delete("/api/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    if not fe.delete_invoice(db, invoice_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Invoice not found")
    return {"deleted": True}


@app.post("/api/income", response_model=InvoiceOut)
def add_income(
    req: IncomeCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    result = fe.create_income(
        db,
        req.client_id,
        req.amount,
        req.description,
        _parse_date(req.date),
        user_id=user_id,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Client not found")
    return result


@app.post("/api/ai-cfo/chat", response_model=ChatResponse)
def chat(
    req: ChatRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return ai_cfo.answer(db, req.message, user_id=user_id)


@app.get("/api/simulate/presets", response_model=list[ScenarioPreset])
def simulate_presets(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    return simulator.get_presets(db)


@app.post("/api/simulate", response_model=SimulateResult)
def simulate(
    req: SimulateCustomRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
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
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_expense_list(db, user_id=user_id)


@app.get("/api/loans", response_model=list[LoanOut])
def loans(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return loan_engine.list_loans(db, user_id=user_id)


@app.post("/api/loans", response_model=LoanOut)
def create_loan(
    req: LoanCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return loan_engine.create_loan(
        db,
        req.name,
        req.principal,
        req.annual_rate,
        req.tenure_months,
        _parse_date(req.start_date),
        req.penal_rate_monthly,
        user_id=user_id,
    )


@app.get("/api/loans/{loan_id}", response_model=LoanOut)
def loan_detail(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    result = loan_engine.get_loan(db, loan_id, user_id=user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Loan not found")
    return result


@app.patch("/api/loans/{loan_id}/missed-emis", response_model=LoanOut)
def update_missed_emis(
    loan_id: int,
    req: LoanMissedEmisUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    result = loan_engine.set_missed_emis(db, loan_id, req.missed_emis, user_id=user_id)
    if not result:
        raise HTTPException(status_code=404, detail="Loan not found")
    return result


@app.delete("/api/loans/{loan_id}")
def delete_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    if not loan_engine.delete_loan(db, loan_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Loan not found")
    return {"deleted": True}


@app.post("/api/loans/{loan_id}/simulate", response_model=LoanSimulateResult)
def simulate_loan(
    loan_id: int,
    req: LoanSimulateRequest,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    loan = db.query(models.Loan).filter(models.Loan.id == loan_id)
    if user_id is not None:
        loan = loan.filter(models.Loan.user_id == user_id)
    loan_obj = loan.first()
    if not loan_obj:
        raise HTTPException(status_code=404, detail="Loan not found")

    return loan_engine.simulate_missed_emis(
        db,
        loan_obj,
        req.missed_months,
        req.catchup_months,
        user_id=user_id,
    )


@app.get("/api/settings", response_model=schemas.UserSettingsOut)
def get_settings(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_user_settings(db, user_id=user_id)


@app.patch("/api/settings", response_model=schemas.UserSettingsOut)
def update_settings(
    req: schemas.UserSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.update_user_settings(db, user_id=user_id, updates=req.dict(exclude_unset=True))


@app.get("/api/projects", response_model=list[schemas.ProjectOut])
def get_projects(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_project_list(db, user_id=user_id)


@app.post("/api/projects", response_model=schemas.ProjectOut)
def create_project(
    req: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    deadline_date = _parse_date(req.deadline) if req.deadline else None
    return fe.create_project(
        db,
        name=req.name,
        budget=req.budget,
        hours_logged=req.hours_logged,
        target_hourly_rate=req.target_hourly_rate,
        status=req.status,
        deadline=deadline_date,
        client_id=req.client_id,
        user_id=user_id,
    )


@app.patch("/api/projects/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: int,
    req: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    updates = req.dict(exclude_unset=True)
    if "deadline" in updates and isinstance(updates["deadline"], str):
        updates["deadline"] = _parse_date(updates["deadline"])
    updated = fe.update_project(db, project_id, updates, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Project not found")
    return updated


@app.delete("/api/projects/{project_id}")
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    if not fe.delete_project(db, project_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Project not found")
    return {"deleted": True}


@app.get("/api/goals", response_model=list[schemas.GoalOut])
def get_goals(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_goal_list(db, user_id=user_id)


@app.post("/api/goals", response_model=schemas.GoalOut)
def create_goal(
    req: schemas.GoalCreate,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    target_dt = _parse_date(req.target_date) if req.target_date else None
    return fe.create_goal(
        db,
        name=req.name,
        category=req.category,
        target_amount=req.target_amount,
        current_amount=req.current_amount,
        target_date=target_dt,
        user_id=user_id,
    )


@app.delete("/api/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    if not fe.delete_goal(db, goal_id, user_id=user_id):
        raise HTTPException(status_code=404, detail="Goal not found")
    return {"deleted": True}


@app.get("/api/tax/analysis", response_model=schemas.TaxAnalysisOut)
def tax_analysis(
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    return fe.get_tax_analysis(db, user_id=user_id)


@app.get("/api/loans/{loan_id}/amortization", response_model=schemas.AmortizationScheduleOut)
def loan_amortization(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(auth.get_optional_current_user),
):
    user_id = current_user.id if current_user else None
    res = loan_engine.get_amortization_schedule(db, loan_id, user_id=user_id)
    if not res:
        raise HTTPException(status_code=404, detail="Loan not found")
    return res


@app.get("/api/health")
def health():
    return {"status": "ok"}