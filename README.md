# Ledger — AI CFO for Freelancers

A working MVP of the "Freelancer Financial Operating System" concept: a
dashboard, a rule-based AI CFO chat, and a what-if crash-test simulator,
all backed by a real financial engine (not made-up numbers).

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + Vite, React Router, plain CSS (dark "financial
  command center" design system — see `frontend/src/index.css` for tokens)

## Architecture

```
React (Vite)  ──HTTP──►  FastAPI
                            │
                    financial_engine.py   ← single source of truth for
                            │                every number (cash, safe-to-
                            │                spend, runway, receivables…)
                ┌───────────┼────────────┐
                │           │            │
            ai_cfo.py   simulator.py   main.py (routes)
```

`ai_cfo.py` is intentionally **not** a real LLM call — it's a small
intent-matcher that pulls real numbers from `financial_engine.py` and
explains them in plain language. This follows the product spec's own
architecture principle: the model should explain the numbers, never
invent them. To upgrade it to a real LLM, keep
`financial_engine.get_financial_state()` as the source of truth and pass
it (plus the user's message) to your model of choice as tool output.

## Run it

**Backend** (http://localhost:8000):

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The database auto-seeds with demo data (3 clients of varying reliability,
a mix of paid/overdue invoices, recurring expenses) on first run.

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env` points the UI at `http://localhost:8000` — change
`VITE_API_BASE` if your backend runs elsewhere.

## What's implemented (v1 scope)

- **Dashboard** — safe-to-spend breakdown, runway gauge, revenue
  concentration, financial health score, client watchlist, priority
  alerts
- **AI CFO chat** — affordability questions, runway, client risk,
  overdue invoices, tax reserve estimate
- **What-if simulator** — lose your biggest client, income drops 30%,
  payments delayed 45 days, emergency expense, big purchase — each shows
  a before/after runway and risk comparison

## Not implemented (out of scope for v1)

Everything else in the original product spec — full invoice lifecycle
and follow-ups, ML-based payment prediction, project/rate intelligence,
goals, client churn prediction, auth/multi-user, and a real tax engine.
The `financial_engine.py` module is structured so those can be added as
new functions without touching the dashboard/chat/simulator contracts.
