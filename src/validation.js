import { isRegexKey, parseRegexKey } from "./keys.js";
import { checkEntryLimits } from "./entryLimits.js";
import { findBrokenLinks } from "./entryLinks.js";

export const VALIDATION_LABELS = {
  emptyContent: "Empty content",
  duplicateKeys: "Duplicate keys",
  keyCollision: "Key collisions",
  invalidRegex: "Invalid regex keys",
  missingKeys: "Missing keys",
  unreachable: "Unreachable entries",
  orderCollision: "Order collision",
  brokenLink: "Broken entry link",
  tokenLimit: "Token limit",
  charLimit: "Character limit"
};

function entryLabel(entry) {
  return entry.title.trim() || "Untitled entry";
}

function normalizeKey(key) {
  return key.trim().toLocaleLowerCase();
}

export function validateBook(book, tokenCount = null) {
  if (!book?.entries?.length) {
    return [];
  }

  const keyOwners = new Map();
  const orderOwners = new Map();

  for (const entry of book.entries) {
    const localKeys = new Set();

    for (const key of entry.keys) {
      const normalized = normalizeKey(key);

      if (!normalized || localKeys.has(normalized)) {
        continue;
      }

      localKeys.add(normalized);

      if (!keyOwners.has(normalized)) {
        keyOwners.set(normalized, new Set());
      }

      keyOwners.get(normalized).add(entry.id);
    }

    if (!orderOwners.has(entry.order)) {
      orderOwners.set(entry.order, []);
    }

    orderOwners.get(entry.order).push(entry);
  }

  const entryTitles = new Map(book.entries.map((entry) => [entry.id, entryLabel(entry)]));
  const issues = [];

  for (const entry of book.entries) {
    const title = entryLabel(entry);

    issues.push(...checkEntryLimits(entry, tokenCount));

    if (!entry.content.trim()) {
      issues.push({
        code: "emptyContent",
        label: VALIDATION_LABELS.emptyContent,
        field: "entry-content",
        entryId: entry.id,
        entryTitle: title,
        message: "Add content before exporting this entry."
      });
    }

    if (!entry.constant && !entry.keys.length) {
      if (entry.enabled) {
        issues.push({
          code: "unreachable",
          label: VALIDATION_LABELS.unreachable,
          field: "entry-keys-input",
          entryId: entry.id,
          entryTitle: title,
          message: "This entry is enabled but has no trigger keys, so it can never activate."
        });
      } else {
        issues.push({
          code: "missingKeys",
          label: VALIDATION_LABELS.missingKeys,
          field: "entry-keys-input",
          entryId: entry.id,
          entryTitle: title,
          message: "Add trigger keys or make the entry always on before enabling it."
        });
      }
    }

    const localKeys = new Map();
    const repeatedKeys = new Set();

    for (const key of entry.keys) {
      const normalized = normalizeKey(key);

      if (!normalized) {
        continue;
      }

      if (localKeys.has(normalized)) {
        repeatedKeys.add(normalized);
      } else {
        localKeys.set(normalized, key.trim());
      }
    }

    if (repeatedKeys.size) {
      issues.push({
        code: "duplicateKeys",
        label: VALIDATION_LABELS.duplicateKeys,
        field: "entry-keys-input",
        entryId: entry.id,
        entryTitle: title,
        message: `Repeated in this entry: ${[...repeatedKeys].join(", ")}.`
      });
    }

    const invalidRegexKeys = entry.keys.filter((key) => isRegexKey(key) && !parseRegexKey(key).ok);

    if (invalidRegexKeys.length) {
      issues.push({
        code: "invalidRegex",
        label: VALIDATION_LABELS.invalidRegex,
        field: "entry-keys-input",
        entryId: entry.id,
        entryTitle: title,
        message: `Treated as plain text: ${invalidRegexKeys.join(", ")}.`
      });
    }

    const sharedKeys = [...localKeys.keys()].filter((key) => (keyOwners.get(key)?.size ?? 0) > 1);

    if (sharedKeys.length) {
      const others = new Set();

      for (const key of sharedKeys) {
        for (const ownerId of keyOwners.get(key) ?? []) {
          if (ownerId !== entry.id) {
            others.add(entryTitles.get(ownerId) ?? "another entry");
          }
        }
      }

      issues.push({
        code: "keyCollision",
        label: VALIDATION_LABELS.keyCollision,
        field: "entry-keys-input",
        entryId: entry.id,
        entryTitle: title,
        message: `Shared with ${[...others].join(", ")}: ${sharedKeys.join(", ")}.`
      });
    }

    const orderGroup = orderOwners.get(entry.order) ?? [];

    if (orderGroup.length > 1) {
      issues.push({
        code: "orderCollision",
        label: VALIDATION_LABELS.orderCollision,
        field: "entry-order",
        entryId: entry.id,
        entryTitle: title,
        message: `Insertion order ${entry.order} is shared by ${orderGroup.length} entries.`
      });
    }
  }

  issues.push(...findBrokenLinks(book));

  return issues;
}
