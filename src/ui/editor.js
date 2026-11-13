import { getActiveBook, getActiveEntry } from "../store.js";
import { advancedFieldsFor, readAdvancedField } from "../advanced.js";
import { getTextStats } from "../utils.js";

const numberFormatter = new Intl.NumberFormat("en-US");

export function syncEntryStats(refs, content) {
  const { chars, words, tokens } = getTextStats(content);
  const measured = refs.tokenCount ? refs.tokenCount(content) : null;

  refs.entryStatChars.textContent = numberFormatter.format(chars);
  refs.entryStatWords.textContent = numberFormatter.format(words);
  refs.entryStatTokens.textContent = Number.isFinite(measured)
    ? numberFormatter.format(measured)
    : `~${numberFormatter.format(tokens)}`;
}

export function renderEditor(refs) {
  const book = getActiveBook();
  const entry = getActiveEntry();
  const hasEntry = Boolean(entry);

  refs.editorEmpty.hidden = hasEntry;
  refs.editorPane.hidden = !hasEntry;

  if (!hasEntry) {
    const hasEntries = Boolean(book?.entries.length);
    refs.emptyTitle.textContent = hasEntries ? "Select an entry" : "Start your lorebook";
    refs.emptyText.textContent = hasEntries
      ? "Choose an entry from the sidebar or create a new one."
      : "This lorebook is empty. Create your first entry to begin building the world.";
    return;
  }

  refs.entryTitle.value = entry.title;
  refs.entryEnabled.checked = entry.enabled;
  refs.keyChips?.setKeys(entry.keys);
  refs.secondaryKeyChips?.setKeys(entry.secondaryKeys);
  refs.entryTagChips?.setKeys(entry.tags ?? []);
  refs.entryContent.value = entry.content;
  refs.entryNotes.value = entry.notes;
  refs.entryOrder.value = String(entry.order);
  refs.entryPosition.value = entry.position;
  refs.entryProbability.value = String(entry.probability);
  refs.entryProbabilityOutput.textContent = `${entry.probability}%`;
  refs.entryTokenLimit.value = String(entry.tokenLimit ?? 0);
  refs.entryCharLimit.value = String(entry.charLimit ?? 0);
  refs.entryConstant.checked = entry.constant;
  refs.entrySelective.checked = entry.selective;
  refs.entryCaseSensitive.checked = entry.caseSensitive;
  refs.entryWholeWords.checked = entry.matchWholeWords;

  if (refs.entryColorRow) {
    const color = entry.color ?? "";

    for (const option of refs.entryColorRow.querySelectorAll("[data-color]")) {
      option.classList.toggle("is-active", option.dataset.color === color);
      option.setAttribute("aria-pressed", String(option.dataset.color === color));
    }
  }

  renderAdvancedFields(refs, entry);

  refs.requestTokens?.(entry.content);
  syncEntryStats(refs, entry.content);
}

function renderAdvancedFields(refs, entry) {
  if (!refs.advancedFields || !refs.advancedFieldsBody) {
    return;
  }

  const fields = advancedFieldsFor(entry);
  refs.advancedFields.hidden = !fields.length;
  refs.advancedFieldsBody.replaceChildren();

  for (const field of fields) {
    const value = readAdvancedField(entry, field.key);
    const label = document.createElement("label");
    const name = document.createElement("span");
    label.className = "advanced-field";
    name.textContent = field.label;
    label.append(name);

    if (field.type === "boolean") {
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = value === true;
      checkbox.dataset.advancedKey = field.key;
      checkbox.dataset.advancedType = "boolean";
      label.append(checkbox);
    } else if (field.type === "select") {
      const select = document.createElement("select");
      select.dataset.advancedKey = field.key;
      select.dataset.advancedType = "select";

      for (const option of field.options) {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = option;
        select.append(item);
      }

      select.value = String(value ?? field.options[0]);
      label.append(select);
    } else {
      const input = document.createElement("input");
      input.type = field.type === "number" ? "number" : "text";
      input.value = value === undefined || value === null ? "" : String(value);

      if (field.type === "number") {
        input.min = String(field.min);
        input.max = String(field.max);
        input.step = String(field.step);
        input.inputmode = "numeric";
      }

      input.dataset.advancedKey = field.key;
      input.dataset.advancedType = field.type;
      label.append(input);
    }

    refs.advancedFieldsBody.append(label);
  }
}
