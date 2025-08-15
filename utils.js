export function mergeWithoutDupes(existing, addition) {
  if (!addition) return existing || "";
  if (!existing) return addition;
  const a = existing.trim();
  const b = addition.trim();
  const aWords = a.split(/\s+/);
  const bWords = b.split(/\s+/);
  const maxOverlap = Math.min(20, aWords.length, bWords.length);
  let overlap = 0;
  for (let k = maxOverlap; k > 0; k--) {
    const tail = aWords.slice(-k).join(" ").toLowerCase();
    const head = bWords.slice(0, k).join(" ").toLowerCase();
    if (tail === head) { overlap = k; break; }
  }
  const toAppend = bWords.slice(overlap).join(" ");
  return (toAppend ? (a ? a + " " : "") + toAppend : a).replace(/\s+/g, " ").trim();
}
export function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

