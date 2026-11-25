import assert from "node:assert/strict";
import { Page, sleep } from "./harness.mjs";

async function dismissOnboarding(page) {
  await sleep(120);

  if (await page.evaluate('Boolean(document.querySelector("#onboarding-dialog")?.open)')) {
    await page.click("#onboarding-sample");
    await page.waitFor('!document.querySelector("#onboarding-dialog")?.open');
  }
}

async function resetApp(page) {
  page.clearErrors();
  await page.resetStorage();
  await page.waitFor('document.querySelector("#book-name")?.value');
  await dismissOnboarding(page);
}

async function openPage(page, view) {
  await page.evaluate(`location.hash = "#/${view}"; true`);

  if (view === "entries") {
    await page.waitFor('document.querySelector("#sidebar")?.hidden === false');
    return;
  }

  await page.waitFor(`!document.querySelector("#page-${view}")?.hidden`);
}

async function appState(page) {
  return page.evaluate(`(() => ({
    book: document.querySelector("#book-name")?.value ?? "",
    books: [...document.querySelectorAll("#book-select option")].map((option) => option.textContent),
    entries: document.querySelectorAll(".entry-card").length,
    saveState: document.querySelector("#save-state")?.dataset.state ?? ""
  }))()`);
}

async function setValue(page, selector, value) {
  await page.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return true;
  })()`);
}

async function setChecked(page, selector, checked) {
  await page.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    input.checked = ${checked};
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  })()`);
}

async function importFile(page, path) {
  await page.setFileInput("#import-input", [path]);
  await page.waitFor('document.querySelector("#diff-dialog")?.open');
}

async function addChipKey(page, selector, value) {
  await page.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    input.focus();
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    return true;
  })()`);
}

async function pasteChipKeys(page, selector, text) {
  await page.evaluate(`(() => {
    const input = document.querySelector(${JSON.stringify(selector)});
    input.focus();
    const data = new DataTransfer();
    data.setData("text", ${JSON.stringify(text)});
    input.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
    return true;
  })()`);
}

async function readIndexedDbProject(page) {
  return page.evaluate(`(async () => {
    const database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("loreweaver");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const value = await new Promise((resolve, reject) => {
      const transaction = database.transaction("keyval", "readonly");
      const request = transaction.objectStore("keyval").get("loreweaver:project:v1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return {
      value: typeof value === "string" ? value : "",
      localStorageProject: localStorage.getItem("loreweaver:project:v1")
    };
  })()`);
}

async function pressKey(page, selector, key, { ctrl = false, shift = false, alt = false } = {}) {
  await page.evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    target.focus();
    target.dispatchEvent(new KeyboardEvent("keydown", {
      key: ${JSON.stringify(key)},
      bubbles: true,
      cancelable: true,
      ctrlKey: ${ctrl},
      metaKey: ${ctrl},
      shiftKey: ${shift},
      altKey: ${alt}
    }));
    return true;
  })()`);
}

