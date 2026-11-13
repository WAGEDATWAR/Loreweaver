import {
  buildLossyWarnings,
  copyPreservedFields,
  createUidAllocator,
  isRecord,
  mapPositionToNumber
} from "./helpers.js";

export const risuAdapter = {
  id: "risu",
  label: "RisuAI lorebook",
  exportLabel: "RisuAI lorebook",
  exportDescription: "A RisuAI-style lorebook JSON with array entries.",
  exportFilenameSuffix: "risuai-lorebook",
  capabilities: {
    bookExport: true,
    preservesUnknownFields: true
  },
  // RisuAI lorebooks read through the same world-info shape as SillyTavern's;
  // detection is handled there. This adapter is export-only.
  detect() {
    return 0;
  },
  serialize(book) {
    if (!isRecord(book) || !Array.isArray(book.entries)) {
      return { ok: false, error: "There is no lorebook to export." };
    }

    const allocateUid = createUidAllocator();
    const entries = [];
    const bookFields = copyPreservedFields(book.extensions, this.id);

    for (const entry of book.entries) {
      const uid = allocateUid(entry);
      const probability = Math.min(100, Math.max(0, Math.trunc(entry.probability ?? 100)));

      entries.push({
        uid,
        key: [...entry.keys],
        keysecondary: [...entry.secondaryKeys],
        comment: entry.title,
        content: entry.content,
        disable: !entry.enabled,
        constant: entry.constant,
        selective: entry.selective,
        order: entry.order,
        position: mapPositionToNumber(entry.position),
        probability,
        useProbability: probability < 100,
        caseSensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords,
        extensions: {}
      });
    }

    return {
      ok: true,
      data: {
        ...bookFields,
        name: book.name,
        description: book.description,
        entries
      },
      warnings: buildLossyWarnings(book, this.exportLabel || this.label)
    };
  }
};
