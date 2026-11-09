import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
const r = await page.evaluate(`(() => {
  window.__probe = [];
  const list = document.querySelector("#entry-list");
  list.addEventListener("keydown", (e) => window.__probe.push(["list", e.key, e.target.closest("[data-entry-id]") ? "card" : "other"]), { once: true, capture: false });
  const doc = document;
  doc.addEventListener("keydown", (e) => window.__probe.push(["doc", e.key]), { once: true, capture: true });
  const target = document.querySelector("[data-entry-id]");
  target.focus();
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  return window.__probe;
})()`);
console.log(JSON.stringify(r));
page.close(); await browser.close(); server.close();
