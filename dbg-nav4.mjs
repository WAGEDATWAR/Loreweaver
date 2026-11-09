import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
const step1 = await page.evaluate(`(() => {
  const target = document.querySelector("[data-entry-id]");
  target.focus();
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  return {
    activeNow: document.querySelector(".entry-card.is-active")?.dataset?.entryId?.slice(-6) ?? "none",
    focusNow: document.activeElement?.dataset?.entryId?.slice(-6) ?? document.activeElement?.className
  };
})()`);
console.log("step1", JSON.stringify(step1));
await sleep(400);
console.log("after:", await page.evaluate('document.querySelector("#entry-title").value'));
page.close(); await browser.close(); server.close();
