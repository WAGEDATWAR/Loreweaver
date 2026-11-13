import { createHash } from "node:crypto";
import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const out = resolve(root, "www");
const entries = ["index.html", "src", "favicon.svg", "favicon.ico", "manifest.webmanifest", "sw.js", "icons"];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(resolve(out, ".nojekyll"), "");

let copied = 0;

for (const entry of entries) {
  const source = resolve(root, entry);

  if (!await exists(source)) {
    continue;
  }

  await cp(source, resolve(out, entry), { recursive: true });
  copied += 1;
}

async function walk(dir) {
  const found = [];

  for (const item of await readdir(dir, { withFileTypes: true })) {
    const full = resolve(dir, item.name);

    if (item.isDirectory()) {
      found.push(...await walk(full));
    } else {
      found.push(full);
    }
  }

  return found;
}

const shipped = (await walk(out))
  .map((file) => relative(out, file).split("\\").join("/"))
  .filter((file) => file !== ".nojekyll" && file !== "sw.js" && !file.endsWith("SOURCE.md"))
  .sort();
const hash = createHash("sha256");

for (const file of shipped) {
  hash.update(file);
  hash.update(await readFile(resolve(out, file)));
}

const version = hash.digest("hex").slice(0, 12);
const swPath = resolve(out, "sw.js");
let sw = await readFile(swPath, "utf8");
sw = sw.replace(/const VERSION = "[^"]*";/, `const VERSION = "${version}";`);
sw = sw.replace(/const PRECACHE = \[[\s\S]*?\n\];/, `const PRECACHE = ${JSON.stringify(["./", ...shipped], null, 2)};`);
await writeFile(swPath, sw);

console.log(`web bundle: ${copied} entries written to www/ (service worker cache ${version}, ${shipped.length} files precached)`);
