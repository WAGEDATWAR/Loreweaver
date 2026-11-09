import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
const r = await page.evaluate(`(() => {
  const card = document.querySelector("[data-entry-id]");
  const before = document.activeElement?.dataset?.entryId;
  card.focus();
  card.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",bubbles:true,cancelable:true}));
  const after = document.querySelector(".entry-card.is-active")?.dataset?.entryId;
  return { before, after, cards: [...document.querySelectorAll(".entry-card")].map(c=>c.dataset.entryId.slice(-6)) };
})()`);
console.log(JSON.stringify(r));
console.log("errors:", page.errors);
page.close(); await browser.close(); server.close();
