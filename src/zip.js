const LOCAL_SIG = 0x04034b50;
const CENTRAL_SIG = 0x02014b50;
const END_SIG = 0x06054b50;
const UTF8_FLAG = 0x0800;

const encoder = new TextEncoder();
const latin1 = new TextDecoder("latin1");

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

function writeUint16(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(target, offset, value) {
  target[offset] = value & 0xff;
  target[offset + 1] = (value >>> 8) & 0xff;
  target[offset + 2] = (value >>> 16) & 0xff;
  target[offset + 3] = (value >>> 24) & 0xff;
}

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

export function isZip(bytes) {
  return Boolean(bytes) && bytes.length >= 4 && readUint32(bytes, 0) === LOCAL_SIG;
}

export async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/**
 * List the entries in a zip archive. Directory entries are skipped. `read(name)` inflates one entry.
 */
export function listZip(bytes) {
  if (!isZip(bytes)) {
    return { ok: false, error: "That file is not a zip archive." };
  }

  const entries = [];
  let offset = 0;

  while (offset + 30 <= bytes.length && readUint32(bytes, offset) === LOCAL_SIG) {
    const flags = readUint16(bytes, offset + 6);
    const method = readUint16(bytes, offset + 8);
    const compressedSize = readUint32(bytes, offset + 18);
    const nameLength = readUint16(bytes, offset + 26);
    const extraLength = readUint16(bytes, offset + 28);
    const nameStart = offset + 30;
    const nameEnd = nameStart + nameLength;

    if (nameEnd > bytes.length) {
      return { ok: false, error: "The zip directory is truncated." };
    }

    const name = new TextDecoder(flags & UTF8_FLAG ? "utf-8" : "latin1").decode(bytes.subarray(nameStart, nameEnd));
    const dataStart = nameEnd + extraLength;
    const dataEnd = dataStart + compressedSize;

    if (dataEnd > bytes.length) {
      return { ok: false, error: "A zip entry is truncated." };
    }

    if (!name.endsWith("/")) {
      entries.push({
        name,
        method,
        dataStart,
        dataEnd,
        async read() {
          const raw = bytes.subarray(dataStart, dataEnd);

          if (method === 0) {
            return raw;
          }

          if (method === 8) {
            return inflateRaw(raw);
          }

          throw new Error(`Unsupported compression method ${method}`);
        }
      });
    }

    offset = dataEnd;
  }

  return { ok: true, entries };
}

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

/** Build a stored (uncompressed) zip from `{ name, bytes }` entries. */
export function buildZip(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const data = file.bytes;
    const crc = crc32(data);

    const local = new Uint8Array(30 + nameBytes.length + data.length);
    writeUint32(local, 0, LOCAL_SIG);
    writeUint16(local, 4, 20);
    writeUint16(local, 6, UTF8_FLAG);
    writeUint16(local, 8, 0);
    writeUint16(local, 10, 0);
    writeUint16(local, 12, 0);
    writeUint32(local, 14, crc);
    writeUint32(local, 18, data.length);
    writeUint32(local, 22, data.length);
    writeUint16(local, 26, nameBytes.length);
    writeUint16(local, 28, 0);
    local.set(nameBytes, 30);
    local.set(data, 30 + nameBytes.length);
    locals.push(local);

    const central = new Uint8Array(46 + nameBytes.length);
    writeUint32(central, 0, CENTRAL_SIG);
    writeUint16(central, 4, 20);
    writeUint16(central, 6, 20);
    writeUint16(central, 8, UTF8_FLAG);
    writeUint16(central, 10, 0);
    writeUint16(central, 12, 0);
    writeUint16(central, 14, 0);
    writeUint32(central, 16, crc);
    writeUint32(central, 20, data.length);
    writeUint32(central, 24, data.length);
    writeUint16(central, 28, nameBytes.length);
    writeUint16(central, 30, 0);
    writeUint16(central, 32, 0);
    writeUint16(central, 34, 0);
    writeUint16(central, 36, 0);
    writeUint32(central, 38, 0);
    writeUint32(central, 42, offset);
    central.set(nameBytes, 46);
    centrals.push(central);

    offset += local.length;
  }

  const centralSize = centrals.reduce((total, part) => total + part.length, 0);
  const end = new Uint8Array(22);
  writeUint32(end, 0, END_SIG);
  writeUint16(end, 4, 0);
  writeUint16(end, 6, 0);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralSize);
  writeUint32(end, 16, offset);
  writeUint16(end, 20, 0);

  return concat([...locals, ...centrals, end]);
}

export function readEntryName(bytes, offset) {
  return latin1.decode(bytes.subarray(offset, offset + 4));
}
