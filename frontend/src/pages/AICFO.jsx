import { useEffect, useRef, useState } from "react";
import { sendChat } from "../api.js";
import "./AICFO.css";

const SUGGESTIONS = [
  "Can I afford a ₹1.5L laptop?",
  "What's my runway?",
  "Which client is riskiest?",
  "Do I have any overdue invoices?",
  "How much should I set aside for tax?",
];

const OPENING = {
  role: "assistant",
  text:
    "I'm your AI CFO. Ask me about affordability, runway, client risk, overdue invoices, or your tax reserve — I'll pull the real numbers before answering.",
};

export default function AICFO() {
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
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setPending(true);
    try {
      const res = await sendChat(q);
      setMessages((m) => [...m, { role: "assistant", text: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", text: "Couldn't reach the API. Is the backend running?" }]);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="ai-cfo">
      <header className="page-header">
        <p className="eyebrow mono">AI CFO</p>
        <h1>Ask about your business</h1>
      </header>

      <div className="panel chat-panel">
        <div className="chat-scroll scroll-thin" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={"bubble-row " + m.role}>
              <div className="bubble">
                {m.text.split("\n").map((line, j) => (
                  <p key={j}>{line || "\u00A0"}</p>
                ))}
              </div>
            </div>
          ))}
          {pending && (
            <div className="bubble-row assistant">
              <div className="bubble typing">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
        </div>

        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} className="chip-btn" onClick={() => handleSend(s)}>
              {s}
            </button>
          ))}
        </div>

        <form
          className="chat-input-row"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your AI CFO anything…"
          />
          <button type="submit" disabled={pending}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
