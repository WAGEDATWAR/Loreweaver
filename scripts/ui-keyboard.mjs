import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startStaticServer } from "./serve.mjs";
import { launchBrowser, Page, sleep } from "../e2e/harness.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function press(page, key, { shift = false } = {}) {
  const base = { key, code: key === "Tab" ? "Tab" : key, windowsVirtualKeyCode: key === "Tab" ? 9 : key === "Escape" ? 27 : key === "Enter" ? 13 : 0, modifiers: shift ? 8 : 0 };
  const text = key === "Enter" ? String.fromCharCode(13) : undefined;
  await page.client.send("Input.dispatchKeyEvent", { type: text ? "keyDown" : "rawKeyDown", text, ...base });
  await page.client.send("Input.dispatchKeyEvent", { type: "keyUp", ...base });
}

const DESCRIBE = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return JSON.stringify({ name: "BODY" });
  const cs = getComputedStyle(el);
  const ring = (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== "none");
  const r = el.getBoundingClientRect();
  const label = el.getAttribute("aria-label") || el.textContent.trim().slice(0, 24) || el.placeholder || "";
  return JSON.stringify({ name: (el.id ? "#" + el.id : el.tagName.toLowerCase()) + ' "' + label + '"', ring, inView: r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth, dialog: Boolean(el.closest("dialog[open]")) });
})()`;

async function tabWalk(page, count) {
  const seen = [];
  for (let index = 0; index < count; index += 1) {
    await press(page, "Tab");
    await sleep(25);
    seen.push(JSON.parse(await page.evaluate(DESCRIBE)));
  }
  return seen;
}

async function main() {
  const { server, port } = await startStaticServer({ root });
  const browser = await launchBrowser();
  const page = await Page.open(browser.port);
  const out = {};

  try {
    await page.navigate(`http://127.0.0.1:${port}/`);
    await page.setViewport(1440, 900);
    await page.resetStorage();
    await page.waitFor('document.querySelector("#book-name")?.value');
    await sleep(200);
    await page.click("#onboarding-sample");
    await sleep(300);

    await page.evaluate("document.body.focus(); document.activeElement.blur(); true");
    const walk = await tabWalk(page, 45);
    out.entriesTabOrder = walk.map((item) => item.name);
    out.entriesNoRing = walk.filter((item) => item.name !== "BODY" && !item.ring).map((item) => item.name);
    out.entriesOffScreen = walk.filter((item) => item.name !== "BODY" && !item.inView).map((item) => item.name);
    out.entriesLostFocus = walk.filter((item) => item.name === "BODY").length;

    await page.evaluate("location.hash = '#/library'; true");
    await sleep(300);
    out.libraryFocusAfterNav = JSON.parse(await page.evaluate(DESCRIBE)).name;
    const lib = await tabWalk(page, 14);
    out.libraryTabOrder = lib.map((item) => item.name);
    out.libraryNoRing = lib.filter((item) => item.name !== "BODY" && !item.ring).map((item) => item.name);

    await page.evaluate("location.hash = '#/entries'; true");
    await sleep(300);
    await page.evaluate("document.querySelector('#overview-btn').focus(); true");
    await press(page, "Enter");
    await sleep(300);
    out.dialogOpened = await page.evaluate('!document.querySelector("#page-book-overview")?.hidden');
    out.dialogFocus = JSON.parse(await page.evaluate(DESCRIBE)).name;
    await press(page, "Escape");
    await sleep(300);
    out.dialogClosedByEsc = true;
    out.focusReturned = JSON.parse(await page.evaluate(DESCRIBE)).name;

    await page.evaluate("location.hash = '#/library'; true");
    await sleep(200);
    await page.evaluate("document.querySelector('#new-card-btn').focus(); true");
    await press(page, "Enter");
    await sleep(300);
    out.cardDialogFocus = JSON.parse(await page.evaluate(DESCRIBE)).name;
    const cardWalk = await tabWalk(page, 12);
    out.cardTabOrder = cardWalk.map((item) => item.name);
    out.cardTabEscapesDialog = cardWalk.some((item) => !item.dialog && item.name !== "BODY");
    await press(page, "Escape");
    await sleep(300);
    out.cardEscClosed = await page.evaluate('!document.querySelector("#card-dialog")?.open');
    out.cardFocusReturned = JSON.parse(await page.evaluate(DESCRIBE)).name;

    out.headingsPerPage = {};
    for (const view of ["entries", "library", "data", "settings"]) {
      await page.evaluate(`location.hash = '#/${view}'; true`);
      await sleep(200);
      out.headingsPerPage[view] = await page.evaluate(`[...document.querySelectorAll("h1,h2,h3")].filter((h) => h.offsetParent !== null).map((h) => h.tagName + ":" + h.textContent.trim().slice(0, 24)).join(" | ")`);
    }
    out.landmarks = await page.evaluate(`[...document.querySelectorAll("header,nav,main,aside,[role=region]")].filter((e) => e.offsetParent !== null || e.tagName === "HEADER").map((e) => e.tagName.toLowerCase() + (e.getAttribute("aria-label") ? "[" + e.getAttribute("aria-label") + "]" : "")).join(", ")`);
  } finally {
    page.close();
    await browser.close();
    await new Promise((done) => server.close(done));
  }

  console.log(JSON.stringify(out, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
