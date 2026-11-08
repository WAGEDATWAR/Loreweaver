const STOP_WORDS = new Set([
  "the", "and", "but", "for", "with", "from", "into", "over", "under", "that", "this", "these", "those",
  "has", "have", "had", "was", "were", "are", "its", "his", "her", "their", "our", "all", "any", "not",
  "who", "whom", "whose", "she", "him", "they", "them", "you", "your", "one", "two", "own", "out", "off",
  "when", "where", "while", "will", "would", "could", "should", "been", "being", "very", "just", "also",
  "than", "then", "there", "here", "each", "every", "both", "some", "such", "only", "more", "most"
]);

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

function tokenize(text) {
  return normalize(text)
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .map((word) => word.replace(/^['-]+|['-]+$/g, ""))
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word));
}

/**
 * Suggest trigger keys from a title and content. Title words rank first, then repeated content words.
 * Keys already present are excluded. Returns at most `limit` suggestions.
 */
export function suggestKeys({ title = "", content = "", existing = [], limit = 5 } = {}) {
  const taken = new Set(existing.map(normalize));
  const scored = new Map();

  function bump(word, weight) {
    if (taken.has(word)) {
      return;
    }

    scored.set(word, (scored.get(word) ?? 0) + weight);
  }

  tokenize(title).forEach((word, index) => bump(word, 10 - index));

  const counts = new Map();

  for (const word of tokenize(content)) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  for (const [word, count] of counts) {
    bump(word, Math.min(count, 5));
  }

  return [...scored.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, Math.max(0, limit))
    .map(([word]) => word);
}
