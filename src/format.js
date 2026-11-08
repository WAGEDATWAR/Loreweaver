import { CARD_ADAPTER, EXPORT_FORMATS, parseLorebookData, serializeLorebook } from "./formats/index.js";
import { checkImportText, checkProjectLimits } from "./limits.js";
import { migrateProjectData } from "./migrations.js";
import { APP_ID, SCHEMA_VERSION } from "./schema.js";

export { CARD_ADAPTER, EXPORT_FORMATS, serializeLorebook };

function isBinaryInput(value) {
  return value instanceof ArrayBuffer || ArrayBuffer.isView(value);
}

export async function parseProject(text, options = {}) {
  if (isBinaryInput(text)) {
    const bytes = new Uint8Array(text);

    if (bytes.length > 25 * 1024 * 1024) {
      return checkImportText("x".repeat(bytes.length));
    }

    return await parseLorebookData(bytes, options);
  }

  const size = checkImportText(text);

  if (!size.ok) {
    return size;
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  // A card JSON is a card, not a project; only migrate projects.
  if (CARD_ADAPTER.detect(data) > 0) {
    return await parseLorebookData(data, options);
  }

  const migration = migrateProjectData(data);
  const parsed = await parseLorebookData(migration.data, options);

  if (!parsed.ok) {
    return parsed;
  }

  const limits = checkProjectLimits(parsed.project);

  if (!limits.ok) {
    return limits;
  }

  const warnings = [...(parsed.warnings ?? [])];

  if (migration.applied.length) {
    warnings.push(`Upgraded project schema ${migration.from} \u2192 ${SCHEMA_VERSION}.`);
  }

  if (migration.newer) {
    warnings.push("This project was created with a newer version and may contain unsupported fields.");
  }

  return { ...parsed, warnings, migrations: migration.applied };
}

export function buildExport(state) {
  return {
    app: APP_ID,
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    activeBookId: state.activeBookId,
    activeEntryId: state.activeEntryId,
    books: state.books.map((book) => ({
      id: book.id,
      name: book.name,
      description: book.description,
      tags: [...(book.tags ?? [])],
      createdAt: book.createdAt,
      updatedAt: book.updatedAt,
      extensions: { ...book.extensions },
      entries: book.entries.map((entry) => ({ ...entry }))
    })),
    cards: (state.cards ?? []).map((card) => ({
      ...card,
      tags: [...(card.tags ?? [])],
      alternateGreetings: [...(card.alternateGreetings ?? [])],
      extensions: { ...card.extensions }
    }))
  };
}

export function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  downloadBlob(blob, filename);
}

export function downloadBytes(bytes, filename, type = "application/octet-stream") {
  downloadBlob(new Blob([bytes], { type }), filename);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
