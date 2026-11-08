function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function parseReplaceQuery({ find = "", replacement = "", regex = false, caseSensitive = false } = {}) {
  const pattern = String(find ?? "");

  if (!pattern) {
    return { ok: false, error: "Enter something to find." };
  }

  if (!regex) {
    return {
      ok: true,
      query: {
        find: pattern,
        replacement: String(replacement ?? ""),
        regex: false,
        caseSensitive: Boolean(caseSensitive)
      }
    };
  }

  try {
    new RegExp(pattern, caseSensitive ? "gu" : "giu");
  } catch (error) {
    return { ok: false, error: error?.message || "That is not a valid regular expression." };
  }

  return {
    ok: true,
    query: {
      find: pattern,
      replacement: String(replacement ?? ""),
      regex: true,
      caseSensitive: Boolean(caseSensitive)
    }
  };
}

export function replaceInText(text, query) {
  const value = String(text ?? "");

  if (query.regex) {
    const flags = query.caseSensitive ? "gu" : "giu";
    return value.replace(new RegExp(query.find, flags), query.replacement);
  }

  if (query.caseSensitive) {
    return value.split(query.find).join(query.replacement);
  }

  return value.replace(new RegExp(escapeRegExp(query.find), "giu"), () => query.replacement);
}

export function countReplacements(text, query) {
  const value = String(text ?? "");

  if (!value) {
    return 0;
  }

  if (query.regex) {
    const flags = query.caseSensitive ? "gu" : "giu";
    return [...value.matchAll(new RegExp(query.find, flags))].length;
  }

  if (query.caseSensitive) {
    return value.split(query.find).length - 1;
  }

  const needle = query.find.toLocaleLowerCase();
  const haystack = value.toLocaleLowerCase();
  let count = 0;
  let index = 0;

  while (index <= haystack.length) {
    const found = haystack.indexOf(needle, index);

    if (found === -1) {
      break;
    }

    count += 1;
    index = found + Math.max(1, needle.length);
  }

  return count;
}

export const TEXT_FIELDS = new Set(["content", "title", "notes"]);
export const LIST_FIELDS = new Set(["keys", "secondaryKeys", "tags"]);

function replaceList(values, query) {
  return values.map((value) => (countReplacements(value, query) ? replaceInText(value, query) : value));
}

function listMatches(values, query) {
  return values.reduce((sum, value) => sum + countReplacements(value, query), 0);
}

export function planReplace(book, query, { fields = ["content"], onlySelected = null } = {}) {
  const targets = onlySelected ? new Set(onlySelected) : null;
  const changes = [];
  let totalMatches = 0;

  for (const entry of book?.entries ?? []) {
    if (targets && !targets.has(entry.id)) {
      continue;
    }

    let matches = 0;
    const before = {};
    const after = {};

    for (const field of fields) {
      if (LIST_FIELDS.has(field)) {
        const values = Array.isArray(entry[field]) ? entry[field] : [];
        const fieldMatches = listMatches(values, query);

        if (!fieldMatches) {
          continue;
        }

        matches += fieldMatches;
        before[field] = values.slice();
        after[field] = replaceList(values, query);
        continue;
      }

      const value = String(entry[field] ?? "");
      const fieldMatches = countReplacements(value, query);

      if (!fieldMatches) {
        continue;
      }

      matches += fieldMatches;
      before[field] = value;
      after[field] = replaceInText(value, query);
    }

    if (!matches) {
      continue;
    }

    totalMatches += matches;
    changes.push({
      entryId: entry.id,
      title: entry.title.trim() || "Untitled entry",
      fields: Object.keys(after),
      matches,
      before,
      after
    });
  }

  return {
    changes,
    entryCount: changes.length,
    totalMatches
  };
}

export function applyReplace(book, plan) {
  const replacements = new Map(plan.changes.map((change) => [change.entryId, change]));
  let touched = 0;

  for (const entry of book?.entries ?? []) {
    const change = replacements.get(entry.id);

    if (!change) {
      continue;
    }

    Object.assign(entry, change.after);
    entry.updatedAt = Date.now();
    touched += 1;
  }

  if (touched) {
    book.updatedAt = Date.now();
  }

  return touched;
}
