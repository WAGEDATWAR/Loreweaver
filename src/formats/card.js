import { parseCard, serializeCard, validateCard } from "../cardCodec.js";
import { isPng, readCardChunk, writeCardChunk } from "../cardPng.js";
import { createProject } from "../schema.js";
import { buildZip, isZip, listZip } from "../zip.js";
import { isRecord, normalizeLorebook } from "./helpers.js";

const CARD_ENTRY = /(^|\/)(ccv3|chara|card)\.json$/i;
const IMAGE_ENTRY = /(^|\/)avatar\.(png|webp|jpe?g)$/i;
const MAX_CONTAINER_BYTES = 64 * 1024 * 1024;

function bytesToBase64(bytes, type) {
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `data:${type};base64,${btoa(binary)}`;
}

function base64ToBytes(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(String(dataUrl ?? ""));

  if (!match) {
    return null;
  }

  try {
    const binary = atob(match[2]);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return { bytes, type: match[1] };
  } catch {
    return null;
  }
}

function readCardJson(text) {
  let data;

  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "The card payload isn't valid JSON." };
  }

  return validateCard(data);
}

async function parsePng(input) {
  const bytes = new Uint8Array(input);
  const card = readCardChunk(bytes);

  if (!card.ok) {
    return card;
  }

  const validated = readCardJson(card.text);

  if (!validated.ok) {
    return validated;
  }

  return {
    ok: true,
    text: card.text,
    card: validated,
    avatarDataUrl: bytesToBase64(bytes, "image/png"),
    warnings: validated.warnings
  };
}

async function parseCharx(input) {
  const bytes = new Uint8Array(input);

  if (bytes.length > MAX_CONTAINER_BYTES) {
    return { ok: false, error: "That CHARX file is too large." };
  }

  const parsed = listZip(bytes);

  if (!parsed.ok) {
    return parsed;
  }

  const cardEntry = parsed.entries.find((entry) => CARD_ENTRY.test(entry.name));

  if (!cardEntry) {
    return { ok: false, error: "The CHARX archive has no card JSON." };
  }

  const text = new TextDecoder().decode(await cardEntry.read());
  const validated = readCardJson(text);

  if (!validated.ok) {
    return validated;
  }

  const imageEntry = parsed.entries.find((entry) => IMAGE_ENTRY.test(entry.name));
  let avatarDataUrl = "";

  if (imageEntry) {
    const image = await imageEntry.read();
    const type = /\.webp$/i.test(imageEntry.name)
      ? "image/webp"
      : /\.jpe?g$/i.test(imageEntry.name)
        ? "image/jpeg"
        : "image/png";
    avatarDataUrl = bytesToBase64(image, type);
  }

  return {
    ok: true,
    text,
    card: validated,
    avatarDataUrl,
    warnings: validated.warnings
  };
}

