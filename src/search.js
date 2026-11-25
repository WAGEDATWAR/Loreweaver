const QUERY_FIELDS = [
  { key: "title", label: "title", read: (entry) => entry.title },
  { key: "content", label: "content", read: (entry) => entry.content },
  { key: "notes", label: "notes", read: (entry) => entry.notes ?? "" },
  { key: "keys", label: "keys", read: (entry) => entry.keys.join(", ") },
  { key: "secondaryKeys", label: "secondary keys", read: (entry) => entry.secondaryKeys.join(", ") },
  { key: "tags", label: "tags", read: (entry) => (entry.tags ?? []).join(", ") }
];

function analyzeWithNeedle(entry, needle) {
  return QUERY_FIELDS
    .filter((field) => String(field.read(entry)).toLowerCase().includes(needle))
    .map((field) => field.label);
}

export function analyzeEntryQuery(entry, query, { regex = false } = {}) {
  const needle = String(query ?? "").trim();

  if (!needle) {
    return { matched: true, fields: [] };
  }

  if (regex) {
    let pattern;

    try {
      pattern = new RegExp(needle, "i");
    } catch {
      return { matched: false, fields: [], invalid: true };
    }

    const fields = QUERY_FIELDS
      .filter((field) => pattern.test(String(field.read(entry))))
      .map((field) => field.label);

    return { matched: fields.length > 0, fields };
  }

  const fields = analyzeWithNeedle(entry, needle.toLowerCase());
  return { matched: fields.length > 0, fields };
}

const CARD_QUERY_FIELDS = [
  { label: "name", read: (card) => card.name },
  { label: "nickname", read: (card) => card.nickname },
  { label: "description", read: (card) => card.description },
  { label: "personality", read: (card) => card.personality },
  { label: "scenario", read: (card) => card.scenario },
  { label: "first message", read: (card) => card.firstMessage },
  { label: "greetings", read: (card) => [...(card.alternateGreetings ?? []), ...(card.groupOnlyGreetings ?? [])].join("\n") },
  { label: "examples", read: (card) => card.exampleMessages },
  { label: "system prompt", read: (card) => card.systemPrompt },
  { label: "post-history", read: (card) => card.postHistoryInstructions },
  { label: "depth prompt", read: (card) => card.depthPrompt?.prompt ?? "" },
  { label: "creator notes", read: (card) => card.creatorNotes },
  { label: "creator", read: (card) => card.creator },
  { label: "tags", read: (card) => (card.tags ?? []).join(", ") }
];

export function analyzeCardQuery(card, query, { regex = false } = {}) {
  const needle = String(query ?? "").trim();

  if (!needle) {
    return { matched: true, fields: [] };
  }

  let test;

  if (regex) {
    try {
      const pattern = new RegExp(needle, "i");
      test = (text) => pattern.test(text);
    } catch {
      return { matched: false, fields: [], invalid: true };
    }
  } else {
    const lower = needle.toLowerCase();
    test = (text) => text.toLowerCase().includes(lower);
  }

  const fields = CARD_QUERY_FIELDS.filter((field) => test(String(field.read(card) ?? ""))).map((field) => field.label);
  return { matched: fields.length > 0, fields };
}

export function searchProject(project, query, { regex = false } = {}) {
  const needle = String(query ?? "").trim();
  const groups = [];
  let total = 0;

  const cards = [];

  if (!needle) {
    return { query: needle, total, groups, cards };
  }

  for (const card of project?.cards ?? []) {
    const match = analyzeCardQuery(card, needle, { regex });

    if (match.matched) {
      cards.push({ card, fields: match.fields });
    }
  }

  for (const book of project?.books ?? []) {
    const entries = [];

    for (const entry of book.entries ?? []) {
      const match = analyzeEntryQuery(entry, needle, { regex });

      if (match.matched) {
        entries.push({ entry, fields: match.fields });
        total += 1;
      }
    }

    if (entries.length) {
      groups.push({ book, entries });
    }
  }

  return { query: needle, total, groups, cards };
}
