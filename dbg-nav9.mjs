import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
const r = await page.evaluate(`(() => {
  const target = document.querySelector("[data-entry-id]");
  target.focus();
  const ev = new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true });
  target.dispatchEvent(ev);
  return {
    defaultPrevented: ev.defaultPrevented,
    focusedIsCard: Boolean(document.activeElement.closest("[data-entry-id]"))
  };
})()`);
console.log(JSON.stringify(r));
page.close(); await browser.close(); server.close();
