export default function ComingSoon({ eyebrow, title, note }) {
  return (
    <div style={{ maxWidth: 560 }}>
      <header className="page-header">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </header>
      <div className="panel empty-state" style={{ textAlign: "left" }}>
        {note || "This section isn't built in the v1 MVP yet."}
      </div>
    </div>
  );
}
