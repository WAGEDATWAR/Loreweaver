/**
 * The lorebook adapters. Every adapter reads a file into canonical books and writes a canonical
 * book back without dropping what it did not understand (unknown fields ride in `extensions`).
 *
 * Shared by Loreweaver and any frontend that vendors this module (Y-17).
 */
import {
  FORMAT_ID,
  FORMAT_VERSION,
  buildLossyWarnings,
  copyPreservedFields,
  createUidAllocator,
  getEntryItems,
  hasOwn,
  isRecord,
  mapPositionToNumber,
  normalizeLorebook,
  resolveLorebook,
} from "./model.js";

const ENTRY_DEFAULTS = {
  selectiveLogic: 0,
  addMemo: false,
  excludeRecursion: false,
  preventRecursion: false,
  delayUntilRecursion: false,
  depth: 4,
  group: "",
  groupOverride: false,
  groupWeight: 100,
  automationId: "",
  role: 0,
  vectorized: false,
  sticky: 0,
  cooldown: 0,
  delay: 0,
  matchPersonaDescription: false,
  matchCharacterDescription: false,
  matchCharacterPersonality: false,
  matchCharacterDepthPrompt: false,
  matchScenario: false,
  matchCreatorNotes: false,
};

function looksLikeWorldInfo(items) {
  return items.some(
    ({ entry }) =>
      isRecord(entry) &&
      (hasOwn(entry, "key") || hasOwn(entry, "keysecondary") || hasOwn(entry, "comment") || hasOwn(entry, "disable") || hasOwn(entry, "uid")),
  );
}

function hasDualFields(items) {
  return items.some(
    ({ entry }) =>
      isRecord(entry) &&
      ((hasOwn(entry, "key") && hasOwn(entry, "keys")) ||
        (hasOwn(entry, "comment") && hasOwn(entry, "name")) ||
        (hasOwn(entry, "order") && hasOwn(entry, "insertion_order")) ||
        (hasOwn(entry, "keysecondary") && hasOwn(entry, "secondary_keys"))),
  );
}

function isWrappedCharacterBook(input) {
  return isRecord(input) && (input.spec === "lorebook_v3" || (isRecord(input.data) && isRecord(input.data.character_book)));
}

function asBooks(result) {
  return result.ok ? { ...result, books: [result.book] } : result;
}

/** The canonical interchange file: what one app writes and any other can read. */
export const contentFormatAdapter = {
  id: FORMAT_ID,
  label: "Lorebook (interchange)",
  exportLabel: "Interchange lorebook",
  exportDescription: "The canonical lorebook file every frontend can read.",
  exportFilenameSuffix: "lorebook",
  capabilities: { bookExport: true, preservesUnknownFields: true },
  detect(input) {
    if (!isRecord(input)) return 0;
    if (input.app === FORMAT_ID) return 30;
    if (Array.isArray(input.lorebooks)) return 18;
    return 0;
  },
  parse(input, options = {}) {
    const books = Array.isArray(input?.books)
      ? input.books
      : Array.isArray(input?.lorebooks)
        ? input.lorebooks
        : [input];
    const out = [];
    const warnings = [];
    for (const raw of books) {
      const parsed = normalizeLorebook(raw, { formatId: this.id, formatLabel: this.label, filename: options.filename });
      if (!parsed.ok) {
        warnings.push(parsed.error);
        continue;
      }
      out.push(parsed.book);
    }
    if (!out.length) return { ok: false, error: "That file doesn't contain a readable lorebook." };
    return { ok: true, books: out, book: out[0], format: this.label, warnings };
  },
  serialize(book) {
    if (!isRecord(book) || !Array.isArray(book.entries)) return { ok: false, error: "There is no lorebook to export." };
    const entries = book.entries.map((entry) => ({
      ...copyPreservedFields(entry.extensions, this.id),
      id: entry.id,
      title: entry.title,
      keys: [...entry.keys],
      secondaryKeys: [...entry.secondaryKeys],
      tags: entry.tags ? [...entry.tags] : [],
      content: entry.content,
      notes: entry.notes ?? "",
      enabled: entry.enabled,
      constant: entry.constant,
      selective: entry.selective,
      caseSensitive: entry.caseSensitive,
      matchWholeWords: entry.matchWholeWords,
      order: entry.order,
      position: entry.position,
      probability: entry.probability,
      tokenLimit: entry.tokenLimit ?? 0,
      charLimit: entry.charLimit ?? 0,
    }));
    return {
      ok: true,
      data: {
        app: FORMAT_ID,
        version: FORMAT_VERSION,
        exportedAt: new Date().toISOString(),
        books: [
          {
            name: book.name,
            description: book.description ?? "",
            tags: book.tags ? [...book.tags] : [],
            tokenBudget: book.tokenBudget ?? 0,
            entries,
          },
        ],
      },
      warnings: [],
    };
  },
};