export const cardAdapter = {
  id: "card",
  label: "Character card",
  exportLabel: "Character card (PNG)",
  exportDescription: "A PNG card with its data embedded in a ccv3 text chunk.",
  exportFilenameSuffix: "card",
  capabilities: {
    bookExport: false,
    preservesUnknownFields: true,
    cardImport: true,
    cardExport: true
  },
  detect(input) {
    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
      const bytes = new Uint8Array(input);
      return isPng(bytes) || isZip(bytes) ? 30 : 0;
    }

    if (isRecord(input)) {
      return validateCard(input).ok ? 25 : 0;
    }

    return 0;
  },
  isBinary: true,
  async parse(input, options = {}) {
    let parsed;

    if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) {
      const bytes = new Uint8Array(input);
      parsed = isZip(bytes) ? await parseCharx(bytes) : await parsePng(bytes);
    } else {
      const validated = validateCard(input);

      if (!validated.ok) {
        return validated;
      }

      parsed = { ok: true, text: JSON.stringify(input), card: validated, avatarDataUrl: "", warnings: validated.warnings };
    }

    if (!parsed.ok) {
      return parsed;
    }

    const book = extractBook(parsed.card.body);
    const cardResult = parseCard(parsed.card.body);

    if (!cardResult.ok) {
      return cardResult;
    }

    const warnings = [...parsed.warnings];

    if (parsed.avatarDataUrl) {
      cardResult.card.avatarDataUrl = parsed.avatarDataUrl;
    }

    let linkedBook = null;

    if (book) {
      const normalized = normalizeLorebook(book, {
        formatId: "card-book",
        formatLabel: "Embedded character book",
        filename: options.filename
      });

      if (normalized.ok) {
        linkedBook = normalized.project.books[0];
        warnings.push("The card carries an embedded lorebook; extraction is previewed before it is added.");
      } else {
        warnings.push("The card's embedded lorebook could not be read.");
      }
    }

    if (linkedBook) {
      cardResult.card.bookId = linkedBook.id;
    }

    const project = createProject({
      books: linkedBook ? [linkedBook] : [],
      cards: [cardResult.card]
    });

    return {
      ok: true,
      project,
      cardId: cardResult.card.id,
      bookId: linkedBook?.id ?? null,
      format: "Character card",
      warnings
    };
  },
  serialize(card, { book = null, avatarDataUrl = "" } = {}) {
    if (!isRecord(card)) {
      return { ok: false, error: "There is no card to export." };
    }

    if (!card.name?.trim()) {
      return { ok: false, error: "Give the card a name before exporting." };
    }

    const payload = serializeCard(card);

    if (book) {
      payload.data.character_book = bookSnapshot(book);
    }

    const source = base64ToBytes(avatarDataUrl || card.avatarDataUrl);

    if (!source || source.type !== "image/png") {
      return {
        ok: true,
        dataUrl: true,
        json: JSON.stringify(payload),
        filename: "card.json",
        warnings: ["The card has no PNG image; it exports as JSON only."]
      };
    }

    const written = writeCardChunk(source.bytes, JSON.stringify(payload));

    if (!written.ok) {
      return written;
    }

    return {
      ok: true,
      bytes: written.bytes,
      type: "image/png",
      filename: `${card.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card"}.png`,
      warnings: book ? [] : ["The card carries no linked lorebook."]
    };
  },
  serializeCharx(card, { book = null, avatarDataUrl = "" } = {}) {
    const serialized = this.serialize(card);

    if (!serialized.ok) {
      return serialized;
    }

    const payload = serializeCard(card);

    if (book) {
      payload.data.character_book = bookSnapshot(book);
    }

    const files = [{ name: "ccv3.json", bytes: new TextEncoder().encode(JSON.stringify(payload)) }];
    const source = base64ToBytes(avatarDataUrl || card.avatarDataUrl);

    if (source) {
      files.push({ name: `avatar.${source.type.split("/")[1] === "jpeg" ? "jpg" : source.type.split("/")[1]}`, bytes: source.bytes });
    }

    return {
      ok: true,
      bytes: buildZip(files),
      type: "application/zip",
      filename: `${payload.data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "card"}.charx`,
      warnings: serialized.warnings
    };
  }
};

export function extractBook(body) {
  if (!isRecord(body)) {
    return null;
  }

  if (isRecord(body.character_book)) {
    return body.character_book;
  }

  if (isRecord(body.data?.character_book)) {
    return body.data.character_book;
  }

  return null;
}

function bookSnapshot(book) {
  return {
    name: book.name,
    description: book.description,
    entries: book.entries.map((entry) => ({
      keys: [...entry.keys],
      secondary_keys: [...entry.secondaryKeys],
      comment: entry.title,
      content: entry.content,
      enabled: entry.enabled,
      constant: entry.constant,
      selective: entry.selective,
      insertion_order: entry.order,
      case_sensitive: entry.caseSensitive,
      match_whole_words: entry.matchWholeWords
    }))
  };
}
