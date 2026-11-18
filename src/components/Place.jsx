export const Place = ({ p }) => /^https?:\/\//.test(p) ? <a href={p} target="_blank" rel="noreferrer">Join link</a> : <>{p}</>;
