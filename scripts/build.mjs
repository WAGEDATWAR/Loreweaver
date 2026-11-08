import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const script = join(root, "scripts", "build-apk.sh");

const bashCandidates = [
  process.env.BASH_PATH,
  "C:\\Program Files\\Git\\bin\\bash.exe",
  "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
  "/bin/bash",
  "/usr/bin/bash"
].filter(Boolean);

const bash = bashCandidates.find((candidate) => existsSync(candidate));

if (!bash) {
  console.error("build: no bash found. Set BASH_PATH or install Git Bash.");
  process.exit(1);
}

const result = spawnSync(bash, [script, ...process.argv.slice(2)], {
  stdio: "inherit",
  cwd: root
});

process.exit(result.status ?? 1);