export const sillyTavernAdapter = {
  id: "sillytavern",
  label: "SillyTavern World Info",
  exportLabel: "SillyTavern World Info v2",
  exportDescription: "A World Info v2 JSON file compatible with SillyTavern.",
  exportFilenameSuffix: "sillytavern-world-info",
  primary: true,
  capabilities: { bookExport: true, preservesUnknownFields: true },
  detect(input) {
    if (!isRecord(input) || Array.isArray(input.books)) return 0;
    const resolved = resolveLorebook(input);
    if (!resolved) return 0;
    const items = getEntryItems(resolved.book.entries);
    if (!items.length) return hasOwn(resolved.book, "scan_depth") || hasOwn(resolved.book, "token_budget") ? 2 : 0;
    if (!looksLikeWorldInfo(items)) return 0;
    let score = 4;
    if (items.some(({ entry }) => isRecord(entry) && hasOwn(entry, "key") && !hasOwn(entry, "keys"))) score += 2;
    if (items.some(({ entry }) => isRecord(entry) && hasOwn(entry, "disable"))) score += 1;
    if (items.some(({ entry }) => isRecord(entry) && hasOwn(entry, "keysecondary"))) score += 1;
    return score;
  },
  parse(input, options = {}) {
    return asBooks(normalizeLorebook(input, { formatId: this.id, formatLabel: this.label, filename: options.filename }));
  },
  serialize(book) {
    if (!isRecord(book) || !Array.isArray(book.entries)) return { ok: false, error: "There is no lorebook to export." };
    const allocateUid = createUidAllocator();
    const entries = {};
    const bookFields = copyPreservedFields(book.extensions, this.id);
    for (const entry of book.entries) {
      const uid = allocateUid(entry);
      const probability = Math.min(100, Math.max(0, Math.trunc(entry.probability ?? 100)));
      entries[String(uid)] = {
        ...ENTRY_DEFAULTS,
        ...copyPreservedFields(entry.extensions, this.id),
        uid,
        key: [...entry.keys],
        keysecondary: [...entry.secondaryKeys],
        comment: entry.title,
        content: entry.content,
        constant: entry.constant,
        selective: entry.selective,
        order: entry.order,
        position: mapPositionToNumber(entry.position),
        disable: !entry.enabled,
        probability,
        useProbability: probability < 100,
        caseSensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords,
      };
    }
    const output = { ...bookFields, name: book.name, description: book.description, entries };
    if (!hasOwn(output, "scan_depth")) output.scan_depth = 4;
    if (!hasOwn(output, "token_budget")) output.token_budget = 2048;
    if (!hasOwn(output, "recursive_scanning")) output.recursive_scanning = false;
    return { ok: true, data: output, warnings: buildLossyWarnings(book, this.exportLabel) };
  },
};

