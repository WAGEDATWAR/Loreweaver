import { performance } from "node:perf_hooks";
import { buildBookOverview } from "../src/overview.js";
import { createBook, createEntry } from "../src/schema.js";
import { analyzeEntryQuery } from "../src/search.js";
import { sortEntries } from "../src/ui/sidebar.js";
import { computeWindow } from "../src/windowing.js";

const BUDGET_MS = 250;
const LONG_BUDGET_MS = 500;

const profiles = [
  {
    label: "row scale",
    entries: Number(process.argv[2]) || 2000,
    charsPerEntry: 190,
    budget: BUDGET_MS
  },
  {
    label: "content size",
    entries: 250,
    charsPerEntry: 2000,
    budget: LONG_BUDGET_MS
  },
  {
    label: "wide scale",
    entries: 5000,
    charsPerEntry: 190,
    budget: LONG_BUDGET_MS
  }
];

function buildBook(count, charsPerEntry) {
  const filler = "lorem ipsum dolor sit amet ".repeat(Math.ceil(charsPerEntry / 27) + 1);
  const entries = [];

  for (let index = 0; index < count; index += 1) {
    entries.push(createEntry({
      id: `entry_bench_${index}`,
      title: `Benchmark entry ${index}`,
      keys: [`key ${index}`, "shared key"],
      content: `${index}: ${filler}`.slice(0, charsPerEntry),
      order: index
    }));
  }

  return createBook({ id: "book_bench", name: "Benchmark", entries });
}

function timed(run) {
  const started = performance.now();
  const value = run();
  return { elapsed: performance.now() - started, value };
}

let failed = false;

for (const profile of profiles) {
  const book = buildBook(profile.entries, profile.charsPerEntry);
  const totalChars = book.entries.reduce((sum, entry) => sum + entry.content.length, 0);
  const filter = timed(() => book.entries.filter((entry) => analyzeEntryQuery(entry, "key").matched));
  const sort = timed(() => sortEntries(filter.value, "order"));
  const overview = timed(() => buildBookOverview(book));
  const window = timed(() => computeWindow({
    total: book.entries.length,
    scrollTop: profile.entries * 28,
    viewport: 600
  }));
  const total = filter.elapsed + sort.elapsed + overview.elapsed + window.elapsed;
  const rendered = window.value.end - window.value.start;

  console.log(
    `${profile.label}: ${profile.entries} entries / ${totalChars.toLocaleString()} chars `
    + `- filter ${filter.elapsed.toFixed(1)}ms, sort ${sort.elapsed.toFixed(1)}ms, `
    + `overview ${overview.elapsed.toFixed(1)}ms, window ${window.elapsed.toFixed(1)}ms `
    + `= ${total.toFixed(1)}ms (budget ${profile.budget}ms), ${rendered} rows rendered`
  );

  if (total > profile.budget) {
    console.error(`  ${profile.label} exceeded the ${profile.budget}ms budget`);
    failed = true;
  }

  if (rendered >= profile.entries) {
    console.error(`  ${profile.label} rendered every row`);
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
}
