import "./TickerTape.css";

export default function TickerTape({ alerts }) {
  const items = alerts && alerts.length ? alerts : ["All clear — no flagged items right now."];
  // duplicate so the scroll loops seamlessly
  const loop = [...items, ...items];

  return (
    <div className="ticker" role="status" aria-label="Financial alerts">
      <div className="ticker-label mono">LIVE</div>
      <div className="ticker-track">
        <div className="ticker-content">
          {loop.map((text, i) => (
            <span className="ticker-item" key={i}>
              <span className="ticker-dot" />
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
