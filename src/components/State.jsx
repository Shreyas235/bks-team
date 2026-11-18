export function Spinner({ label = "Loading…" }) {
  return <div className="spinner-wrap" role="status"><span className="spinner" /><span className="muted">{label}</span></div>;
}

const friendly = (e) => (e?.code === "permission-denied" ? "Access denied by the database rules (permission-denied). If the app was just updated, publish the latest firestore.rules in Firebase." : e?.code === "unavailable" ? "You seem to be offline." : e?.message || "Something went wrong.");

export function LoadError({ error }) {
  return (
    <div className="banner" role="alert">
      <div><strong>Couldn't load this data.</strong><div className="muted small">{friendly(error)}</div></div>
      <button className="btn ghost" onClick={() => window.location.reload()}>Retry</button>
    </div>
  );
}

// Shows a spinner while loading, an error box on failure, otherwise the content.
export function Status({ loading, error, children }) {
  if (error) return <LoadError error={error} />;
  if (loading) return <Spinner />;
  return children;
}
