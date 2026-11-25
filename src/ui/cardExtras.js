import { ASSET_TYPES, REGEX_PLACEMENTS, createAsset, createRegexScript } from "../cardExtensions.js";

function el(tag, className, text) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function labeled(text, control, className = "field") {
  const label = el("label", className);
  label.append(el("span", "field-label", text), control);
  return label;
}

function input(value, { type = "text", placeholder = "", name = "" } = {}) {
  const node = el("input");
  node.type = type;
  node.value = value;
  node.autocomplete = "off";
  node.spellcheck = false;
  node.placeholder = placeholder;
  node.dataset.ext = name;
  return node;
}

function area(value, rows, name) {
  const node = el("textarea");
  node.rows = rows;
  node.value = value;
  node.spellcheck = false;
  node.dataset.ext = name;
  return node;
}

function checkbox(text, checked, name, value = "") {
  const label = el("label", "ext-check");
  const box = el("input");
  box.type = "checkbox";
  box.checked = checked;
  box.dataset.ext = name;
  box.value = value;
  label.append(box, el("span", "", text));
  return label;
}

function removeButton(kind, label) {
  const button = el("button", "btn", "Remove");
  button.type = "button";
  button.dataset.extRemove = kind;
  button.setAttribute("aria-label", label);
  return button;
}

function depthValue(node) {
  return node.value.trim() === "" ? null : Math.max(0, Math.round(Number(node.value)) || 0);
}

function scriptRow(script, index) {
  const row = el("fieldset", "ext-item");
  const legend = el("legend", "", `Regex script ${index + 1}`);
  const placements = el("div", "ext-checks");
  const flags = el("div", "ext-checks");
  const depths = el("div", "field-grid");

  row.dataset.extKind = "regex";
  row.dataset.raw = JSON.stringify(script.raw);

  for (const placement of REGEX_PLACEMENTS) {
    placements.append(checkbox(placement.label, script.placement.includes(placement.value), "placement", String(placement.value)));
  }

  flags.append(
    checkbox("Disabled", script.disabled, "disabled"),
    checkbox("Markdown only", script.markdownOnly, "markdownOnly"),
    checkbox("Prompt only", script.promptOnly, "promptOnly"),
    checkbox("Run on edit", script.runOnEdit, "runOnEdit")
  );
  depths.append(
    labeled("Minimum depth", input(script.minDepth ?? "", { type: "number", name: "minDepth" })),
    labeled("Maximum depth", input(script.maxDepth ?? "", { type: "number", name: "maxDepth" }))
  );

  const placementGroup = el("div", "field");
  placementGroup.append(el("span", "field-label", "Applies to"), placements);
  const flagGroup = el("div", "field");
  flagGroup.append(el("span", "field-label", "Options"), flags);

  row.append(
    legend,
    labeled("Name", input(script.scriptName, { name: "scriptName" })),
    labeled("Find (a pattern, or /pattern/flags)", input(script.findRegex, { name: "findRegex", placeholder: "/\\*+/g" })),
    labeled("Replace with", input(script.replaceString, { name: "replaceString" })),
    labeled("Also trim (one per line)", area(script.trimStrings.join("\n"), 2, "trimStrings")),
    placementGroup,
    flagGroup,
    depths,
    removeButton("regex", `Remove regex script ${index + 1}`)
  );
  return row;
}

function assetRow(asset, index) {
  const row = el("fieldset", "ext-item");
  const grid = el("div", "field-grid");
  const list = el("datalist");
  const typeInput = input(asset.type, { name: "type" });

  list.id = `card-ext-asset-types-${index}`;
  typeInput.setAttribute("list", list.id);

  for (const type of ASSET_TYPES) {
    const option = el("option");
    option.value = type;
    list.append(option);
  }

  row.dataset.extKind = "asset";
  row.dataset.raw = JSON.stringify(asset.raw);
  grid.append(labeled("Type", typeInput), labeled("Name", input(asset.name, { name: "name" })), labeled("Extension", input(asset.ext, { name: "ext" })));
  row.append(
    el("legend", "", `Asset ${index + 1}`),
    grid,
    list,
    labeled("URI (an address, a data: URL or ccdefault:)", input(asset.uri, { name: "uri" })),
    removeButton("asset", `Remove asset ${index + 1}`)
  );
  return row;
}

function noteRow(note, index) {
  const row = el("fieldset", "ext-item");

  row.dataset.extKind = "note";
  row.append(
    el("legend", "", `Notes in another language ${index + 1}`),
    labeled("Language code", input(note.lang, { name: "lang", placeholder: "fr" })),
    labeled("Creator notes", area(note.text, 2, "text")),
    removeButton("note", `Remove notes in another language ${index + 1}`)
  );
  return row;
}

function group(title, hint, listClass, addId, addLabel) {
  const section = el("section", "ext-group");
  const heading = el("h3", "", title);
  const list = el("div", listClass);
  const add = el("button", "btn", addLabel);

  add.type = "button";
  add.id = addId;
  section.append(heading, el("p", "hint", hint), list, add);
  return { section, list };
}

