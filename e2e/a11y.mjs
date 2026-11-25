import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "../scripts/serve.mjs";
import { launchBrowser, Page } from "./harness.mjs";

async function openPage(page, view) {
  await page.evaluate(`location.hash = "#/${view}"; true`);

  if (view === "entries") {
    await page.waitFor('document.querySelector("#sidebar")?.hidden === false');
    return;
  }

  await page.waitFor(`!document.querySelector("#page-${view}")?.hidden`);
}

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const fixture = resolve(root, "test", "fixtures", "sillytavern-world-info.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function dismissOnboarding(page) {
  await sleep(120);

  if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) {
    await page.click("#onboarding-sample");
    await page.waitFor('!document.querySelector("#onboarding-dialog")?.open');
  }
}

const states = [
  { name: "onboarding dialog", keepOnboarding: true, setup: async () => {} },
  { name: "workspace", setup: async () => {} },
  { name: "light workspace", setup: async (page) => {
    await page.evaluate('document.documentElement.dataset.theme = "light"; true');
    // The theme flip animates colors over 140ms; let it settle before auditing.
    await sleep(250);
  } },
  { name: "command palette", setup: async (page) => {
    await page.click("#command-btn");
    await page.waitFor('document.querySelector("#command-dialog")?.open');
  } },
  { name: "export dialog", setup: async (page) => {
    await page.click("#file-menu-btn");
    await page.click("#export-btn");
    await page.waitFor('document.querySelector("#export-dialog")?.open');
    await page.waitFor('document.querySelector("#storage-usage-backend").textContent !== "—"');
  } },
  { name: "issues page", setup: async (page) => {
    await page.click("#validation-btn");
    await page.waitFor('!document.querySelector("#page-book-issues")?.hidden');
  } },
  { name: "overview page", setup: async (page) => {
    await page.click("#overview-btn");
    await page.waitFor('!document.querySelector("#page-book-overview")?.hidden');
  } },
  { name: "simulation page", setup: async (page) => {
    await page.click("#simulation-btn");
    await page.waitFor('!document.querySelector("#page-book-simulate")?.hidden');
    await page.evaluate(`(() => {
      const input = document.querySelector("#simulation-input");
      input.value = "Mara Voss walks the harbor at dusk.";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    await page.waitFor('document.querySelectorAll(".simulation-item").length >= 1');
  } },
  { name: "history dialog", setup: async (page) => {
    await page.click("#history-btn");
    await page.waitFor('document.querySelector("#history-dialog")?.open');
    await page.waitFor('document.querySelector("#history-count")');
  } },
  { name: "template dialog", setup: async (page) => {
    await page.click("#template-btn");
    await page.waitFor('document.querySelector("#template-dialog")?.open');
  } },
  { name: "about dialog", setup: async (page) => {
    await page.click("#about-btn");
    await page.waitFor('document.querySelector("#about-dialog")?.open');
  } },
  { name: "book actions dialog", setup: async (page) => {
    await page.click("#book-actions-btn");
    await page.waitFor('document.querySelector("#book-actions-dialog")?.open');
  } },
  { name: "settings page controls", setup: async (page) => {
    await openPage(page, "settings");
    await page.waitFor('document.querySelector("#tokenizer-preset")?.options.length === 2');
  } },
  { name: "global search dialog", setup: async (page) => {
    await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }))');
    await page.waitFor('document.querySelector("#global-search-dialog")?.open');
    await page.evaluate(`(() => {
      const input = document.querySelector("#global-search-input");
      input.value = "harbor";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return true;
    })()`);
    await page.waitFor('document.querySelectorAll(".global-search-item").length > 0');
  } },
  { name: "integrity dialog", setup: async (page) => {
    await openPage(page, "data");
    await page.click("#about-integrity-btn");
    await page.waitFor('document.querySelector("#integrity-dialog")?.open');
    await page.waitFor('document.querySelector("#integrity-summary").textContent.length > 0');
  } },
  { name: "guide dialog", setup: async (page) => {
    await page.click("#about-btn");
    await page.waitFor('document.querySelector("#about-dialog")?.open');
    await page.click("#about-guide-btn");
    await page.waitFor('document.querySelector("#guide-dialog")?.open');
  } },
  { name: "shortcuts dialog", setup: async (page) => {
    await openPage(page, "settings");
    await page.click("#about-shortcuts-btn");
    await page.waitFor('document.querySelector("#shortcuts-dialog")?.open');
  } },
  { name: "mobile drawer", setup: async (page) => {
    await page.setViewport(390, 844);
    await sleep(150);
    await page.click("#drawer-toggle");
    await page.waitFor('document.querySelector("#sidebar")?.classList.contains("is-drawer")');
  } },
  { name: "schema dialog", setup: async (page) => {
    await openPage(page, "settings");
    await page.click("#about-schema-btn");
    await page.waitFor('document.querySelector("#schema-dialog")?.open');
    await page.waitFor('document.querySelector("#schema-body")?.childElementCount > 0');
  } },
  { name: "peek dialog", setup: async (page) => {
    await page.click("#peek-btn");
    await page.waitFor('document.querySelector("#peek-dialog")?.open');
  } },
  { name: "bulk tag dialog", setup: async (page) => {
    await page.evaluate(`(() => {
      const card = document.querySelector(".entry-card");
      card.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      return true;
    })()`);
    await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');
    await page.click("#bulk-tag-btn");
    await page.waitFor('document.querySelector("#bulk-tag-dialog")?.open');
  } },
  { name: "card page", setup: async (page) => {
    await openPage(page, "library");
    await page.click("#new-card-btn");
    await page.waitFor('!document.querySelector("#page-card")?.hidden');
  } },
  { name: "mobile card page", setup: async (page) => {
    await page.setViewport(390, 844);
    await openPage(page, "library");
    await page.click("#new-card-btn");
    await page.waitFor('!document.querySelector("#page-card")?.hidden');
  } },
  { name: "book settings page", setup: async (page) => {
    await page.click("#app-nav a[data-view=\"book-settings\"]");
    await page.waitFor('!document.querySelector("#page-book-settings")?.hidden');
  } },
  { name: "review page", setup: async (page) => {
    await page.click("#app-nav a[data-view=\"book-review\"]");
    await page.waitFor('!document.querySelector("#page-review")?.hidden');
    await page.waitFor('document.querySelectorAll("#review-body .review-stat").length >= 4');
  } },
  { name: "file menu", setup: async (page) => {
    await page.click("#file-menu-btn");
    await page.waitFor('!document.querySelector("#file-menu")?.hidden');
  } },
  { name: "card template dialog", setup: async (page) => {
    await openPage(page, "library");
    await page.click("#new-card-template-btn");
    await page.waitFor('document.querySelector("#card-template-dialog")?.open');
  } },
  { name: "card history dialog", setup: async (page) => {
    await openPage(page, "library");
    await page.click("#new-card-template-btn");
    await page.waitFor('document.querySelector("#card-template-dialog")?.open');
    await page.click("#card-template-list [data-template-id=card-character]");
    await page.waitFor('!document.querySelector("#page-card")?.hidden');
    await page.click("#card-history-btn");
    await page.waitFor('document.querySelector("#card-history-dialog")?.open');
    await page.waitFor('!document.querySelector("#card-history-summary").textContent.startsWith("Looking")');
  } },
  { name: "card review with prompt preview", setup: async (page) => {
    await openPage(page, "library");
    await page.click("#new-card-template-btn");
    await page.waitFor('document.querySelector("#card-template-dialog")?.open');
    await page.click("#card-template-list [data-template-id=card-character]");
    await page.waitFor('!document.querySelector("#page-card")?.hidden');
    await page.click('#app-nav a[data-view="card-review"]');
    await page.waitFor('document.querySelectorAll("#preview-output .preview-segment").length >= 1');
  } },
  { name: "library list layout", setup: async (page) => {
    await openPage(page, "library");
    await page.click('#hub-layout [data-layout="list"]');
    await page.waitFor('document.querySelector("#project-list").dataset.layout === "list"');
  } },
  { name: "card extension editors", setup: async (page) => {
    await openPage(page, "library");
    await page.click("#new-card-btn");
    await page.waitFor('!document.querySelector("#page-card")?.hidden');
    await page.click("#card-extras-summary");
    await page.click("#card-ext-regex-add");
    await page.click("#card-ext-asset-add");
    await page.click("#card-ext-note-add");
    await page.waitFor('document.querySelectorAll("#card-extras [data-ext-kind]").length === 3');
  } },
  { name: "app menu", setup: async (page) => {
    await page.click("#app-menu-btn");
    await page.waitFor('!document.querySelector("#app-menu")?.hidden');
  } },
  { name: "replace dialog", setup: async (page) => {
    await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "h", ctrlKey: true, bubbles: true, cancelable: true })); true');
    await page.waitFor('document.querySelector("#replace-dialog")?.open');
  } },
  { name: "session summary banner", setup: async (page) => {
    await page.evaluate(`(() => {
      localStorage.setItem("loreweaver:last-session:v1", JSON.stringify({ text: "1 entry added", at: Date.now() }));
      return true;
    })()`);
    await page.reload();
    await page.waitFor('document.querySelector("#book-name")?.value');
    await page.waitFor('document.querySelector("#session-summary")?.hidden === false');
  } },
  { name: "bulk size dialog", setup: async (page) => {
    await page.evaluate(`(() => {
      const card = document.querySelector(".entry-card");
      card.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
      return true;
    })()`);
    await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');
    await page.click("#bulk-size-btn");
    await page.waitFor('document.querySelector("#bulk-size-dialog")?.open');
  } },
  { name: "confirm dialog", setup: async (page) => {
    await page.click("#delete-entry-btn");
    await page.waitFor('document.querySelector("#confirm-dialog")?.open');
  } },
  { name: "library hub", setup: async (page) => {
    await openPage(page, "library");
  } },
  { name: "mobile library hub", setup: async (page) => {
    await page.setViewport(390, 844);
    await openPage(page, "library");
  } },
  { name: "data page", setup: async (page) => {
    await openPage(page, "data");
    await page.waitFor('document.querySelector("#storage-usage-backend")?.textContent !== "\u2014"');
  } },
  { name: "settings page", setup: async (page) => {
    await openPage(page, "settings");
  } },
  { name: "light library hub", setup: async (page) => {
    await page.evaluate('document.documentElement.dataset.theme = "light"; true');
    await openPage(page, "library");
  } },
  { name: "collapsed editor menu", setup: async (page) => {
    await page.click("#nav-collapse");
    await page.waitFor('document.querySelector(".shell")?.dataset.nav === "collapsed"');
    await sleep(400);
  } },
  { name: "mobile editor menu", setup: async (page) => {
    await page.setViewport(390, 844);
    await sleep(150);
    await page.click("#nav-open-btn");
    await page.waitFor('document.querySelector(".shell")?.classList.contains("is-nav-open")');
    await sleep(400);
  } },
  { name: "import diff dialog", setup: async (page) => {
    await page.setFileInput("#import-input", [fixture]);
    await page.waitFor('document.querySelector("#diff-dialog")?.open');
  } }
];

const AXE_RUN = `(async () => {
  const results = await window.axe.run(document);
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(" "))
  }));
})()`;

async function loadAxe() {
  try {
    return await readFile(resolve(root, "node_modules", "axe-core", "axe.min.js"), "utf8");
  } catch {
    return null;
  }
}

async function main() {
  const axeSource = await loadAxe();

  if (!axeSource) {
    console.error("axe-core is not installed. Run: npm install");
    process.exitCode = 1;
    return;
  }

  const { server, port } = await startStaticServer({ root });
  const baseUrl = `http://127.0.0.1:${port}/`;
  let browser = null;
  let page = null;
  const found = new Map();
  const blocked = { critical: 0, serious: 0, moderate: 0, minor: 0 };

  try {
    browser = await launchBrowser();
    page = await Page.open(browser.port);
    await page.navigate(baseUrl);
    await page.setViewport(1440, 900);
    await page.client.send("Page.addScriptToEvaluateOnNewDocument", { source: axeSource });

    for (const state of states) {
      page.clearErrors();
      await page.resetStorage();
      await page.waitFor('document.querySelector("#book-name")?.value');

      if (!state.keepOnboarding) {
        await dismissOnboarding(page);
      }

      await state.setup(page);
      // A toast that is still fading in has a blended colour; audit it once it has settled.
      await page.waitFor('[...document.querySelectorAll(".toast")].every((node) => getComputedStyle(node).opacity === "1")');

      const violations = await page.evaluate(AXE_RUN);
      let count = 0;

      for (const violation of violations) {
        for (const target of violation.nodes) {
          count += 1;
          const key = `${violation.id}|${target}`;

          if (!found.has(key)) {
            found.set(key, {
              id: violation.id,
              impact: violation.impact ?? "minor",
              help: violation.help,
              target,
              states: new Set()
            });
          }

          found.get(key).states.add(state.name);
        }
      }

      console.log(`${count === 0 ? "ok" : "!!"} - ${state.name}: ${count} violation${count === 1 ? "" : "s"}`);
    }
  } finally {
    page?.close();
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const unique = [...found.values()].sort((left, right) => (
    ["critical", "serious", "moderate", "minor"].indexOf(left.impact)
    - ["critical", "serious", "moderate", "minor"].indexOf(right.impact)
  ));

  for (const violation of unique) {
    blocked[violation.impact] += 1;
  }

  if (unique.length) {
    console.log("\nUnique violations:");
    for (const violation of unique) {
      console.log(`- [${violation.impact}] ${violation.id} — ${violation.help}`);
      console.log(`    ${violation.target}  (${[...violation.states].join(", ")})`);
    }
  }

  console.log(`\nUnique total: ${unique.length} (critical ${blocked.critical}, serious ${blocked.serious}, moderate ${blocked.moderate}, minor ${blocked.minor}).`);

  if (blocked.critical || blocked.serious) {
    console.error("Accessibility audit failed: fix critical and serious violations.");
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
