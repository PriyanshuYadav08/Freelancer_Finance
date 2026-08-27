export default function RunwayGauge({ months, max = 12 }) {
  const size = 148;
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, months / max));
  const offset = c * (1 - pct);
  const color = months >= 6 ? "var(--positive)" : months >= 3 ? "var(--accent)" : "var(--risk)";

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "8px auto" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span className="mono" style={{ fontSize: 30, fontWeight: 600, lineHeight: 1 }}>
          {months}
        </span>
        <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>months</span>
      </div>
    </div>
  );
}
