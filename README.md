# SoloCFO — AI CFO for Freelancers

A working MVP of the "Freelancer Financial Operating System" concept: a dark, monochrome
SaaS-dashboard UI (grouped sidebar, top command bar, stat cards with sparklines, a combined
AI CFO chat + scenario simulator) backed by a real financial engine and full CRUD — every
number on screen is computed or persisted for real, nothing is hand-typed into the UI.

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
                            │                reconstruction, loan EMI…)
                ┌───────────┼────────────┬─────────────┬────────────┐
                │           │            │             │            │
            ai_cfo.py   simulator.py   loan_engine.py  seed.py  main.py (routes)
```

`ai_cfo.py` is a rule-based intent-matcher, not a real LLM call — it pulls real numbers from
`financial_engine.py` and explains them in plain language, returning a structured
`{reply, headline?, reasoning?, note?}` shape so the chat UI can render the "Here's why"
breakdown card. To upgrade it to a real LLM: keep `financial_engine.get_financial_state()` as
the source of truth and pass it (plus the user's message) to your model of choice as tool
output.

`simulator.py`'s scenario runway is duration-aware: it projects cash forward
`(revenue - burn) × duration_months` and asks how many months of essential burn that covers.

`loan_engine.py` holds the EMI math (standard reducing-balance formula, shared with
`financial_engine.py` so loan EMIs count toward monthly burn) and the missed-EMI consequence
simulator: arrears (missed installments + accruing penal interest), the extra monthly payment
needed to catch up in a chosen window, and whether that fits the freelancer's real monthly
surplus — with a hard disclaimer that this is a planning estimate, not financial or legal
advice.

## Run it

**Backend** (http://localhost:8000):

```bash
cd backend
python3 -m venv venv && source venv/bin/activate   # optional
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Run `uvicorn` from inside `backend/` (not from inside a venv's `Scripts`/`bin` folder) so Python
can resolve the `app` package. The database auto-seeds on first run: 5 clients with 6 months of
paid-invoice history each, a current cycle of draft/sent/due/overdue invoices, recurring +
one-off expenses, and 2 loans — including a ₹30L / 7.95% / 20-year home loan with 3 missed EMIs
already logged, so the loan feature has something to show immediately.

**Frontend** (http://localhost:5173):

```bash
cd frontend
npm install
npm run dev
```

`frontend/.env` points the UI at `http://localhost:8000` — change `VITE_API_BASE` if your
backend runs elsewhere.

## What's implemented

- **Dashboard** — greeting header, 4 stat cards with sparklines, a working Cash Flow Forecast
  chart, AI Insights, and an Upcoming panel. **Add Income** is fully wired (logs a payment
  against a client, refreshes every number on the page).
- **Clients** — roster list and a per-client detail page with revenue history, a rule-based AI
  insight, and recent invoices. **Send Invoice** creates a real invoice for that client.
- **Invoices** — status counts, filtering, search, pagination, **New Invoice** creation, and
  per-row **mark paid** / **delete** actions.
- **AI CFO + Scenario Simulator** (combined split view) — chat handles affordability, runway,
  client risk, overdue invoices, tax reserve, and cash-flow questions; the simulator has 4
  presets with editable duration/revenue-drop/expense fields and a live before/after comparison.
- **Loans** *(new)* — add a loan (principal, rate, tenure, start date), see its EMI and
  outstanding balance computed live, and run the **Missed EMI Simulator**: how much arrears
  accrues, what it costs per month to catch up in a chosen window, whether that fits your real
  surplus, a risk read on whether the situation could snowball, and concrete next steps. You can
  also log actual missed/made payments, which persists and feeds straight into the dashboard's
  monthly burn, runway, and alerts.
- **Cash Flow** — the forecast chart at a larger size plus a monthly income/expense/net table.
- **Insights** — a fuller list of the same rule-based insights (now includes loan alerts).
- **Expenses** — real backend expense ledger (recurring vs one-time).
- **Tax** — the current reserve estimate with a plain-language explanation of its limits.

## Backend API surface

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/dashboard` | full financial snapshot |
| GET | `/api/cashflow-forecast` | history + forward projection |
| GET / POST | `/api/clients` | list / create |
| GET | `/api/clients/{id}` | client detail |
| GET / POST | `/api/invoices` | list (filter/paginate) / create |
| PATCH / DELETE | `/api/invoices/{id}` | update status (mark paid) / delete |
| POST | `/api/income` | log ad-hoc income (creates a paid invoice) |
| POST | `/api/ai-cfo/chat` | AI CFO chat |
| GET | `/api/simulate/presets` | scenario simulator presets |
| POST | `/api/simulate` | run a what-if scenario |
| GET | `/api/expenses` | expense ledger |
| GET / POST | `/api/loans` | list / create |
| GET | `/api/loans/{id}` | loan detail |
| PATCH | `/api/loans/{id}/missed-emis` | log missed/made payments (persists) |
| DELETE | `/api/loans/{id}` | delete loan |
| POST | `/api/loans/{id}/simulate` | missed-EMI consequence simulator (hypothetical, doesn't persist) |

## Not implemented (v1 scope)

**Coming-soon placeholders** (no data model behind them yet): Projects, Goals, Settings.

**Not attempted at all**: ML-based payment prediction, an invoice follow-up automation flow, a
real jurisdiction-specific tax engine, auth/multi-user, rate/project intelligence, client churn
prediction, and a full loan amortization schedule view (the loan engine computes summary stats,
not a month-by-month table).

`financial_engine.py` and `loan_engine.py` are structured so these can be added as new functions
without touching the existing routes.