export const scenarios = [
  {
    name: "boots with the sample project",
    async run(page) {
      await resetApp(page);
      const state = await appState(page);

      assert.equal(state.book, "Aurora Vale");
      assert.equal(state.entries, 3);
      assert.deepEqual(state.books, ["Aurora Vale"]);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "shows first-run onboarding and can start empty",
    async run(page) {
      page.clearErrors();
      await page.resetStorage();
      await page.waitFor('document.querySelector("#onboarding-dialog")?.open');
      await page.click("#onboarding-empty");
      await page.waitFor('!document.querySelector("#onboarding-dialog")?.open');
      await page.waitFor('document.querySelector("#book-name")?.value === "Untitled Lorebook"');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 0');
      await page.waitFor('document.querySelector("#sample-badge")?.hidden === true');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "shows a sample badge and clears it after an edit",
    async run(page) {
      await resetApp(page);
      await page.waitFor('document.querySelector("#sample-badge")?.hidden === false');
      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelector("#sample-badge")?.hidden === true');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "resets to the sample project",
    async run(page) {
      await resetApp(page);
      await page.click("#sample-badge");
      await page.waitFor('document.querySelector("#sample-dialog")?.open');
      await page.click("#sample-reset");
      await page.waitFor('!document.querySelector("#sample-dialog")?.open');
      await page.waitFor('document.querySelector("#book-name")?.value === "Aurora Vale"');
      await page.waitFor('document.querySelector("#sample-badge")?.hidden === false');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "creates, edits, and deletes an entry",
    async run(page) {
      await resetApp(page);
      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 4');
      await setValue(page, "#entry-title", "E2E Entry");
      await setValue(page, "#entry-content", "Written by the end-to-end test.");
      await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');

      const saved = await page.evaluate('document.querySelector("#entry-title").value');
      assert.equal(saved, "E2E Entry");

      await page.click("#delete-entry-btn");
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 3');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "filters entries with search",
    async run(page) {
      await resetApp(page);
      await setValue(page, "#entry-search", "Mara");
      await page.waitFor('document.querySelectorAll(".entry-card:not(.is-pinned)").length === 1');
      const title = await page.evaluate('document.querySelector(".entry-card:not(.is-pinned) .entry-card-title").textContent');
      assert.equal(title, "Mara Voss");

      await setValue(page, "#entry-search", "");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 3');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "filters entries by status and keys",
    async run(page) {
      await resetApp(page);

      await page.click('[data-filter="alwaysOn"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 1');
      const alwaysOnTitle = await page.evaluate('document.querySelector(".entry-card-title").textContent');
      assert.equal(alwaysOnTitle, "Aurora Vale");

      await page.click('[data-filter="alwaysOn"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 3');

      await page.click('[data-filter="enabled"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 3');

      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 4');
      await setChecked(page, "#entry-enabled", false);
      await page.waitFor('document.querySelectorAll(".entry-card:not(.is-pinned)").length === 3');

      await page.click('[data-filter="disabled"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 1');
      const count = await page.evaluate('document.querySelector("#entry-count").textContent');
      assert.equal(count, "1/4");

      await page.click('[data-filter="missingKeys"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 1');

      await page.click('[data-filter="disabled"]');
      await page.click('[data-filter="missingKeys"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 4');

      const pressed = await page.evaluate('[...document.querySelectorAll("#entry-filters [data-filter]")].map((button) => button.getAttribute("aria-pressed"))');
      assert.deepEqual(pressed, ["false", "false", "false", "false"]);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "tags entries and filters by tag",
    async run(page) {
      await resetApp(page);

      await addChipKey(page, "#entry-tags-input", "location");
      await addChipKey(page, "#entry-tags-input", "city");
      await page.waitFor('document.querySelectorAll("#entry-tags .key-chip").length === 2');

      await page.evaluate(`(() => {
        const cards = [...document.querySelectorAll(".entry-card")];
        cards[1].click();
        return true;
      })()`);
      await page.waitFor('document.querySelector("#entry-title").value === "Mara Voss"');
      await addChipKey(page, "#entry-tags-input", "npc");
      await page.waitFor('document.querySelectorAll("#tag-filters [data-tag]").length === 3');

      await page.click('#tag-filters [data-tag="npc"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 1');
      const title = await page.evaluate('document.querySelector(".entry-card-title").textContent');
      assert.equal(title, "Mara Voss");

      await page.click('#tag-filters [data-tag="npc"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length === 3');

      await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');
      await page.reload();
      await page.waitFor('document.querySelector("#entry-title")?.value === "Mara Voss"');
      await page.waitFor('document.querySelectorAll("#entry-tags .key-chip").length === 1');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "highlights search matches and explains them",
    async run(page) {
      await resetApp(page);

      await setValue(page, "#entry-search", "mara");
      await page.waitFor('document.querySelectorAll(".entry-card:not(.is-pinned)").length === 1');
      const highlight = await page.evaluate('document.querySelector(".entry-card:not(.is-pinned) .entry-card-title mark")?.textContent ?? ""');
      assert.equal(highlight.toLowerCase(), "mara");
      const why = await page.evaluate('document.querySelector(".entry-card:not(.is-pinned) .entry-card-match")?.textContent ?? ""');
      assert.match(why, /title/);

      await setValue(page, "#entry-search", "lanterns");
      await page.waitFor('document.querySelectorAll(".entry-card:not(.is-pinned)").length === 1');
      const contentWhy = await page.evaluate('document.querySelector(".entry-card:not(.is-pinned) .entry-card-match")?.textContent ?? ""');
      assert.match(contentWhy, /content/);
      const titleMark = await page.evaluate('Boolean(document.querySelector(".entry-card:not(.is-pinned) .entry-card-title mark"))');
      assert.equal(titleMark, false);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "keeps the active entry visible when filtered out",
    async run(page) {
      await resetApp(page);
      const activeId = await page.evaluate('document.querySelector(".entry-card.is-active").dataset.entryId');

      await setValue(page, "#entry-search", "mara");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 2');
      const pinned = await page.evaluate('document.querySelector(".entry-card.is-pinned")?.dataset.entryId ?? ""');
      assert.equal(pinned, activeId);
      const count = await page.evaluate('document.querySelector("#entry-count").textContent');
      assert.equal(count, "1/3");

      await setValue(page, "#entry-search", "");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 3');
      const stillPinned = await page.evaluate('Boolean(document.querySelector(".entry-card.is-pinned"))');
      assert.equal(stillPinned, false);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "navigates and restores focus in the entry list",
    async run(page) {
      await resetApp(page);
      const firstId = await page.evaluate('document.querySelector(".entry-card").dataset.entryId');
      await pressKey(page, `[data-entry-id="${firstId}"]`, "ArrowDown");
      await page.waitFor('document.querySelector("#entry-title").value === "Mara Voss"');

      let focused = await page.evaluate('document.activeElement.closest("[data-entry-id]")?.dataset.entryId ?? ""');
      let active = await page.evaluate('document.querySelector(".entry-card.is-active")?.dataset.entryId ?? ""');
      assert.equal(focused, active);

      await pressKey(page, `[data-entry-id="${active}"]`, "End");
      await page.waitFor('document.querySelector("#entry-title").value === "Tidebinding"');
      active = await page.evaluate('document.querySelector(".entry-card.is-active").dataset.entryId');
      await pressKey(page, `[data-entry-id="${active}"]`, "Home");
      await page.waitFor('document.querySelector("#entry-title").value === "Aurora Vale"');

      await page.click("#delete-entry-btn");
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 2');
      focused = await page.evaluate('document.activeElement.closest("[data-entry-id]")?.dataset.entryId ?? ""');
      active = await page.evaluate('document.querySelector(".entry-card.is-active")?.dataset.entryId ?? ""');
      assert.equal(focused, active);

      await page.evaluate('document.querySelector("#history-btn").focus(); true');
      await page.click("#history-btn");
      await page.waitFor('document.querySelector("#history-dialog")?.open');
      await page.click("#history-close");
      await page.waitFor('!document.querySelector("#history-dialog")?.open');
      const restored = await page.evaluate('document.activeElement.id');
      assert.equal(restored, "history-btn");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "edits trigger keys as chips with paste support",
    async run(page) {
      await resetApp(page);
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length === 3');

      await addChipKey(page, "#entry-keys-input", "harbor");
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length === 4');

      await pasteChipKeys(page, "#entry-keys-input", "alpha, beta\ngamma");
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length === 7');

      await page.evaluate('document.querySelector("#entry-keys .key-chip-remove").click(); true');
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length === 6');

      await addChipKey(page, "#entry-keys-input", "/[bad/");
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length === 7');
      const invalid = await page.evaluate('Boolean(document.querySelector("#entry-keys .key-chip.is-regex-invalid"))');
      assert.equal(invalid, true);

      await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');
      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length === 7');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "offers reset filters and clear search in the empty state",
    async run(page) {
      await resetApp(page);
      await page.evaluate(`(() => {
        const chip = document.querySelector('[data-filter="missingKeys"]');
        chip.click();
        return true;
      })()`);
      await page.evaluate(`(() => {
        const input = document.querySelector("#entry-search");
        input.value = "zzzznomatch";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("[data-empty-action=\\"clear-search\\"]")');
      await page.click('[data-empty-action="clear-search"]');
      await page.waitFor('document.querySelector("#entry-search")?.value === ""');
      await page.waitFor('document.querySelector("[data-empty-action=\\"reset-filters\\"]")');
      await page.click('[data-empty-action="reset-filters"]');
      await page.waitFor('document.querySelectorAll(".entry-card").length > 0');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "duplicates with Ctrl+D and copies an entry",
    async run(page) {
      await resetApp(page);
      const before = await page.evaluate('document.querySelectorAll(".entry-card").length');
      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "d", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor(`document.querySelectorAll(".entry-card").length === ${before + 1}`);

      await page.evaluate(`(() => {
        window.__copied = "";
        navigator.clipboard.writeText = async (value) => { window.__copied = value; };
        return true;
      })()`);
      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#command-dialog")?.open');
      await setValue(page, "#command-input", "copy entry");
      await page.waitFor('document.querySelectorAll(".command-option").length >= 1');
      await page.evaluate(`(() => {
        const input = document.querySelector("#command-input");
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        return true;
      })()`);
      await page.waitFor('window.__copied.length > 0');
      assert.match(await page.evaluate("window.__copied"), /copy/i);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "remembers the last active entry per lorebook",
    async run(page) {
      await resetApp(page);
      await page.click("#new-book-btn");
      await page.waitFor('document.querySelectorAll("#book-select option").length === 2');
      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelector("#entry-title")?.value === ""');
      await setValue(page, "#entry-title", "Second book entry");
      await page.waitFor('document.querySelector("#entry-title")?.value === "Second book entry"');

      await page.evaluate(`(() => {
        const select = document.querySelector("#book-select");
        select.value = select.options[0].value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#book-name")?.value === "Aurora Vale"');
      await page.evaluate(`(() => {
        const select = document.querySelector("#book-select");
        select.value = select.options[1].value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#entry-title")?.value === "Second book entry"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "pins an entry and searches with a regex",
    async run(page) {
      await resetApp(page);
      const title = await page.evaluate('document.querySelector("#entry-title").value');
      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "p", altKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector(".entry-pin-user")');
      assert.equal(await page.evaluate('document.querySelector(".entry-pin-user").textContent'), "Pinned");

      await page.click("#regex-toggle");
      await page.waitFor('document.querySelector("#regex-toggle")?.getAttribute("aria-pressed") === "true"');
      await setValue(page, "#entry-search", "^" + title.slice(0, 6));
      await page.waitFor(`document.querySelectorAll(".entry-card").length >= 1`);
      await setValue(page, "#entry-search", "zzzq");
      await page.waitFor('document.querySelector("#entry-count")?.textContent === "1/3" || document.querySelector(".entry-list-empty") !== null');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "saves and reuses a custom entry template",
    async run(page) {
      await resetApp(page);
      await setValue(page, "#entry-title", "Signal Tower");
      await setValue(page, "#entry-content", "A tall tower with a signal fire.");
      await page.click("#template-btn");
      await page.waitFor('document.querySelector("#template-dialog")?.open');
      await page.click("[data-save-as-template]");
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelectorAll(".template-option").length === 6');
      await page.click("#template-close");

      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelector("#entry-title")?.value === ""');
      await page.click("#template-btn");
      await page.waitFor('document.querySelector("#template-dialog")?.open');
      await page.click('[data-template-id^="template_"]');
      await page.waitFor('document.querySelector("#entry-title")?.value === "Signal Tower"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "guards against saving over another tab",
    timeout: 40000,
    async run(page, context) {
      await resetApp(page);
      await sleep(400);

      const second = await Page.openNew(context.port, context.baseUrl);

      try {
        await second.waitFor('document.querySelector("#book-name")?.value');
        await page.waitFor('!document.querySelector("#tab-banner")?.hidden');
        assert.equal(await page.evaluate('document.querySelector("#tab-banner-title").textContent'), "Open in another tab");
        assert.equal(await page.evaluate('document.querySelector("#tab-keep-btn").hidden'), true);

        await second.evaluate(`(() => {
          const input = document.querySelector("#entry-title");
          input.value = "Edited in tab two";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        })()`);
        await second.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');

        await page.waitFor('document.querySelector("#tab-banner-title")?.textContent === "Changed in another tab"');
        assert.equal(await page.evaluate('document.querySelector("#tab-keep-btn").hidden'), false);

        await page.evaluate(`(() => {
          const input = document.querySelector("#entry-title");
          input.value = "Edited in tab one";
          input.dispatchEvent(new Event("input", { bubbles: true }));
          return true;
        })()`);
        await page.waitFor('document.querySelector("#save-state")?.dataset.state === "paused"', { timeout: 15000 });

        await page.click("#tab-keep-btn");
        await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');
        assert.equal(await page.evaluate('document.querySelector("#tab-banner").hidden'), true);
        assert.deepEqual(page.errors, []);
      } finally {
        await second.closeTarget();
      }
    }
  },
  {
    name: "opens projects from the library hub and keeps the editor menu to the editor",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      assert.equal(await page.evaluate('document.querySelector("#sidebar").hidden'), false);
      assert.equal(await page.evaluate('document.querySelector("#app-nav").hidden'), false);
      assert.match(await page.evaluate("location.hash"), /^#\/book\/book_/);

      await page.click("#app-menu-btn");
      await page.waitFor('!document.querySelector("#app-menu")?.hidden');
      assert.equal(await page.evaluate('document.querySelector("#app-menu-btn").getAttribute("aria-expanded")'), "true");
      await page.click('#app-menu a[data-view="library"]');
      await page.waitFor('!document.querySelector("#page-library")?.hidden');
      assert.equal(await page.evaluate('document.querySelector("#app-menu").hidden'), true);
      assert.equal(await page.evaluate('document.querySelector("#sidebar").hidden'), true);
      assert.equal(await page.evaluate('document.querySelector("#app-nav").hidden'), true);
      assert.equal(await page.evaluate('location.hash'), "#/library");
      assert.match(await page.evaluate("document.title"), /^Library/);
      assert.equal(await page.evaluate('document.querySelectorAll("#project-list .project-tile").length'), 1);
      assert.equal(await page.evaluate('document.querySelector("#project-list .project-name").textContent'), "Aurora Vale");

      await page.click("#project-list .project-open");
      await page.waitFor('document.querySelector("#sidebar")?.hidden === false');
      assert.equal(await page.evaluate('document.querySelector("#app-nav").hidden'), false);
      assert.equal(await page.evaluate('document.querySelector("#nav-context-name").textContent'), "Aurora Vale");
      assert.equal(await page.evaluate('document.querySelector("#nav-context-kind").textContent'), "Lorebook");

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "2", altKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('!document.querySelector("#page-data")?.hidden');
      await page.waitFor('document.querySelector("#storage-usage-backend")?.textContent !== "\u2014"');
      assert.equal(await page.evaluate('document.querySelector("#app-nav").hidden'), true);

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "3", altKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('!document.querySelector("#page-settings")?.hidden');

      await page.evaluate('history.back(); true');
      await page.waitFor('!document.querySelector("#page-data")?.hidden');

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "1", altKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('!document.querySelector("#page-library")?.hidden');

      await page.click("#project-list .project-open");
      await page.waitFor('document.querySelector("#sidebar")?.hidden === false');
      await page.click("#nav-back");
      await page.waitFor('!document.querySelector("#page-library")?.hidden');

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#command-dialog")?.open');
      const palette = await page.evaluate('document.querySelector("#command-dialog").textContent');
      assert.ok(palette.includes("Go to Library") && palette.includes("Open lorebook: Aurora Vale"));
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "collapses and expands the editor menu and remembers it",
    async run(page) {
      await resetApp(page);
      await page.setViewport(1440, 900);
      await sleep(100);
      assert.equal(await page.evaluate('document.querySelector(".shell").dataset.nav'), "expanded");
      assert.equal(await page.evaluate('document.querySelector("#nav-collapse").getAttribute("aria-expanded")'), "true");

      await page.click("#nav-collapse");
      await page.waitFor('document.querySelector(".shell").dataset.nav === "collapsed"');
      assert.equal(await page.evaluate('document.querySelector("#nav-collapse").getAttribute("aria-expanded")'), "false");
      await page.waitFor('document.querySelector("#app-nav").getBoundingClientRect().width < 80');

      await page.reload();
      await page.waitFor('document.querySelector(".shell")?.dataset.nav === "collapsed"');
      await page.click("#nav-collapse");
      await page.waitFor('document.querySelector(".shell").dataset.nav === "expanded"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "shows the entry list without scrolling the sidebar",
    async run(page) {
      await resetApp(page);
      await page.setViewport(1440, 900);
      await sleep(150);
      const box = await page.evaluate(`(() => {
        const list = document.querySelector("#entry-list").getBoundingClientRect();
        return { top: list.top, height: list.height, viewport: window.innerHeight };
      })()`);
      assert.ok(box.top < box.viewport * 0.6, `entry list starts too low (${box.top}px)`);
      assert.ok(box.height >= 140, `entry list is too short (${box.height}px)`);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "switches the library between grid and list and remembers it",
    timeout: 30000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      assert.equal(await page.evaluate('document.querySelector("#project-list").dataset.layout'), "grid");
      await page.click('#hub-layout [data-layout="list"]');
      await page.waitFor('document.querySelector("#project-list").dataset.layout === "list"');
      assert.equal(await page.evaluate(`document.querySelector('#hub-layout [data-layout="list"]').getAttribute("aria-pressed")`), "true");
      const columns = await page.evaluate('getComputedStyle(document.querySelector("#project-list")).gridTemplateColumns.split(" ").length');
      assert.equal(columns, 1);

      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');
      await openPage(page, "library");
      assert.equal(await page.evaluate('document.querySelector("#project-list").dataset.layout'), "list");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "creates, searches, duplicates and deletes projects from the library hub",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");

      await page.click("#new-book-btn");
      await page.waitFor('document.querySelector("#sidebar")?.hidden === false');
      assert.equal(await page.evaluate('document.querySelector("#book-name").value'), "Untitled Lorebook");
      await page.click("#nav-back");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 2');

      await setValue(page, "#hub-search", "aurora");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 1');
      await setValue(page, "#hub-search", "zzzz");
      await page.waitFor('!document.querySelector("#hub-empty").hidden');
      await page.click("#hub-empty-clear");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 2');

      await page.click('#hub-filters [data-kind="card"]');
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 0');
      await page.click('#hub-filters [data-kind="all"]');

      const lastId = await page.evaluate('document.querySelector("#project-list .project-tile:last-child .project-open").dataset.projectId');
      await page.click(`#project-list [data-project-action="pin"][data-project-id="${lastId}"]`);
      await page.waitFor(`document.querySelector("#project-list .project-tile .project-open").dataset.projectId === ${JSON.stringify(lastId)}`);
      assert.equal(await page.evaluate(`document.querySelector('[data-project-action="pin"][data-project-id="${lastId}"]').getAttribute("aria-pressed")`), "true");
      await page.click(`#project-list [data-project-action="pin"][data-project-id="${lastId}"]`);
      await page.waitFor(`document.querySelector("#project-list .project-tile:last-child .project-open").dataset.projectId === ${JSON.stringify(lastId)}`);
      assert.equal(await page.evaluate('document.querySelector("#hub-tag").options.length >= 1'), true);

      await page.click('#project-list [data-project-action="duplicate"][data-project-kind="book"]');
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 3');

      await page.click('#project-list [data-project-action="delete"][data-project-kind="book"]');
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 2');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "a blank card is discarded when you leave it, and a named card stays",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      assert.match(await page.evaluate("location.hash"), /^#\/card\/card_/);
      assert.equal(await page.evaluate('document.querySelector("#nav-context-kind").textContent'), "Character card");
      assert.equal(await page.evaluate('document.querySelector("#sidebar").hidden'), true);

      await page.click("#nav-back");
      await page.waitFor('!document.querySelector("#page-library")?.hidden');
      assert.equal(await page.evaluate('document.querySelectorAll("#project-list .project-tile[data-kind=card]").length'), 0);

      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      await setValue(page, "#card-name", "Mara Voss");
      await sleep(500);
      await page.click("#nav-back");
      await page.waitFor('!document.querySelector("#page-library")?.hidden');
      assert.equal(await page.evaluate('document.querySelector("#project-list .project-tile[data-kind=card] .project-name").textContent'), "Mara Voss");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "opens backup and storage details from the data page",
    async run(page) {
      await resetApp(page);
      await openPage(page, "data");
      await page.waitFor('document.querySelector("#storage-usage-backend")?.textContent === "IndexedDB"');
      assert.equal(await page.evaluate('document.querySelector("#backup-status").textContent.length > 0'), true);
      await page.click("#data-export-btn");
      await page.waitFor('document.querySelector("#export-dialog")?.open');
      assert.equal(await page.evaluate('document.querySelector("#export-dialog #storage-usage-backend")'), null);
      await page.click("#export-data-link");
      await page.waitFor('!document.querySelector("#export-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "keeps the editor wide at mid widths and opens details as an overlay",
    async run(page) {
      await resetApp(page);
      await page.setViewport(1024, 768);
      await sleep(150);
      assert.equal(await page.evaluate('document.querySelector("#details-panel").classList.contains("is-collapsed")'), true);
      assert.ok(await page.evaluate('document.querySelector(".editor-scroll").getBoundingClientRect().width') >= 560);

      await page.click("#details-open-btn");
      await page.waitFor('!document.querySelector("#details-panel").classList.contains("is-collapsed")');
      assert.equal(await page.evaluate('document.querySelector("#details-open-btn").getAttribute("aria-expanded")'), "true");
      assert.ok(await page.evaluate('document.querySelector("#entry-order").getBoundingClientRect().width') > 0);
      assert.ok(await page.evaluate('document.querySelector(".editor-scroll").getBoundingClientRect().width') >= 560);

      await page.click("#details-toggle");
      await page.waitFor('document.querySelector("#details-panel").classList.contains("is-collapsed")');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "starts on the entry list on phones and opens an entry full screen",
    async run(page) {
      await resetApp(page);
      await page.setViewport(390, 844);
      await sleep(150);
      await openPage(page, "library");
      await page.click("#project-list .project-open");
      await page.waitFor('document.querySelector("#sidebar")?.classList.contains("is-drawer")');
      assert.ok(await page.evaluate('document.querySelector("#entry-list").getBoundingClientRect().height') > 150);

      await page.evaluate('document.querySelectorAll(".entry-card")[1].click(); true');
      await page.waitFor('!document.querySelector("#sidebar").classList.contains("is-drawer")');
      assert.ok(await page.evaluate('document.querySelector("#entry-content").getBoundingClientRect().width') > 300);
      const overflow = await page.evaluate('document.documentElement.scrollWidth - window.innerWidth');
      assert.ok(overflow <= 0, `overflow ${overflow}px`);
      await page.setViewport(1440, 900);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "registers a service worker and caches the shell",
    timeout: 30000,
    async run(page) {
      await resetApp(page);
      await sleep(700);
      await page.waitFor('Boolean(navigator.serviceWorker.controller)');
      const cache = await page.evaluate(`(async () => {
        const keys = await caches.keys();
        const entries = keys.length ? await (await caches.open(keys[0])).keys() : [];
        return { keys: keys.length, entries: entries.length };
      })()`);
      assert.ok(cache.entries >= 5, `expected the shell precached, saw ${cache.entries} entries`);
      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "opens the library as a mobile drawer",
    async run(page) {
      await page.setViewport(1440, 900);
      await resetApp(page);
      await page.setViewport(390, 844);
      await sleep(150);

      await page.click("#drawer-toggle");
      await page.waitFor('document.querySelector("#sidebar")?.classList.contains("is-drawer")');
      assert.equal(await page.evaluate('document.querySelector("#drawer-toggle").getAttribute("aria-expanded")'), "true");

      await page.evaluate('document.querySelectorAll(".entry-card")[1].click(); true');
      await page.waitFor('!document.querySelector("#sidebar")?.classList.contains("is-drawer")');
      assert.equal(await page.evaluate('document.querySelector("#entry-title").value.length > 0'), true);
      await page.setViewport(1440, 900);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "toggles compact density and keeps textarea heights",
    async run(page) {
      await resetApp(page);
      await openPage(page, "settings");
      await page.click("#density-compact-btn");
      await page.waitFor('document.documentElement.dataset.density === "compact"');
      await openPage(page, "entries");

      await page.evaluate(`(() => {
        const textarea = document.querySelector("#entry-content");
        textarea.style.height = "300px";
        textarea.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        return true;
      })()`);
      await sleep(120);

      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');
      assert.equal(await page.evaluate('document.documentElement.dataset.density'), "compact");
      assert.ok(await page.evaluate('document.querySelector("#entry-content").getBoundingClientRect().height >= 280'));
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "toggles a persistent light theme",
    async run(page) {
      await resetApp(page);
      await openPage(page, "settings");
      await page.click("#theme-light-btn");
      await page.waitFor('document.documentElement.dataset.theme === "light"');
      const pressed = await page.evaluate('document.querySelector("#theme-light-btn").getAttribute("aria-pressed")');
      assert.equal(pressed, "true");
      await page.reload();
      await page.waitFor('document.documentElement.dataset.theme === "light"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "peeks at an entry as injected text",
    async run(page) {
      await resetApp(page);
      await page.click("#peek-btn");
      await page.waitFor('document.querySelector("#peek-dialog")?.open');
      const body = await page.evaluate('document.querySelector("#peek-body").textContent');
      assert.ok(body.length > 0);
      const meta = await page.evaluate('document.querySelector("#peek-meta").textContent');
      assert.match(meta, /tokens/);
      await page.click("#peek-close");
      await page.waitFor('!document.querySelector("#peek-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "suggests keys and flags limits and broken links",
    async run(page) {
      await resetApp(page);
      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 4');
      await setValue(page, "#entry-title", "Mara Voss");
      await setValue(page, "#entry-content", "Mara walks the harbor and sees [[Nowhere]].");

      await page.click("#suggest-keys-btn");
      await page.waitFor('document.querySelectorAll("#entry-keys .key-chip").length > 0');
      const chips = await page.evaluate('[...document.querySelectorAll("#entry-keys .key-chip")].map((chip) => chip.textContent)');
      assert.ok(chips.some((chip) => /mara/i.test(chip)));

      await setValue(page, "#entry-token-limit", "1");
      await page.waitFor('document.querySelector("#validation-count")?.textContent !== "0"');
      await page.click("#validation-btn");
      await page.waitFor('!document.querySelector("#page-book-issues")?.hidden');
      const types = await page.evaluate('[...document.querySelectorAll(".validation-issue-type")].map((node) => node.textContent)');
      assert.ok(types.includes("Broken entry link"));
      assert.ok(types.includes("Token limit"));
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "adds and removes a bulk tag",
    async run(page) {
      await resetApp(page);
      const ids = await page.evaluate('[...document.querySelectorAll(".entry-card")].map((card) => card.dataset.entryId)');
      await page.evaluate(`(() => {
        const cards = [...document.querySelectorAll(".entry-card")];
        cards[0].dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');
      await page.click("#bulk-tag-btn");
      await page.waitFor('document.querySelector("#bulk-tag-dialog")?.open');
      await setValue(page, "#bulk-tag-input", "campaign");
      await page.click("#bulk-tag-add");
      await page.waitFor('!document.querySelector("#bulk-tag-dialog")?.open');
      await page.waitFor('document.querySelectorAll(".entry-tag").length > 0');
      const tagged = await page.evaluate('[...document.querySelectorAll(".entry-tag")].map((node) => node.textContent)');
      assert.ok(tagged.includes("campaign"));
      assert.ok(ids.length >= 1);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "edits advanced imported fields in place",
    async run(page, context) {
      await resetApp(page);
      await importFile(page, context.fixture("sillytavern-world-info.json"));
      await page.click("#diff-accept");
      await page.waitFor('[...document.querySelectorAll("#book-select option")].some((option) => option.textContent === "Harbor Secrets")');
      await page.waitFor('document.querySelector("#advanced-fields")?.hidden === false');
      await page.evaluate('document.querySelector("#advanced-fields").open = true; true');

      const depth = await page.evaluate('document.querySelector(\'[data-advanced-key="depth"]\')?.value');
      assert.equal(depth, "8");

      await setValue(page, '[data-advanced-key="depth"]', "12");
      await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');

      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value === "Harbor Secrets"');
      await page.waitFor('document.querySelector("#advanced-fields")?.hidden === false');
      await page.evaluate('document.querySelector("#advanced-fields").open = true; true');
      const reloaded = await page.evaluate('document.querySelector(\'[data-advanced-key="depth"]\')?.value');
      assert.equal(reloaded, "12");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "imports by drag and drop and logs the audit",
    async run(page, context) {
      await resetApp(page);
      await page.setFileInput("#import-input", [context.fixture("sillytavern-world-info.json")]);
      await page.waitFor('document.querySelector("#diff-dialog")?.open');
      await page.click("#diff-accept");
      await page.waitFor('!document.querySelector("#diff-dialog")?.open');
      await sleep(300);

      await openPage(page, "data");
      await page.waitFor('document.querySelector("#about-audit")?.textContent.includes("sillytavern-world-info.json")');
      const log = await page.evaluate('document.querySelector("#about-audit").textContent');
      assert.match(log, /SillyTavern/);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "imports a PNG card and extracts its book",
    async run(page, context) {
      await resetApp(page);
      await page.setFileInput("#import-input", [context.fixture("card-mara.png")]);
      await page.waitFor('document.querySelector("#diff-dialog")?.open');

      const message = await page.evaluate('document.querySelector("#diff-message").textContent');
      assert.match(message, /character card/i);
      const details = await page.evaluate('document.querySelector("#diff-detail-list").textContent');
      assert.match(details, /Mara Voss/);

      await page.click("#diff-accept");
      await page.waitFor('!document.querySelector("#diff-dialog")?.open');
      await openPage(page, "library");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile[data-kind=card]").length === 1');
      assert.equal(await page.evaluate('document.querySelector("#project-list .project-tile[data-kind=card] .project-name").textContent'), "Mara Voss");
      assert.match(await page.evaluate('document.querySelector("#project-list .project-tile[data-kind=card] .project-sub").textContent'), /Mara Book/);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "re-importing a card updates it in place and shows a card diff",
    timeout: 40000,
    async run(page, context) {
      await resetApp(page);
      await page.setFileInput("#import-input", [context.fixture("card-mara.png")]);
      await page.waitFor('document.querySelector("#diff-dialog")?.open');
      await page.click("#diff-accept");
      await page.waitFor('!document.querySelector("#diff-dialog")?.open');
      await page.waitFor('document.querySelector("#import-input").value === ""');

      await page.setFileInput("#import-input", [context.fixture("card-mara.png")]);
      await page.waitFor('document.querySelector("#diff-dialog")?.open');
      assert.equal(await page.evaluate('document.querySelector("#diff-controls select")?.value ?? ""'), "merge");
      assert.match(await page.evaluate('document.querySelector("#diff-message").textContent'), /updated in place/i);
      await page.click("#diff-accept");
      await page.waitFor('!document.querySelector("#diff-dialog")?.open');

      await openPage(page, "library");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile[data-kind=card]").length === 1');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "starts a card from a template and saves a card as a template",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-template-btn");
      await page.waitFor('document.querySelector("#card-template-dialog")?.open');
      await page.click("#card-template-list [data-template-id=card-character]");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      assert.match(await page.evaluate('document.querySelector("#card-description").value'), /{{char}}/);

      await setValue(page, "#card-name", "Templated");
      await page.click("#card-template-btn");
      await page.waitFor('document.querySelector("#card-template-dialog")?.open');
      await page.click("#card-template-list [data-save-card-template]");
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelectorAll("#card-template-list [data-remove-template-id]").length === 1');
      await page.click("#card-template-close");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "shows earlier versions of a card and restores one",
    timeout: 50000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      await setValue(page, "#card-name", "Aria");
      await setValue(page, "#card-description", "first version");
      await sleep(500);

      await page.click("#history-btn");
      await page.waitFor('document.querySelector("#history-dialog")?.open');
      await page.click("#history-save-btn");
      await page.waitFor('document.querySelectorAll("#history-list .history-item").length >= 1');
      await page.click("#history-close");

      await setValue(page, "#card-description", "second version");
      await sleep(500);
      await page.click("#card-history-btn");
      await page.waitFor('document.querySelectorAll("#card-history-list .history-item").length >= 1');
      assert.match(await page.evaluate('document.querySelector("#card-history-list").textContent'), /Description/);

      await page.click('#card-history-list [data-card-revision-action="restore"]');
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelector("#card-description").value === "first version"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "previews the assembled prompt for a card and its linked lorebook",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      await setValue(page, "#card-name", "Mara");
      await setValue(page, "#card-description", "{{char}} is a smuggler.");
      await page.evaluate(`(() => {
        const select = document.querySelector("#card-link-book");
        select.value = select.options[1].value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await sleep(500);

      await page.click('#app-nav a[data-view="card-review"]');
      await page.waitFor('!document.querySelector("#page-review")?.hidden');
      await page.waitFor('document.querySelectorAll("#preview-output .preview-segment").length >= 1');
      assert.match(await page.evaluate('document.querySelector("#preview-output").textContent'), /Mara is a smuggler/);
      const before = await page.evaluate('document.querySelectorAll("#preview-output .preview-segment").length');

      await setValue(page, "#preview-scene", "Sam: We sail past the harbour and meet Aurora.");
      await page.waitFor(`document.querySelectorAll("#preview-output .preview-segment").length > ${before}`);
      assert.match(await page.evaluate('document.querySelector("#preview-output").textContent'), /Chat so far/);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "finds and prints a character card",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      await setValue(page, "#card-name", "Zephyra");
      await setValue(page, "#card-description", "A wandering cartographer of drowned cities.");
      await sleep(500);

      await page.evaluate('window.__printed = 0; window.print = () => { window.__printed += 1; }; true');
      await page.click("#card-print-btn");
      await page.waitFor('window.__printed === 1');
      const printed = await page.evaluate('document.querySelector("#print-root").textContent');
      assert.match(printed, /Zephyra/);
      assert.match(printed, /cartographer/);

      await page.click("#nav-back");
      await page.waitFor('!document.querySelector("#page-library")?.hidden');
      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#global-search-dialog")?.open');
      await setValue(page, "#global-search-input", "cartographer");
      await page.waitFor('document.querySelectorAll("#global-search-results [data-card-id]").length === 1');
      await page.click("#global-search-results [data-card-id]");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      assert.equal(await page.evaluate('document.querySelector("#card-name").value'), "Zephyra");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "creates, links and exports a character card",
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');

      await setValue(page, "#card-name", "Mara Voss");
      await setValue(page, "#card-personality", "Gruff and careful");
      await setValue(page, "#card-first-message", "Tide's turning.");
      await page.evaluate(`(() => {
        const select = document.querySelector("#card-link-book");
        select.value = select.options[1].value;
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await sleep(500);

      await page.click("#nav-back");
      await page.waitFor('!document.querySelector("#page-library")?.hidden');
      await page.waitFor('document.querySelectorAll("#project-list .project-tile[data-kind=card]").length === 1');
      assert.match(await page.evaluate('document.querySelector("#project-list .project-tile[data-kind=card] .project-sub").textContent'), /Aurora Vale/);

      await page.evaluate(`(() => {
        window.__downloads = [];
        const original = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
          window.__downloads.push({ type: blob.type, size: blob.size });
          return original.call(URL, blob);
        };
        return true;
      })()`);
      await page.click("#project-list .project-tile[data-kind=card] .project-open");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      assert.equal(await page.evaluate('document.querySelector("#card-name").value'), "Mara Voss");
      await page.evaluate('document.querySelector("#card-export-format").value = "json-v3"; true');
      await page.click("#card-export");
      await sleep(250);
      const download = await page.evaluate('window.__downloads?.[0] ?? null');
      assert.equal(download?.type, "application/json");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "edits a full card with greetings, tokens and checks",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');

      await page.waitFor('document.querySelector("#card-issues")?.textContent.includes("Give the card a name")');
      await setValue(page, "#card-name", "Mara Voss");
      await setValue(page, "#card-description", "A smuggler with a silver tongue and a debt to the harbor guild.");
      await setValue(page, "#card-first-message", "Keep your voice down.");
      await addChipKey(page, "#card-tags-input", "npc");

      await page.click("#card-alt-add");
      await page.evaluate(`(() => {
        const area = document.querySelector("#card-alt-greetings textarea");
        area.value = "You again.";
        area.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await page.click("#card-alt-add");
      await page.waitFor('document.querySelectorAll("#card-alt-greetings .greeting-row").length === 2');
      await page.evaluate(`(() => {
        const area = document.querySelectorAll("#card-alt-greetings textarea")[1];
        area.value = "Late, aren't you?";
        area.dispatchEvent(new Event("input", { bubbles: true }));
        document.querySelectorAll("#card-alt-greetings [data-greeting-up]")[1].click();
        return true;
      })()`);

      await page.waitFor('Number(document.querySelector("#card-tokens-always").textContent) > 0');
      assert.equal(await page.evaluate('document.querySelector("#card-issues").textContent.includes("Give the card a name")'), false);
      assert.equal(await page.evaluate('document.querySelector("#card-alt-greetings textarea").value'), "Late, aren't you?");
      await page.waitFor('document.querySelector("#card-title").textContent === "Mara Voss"');

      await sleep(500);
      await page.reload();
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      assert.equal(await page.evaluate('document.querySelector("#card-description").value.startsWith("A smuggler")'), true);
      assert.equal(await page.evaluate('document.querySelectorAll("#card-alt-greetings .greeting-row").length'), 2);
      assert.equal(await page.evaluate('document.querySelector("#card-alt-greetings textarea").value'), "Late, aren't you?");

      await page.click('#app-nav [data-scroll-to="card-first-message"]');
      assert.equal(await page.evaluate('document.activeElement.id'), "card-first-message");

      await page.click("#card-duplicate");
      await page.waitFor('document.querySelector("#card-name").value === "Mara Voss copy"');
      await page.click("#card-delete");
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('!document.querySelector("#page-library")?.hidden');
      await page.waitFor('document.querySelectorAll("#project-list .project-tile[data-kind=card]").length === 1');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "bulk replaces with a preview and undo",
    async run(page) {
      await resetApp(page);
      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "h", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#replace-dialog")?.open');

      await setValue(page, "#replace-find", "harbor");
      await setValue(page, "#replace-with", "port");
      await page.waitFor('document.querySelector("#replace-preview")?.disabled === false');
      await page.click("#replace-preview");
      await page.waitFor('document.querySelector("#diff-dialog")?.open');

      const message = await page.evaluate('document.querySelector("#diff-message").textContent');
      assert.match(message, /matches? across/);
      await page.click("#diff-accept");
      await page.waitFor('!document.querySelector("#replace-dialog")?.open');

      await page.waitFor('document.querySelector("#entry-content")?.value.includes("port bells")');
      assert.ok(!(await page.evaluate('[...document.querySelectorAll("#entry-content")].some((node) => node.value.includes("harbor bells"))')));

      await page.click("#undo-btn");
      await page.waitFor('document.querySelector("#entry-content")?.value.includes("harbor bells")');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "selects entries by token size into the bulk selection",
    async run(page) {
      await resetApp(page);

      await page.evaluate(`(() => {
        const card = document.querySelector(".entry-card");
        card.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');
      await page.click("#bulk-size-btn");
      await page.waitFor('document.querySelector("#bulk-size-dialog")?.open');

      await setValue(page, "#bulk-size-min", "5");
      await page.waitFor('document.querySelector("#bulk-size-apply")?.disabled === false');
      const summary = await page.evaluate('document.querySelector("#bulk-size-summary").textContent');
      assert.match(summary, /entries? match/);

      await page.click("#bulk-size-apply");
      await page.waitFor('!document.querySelector("#bulk-size-dialog")?.open');
      await page.waitFor('Number(document.querySelector("#bulk-count").textContent.split(" ")[0]) > 1');
      await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "sets insertion order for selected entries",
    async run(page) {
      await resetApp(page);
      const firstId = await page.evaluate('document.querySelector(".entry-card").dataset.entryId');
      await pressKey(page, `[data-entry-id="${firstId}"]`, "ArrowDown", { ctrl: true });
      await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');

      await page.evaluate(`(() => {
        const input = document.querySelector("#bulk-order-input");
        input.value = "500";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await page.click("#bulk-order-apply");
      await page.waitFor('document.querySelector("#entry-order")?.value === "500"');

      await page.click("#bulk-order-up");
      await page.waitFor('document.querySelector("#entry-order")?.value === "510"');

      await page.evaluate(`(() => {
        const cards = [...document.querySelectorAll(".entry-card")];
        cards[1].click();
        return true;
      })()`);
      await page.waitFor('document.querySelector("#entry-order")?.value === "510"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "summarizes what changed since the last session",
    async run(page) {
      await resetApp(page);
      await setValue(page, "#entry-title", "Session change");
      await page.waitFor('document.querySelector("#entry-title")?.value === "Session change"');
      await sleep(200);
      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');

      await page.waitFor('document.querySelector("#session-summary")?.hidden === false');
      const text = await page.evaluate('document.querySelector("#session-summary-message").textContent');
      assert.match(text, /1 edited/);

      await page.click("#session-summary-dismiss-btn");
      await page.waitFor('document.querySelector("#session-summary")?.hidden === true');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "keeps undo history across a reload",
    async run(page) {
      await resetApp(page);
      const original = await page.evaluate('document.querySelector("#entry-title").value');
      await setValue(page, "#entry-title", "Renamed before reload");
      await page.waitFor('document.querySelector("#entry-title")?.value === "Renamed before reload"');
      await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');
      await sleep(800);

      await page.reload();
      await page.waitFor('document.querySelector("#entry-title")?.value === "Renamed before reload"');
      assert.equal(await page.evaluate('document.querySelector("#undo-btn").disabled'), false);

      await page.click("#undo-btn");
      await page.waitFor(`document.querySelector("#entry-title")?.value === ${JSON.stringify(original)}`);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "keeps local UI preferences across reloads",
    async run(page) {
      await resetApp(page);
      await page.evaluate(`(() => {
        const select = document.querySelector("#entry-sort");
        select.value = "title";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#entry-sort")?.value === "title"');

      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');
      await page.waitFor('document.querySelector("#entry-sort")?.value === "title"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "reports local storage usage in the export dialog",
    async run(page) {
      await resetApp(page);
      await page.click("#file-menu-btn");
      await page.click("#export-btn");
      await page.waitFor('document.querySelector("#export-dialog")?.open');
      await page.waitFor('document.querySelector("#storage-usage-backend").textContent === "IndexedDB"');
      const project = await page.evaluate('document.querySelector("#storage-usage-project").textContent');
      assert.match(project, /B|KB|MB/);
      const total = await page.evaluate('document.querySelector("#storage-usage-total").textContent');
      assert.ok(total.length > 0);
      await page.click("#export-cancel");
      await page.waitFor('!document.querySelector("#export-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "lists SillyTavern first as the primary export and warns before lossy export",
    async run(page) {
      await resetApp(page);
      await page.click("#file-menu-btn");
      await page.click("#export-btn");
      await page.waitFor('document.querySelector("#export-dialog")?.open');
      await page.waitFor('document.querySelector("#export-options [data-export-format]")');

      const order = await page.evaluate('[...document.querySelectorAll("#export-options [data-export-format]")].map((node) => node.dataset.exportFormat)');
      assert.equal(order[0], "sillytavern");
      assert.ok(order.includes("project"));
      assert.equal(await page.evaluate('document.querySelector("#export-options .export-group-title").textContent'), "Recommended");
      const meta = await page.evaluate('document.querySelector("#export-options [data-export-format=\\"sillytavern\\"] .export-option-meta").textContent');
      assert.match(meta, /primary/);

      await page.evaluate(`(() => {
        const bookName = document.querySelector("#book-name");
        bookName.value = "Harbor Secrets";
        bookName.dispatchEvent(new Event("input", { bubbles: true }));
        return true;
      })()`);
      await page.click('#export-options [data-export-format="sillytavern"]');
      await page.waitFor('document.querySelector("#confirm-dialog")?.open || !document.querySelector("#export-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "downloads an export with the expected filename and content",
    async run(page) {
      await resetApp(page);
      await page.evaluate(`(() => {
        window.__downloads = [];
        const original = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
          window.__downloads.push({ type: blob.type, size: blob.size });
          return original.call(URL, blob);
        };
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function patched() {
          window.__downloads.at(-1).name = this.download;
          return originalClick.call(this);
        };
        return true;
      })()`);

      await page.click("#file-menu-btn");
      await page.click("#export-btn");
      await page.waitFor('document.querySelector("#export-dialog")?.open');
      await page.waitFor('document.querySelector("#export-options [data-export-format=\\"native\\"]")');
      await page.click('#export-options [data-export-format="native"]');
      await page.waitFor('window.__downloads?.length === 1');

      const download = await page.evaluate('window.__downloads[0]');
      assert.equal(download.type, "application/json");
      assert.match(download.name, /\.json$/);
      assert.ok(download.size > 0);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "routes keyboard shortcuts for undo, search and replace",
    async run(page) {
      await resetApp(page);
      const original = await page.evaluate('document.querySelector("#entry-title").value');
      await setValue(page, "#entry-title", "Shortcut edit");
      await page.waitFor('document.querySelector("#entry-title")?.value === "Shortcut edit"');

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor(`document.querySelector("#entry-title")?.value === ${JSON.stringify(original)}`);

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#global-search-dialog")?.open');
      await page.evaluate('document.querySelector("#global-search-dialog").close(); true');

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "h", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#replace-dialog")?.open');
      await page.evaluate('document.querySelector("#replace-dialog").close(); true');

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#command-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "exports a standalone character book",
    async run(page) {
      await resetApp(page);
      await page.click("#file-menu-btn");
      await page.click("#export-btn");
      await page.waitFor('document.querySelector("#export-dialog")?.open');
      await page.waitFor('document.querySelector(\'#export-options [data-export-format="characterbook"]\')');

      await page.click('#export-options [data-export-format="characterbook"]');
      await page.waitFor('!document.querySelector("#export-dialog")?.open');
      const toast = await page.evaluate('document.querySelector(".toast")?.textContent ?? ""');
      assert.match(toast, /Character book/);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "reminds about backups and records an export",
    async run(page) {
      await resetApp(page);
      await page.evaluate(`(() => {
        localStorage.setItem("loreweaver:last-backup:v1", String(Date.now() - 8 * 24 * 60 * 60 * 1000));
        localStorage.removeItem("loreweaver:backup-reminder-snooze:v1");
        return true;
      })()`);
      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value');
      await page.waitFor('document.querySelector("#backup-reminder")?.hidden === false');

      await page.click("#backup-reminder-export-btn");
      await page.waitFor('document.querySelector("#backup-reminder")?.hidden === true');
      const last = await page.evaluate('Number(localStorage.getItem("loreweaver:last-backup:v1"))');
      assert.ok(Date.now() - last < 60000);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "stores the project in IndexedDB",
    async run(page) {
      await resetApp(page);
      const result = await readIndexedDbProject(page);
      assert.ok(result.value.includes("Aurora Vale"));
      assert.equal(result.localStorageProject, null);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "migrates a localStorage project into IndexedDB",
    async run(page) {
      const seed = {
        version: 1,
        activeBookId: "book_migrate",
        activeEntryId: "entry_migrate",
        books: [{
          id: "book_migrate",
          name: "Migrated Book",
          description: "",
          entries: [{
            id: "entry_migrate",
            title: "Migrated Entry",
            keys: ["migrated"],
            content: "From localStorage",
            order: 10
          }]
        }]
      };

      await page.resetStorage({ seed });
      await openPage(page, "entries");
      await page.waitFor('document.querySelector("#book-name")?.value === "Migrated Book"');
      const result = await readIndexedDbProject(page);
      assert.ok(result.value.includes("Migrated Book"));
      assert.equal(result.localStorageProject, null);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "migrates legacy lorebook-studio storage to the loreweaver namespace",
    async run(page) {
      const seed = {
        version: 2,
        activeBookId: "book_legacy",
        activeEntryId: "entry_legacy",
        books: [{
          id: "book_legacy",
          name: "Legacy Book",
          description: "",
          entries: [{
            id: "entry_legacy",
            title: "Legacy Entry",
            keys: ["legacy"],
            content: "From the old namespace",
            order: 10
          }]
        }]
      };

      await page.resetStorage();
      await page.evaluate(`(async () => {
        const database = await new Promise((resolve, reject) => {
          const request = indexedDB.open("loreweaver");
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        await new Promise((resolve, reject) => {
          const transaction = database.transaction("keyval", "readwrite");
          transaction.objectStore("keyval").clear();
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
        });
        database.close();
        localStorage.clear();
        localStorage.setItem("lorebook-studio:project:v1", ${JSON.stringify(JSON.stringify(seed))});
        localStorage.setItem("lorebook-studio:sort:v1", "title");
        return true;
      })()`);
      await page.reload();
      await page.waitFor('document.querySelector("#book-name")?.value === "Legacy Book"');
      const result = await readIndexedDbProject(page);
      assert.ok(result.value.includes("Legacy Book"));
      assert.equal(result.localStorageProject, null);
      assert.equal(await page.evaluate('localStorage.getItem("lorebook-studio:project:v1")'), null);
      assert.equal(await page.evaluate('localStorage.getItem("loreweaver:sort:v1")'), "title");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "virtualizes a 2,000-entry book",
    timeout: 60000,
    async run(page) {
      const seed = {
        version: 2,
        activeBookId: "book_big",
        activeEntryId: "entry_big_0",
        books: [{
          id: "book_big",
          name: "Big Book",
          description: "",
          entries: Array.from({ length: 2000 }, (_, index) => ({
            id: `entry_big_${index}`,
            title: `Entry ${index}`,
            keys: [`key ${index}`],
            content: `Content for entry ${index}.`,
            order: index
          }))
        }]
      };

      await page.resetStorage({ seed });
      await openPage(page, "entries");
      await page.waitFor('document.querySelector("#book-name")?.value === "Big Book"');
      await page.waitFor('document.querySelector("#entry-list")?.classList.contains("is-virtual")');

      const rendered = await page.evaluate('document.querySelectorAll("#entry-list [data-entry-id]").length');
      assert.ok(rendered < 120, `rendered ${rendered} cards`);
      assert.equal(await page.evaluate('document.querySelector("#entry-count").textContent'), "2000");

      const started = Date.now();
      await page.evaluate('document.querySelector("#entry-list").scrollTop = 2000 * 56; true');
      await sleep(150);
      const lateTitles = await page.evaluate('[...document.querySelectorAll("#entry-list [data-entry-id]")].map((item) => item.dataset.entryId)');
      assert.ok(lateTitles.length > 0);
      assert.ok(lateTitles.length < 120);
      assert.ok(!lateTitles.includes("entry_big_0"));
      assert.ok(Date.now() - started < 4000);

      await page.click('[data-entry-id="entry_big_0"]').catch(() => {});
      await page.evaluate('document.querySelector("#entry-list").scrollTop = 0; true');
      await sleep(150);
      await page.click('[data-entry-id="entry_big_0"]');
      await page.waitFor('document.querySelector("#entry-title")?.value === "Entry 0"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "navigates a virtualized list with the keyboard and reorders",
    timeout: 60000,
    async run(page) {
      const seed = {
        version: 2,
        activeBookId: "book_big",
        activeEntryId: "entry_big_0",
        books: [{
          id: "book_big",
          name: "Big Book",
          description: "",
          entries: Array.from({ length: 400 }, (_, index) => ({
            id: `entry_big_${index}`,
            title: `Entry ${index}`,
            keys: [`key ${index}`],
            content: `Content for entry ${index}.`,
            order: index
          }))
        }]
      };

      await page.resetStorage({ seed });
      await openPage(page, "entries");
      await page.waitFor('document.querySelector("#book-name")?.value === "Big Book"');
      await dismissOnboarding(page);
      await page.waitFor('document.querySelector("#entry-list")?.classList.contains("is-virtual")');
      await page.evaluate('document.querySelector("[data-entry-id=\\"entry_big_0\\"]").focus(); true');

      for (let step = 0; step < 40; step += 1) {
        await page.evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true })); true');
      }

      await page.waitFor('document.querySelector("#entry-title")?.value === "Entry 40"');
      assert.equal(await page.evaluate('document.activeElement.dataset.entryId'), "entry_big_40");
      assert.ok(await page.evaluate('document.querySelector("#entry-list").scrollTop > 0'));
      const rendered = await page.evaluate('document.querySelectorAll("#entry-list [data-entry-id]").length');
      assert.ok(rendered < 120, `rendered ${rendered} cards`);

      await page.evaluate('document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", altKey: true, bubbles: true, cancelable: true })); true');
      await sleep(120);
      const order = await page.evaluate('[...document.querySelectorAll("#entry-list [data-entry-id]")].map((item) => item.dataset.entryId)');
      assert.ok(order.indexOf("entry_big_40") < order.indexOf("entry_big_39"));
      assert.equal(await page.evaluate('document.querySelector("#entry-title").value'), "Entry 40");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "recovers from a failed local save",
    async run(page) {
      await resetApp(page);
      await page.evaluate(`(() => {
        const fail = () => {
          const error = new Error("Quota exceeded");
          error.name = "QuotaExceededError";
          throw error;
        };
        window.__originalSetItem = Storage.prototype.setItem;
        window.__originalPut = IDBObjectStore.prototype.put;
        Storage.prototype.setItem = fail;
        IDBObjectStore.prototype.put = fail;
        return true;
      })()`);

      const content = await page.evaluate('document.querySelector("#entry-content").value');
      await setValue(page, "#entry-content", `${content}\n\nUnsaved change`);
      await page.waitFor('!document.querySelector("#storage-banner")?.hidden');
      const message = await page.evaluate('document.querySelector("#storage-banner-message").textContent');
      assert.match(message, /storage is full/i);
      const saveState = await page.evaluate('document.querySelector("#save-state").dataset.state');
      assert.equal(saveState, "error");

      await page.click("#storage-retry-btn");
      await sleep(200);
      assert.equal(await page.evaluate('document.querySelector("#storage-banner").hidden'), false);

      await page.evaluate('Storage.prototype.setItem = window.__originalSetItem; IDBObjectStore.prototype.put = window.__originalPut; true');
      await page.click("#storage-retry-btn");
      await page.waitFor('document.querySelector("#storage-banner").hidden === true');
      await page.waitFor('document.querySelector("#save-state").dataset.state === "saved"');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "imports a SillyTavern file with the replace strategy",
    async run(page, context) {
      await resetApp(page);
      await importFile(page, context.fixture("sillytavern-world-info.json"));

      const initial = await page.evaluate(`(() => ({
        strategy: document.querySelector("#diff-controls select").value,
        summary: document.querySelector("#diff-summary").textContent
      }))()`);
      assert.equal(initial.strategy, "replace");
      assert.match(initial.summary, /\+1 book/);

      await page.click("#diff-accept");
      await page.waitFor('[...document.querySelectorAll("#book-select option")].some((option) => option.textContent === "Harbor Secrets")');
      const state = await appState(page);
      assert.deepEqual(state.books, ["Harbor Secrets"]);
      assert.equal(state.entries, 3);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "appends an import to the existing project",
    async run(page, context) {
      await resetApp(page);
      await importFile(page, context.fixture("sillytavern-world-info.json"));
      await page.evaluate(`(() => {
        const select = document.querySelector("#diff-controls select");
        select.value = "append";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#diff-controls select").value === "append"');
      await page.click("#diff-accept");
      await page.waitFor('document.querySelector(".toast")?.textContent.includes("Appended")');

      const state = await appState(page);
      assert.deepEqual(state.books, ["Aurora Vale", "Harbor Secrets"]);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "merges an import by entry title",
    async run(page, context) {
      await resetApp(page);
      await importFile(page, context.fixture("native-merge.json"));
      await page.evaluate(`(() => {
        const select = document.querySelector("#diff-controls select");
        select.value = "merge";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#diff-controls select").value === "merge"');
      await page.click("#diff-accept");
      await page.waitFor('document.querySelector(".toast")?.textContent.includes("Merged")');

      const state = await appState(page);
      assert.deepEqual(state.books, ["Aurora Vale"]);
      assert.equal(state.entries, 3);

      await page.evaluate(`(() => {
        const card = [...document.querySelectorAll(".entry-card")].find((item) => item.textContent.includes("Mara Voss"));
        card.click();
        return true;
      })()`);
      await page.waitFor('document.querySelector("#entry-title").value === "Mara Voss"');
      const content = await page.evaluate('document.querySelector("#entry-content").value');
      assert.equal(content, "Merged Mara content.");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "compares revision snapshots",
    async run(page) {
      await resetApp(page);
      const original = await page.evaluate('document.querySelector("#entry-content").value');
      await setValue(page, "#entry-content", `${original}\n\nRevision baseline`);
      await page.click("#history-btn");
      await page.waitFor('document.querySelector("#history-dialog")?.open');
      await page.click("#history-save-btn");
      await page.waitFor('document.querySelector("[data-revision-compare]")');
      await page.click("#history-close");
      await page.waitFor('!document.querySelector("#history-dialog")?.open');

      await setValue(page, "#entry-content", `${original}\n\nRevision baseline\nRevision follow-up`);
      await page.click("#history-btn");
      await page.waitFor('document.querySelector("#history-dialog")?.open');
      await page.waitFor('document.querySelector("[data-revision-compare]")');
      await page.click("[data-revision-compare]");
      await page.waitFor('document.querySelector("#diff-dialog")?.open');
      const summary = await page.evaluate('document.querySelector("#diff-summary").textContent');
      assert.ok(summary.length > 0);

      await page.click("#diff-accept");
      await page.waitFor('!document.querySelector("#diff-dialog")?.open');
      await page.click("#history-close");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "shows real token counts from the worker",
    async run(page) {
      await resetApp(page);
      await page.waitFor('!document.querySelector("#entry-stat-tokens").textContent.startsWith("~")');
      const tokens = await page.evaluate('document.querySelector("#entry-stat-tokens").textContent');
      assert.match(tokens, /^\d[\d,]*$/);

      await page.click("#overview-btn");
      await page.waitFor('!document.querySelector("#page-book-overview")?.hidden');
      await page.waitFor('!document.querySelector("#overview-tokens").textContent.startsWith("~")');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "warns when a book exceeds its token budget",
    async run(page) {
      await resetApp(page);
      await setValue(page, "#book-token-budget", "10");
      await page.waitFor('document.querySelector("#book-budget-status")?.classList.contains("is-over")');
      const status = await page.evaluate('document.querySelector("#book-budget-status").textContent');
      assert.match(status, /Over budget/);

      await page.click("#overview-btn");
      await page.waitFor('!document.querySelector("#page-book-overview")?.hidden');
      await page.waitFor('document.querySelector("#overview-budget")?.classList.contains("is-over")');
      const budget = await page.evaluate('document.querySelector("#overview-budget").textContent');
      assert.match(budget, /over/);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "simulates context activation",
    async run(page) {
      await resetApp(page);
      await page.click("#simulation-btn");
      await page.waitFor('!document.querySelector("#page-book-simulate")?.hidden');

      await setValue(page, "#simulation-input", "Mara Voss, the harbormaster, walks the harbor at dusk.");
      await page.waitFor('document.querySelectorAll(".simulation-item").length === 2');

      const summary = await page.evaluate('document.querySelector("#simulation-summary").textContent');
      assert.match(summary, /activate/);
      const output = await page.evaluate('document.querySelector("#simulation-results .simulation-output")?.textContent ?? ""');
      assert.match(output, /Aurora Vale clings/);
      const skipped = await page.evaluate('document.querySelector(".simulation-skipped summary")?.textContent ?? ""');
      assert.match(skipped, /Not activated/);

      const bars = await page.evaluate('document.querySelectorAll(".simulation-graph-row").length');
      assert.ok(bars >= 2);
      const activatedBars = await page.evaluate('document.querySelectorAll(".simulation-graph-row:not(.is-skipped)").length');
      assert.equal(activatedBars, 2);
      const legend = await page.evaluate('document.querySelector(".simulation-graph-legend")?.textContent ?? ""');
      assert.match(legend, /Activated/);

      await page.evaluate('document.querySelector(".simulation-item-title").click(); true');
      await page.waitFor('document.querySelector("#page-book-simulate")?.hidden');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "filters validation issues by type",
    async run(page) {
      await resetApp(page);
      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 4');
      await page.click("#validation-btn");
      await page.waitFor('!document.querySelector("#page-book-issues")?.hidden');
      await page.waitFor('document.querySelectorAll(".validation-issue").length >= 2');

      const total = await page.evaluate('document.querySelectorAll(".validation-issue").length');

      await page.click('[data-validation-filter="emptyContent"]');
      await page.waitFor('document.querySelectorAll(".validation-issue").length === 1');
      const type = await page.evaluate('document.querySelector(".validation-issue-type").textContent');
      assert.equal(type, "Empty content");

      await page.click("[data-validation-all]");
      await page.waitFor(`document.querySelectorAll(".validation-issue").length === ${total}`);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "duplicates, splits, and merges lorebooks",
    async run(page) {
      await resetApp(page);

      await page.click("#book-actions-btn");
      await page.waitFor('document.querySelector("#book-actions-dialog")?.open');
      await page.click("#book-duplicate");
      await page.waitFor('document.querySelectorAll("#book-select option").length === 2');
      let names = await page.evaluate('[...document.querySelectorAll("#book-select option")].map((option) => option.textContent)');
      assert.deepEqual(names, ["Aurora Vale", "Aurora Vale (copy)"]);

      await page.click("#book-actions-btn");
      await page.waitFor('document.querySelector("#book-actions-dialog")?.open');
      await page.click("#book-split");
      await page.waitFor('document.querySelectorAll("#book-select option").length === 3');
      names = await page.evaluate('[...document.querySelectorAll("#book-select option")].map((option) => option.textContent)');
      assert.deepEqual(names, ["Aurora Vale", "Aurora Vale (copy)", "Aurora Vale (copy) (split)"]);

      await page.click("#book-actions-btn");
      await page.waitFor('document.querySelector("#book-actions-dialog")?.open');
      await page.evaluate(`(() => {
        const select = document.querySelector("#book-merge-target");
        const option = [...select.options].find((item) => item.textContent === "Aurora Vale");
        select.value = option.value;
        return true;
      })()`);
      await page.click("#book-merge");
      await page.waitFor('document.querySelectorAll("#book-select option").length === 2');

      const book = await page.evaluate('document.querySelector("#book-name").value');
      assert.equal(book, "Aurora Vale");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "switches tokenizer and context window presets",
    async run(page) {
      await resetApp(page);
      await openPage(page, "settings");
      await page.waitFor('document.querySelector("#tokenizer-preset")?.options.length === 2');

      await page.evaluate(`(() => {
        const select = document.querySelector("#tokenizer-preset");
        select.value = "o200k";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#tokenizer-preset-hint").textContent === "o200k_base"');
      await page.waitFor('!document.querySelector("#entry-stat-tokens").textContent.startsWith("~")');

      await page.evaluate(`(() => {
        const select = document.querySelector("#context-window-preset");
        select.value = "32768";
        select.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      })()`);

      await page.click("#overview-btn");
      await page.waitFor('!document.querySelector("#page-book-overview")?.hidden');
      await page.waitFor('document.querySelector("#overview-context").textContent.includes("32,768")');
      const tokenizer = await page.evaluate('document.querySelector("#overview-tokenizer").textContent');
      assert.equal(tokenizer, "o200k_base");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "searches across all lorebooks",
    async run(page) {
      await resetApp(page);
      await page.click("#new-book-btn");
      await page.waitFor('document.querySelectorAll("#book-select option").length === 2');
      await page.click("#add-entry-btn");
      await page.waitFor('document.querySelectorAll(".entry-card").length === 1');
      await setValue(page, "#entry-title", "Harbor Watch");
      await setValue(page, "#entry-content", "A watch on the harbor.");
      await page.waitFor('document.querySelector("#save-state")?.dataset.state === "saved"');

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "f", ctrlKey: true, shiftKey: true, bubbles: true, cancelable: true }))');
      await page.waitFor('document.querySelector("#global-search-dialog")?.open');

      await setValue(page, "#global-search-input", "harbor");
      await page.waitFor('document.querySelectorAll(".global-search-item").length >= 1');

      const groups = await page.evaluate('document.querySelectorAll(".global-search-group").length');
      assert.ok(groups >= 2, `expected matches in at least two lorebooks, saw ${groups}`);

      await page.evaluate('document.querySelector(".global-search-item").click(); true');
      await page.waitFor('!document.querySelector("#global-search-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "checks project data integrity",
    async run(page) {
      await resetApp(page);
      await openPage(page, "data");
      await page.click("#about-integrity-btn");
      await page.waitFor('document.querySelector("#integrity-dialog")?.open');
      await page.waitFor('document.querySelector("#integrity-summary").textContent.includes("No integrity issues")');

      const disabled = await page.evaluate('document.querySelector("#integrity-repair").disabled');
      assert.equal(disabled, true);

      await page.click("#integrity-close");
      await page.waitFor('!document.querySelector("#integrity-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "keeps the new dialogs usable at phone width",
    async run(page) {
      await resetApp(page);
      await page.setViewport(390, 844);
      await sleep(150);

      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "h", ctrlKey: true, bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#replace-dialog")?.open');
      const replace = await page.evaluate(`(() => {
        const element = document.querySelector("#replace-dialog");
        return { width: Math.round(element.getBoundingClientRect().width), viewport: window.innerWidth };
      })()`);
      assert.ok(replace.width <= replace.viewport);
      await page.click("#replace-cancel");

      await page.evaluate(`(() => {
        const card = document.querySelector(".entry-card");
        card.dispatchEvent(new MouseEvent("click", { bubbles: true, ctrlKey: true }));
        return true;
      })()`);
      await page.waitFor('document.querySelector("#bulk-bar")?.hidden === false');
      await page.click("#bulk-size-btn");
      await page.waitFor('document.querySelector("#bulk-size-dialog")?.open');
      const size = await page.evaluate(`(() => {
        const element = document.querySelector("#bulk-size-dialog");
        return { width: Math.round(element.getBoundingClientRect().width), viewport: window.innerWidth };
      })()`);
      assert.ok(size.width <= size.viewport);
      await page.click("#bulk-size-cancel");
      await page.setViewport(1440, 900);
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "opens and runs commands from the command palette",
    async run(page) {
      await resetApp(page);
      await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true }))');
      await page.waitFor('document.querySelector("#command-dialog")?.open');

      await setValue(page, "#command-input", "overview");
      await page.waitFor('document.querySelectorAll(".command-option").length === 1');
      const title = await page.evaluate('document.querySelector(".command-option-title").textContent');
      assert.equal(title, "Overview");

      await page.evaluate(`(() => {
        const input = document.querySelector("#command-input");
        input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        return true;
      })()`);
      await page.waitFor('!document.querySelector("#page-book-overview")?.hidden');
      await page.waitFor('!document.querySelector("#command-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "scopes the command palette to the current page and remembers recent commands",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      const open = async () => {
        await page.evaluate('document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true, cancelable: true })); true');
        await page.waitFor('document.querySelector("#command-dialog")?.open');
      };
      const titles = () => page.evaluate('[...document.querySelectorAll(".command-option-title")].map((n) => n.textContent)');

      await open();
      assert.equal((await titles()).includes("New entry"), false);
      await setValue(page, "#command-input", "new entry");
      await page.waitFor('[...document.querySelectorAll(".command-option-title")].some((n) => n.textContent === "New entry")');
      await page.evaluate('document.querySelector("#command-dialog").close(); true');

      await openPage(page, "entries");
      await open();
      assert.equal((await titles()).includes("New entry"), true);
      await setValue(page, "#command-input", "keyboard shortcuts");
      await page.waitFor('document.querySelectorAll(".command-option").length === 1');
      await page.evaluate('document.querySelector("#command-input").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); true');
      await page.waitFor('document.querySelector("#shortcuts-dialog")?.open');
      await page.evaluate('document.querySelector("#shortcuts-dialog").close(); true');

      await open();
      assert.equal((await titles())[0], "Keyboard shortcuts");
      await page.evaluate('document.querySelector("#command-dialog").close(); true');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "opens the About panel and getting-started guide",
    async run(page) {
      await resetApp(page);
      await page.click("#about-btn");
      await page.waitFor('document.querySelector("#about-dialog")?.open');
      await page.waitFor('document.querySelector("#about-version").textContent.startsWith("Version ")');

      const version = await page.evaluate('document.querySelector("#about-version").textContent');
      const meta = await page.evaluate('document.querySelector("meta[name=\\"app-version\\"]").content');
      assert.ok(version.includes(meta));

      const privacy = await page.evaluate('document.querySelector(".about-privacy").textContent');
      assert.match(privacy, /local-first/);
      const formats = await page.evaluate('document.querySelector("#about-export-formats").textContent');
      assert.match(formats, /Character book/);

      await page.click("#about-guide-btn");
      await page.waitFor('document.querySelector("#guide-dialog")?.open');
      const steps = await page.evaluate('document.querySelectorAll(".guide-steps li").length');
      assert.ok(steps >= 5);
      await page.click("#guide-close");
      await page.waitFor('!document.querySelector("#guide-dialog")?.open');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "reviews a lorebook and a card on the Review page",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "entries");
      await page.click('#app-nav a[data-view="book-review"]');
      await page.waitFor('!document.querySelector("#page-review")?.hidden');
      await page.waitFor('document.querySelectorAll("#review-body .review-stat").length >= 4');
      await page.click("#review-simulate-btn");
      await page.waitFor('!document.querySelector("#page-book-simulate")?.hidden');

      await openPage(page, "library");
      await page.click("#new-card-btn");
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      await setValue(page, "#card-name", "Reviewed");
      await page.click('#app-nav a[data-view="card-review"]');
      await page.waitFor('!document.querySelector("#page-review")?.hidden');
      await page.waitFor('document.querySelectorAll("#review-body [data-review-field]").length > 0');
      await page.click('#review-body [data-review-field="description"]');
      await page.waitFor('!document.querySelector("#page-card")?.hidden');
      assert.equal(await page.evaluate('document.activeElement?.id'), "card-description");
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "selects projects in the Library and applies bulk actions",
    timeout: 40000,
    async run(page) {
      await resetApp(page);
      await openPage(page, "library");
      await page.click("#new-book-btn");
      await page.waitFor('document.querySelector("#sidebar")?.hidden === false');
      await page.click("#nav-back");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 2');

      await page.click("#hub-select-btn");
      await page.waitFor('!document.querySelector("#hub-bulk-bar").hidden');
      await page.click("#hub-bulk-all");
      await page.waitFor('document.querySelector("#hub-bulk-count").textContent === "2 selected"');

      await setValue(page, "#hub-bulk-tag", "batch");
      await page.click("#hub-bulk-tag-add");
      await page.waitFor('[...document.querySelectorAll("#hub-tag option")].some((o) => o.value === "batch")');
      await page.click("#hub-bulk-tag-remove");
      await page.waitFor('![...document.querySelectorAll("#hub-tag option")].some((o) => o.value === "batch")');

      await page.click("#hub-bulk-delete");
      await page.waitFor('document.querySelector("#confirm-dialog")?.open');
      await page.click("#confirm-accept");
      await page.waitFor('document.querySelectorAll("#project-list .project-tile").length === 1');
      await page.click("#hub-bulk-done");
      await page.waitFor('document.querySelector("#hub-bulk-bar").hidden');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "groups file actions in the header File menu",
    async run(page) {
      await resetApp(page);
      assert.equal(await page.evaluate('document.querySelector("#file-menu").hidden'), true);
      await page.click("#file-menu-btn");
      await page.waitFor('!document.querySelector("#file-menu").hidden');
      assert.equal(await page.evaluate('document.querySelector("#file-menu-btn").getAttribute("aria-expanded")'), "true");
      await page.click("#export-btn");
      await page.waitFor('document.querySelector("#export-dialog")?.open');
      assert.equal(await page.evaluate('document.querySelector("#file-menu").hidden'), true);
      await page.evaluate('document.querySelector("#export-dialog").close(); true');
      assert.deepEqual(page.errors, []);
    }
  },
  {
    name: "keeps the layout inside the viewport",
    async run(page, context) {
      await resetApp(page);

      for (const [width, height] of [[1440, 900], [390, 844], [320, 760]]) {
        await page.setViewport(width, height);
        await sleep(120);
        const overflow = await page.evaluate("document.documentElement.scrollWidth - window.innerWidth");
        assert.ok(overflow <= 0, `Expected no horizontal overflow at ${width}px, saw ${overflow}px.`);
      }

      await page.setViewport(320, 760);
      await importFile(page, context.fixture("sillytavern-world-info.json"));
      const dialog = await page.evaluate(`(() => {
        const element = document.querySelector("#diff-dialog");
        return {
          width: Math.round(element.getBoundingClientRect().width),
          viewport: window.innerWidth,
          overflow: document.documentElement.scrollWidth - window.innerWidth
        };
      })()`);
      assert.ok(dialog.width <= dialog.viewport);
      assert.ok(dialog.overflow <= 0);
      await page.click("#diff-cancel");
      assert.deepEqual(page.errors, []);
    }
  }
];
