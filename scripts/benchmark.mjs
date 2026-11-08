import { performance } from "node:perf_hooks";
import { buildBookOverview } from "../src/overview.js";
import { createBook, createEntry } from "../src/schema.js";
import { analyzeEntryQuery } from "../src/search.js";
import { sortEntries } from "../src/ui/sidebar.js";
import { computeWindow } from "../src/windowing.js";

const ENTRY_COUNT = Number(process.argv[2]) || 2000;
const BUDGET_MS = Number(process.argv[3]) || 250;

function buildBook(count) {
  const entries = [];

  for (let index = 0; index < count; index += 1) {
    entries.push(createEntry({
      id: `entry_bench_${index}`,
      title: `Benchmark entry ${index}`,
      keys: [`key ${index}`, `shared key`],
      content: `Entry ${index} content. `.repeat(12),
      order: index
    }));
  }

  return createBook({ id: "book_bench", name: "Benchmark", entries });
}

function measure(label, run) {
  const started = performance.now();
  const value = run();
  const elapsed = performance.now() - started;
  return { label, elapsed, value };
}

const book = buildBook(ENTRY_COUNT);
const filter = measure("filter 2,000 entries", () => book.entries.filter((entry) => analyzeEntryQuery(entry, "key").matched));
const sort = measure("sort 2,000 entries", () => sortEntries(filter.value, "order"));
const overview = measure("overview stats", () => buildBookOverview(book));
const window = measure("window 2,000 rows", () => computeWindow({ total: 2000, scrollTop: 2800, viewport: 600 }));
const total = filter.elapsed + sort.elapsed + overview.elapsed + window.elapsed;

for (const result of [filter, sort, overview, window]) {
  console.log(`${result.label}: ${result.elapsed.toFixed(1)}ms`);
}

console.log(`total: ${total.toFixed(1)}ms (budget ${BUDGET_MS}ms)`);
console.log(`rows rendered by the window: ${window.value.end - window.value.start} of 2,000`);

if (total > BUDGET_MS) {
  console.error(`benchmark exceeded the ${BUDGET_MS}ms budget`);
  process.exitCode = 1;
}

if (window.value.end - window.value.start >= 2000) {
  console.error("the window rendered every row");
  process.exitCode = 1;
}
