// Every word of the query must appear somewhere in the given fields (case-insensitive).
export function matches(query, ...fields) {
  const words = String(query || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.flat().filter((f) => f != null).join(" ").toLowerCase();
  return words.every((w) => hay.includes(w));
}