export function renderCardExtras(root, extras) {
  const world = input(extras.world, { name: "world", placeholder: "The name of the lorebook a frontend attaches" });
  const useBook = el("button", "btn", "Use the linked lorebook's name");
  const fav = checkbox("Favourite (marks the card in frontends that support it)", extras.fav, "fav");
  const worldField = labeled("Attached world name", world);
  const sources = area(extras.sources.join("\n"), 2, "sources");

  useBook.type = "button";
  useBook.id = "card-ext-world-from-book";
  worldField.append(el("span", "hint", "Frontends load a lorebook by this name. It is a name, not a link to the lorebook in this app."), useBook);

  const regex = group("Regex scripts", "Text replacements a frontend applies to chat, prompts or lorebook content.", "ext-list ext-regex-list", "card-ext-regex-add", "Add a regex script");
  const assets = group("Assets", "Images, backgrounds and other files a V3 card references. The V2 format cannot carry them.", "ext-list ext-asset-list", "card-ext-asset-add", "Add an asset");
  const notes = group("Creator notes in other languages", "Notes keyed by language code (V3).", "ext-list ext-note-list", "card-ext-note-add", "Add notes for a language");

  regex.list.append(...extras.regexScripts.map(scriptRow));
  assets.list.append(...extras.assets.map(assetRow));
  notes.list.append(...extras.notes.map(noteRow));

  const sourceField = labeled("Source links (one per line)", sources);

  root.replaceChildren(worldField, fav, regex.section, assets.section, notes.section, sourceField);
}

function readRegexRow(row) {
  const value = (name) => row.querySelector(`[data-ext="${name}"]`);
  let raw = {};

  try {
    raw = JSON.parse(row.dataset.raw || "{}");
  } catch {
    raw = {};
  }

  return {
    raw,
    scriptName: value("scriptName").value,
    findRegex: value("findRegex").value,
    replaceString: value("replaceString").value,
    trimStrings: value("trimStrings").value.split("\n").filter((line) => line !== ""),
    placement: [...row.querySelectorAll('[data-ext="placement"]:checked')].map((box) => Number(box.value)),
    disabled: value("disabled").checked,
    markdownOnly: value("markdownOnly").checked,
    promptOnly: value("promptOnly").checked,
    runOnEdit: value("runOnEdit").checked,
    minDepth: depthValue(value("minDepth")),
    maxDepth: depthValue(value("maxDepth"))
  };
}

function readAssetRow(row) {
  const value = (name) => row.querySelector(`[data-ext="${name}"]`).value;
  let raw = {};

  try {
    raw = JSON.parse(row.dataset.raw || "{}");
  } catch {
    raw = {};
  }

  return { raw, type: value("type"), name: value("name"), uri: value("uri"), ext: value("ext") };
}

export function readCardExtrasForm(root) {
  const value = (name) => root.querySelector(`:scope > label [data-ext="${name}"]`);

  return {
    world: value("world")?.value ?? "",
    fav: root.querySelector(':scope > .ext-check [data-ext="fav"]')?.checked ?? false,
    regexScripts: [...root.querySelectorAll('[data-ext-kind="regex"]')].map(readRegexRow),
    assets: [...root.querySelectorAll('[data-ext-kind="asset"]')].map(readAssetRow),
    sources: (value("sources")?.value ?? "").split("\n").map((line) => line.trim()).filter(Boolean),
    notes: [...root.querySelectorAll('[data-ext-kind="note"]')].map((row) => ({
      lang: row.querySelector('[data-ext="lang"]').value,
      text: row.querySelector('[data-ext="text"]').value
    }))
  };
}

/** Add or remove a row after a click inside the extras root. Returns true when the form changed. */
export function handleCardExtrasClick(root, target) {
  const remove = target.closest("[data-ext-remove]");

  if (remove) {
    const row = remove.closest("[data-ext-kind]");
    const list = row.parentElement;
    row.remove();
    list.querySelectorAll("legend").forEach((legend, index) => {
      legend.textContent = legend.textContent.replace(/\d+$/, String(index + 1));
    });
    return true;
  }

  const adders = {
    "card-ext-regex-add": [".ext-regex-list", () => scriptRow(createRegexScript(), root.querySelectorAll('[data-ext-kind="regex"]').length)],
    "card-ext-asset-add": [".ext-asset-list", () => assetRow(createAsset(), root.querySelectorAll('[data-ext-kind="asset"]').length)],
    "card-ext-note-add": [".ext-note-list", () => noteRow({ lang: "", text: "" }, root.querySelectorAll('[data-ext-kind="note"]').length)]
  };
  const add = target.closest("button")?.id;

  if (add && adders[add]) {
    const [selector, build] = adders[add];
    const row = build();
    root.querySelector(selector).append(row);
    row.querySelector("input, textarea")?.focus();
    return true;
  }

  return false;
}
