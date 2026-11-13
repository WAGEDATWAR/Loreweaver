import { cp, mkdir, rm, stat } from "node:fs/promises";
import { resolve } from "node:path";
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
await (import("node:fs/promises")).then((fs) => fs.writeFile(resolve(out, ".nojekyll"), ""));

let copied = 0;

for (const entry of entries) {
  const source = resolve(root, entry);

  if (!await exists(source)) {
    continue;
  }

  await cp(source, resolve(out, entry), { recursive: true });
  copied += 1;
}

console.log(`web bundle: ${copied} entries written to www/`);
