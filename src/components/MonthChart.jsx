// Grouped column chart. series: [{ key, cls (cb|cp|cr), dot (o|g|r), name }]
export function MonthChart({ rows, series, format = (v) => v }) {
  const max = Math.max(1, ...rows.flatMap((r) => series.map((s) => r[s.key] || 0)));
  return (
    <>
      <div className="cols">{rows.map((r) => (
        <div key={r.label} className="colgrp">
          <div className="colbars" title={`${r.label}: ${series.map((s) => `${s.name} ${format(r[s.key] || 0)}`).join(", ")}`}>
            {series.map((s) => <i key={s.key} className={s.cls} style={{ height: `${((r[s.key] || 0) / max) * 100}%` }} />)}
          </div>
          <span>{r.label}</span>
        </div>))}</div>
      <p className="muted small">{series.map((s) => <span key={s.key}><i className={"dot " + s.dot} />{s.name} &nbsp;</span>)}</p>
    </>
  );
}

// One row per person with a small bar for each week.
export function Trend({ rows, labels }) {
  const max = Math.max(1, ...rows.flatMap((r) => r.weeks));
  if (!rows.length) return <p className="muted">No hours logged in these weeks.</p>;
  return (
    <div className="tblwrap"><table className="tbl trend"><thead><tr><th>Person</th>{labels.map((l) => <th key={l}>{l}</th>)}<th>Total</th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.name}><td><strong>{r.name}</strong></td>
          {r.weeks.map((w, i) => <td key={i}><span className="tbar"><i style={{ height: `${(w / max) * 100}%` }} /></span><small>{w || ""}</small></td>)}
          <td>{Math.round(r.weeks.reduce((s, w) => s + w, 0) * 10) / 10} h</td></tr>))}</tbody></table></div>
  );
}