export const chubAdapter = {
  id: "chub",
  label: "Chub lorebook",
  exportLabel: "Chub lorebook",
  exportDescription: "A standalone Chub lorebook with both common field variants.",
  exportFilenameSuffix: "chub-lorebook",
  capabilities: { bookExport: true, preservesUnknownFields: true },
  detect(input) {
    if (!isRecord(input) || Array.isArray(input.books)) return 0;
    const resolved = resolveLorebook(input);
    if (!resolved) return 0;
    const book = resolved.book;
    const items = getEntryItems(book.entries);
    if (isRecord(book.extensions) && book.extensions.chub) return 10;
    if (isWrappedCharacterBook(input)) return 9;
    if (hasDualFields(items)) return 8;
    if (Array.isArray(book.entries) && items.some(({ entry }) => isRecord(entry) && (hasOwn(entry, "keys") || hasOwn(entry, "insertion_order")))) return 6;
    if (items.some(({ entry }) => isRecord(entry) && hasOwn(entry, "keys"))) return 4;
    return 0;
  },
  parse(input, options = {}) {
    const resolved = resolveLorebook(input);
    const isCharacterBook = isWrappedCharacterBook(input) || Array.isArray(resolved?.book.entries);
    return asBooks(
      normalizeLorebook(input, {
        formatId: this.id,
        formatLabel: isCharacterBook ? "Character book" : this.label,
        filename: options.filename,
      }),
    );
  },
  serialize(book) {
    if (!isRecord(book) || !Array.isArray(book.entries)) return { ok: false, error: "There is no lorebook to export." };
    const allocateUid = createUidAllocator();
    const entries = {};
    const bookFields = copyPreservedFields(book.extensions, this.id);
    for (const entry of book.entries) {
      const uid = allocateUid(entry);
      const probability = Math.min(100, Math.max(0, Math.trunc(entry.probability ?? 100)));
      entries[String(uid)] = {
        ...copyPreservedFields(entry.extensions, this.id),
        uid,
        key: [...entry.keys],
        keys: [...entry.keys],
        keysecondary: [...entry.secondaryKeys],
        secondary_keys: [...entry.secondaryKeys],
        comment: entry.title,
        name: entry.title,
        content: entry.content,
        order: entry.order,
        insertion_order: entry.order,
        position: mapPositionToNumber(entry.position),
        disable: !entry.enabled,
        enabled: entry.enabled,
        constant: entry.constant,
        selective: entry.selective,
        caseSensitive: entry.caseSensitive,
        case_sensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords,
        match_whole_words: entry.matchWholeWords,
        probability,
        useProbability: probability < 100,
      };
    }
    return { ok: true, data: { ...bookFields, name: book.name, description: book.description, entries }, warnings: buildLossyWarnings(book, this.exportLabel) };
  },
};

const CHARACTER_BOOK_POSITIONS = new Set(["before_char", "after_char"]);

export const characterBookAdapter = {
  id: "characterbook",
  label: "Character book",
  exportLabel: "Character book",
  exportDescription: "A standalone character_book JSON for embedding in character cards.",
  exportFilenameSuffix: "character-book",
  capabilities: { bookExport: true, preservesUnknownFields: true },
  detect() {
    return 0;
  },
  parse(input, options = {}) {
    return asBooks(normalizeLorebook(input, { formatId: this.id, formatLabel: this.label, filename: options.filename }));
  },
  serialize(book) {
    if (!isRecord(book) || !Array.isArray(book.entries)) return { ok: false, error: "There is no lorebook to export." };
    const warnings = [];
    const bookFields = copyPreservedFields(book.extensions, this.id);
    let fallbackPositions = 0;
    const entries = book.entries.map((entry, index) => {
      const supported = CHARACTER_BOOK_POSITIONS.has(entry.position);
      if (!supported) fallbackPositions += 1;
      const serialized = {
        ...copyPreservedFields(entry.extensions, this.id),
        id: index,
        keys: [...entry.keys],
        secondary_keys: [...entry.secondaryKeys],
        content: entry.content,
        name: entry.title,
        comment: entry.title,
        enabled: entry.enabled,
        constant: entry.constant,
        selective: entry.selective,
        insertion_order: entry.order,
        priority: entry.order,
        position: supported ? entry.position : "before_char",
        case_sensitive: entry.caseSensitive,
        match_whole_words: entry.matchWholeWords,
      };
      if (!isRecord(serialized.extensions)) serialized.extensions = {};
      return serialized;
    });
    if (fallbackPositions) {
      warnings.push(`${fallbackPositions} ${fallbackPositions === 1 ? "entry used" : "entries used"} a position the character book format doesn't support and ${fallbackPositions === 1 ? "was" : "were"} exported as before the character.`);
    }
    warnings.push(...buildLossyWarnings(book, this.exportLabel));
    return {
      ok: true,
      data: { ...bookFields, name: book.name, description: book.description, scan_depth: 4, token_budget: 2048, recursive_scanning: false, entries },
      warnings,
    };
  },
};

export const BOOK_ADAPTERS = [contentFormatAdapter, chubAdapter, sillyTavernAdapter, characterBookAdapter];

export function adapterById(id) {
  return BOOK_ADAPTERS.find((adapter) => adapter.id === id) ?? null;
}

export const EXPORT_FORMATS = BOOK_ADAPTERS.filter((adapter) => adapter.capabilities?.bookExport).map((adapter) => ({
  id: adapter.id,
  label: adapter.exportLabel || adapter.label,
  description: adapter.exportDescription || "",
  capabilities: { ...adapter.capabilities },
  primary: adapter.primary === true,
}));
