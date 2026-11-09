import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
console.log(await page.evaluate(`(() => {
  const card = document.querySelector("[data-entry-id]");
  return { parent: card.parentElement.id || card.parentElement.className, listChildren: document.querySelector("#entry-list").children.length };
})()`));
page.close(); await browser.close(); server.close();
