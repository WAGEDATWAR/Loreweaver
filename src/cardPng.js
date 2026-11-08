const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CARD_KEY = "ccv3";
const LEGACY_CARD_KEY = "chara";
const MAX_CARD_BYTES = 32 * 1024 * 1024;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function readUint32(bytes, offset) {
  return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function writeUint32(target, offset, value) {
  target[offset] = (value >>> 24) & 0xff;
  target[offset + 1] = (value >>> 16) & 0xff;
  target[offset + 2] = (value >>> 8) & 0xff;
  target[offset + 3] = value & 0xff;
}

const latin1 = new TextDecoder("latin1");

function concat(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const out = new Uint8Array(length);
  let offset = 0;

  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }

  return out;
}

export function isPng(bytes) {
  if (!bytes || bytes.length < 8) {
    return false;
  }

  return PNG_SIGNATURE.every((value, index) => bytes[index] === value);
}

export function decodeBase64Text(text) {
  const clean = String(text ?? "").replace(/\s+/g, "");

  if (!clean) {
    return "";
  }

  try {
    const binary = atob(clean);
    const bytes = new Uint8Array(binary.length);

    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return new TextDecoder().decode(bytes);
  } catch {
    return "";
  }
}

export function encodeBase64Text(text) {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function chunkType(bytes, offset) {
  return latin1.decode(bytes.subarray(offset, offset + 4));
}

/**
 * Walk the PNG chunk table. Returns the card text chunks found and, when `stopAt` is given, the byte
 * offset just past the matching chunk. The pixel data is never decoded.
 */
export function readChunks(bytes) {
  if (!isPng(bytes)) {
    return { ok: false, error: "That file is not a PNG." };
  }

  const chunks = [];
  let offset = 8;

  while (offset + 12 <= bytes.length) {
    const length = readUint32(bytes, offset);
    const type = chunkType(bytes, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;

    if (dataEnd + 4 > bytes.length) {
      return { ok: false, error: "The PNG chunk table is truncated." };
    }

    chunks.push({ type, offset, length, dataStart, dataEnd });
    offset = dataEnd + 4;

    if (type === "IEND") {
      break;
    }
  }

  return { ok: true, chunks };
}

export function readCardChunk(bytes) {
  const parsed = readChunks(bytes);

  if (!parsed.ok) {
    return parsed;
  }

  const textChunks = parsed.chunks.filter((chunk) => chunk.type === "tEXt" || chunk.type === "zTXt" || chunk.type === "iTXt");
  let payload = "";
  let legacyPayload = "";

  for (const chunk of textChunks) {
    const data = latin1.decode(bytes.subarray(chunk.dataStart, chunk.dataEnd));
    const separator = data.indexOf("\u0000");

    if (separator === -1) {
      continue;
    }

    const keyword = data.slice(0, separator);

    if (keyword !== CARD_KEY && keyword !== LEGACY_CARD_KEY) {
      continue;
    }

    const rest = data.slice(separator + 1);

    if (chunk.type !== "tEXt") {
      continue;
    }

    if (keyword === CARD_KEY) {
      payload = rest;
    } else {
      legacyPayload = rest;
    }
  }

  if (!payload) {
    payload = legacyPayload;
  }

  if (!payload) {
    return { ok: false, error: "The PNG has no character card chunk." };
  }

  const text = decodeBase64Text(payload);

  if (!text) {
    return { ok: false, error: "The character card chunk is not valid base64." };
  }

  return { ok: true, text, key: CARD_KEY };
}

function buildTextChunk(keyword, value) {
  const keywordBytes = new TextEncoder().encode(keyword);
  const data = concat([keywordBytes, new Uint8Array([0]), new TextEncoder().encode(value)]);
  const type = new TextEncoder().encode("tEXt");
  const out = new Uint8Array(12 + data.length);
  writeUint32(out, 0, data.length);
  out.set(type, 4);
  out.set(data, 8);
  writeUint32(out, 8 + data.length, crc32(concat([type, data])));
  return out;
}

/**
 * Insert or replace the card chunk. `ccv3` is written; a stale `chara` chunk is removed so the file
 * cannot carry two divergent cards.
 */
export function writeCardChunk(bytes, text) {
  if (!isPng(bytes)) {
    return { ok: false, error: "That file is not a PNG." };
  }

  if (!text) {
    return { ok: false, error: "There is no card text to write." };
  }

  if (bytes.length > MAX_CARD_BYTES) {
    return { ok: false, error: "The image is too large to embed a card." };
  }

  const parsed = readChunks(bytes);

  if (!parsed.ok) {
    return parsed;
  }

  const drop = parsed.chunks.filter((chunk) => {
    if (chunk.type !== "tEXt" && chunk.type !== "zTXt" && chunk.type !== "iTXt") {
      return false;
    }

    const data = latin1.decode(bytes.subarray(chunk.dataStart, chunk.dataEnd));
    const separator = data.indexOf("\u0000");
    const keyword = separator === -1 ? data : data.slice(0, separator);
    return keyword === CARD_KEY || keyword === LEGACY_CARD_KEY;
  });

  if (drop.length) {
    const firstDamaged = Math.min(...drop.map((chunk) => chunk.offset));
    const head = bytes.subarray(0, firstDamaged);
    const tail = bytes.subarray(drop[drop.length - 1].dataEnd + 4);
    return {
      ok: true,
      bytes: concat([head, buildTextChunk(CARD_KEY, encodeBase64Text(text)), tail])
    };
  }

  const firstIdat = parsed.chunks.find((chunk) => chunk.type === "IDAT") ?? parsed.chunks.find((chunk) => chunk.type === "IEND");

  if (!firstIdat) {
    return { ok: false, error: "The PNG has no IDAT chunk." };
  }

  const head = bytes.subarray(0, firstIdat.offset);
  const tail = bytes.subarray(firstIdat.offset);
  return { ok: true, bytes: concat([head, buildTextChunk(CARD_KEY, encodeBase64Text(text)), tail]) };
}
