import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./serve.mjs";
import { launchBrowser, Page, sleep } from "../e2e/harness.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outDir = resolve(root, "test-results", "ui-review");
const WIDTHS = [[1440, 900], [1024, 768], [390, 844], [320, 760]];

const click = (selector) => `document.querySelector(${JSON.stringify(selector)})?.click(); true`;
const hash = (view) => `location.hash = "#/${view}"; true`;

const STATES = [
  { name: "entries", setup: [hash("entries")] },
  { name: "entries-nav-collapsed", setup: [hash("entries"), click("#nav-toggle")], teardown: [click("#nav-toggle")], desktopOnly: true },
  { name: "entries-nav-open", setup: [hash("entries"), click("#nav-toggle")], teardown: [click("#nav-toggle")], mobileOnly: true },
  { name: "library", setup: [hash("library")] },
  { name: "data", setup: [hash("data")] },
  { name: "settings", setup: [hash("settings")] },
  { name: "dialog-export", setup: [hash("entries"), click("#export-btn")], dialog: "#export-dialog" },
  { name: "dialog-overview", setup: [hash("entries"), click("#overview-btn")], dialog: "#overview-dialog" },
  { name: "dialog-simulation", setup: [hash("entries"), click("#simulation-btn")], dialog: "#simulation-dialog" },
  { name: "dialog-issues", setup: [hash("entries"), click("#validation-btn")], dialog: "#validation-dialog" },
  { name: "dialog-history", setup: [hash("entries"), click("#history-btn")], dialog: "#history-dialog" },
  { name: "dialog-template", setup: [hash("entries"), click("#template-btn")], dialog: "#template-dialog" },
  { name: "dialog-card", setup: [hash("library"), click("#new-card-btn")], dialog: "#card-dialog" },
  { name: "dialog-search", setup: [hash("entries"), click("#nav-search-btn")], dialog: "#global-search-dialog" },
  { name: "dialog-replace", setup: [hash("entries"), click("#nav-replace-btn")], dialog: "#replace-dialog" },
  { name: "dialog-shortcuts", setup: [hash("settings"), click("#about-shortcuts-btn")], dialog: "#shortcuts-dialog" },
  { name: "dialog-schema", setup: [hash("settings"), click("#about-schema-btn")], dialog: "#schema-dialog" },
  { name: "dialog-tokens", setup: [hash("settings"), click("#about-token-btn")], dialog: "#token-settings-dialog" },
  { name: "dialog-about", setup: [hash("entries"), click("#about-btn")], dialog: "#about-dialog" },
  { name: "dialog-guide", setup: [hash("settings"), click("#settings-guide-btn")], dialog: "#guide-dialog" },
  { name: "dialog-bookactions", setup: [hash("library"), click("#book-actions-btn")], dialog: "#book-actions-dialog" },
  {
    name: "dialog-palette",
    setup: [hash("entries"), 'document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })); true'],
    dialog: "#command-dialog"
  },
  {
    name: "entries-empty-search",
    setup: [hash("entries"), `(() => { const i = document.querySelector("#entry-search"); i.value = "zzzznomatch"; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`],
    teardown: [`(() => { const i = document.querySelector("#entry-search"); i.value = ""; i.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`]
  },
  { name: "light-entries", setup: ['document.documentElement.dataset.theme = "light"; true', hash("entries")], teardown: ["delete document.documentElement.dataset.theme; true"] },
  { name: "light-library", setup: ['document.documentElement.dataset.theme = "light"; true', hash("library")], teardown: ["delete document.documentElement.dataset.theme; true"] }
];

const METRICS = (rootSelector, minTarget) => `(() => {
  const scope = document.querySelector(${JSON.stringify(rootSelector)}) ?? document.body;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
  };
  const name = (el) => (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === "string" ? "." + el.className.split(" ")[0] : "")) + " \\"" + (el.getAttribute("aria-label") || el.textContent || el.value || "").trim().slice(0, 24) + "\\"";
  const targets = [...scope.querySelectorAll("button, a[href], summary, select, input:not([type=hidden]):not([type=checkbox]):not([type=radio]), [role=option], [role=listitem] [tabindex]")].filter(visible);
  const small = targets.filter((el) => { const r = el.getBoundingClientRect(); return r.width < ${minTarget} || r.height < ${minTarget}; }).map((el) => { const r = el.getBoundingClientRect(); return name(el) + " " + Math.round(r.width) + "x" + Math.round(r.height); });
  const tiny = [...scope.querySelectorAll("*")].filter((el) => visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 11).map((el) => name(el) + " " + getComputedStyle(el).fontSize);
  const truncated = [...scope.querySelectorAll("*")].filter((el) => visible(el) && el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== "visible" && getComputedStyle(el).textOverflow === "ellipsis").map(name);
  const offscreen = targets.filter((el) => { const r = el.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).map(name);
  const headings = [...scope.querySelectorAll("h1, h2, h3, h4")].filter(visible).map((h) => h.tagName.toLowerCase() + ":" + h.textContent.trim().slice(0, 28));
  const dialog = scope.matches && scope.matches("dialog") ? scope.getBoundingClientRect() : null;
  return JSON.stringify({
    viewport: [window.innerWidth, window.innerHeight],
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    targets: targets.length,
    small: small.slice(0, 25),
    smallCount: small.length,
    tiny: [...new Set(tiny)].slice(0, 12),
    truncated: [...new Set(truncated)].slice(0, 10),
    offscreen: [...new Set(offscreen)].slice(0, 10),
    headings,
    dialog: dialog ? { w: Math.round(dialog.width), h: Math.round(dialog.height), clipped: dialog.height > window.innerHeight - 8 } : null
  });
})()`;

async function shoot(page, path) {
  const result = await page.client.send("Page.captureScreenshot", { format: "jpeg", quality: 60, fromSurface: true });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const { server, port } = await startStaticServer({ root });
  const baseUrl = `http://127.0.0.1:${port}/`;
  const browser = await launchBrowser();
  const page = await Page.open(browser.port);
  const report = {};

  try {
    await page.navigate(baseUrl);

    for (const [width, height] of WIDTHS) {
      const mobile = width <= 780;
      const key = `${width}x${height}`;
      report[key] = {};
      await page.setViewport(width, height);
      await page.resetStorage();
      await page.waitFor('document.querySelector("#book-name")?.value');
      await sleep(150);

      if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) {
        await page.click("#onboarding-sample");
        await sleep(200);
      }

      for (const state of STATES) {
        if ((state.desktopOnly && mobile) || (state.mobileOnly && !mobile)) {
          continue;
        }

        for (const step of state.setup) {
          await page.evaluate(step);
          await sleep(60);
        }

        await sleep(420);
        const scope = state.dialog ?? (state.name.includes("library") || state.name === "data" || state.name === "settings" ? `#page-${state.name.replace("light-", "")}` : "body");
        const minTarget = mobile ? 44 : 24;
        const metrics = JSON.parse(await page.evaluate(METRICS(scope, minTarget)));
        report[key][state.name] = metrics;
        await shoot(page, resolve(outDir, `${state.name}-${width}.jpg`));

        if (state.dialog) {
          await page.evaluate(`document.querySelector(${JSON.stringify(state.dialog)})?.close(); true`);
        }

        for (const step of state.teardown ?? []) {
          await page.evaluate(step);
          await sleep(40);
        }
      }
    }
  } finally {
    page.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }

  await writeFile(resolve(outDir, "metrics.json"), JSON.stringify(report, null, 2));
  console.log(`ui-review: ${Object.keys(report).length} viewports captured in test-results/ui-review`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
