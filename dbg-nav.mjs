import { startStaticServer } from "./scripts/serve.mjs";
import { launchBrowser, Page, sleep } from "./e2e/harness.mjs";
const { server, port } = await startStaticServer({ root: process.cwd() });
const browser = await launchBrowser();
const page = await Page.open(browser.port);
await page.navigate(`http://127.0.0.1:${port}/`);
await sleep(500);
if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) { await page.click("#onboarding-sample"); await page.waitFor('!document.querySelector("#onboarding-dialog")?.open'); }
console.log("cards:", await page.evaluate('document.querySelectorAll(".entry-card").length'));
console.log("titles:", await page.evaluate('[...document.querySelectorAll(".entry-card-title")].map(n=>n.textContent)'));
await page.evaluate('document.querySelector("[data-entry-id]")?.dispatchEvent(new KeyboardEvent("keydown",{key:"ArrowDown",bubbles:true})); true');
await sleep(200);
console.log("after:", await page.evaluate('document.querySelector("#entry-title").value'));
console.log("errors:", page.errors);
page.close(); await browser.close(); server.close();
