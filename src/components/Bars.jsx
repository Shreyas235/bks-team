export function Bars({ rows, unit = "", empty = "Nothing to show yet." }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="muted">{empty}</p>;
  return <div className="bars">{rows.map((r) => (
    <div key={r.label} className="bar"><span className="bl" title={r.label}>{r.label}</span>
      <div className="bt"><i style={{ width: `${(r.value / max) * 100}%` }} /></div><b>{r.value}{unit}</b></div>))}</div>;
}
