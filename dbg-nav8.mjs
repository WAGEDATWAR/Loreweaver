import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
await page.evaluate('document.querySelectorAll(".entry-card")[1].click(); true');
await sleep(150);
console.log("after click:", await page.evaluate('document.querySelector("#entry-title").value'));
await page.evaluate(`(() => {
  const target = document.querySelector("[data-entry-id]");
  target.focus();
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
  return true;
})()`);
await sleep(150);
console.log("after arrow:", await page.evaluate('document.querySelector("#entry-title").value'));
page.close(); await browser.close(); server.close();
