# SoloCFO — AI CFO for Freelancers

A working MVP of the "Freelancer Financial Operating System" concept, redesigned to match a
dark, monochrome SaaS-dashboard reference (grouped sidebar, top command bar, stat cards with
sparklines, a combined AI CFO chat + scenario simulator). Every number on screen is computed by
a real financial engine — nothing is hand-typed into the UI.

## Stack

- **Backend:** FastAPI + SQLAlchemy + SQLite
- **Frontend:** React + Vite, React Router, Recharts, lucide-react icons, plain CSS
  (see `frontend/src/index.css` for the design tokens — near-black surfaces, white accents,
  red/amber for risk states)

## Architecture

```
React (Vite)  ──HTTP──►  FastAPI
                            │
                    financial_engine.py   ← single source of truth for
                            │                every number (cash, safe-to-
                            │                spend, runway, receivables,
                            │                client stats, cash-flow
                            │                reconstruction…)
                ┌───────────┼────────────┬─────────────┐
                │           │            │             │
            ai_cfo.py   simulator.py   seed.py     main.py (routes)
```

`ai_cfo.py` is a rule-based intent-matcher, not a real LLM call — it pulls real numbers from
`financial_engine.py` and explains them in plain language, returning a structured
`{reply, headline?, reasoning?, note?}` shape so the chat UI can render the "Here's why"
breakdown card seen in the reference design. To upgrade it to a real LLM: keep
`financial_engine.get_financial_state()` as the source of truth and pass it (plus the user's
message) to your model of choice as tool output.

`simulator.py`'s scenario runway is duration-aware: it projects cash forward
`(revenue - burn) × duration_months` and asks how many months of essential burn that covers, so
the Duration dropdown in the What-If simulator actually changes the result.

## Run it

**Backend** (http://localhost:8000):

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Run `uvicorn` from inside `backend/` (not from inside a venv's `Scripts`/`bin` folder) so Python
can resolve the `app` package. The database auto-seeds on first run: 5 clients with varying
reliability, 6 months of paid-invoice history each, a current cycle of draft/sent/due/overdue
invoices, and recurring + one-off expenses.

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env` points the UI at `http://localhost:8000` — change `VITE_API_BASE` if your
backend runs elsewhere.

## What's implemented

- **Dashboard** — greeting header, 4 stat cards (financial health, cash, runway, safe-to-spend)
  each with a sparkline, a Cash Flow Forecast chart (reconstructed history + projection, with a
  working "Next N Months" selector), an AI Insights panel, and an Upcoming panel pulling real
  overdue/due invoices
- **Clients** — roster list (sortable by revenue) and a per-client detail page: lifetime
  revenue, contribution %, reliability, avg delay, a revenue-over-time bar chart, a rule-based
  AI insight, and recent invoices
- **Invoices** — full list with status counts (draft/sent/due/overdue/paid), status filter,
  search, and pagination
- **AI CFO + Scenario Simulator** (combined split view) — chat handles affordability, runway,
  client risk, overdue invoices, tax reserve, and cash-flow questions; the simulator has 4
  presets (lose biggest client, income drop 30%, payment delay 45 days, emergency expense) with
  editable duration/revenue-drop/one-time-expense fields and a live before/after comparison
- **Cash Flow** — the forecast chart at a larger size plus a monthly income/expense/net table
- **Insights** — a fuller list of the same rule-based insights
- **Expenses** — real backend expense ledger (recurring vs one-time)
- **Tax** — the current reserve estimate with a plain-language explanation of its limits

## Not implemented (v1 scope)

**Coming-soon placeholders** (no data model behind them yet): Projects, Goals, Settings.

**Not attempted at all** (see the original product spec for the full vision): ML-based payment
prediction, an invoice follow-up automation flow, a real jurisdiction-specific tax engine,
auth/multi-user, rate/project intelligence, and client churn prediction.

`financial_engine.py` is structured so these can be added as new functions without touching the
existing dashboard/chat/simulator contracts.
