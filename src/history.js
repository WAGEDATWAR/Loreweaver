export const HISTORY_PERSIST_LIMIT = 20;
export const HISTORY_PERSIST_CHAR_BUDGET = 1_000_000;
export const HISTORY_VERSION = 1;

function isSnapshot(value) {
  return Boolean(value)
    && typeof value === "object"
    && Array.isArray(value.books)
    && value.books.every((book) => book && typeof book === "object" && Array.isArray(book.entries));
}

export function trimHistory(entries, {
  limit = HISTORY_PERSIST_LIMIT,
  charBudget = HISTORY_PERSIST_CHAR_BUDGET
} = {}) {
  const kept = [];
  let used = 0;

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    if (kept.length >= limit) {
      break;
    }

    const entry = entries[index];

    if (!isSnapshot(entry)) {
      continue;
    }

    const size = JSON.stringify(entry).length;

    if (kept.length && used + size > charBudget) {
      break;
    }

    kept.unshift(entry);
    used += size;
  }

  return kept;
}

export function serializeHistory({ past = [], future = [] } = {}) {
  try {
    return JSON.stringify({
      version: HISTORY_VERSION,
      savedAt: Date.now(),
      past: trimHistory(past),
      future: trimHistory(future)
    });
  } catch {
    return "";
  }
}

export function parseHistory(raw) {
  const empty = { past: [], future: [] };

  if (!raw) {
    return empty;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!parsed || parsed.version !== HISTORY_VERSION) {
      return empty;
    }

    return {
      past: trimHistory(Array.isArray(parsed.past) ? parsed.past : []),
      future: trimHistory(Array.isArray(parsed.future) ? parsed.future : [])
    };
  } catch {
    return empty;
  }
}
