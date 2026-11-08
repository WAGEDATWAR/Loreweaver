const LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;

export function extractLinks(text) {
  const value = String(text ?? "");
  const links = [];
  let match;

  LINK_PATTERN.lastIndex = 0;

  while ((match = LINK_PATTERN.exec(value)) !== null) {
    const target = match[1].trim();

    if (target) {
      links.push({ target, label: (match[2] ?? "").trim() });
    }
  }

  return links;
}

function normalize(value) {
  return String(value ?? "").trim().toLocaleLowerCase();
}

export function findBrokenLinks(book) {
  const titles = new Map();

  for (const entry of book?.entries ?? []) {
    const key = normalize(entry.title);

    if (!key) {
      continue;
    }

    if (!titles.has(key)) {
      titles.set(key, entry);
    }
  }

  const issues = [];

  for (const entry of book?.entries ?? []) {
    const seen = new Set();

    for (const link of extractLinks(entry.content)) {
      const key = normalize(link.target);

      if (!key || seen.has(key)) {
        continue;
      }

      seen.add(key);

      if (titles.has(key)) {
        continue;
      }

      issues.push({
        code: "brokenLink",
        label: "Broken entry link",
        field: "entry-content",
        entryId: entry.id,
        entryTitle: entry.title.trim() || "Untitled entry",
        message: `Links to "${link.target}", which no entry is titled.`
      });
    }
  }

  return issues;
}
