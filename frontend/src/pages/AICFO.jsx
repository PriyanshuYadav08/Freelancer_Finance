import { useEffect, useRef, useState } from "react";
import { Send, RefreshCw } from "lucide-react";
import { sendChat, getSimulatorPresets, runSimulation } from "../api.js";
import "./AICFO.css";

const inr = (n) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const SUGGESTIONS = [
  "Can I take a vacation?",
  "Why is cash flow falling?",
  "Which client is risky?",
  "How much for taxes?",
];

const OPENING = {
  role: "assistant",
  reply: "I'm your AI CFO. Ask me about affordability, runway, client risk, overdue invoices, or your tax reserve — I'll pull the real numbers before answering.",
};

const PRESET_TITLES = {
  lose_top_client: "What if I lose my biggest client?",
  income_drop_30: "What if my income drops 30%?",
  payment_delay_45: "What if payments get delayed 45 days?",
  emergency_expense: "What if I have a sudden emergency expense?",
};

export default function AICFO() {
  return (
    <div className="ai-cfo-page">
      <header className="page-header">
        <p className="eyebrow">AI CFO CHAT · SCENARIO SIMULATOR</p>
        <h1>Ask, then stress-test the answer</h1>
      </header>
      <div className="split-grid">
        <ChatPanel />
        <SimulatorPanel />
      </div>
    </div>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState([OPENING]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function handleSend(text) {
    const q = (text ?? input).trim();
    if (!q || pending) return;
    setMessages((m) => [...m, { role: "user", reply: q }]);
    setInput("");
    setPending(true);
    try {
      const res = await sendChat(q);
      setMessages((m) => [...m, { role: "assistant", ...res }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", reply: "Couldn't reach the API. Is the backend running?" }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel chat-panel">
      <h2 className="panel-title">AI CFO Chat</h2>
      <div className="chat-scroll scroll-thin" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={"bubble-row " + m.role}>
            {m.headline ? (
              <div className="bubble structured">
                <div className="bubble-headline">{m.headline}</div>
                <div className="reasoning-list">
                  {m.reasoning.map((r, j) => (
                    <div className="reasoning-row" key={j}>
                      <span>{r.label}</span>
                      <span className="mono">{r.value}</span>
                    </div>
                  ))}
                </div>
                {m.note && <div className="bubble-note">{m.note}</div>}
              </div>
            ) : (
              <div className="bubble">
                {m.reply.split("\n").map((line, j) => <p key={j}>{line || "\u00A0"}</p>)}
              </div>
            )}
          </div>
        ))}
        {pending && (
          <div className="bubble-row assistant">
            <div className="bubble typing"><span /><span /><span /></div>
          </div>
        )}
      </div>

      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip-btn" onClick={() => handleSend(s)}>{s}</button>
        ))}
      </div>

      <form className="chat-input-row" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask a follow up..." />
        <button type="submit" className="btn-icon" disabled={pending}><Send size={15} /></button>
      </form>
    </div>
  );
}

function SimulatorPanel() {
  const [presets, setPresets] = useState(null);
  const [presetId, setPresetId] = useState(null);
  const [duration, setDuration] = useState(6);
  const [revenueDrop, setRevenueDrop] = useState(0);
  const [oneTime, setOneTime] = useState(0);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSimulatorPresets().then((p) => {
      setPresets(p);
      if (p.length) applyPreset(p[0]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyPreset(preset) {
    setPresetId(preset.id);
    setDuration(preset.duration_months);
    setRevenueDrop(preset.monthly_revenue_drop);
    setOneTime(preset.one_time_expense);
    run(preset.duration_months, preset.monthly_revenue_drop, preset.one_time_expense, preset.label);
  }

  async function run(d = duration, rd = revenueDrop, ot = oneTime, label) {
    setLoading(true);
    try {
      const res = await runSimulation({
        label: label || PRESET_TITLES[presetId] || "Custom scenario",
        duration_months: Number(d),
        monthly_revenue_drop: Number(rd),
        one_time_expense: Number(ot),
      });
      setResult(res);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  const title = PRESET_TITLES[presetId] || "Custom scenario";
  const dropPct = result ? result.revenue_drop_pct : 0;

  return (
    <div className="panel simulator-panel">
      <h2 className="panel-title">Scenario Simulator</h2>

      <div className="preset-chips">
        {(presets || []).map((p) => (
          <button
            key={p.id}
            className={"chip-btn" + (p.id === presetId ? " active" : "")}
            onClick={() => applyPreset(p)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <h3 className="scenario-question">{title}</h3>

      <div className="sim-fields">
        <div>
          <label className="field-label">Duration</label>
          <select className="field-select" value={duration} onChange={(e) => setDuration(e.target.value)}>
            <option value={3}>3 months</option>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </div>
        <div>
          <label className="field-label">Monthly revenue drop {result ? `(~${dropPct}%)` : ""}</label>
          <input className="field-input mono" type="number" value={revenueDrop} onChange={(e) => setRevenueDrop(e.target.value)} />
        </div>
        <div>
          <label className="field-label">One-time expense</label>
          <input className="field-input mono" type="number" value={oneTime} onChange={(e) => setOneTime(e.target.value)} />
        </div>
      </div>

      {result && (
        <div className="results-block">
          <div className="panel-label" style={{ marginBottom: 10 }}>RESULTS</div>
          <ResultRow label="Revenue" current={inr(result.revenue_current)} scenario={inr(result.revenue_scenario)} />
          <ResultRow label="Runway" current={`${result.runway_current} months`} scenario={`${result.runway_scenario} months`} />
          <ResultRow
            label="Risk Level"
            current={result.risk_current}
            scenario={result.risk_scenario}
            riskTone
          />
        </div>
      )}

      <button className="btn btn-primary btn-block" onClick={() => run()} disabled={loading}>
        <RefreshCw size={14} /> {loading ? "Running…" : "Run New Simulation"}
      </button>
    </div>
  );
}

function ResultRow({ label, current, scenario, riskTone }) {
  const toneClass = (val) => {
    if (!riskTone) return "";
    if (val === "LOW") return "tone-positive";
    if (val === "MEDIUM") return "tone-warn";
    return "tone-risk";
  };
  return (
    <div className="result-row">
      <span className="result-label">{label}</span>
      <div className="result-values">
        <div className="result-col">
          <span className="result-tag">Current</span>
          <span className={"mono " + toneClass(current)}>{current}</span>
        </div>
        <div className="result-col">
          <span className="result-tag">Scenario</span>
          <span className={"mono " + toneClass(scenario)}>{scenario}</span>
        </div>
      </div>
    </div>
  );
}
