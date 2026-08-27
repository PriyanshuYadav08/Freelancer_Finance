from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from . import financial_engine as fe
from . import ai_cfo
from . import simulator
from .schemas import DashboardOut, ChatRequest, ChatResponse, SimulateRequest, SimulateResult
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


@app.post("/api/ai-cfo/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: Session = Depends(get_db)):
    return ai_cfo.answer(db, req.message)


@app.post("/api/simulate", response_model=SimulateResult)
def simulate(req: SimulateRequest, db: Session = Depends(get_db)):
    return simulator.run_scenario(db, req.scenario, req.amount)


@app.get("/api/health")
def health():
    return {"status": "ok"}
