from typing import Optional
from fastapi import FastAPI, Depends, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import financial_engine as fe
from . import ai_cfo
from . import simulator
from .schemas import (
    DashboardOut, ChatRequest, ChatResponse, SimulateCustomRequest, SimulateResult,
    ClientListItem, ClientDetailOut, InvoiceListOut, CashflowForecastOut, ScenarioPreset,
    ExpenseOut,
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


@app.get("/api/dashboard", response_model=DashboardOut)
def dashboard(db: Session = Depends(get_db)):
    return fe.get_financial_state(db)


@app.get("/api/cashflow-forecast", response_model=CashflowForecastOut)
def cashflow_forecast(history: int = 6, forecast: int = 6, db: Session = Depends(get_db)):
    return fe.get_cashflow_forecast(db, history, forecast)


@app.get("/api/clients", response_model=list[ClientListItem])
def clients(db: Session = Depends(get_db)):
    return fe.get_client_list(db)


@app.get("/api/clients/{client_id}", response_model=ClientDetailOut)
def client_detail(client_id: int, db: Session = Depends(get_db)):
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
):
    return fe.get_invoice_list(db, status=status, search=search, page=page, page_size=page_size)


@app.post("/api/ai-cfo/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    return ai_cfo.answer(db, req.message)


@app.get("/api/simulate/presets", response_model=list[ScenarioPreset])
def simulate_presets(db: Session = Depends(get_db)):
    return simulator.get_presets(db)


@app.post("/api/simulate", response_model=SimulateResult)
def simulate(req: SimulateCustomRequest, db: Session = Depends(get_db)):
    return simulator.run_custom_scenario(
        db, req.duration_months, req.monthly_revenue_drop, req.one_time_expense, req.label
    )


@app.get("/api/expenses", response_model=list[ExpenseOut])
def expenses(db: Session = Depends(get_db)):
    return fe.get_expense_list(db)


@app.get("/api/health")
def health():
    return {"status": "ok"}
