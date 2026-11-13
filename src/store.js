import { duplicateBook, mergeBookEntries, splitBook, splitPoint } from "./books.js";
import { applyReplace } from "./replace.js";
import { createBook, createEntry, normalizeTagList } from "./schema.js";
import { clamp } from "./utils.js";

const HISTORY_LIMIT = 60;
const HISTORY_GROUP_MS = 900;
const SORT_MODES = new Set(["manual", "title", "order", "updated", "enabled"]);
export const ENTRY_FILTERS = ["enabled", "disabled", "alwaysOn", "missingKeys"];
const ENTRY_FILTER_NAMES = new Set(ENTRY_FILTERS);

let state = null;
let past = [];
let future = [];
let lastHistoryKey = "";
let lastHistoryAt = 0;
let selectedEntryIds = new Set();
let selectionAnchorId = null;
let historyListener = null;

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function snapshot() {
  return {
    activeBookId: state.activeBookId,
    activeEntryId: state.activeEntryId,
    activeCardId: state.activeCardId ?? null,
    books: clone(state.books),
    cards: clone(state.cards ?? []),
    customTemplates: clone(state.customTemplates ?? [])
  };
}

function restore(snapshotValue) {
  state.activeBookId = snapshotValue.activeBookId;
  state.activeEntryId = snapshotValue.activeEntryId;
  state.activeCardId = snapshotValue.activeCardId ?? null;
  state.books = clone(snapshotValue.books);
  state.cards = clone(snapshotValue.cards ?? []);
  state.customTemplates = clone(snapshotValue.customTemplates ?? []);
  ensureSelections();
}

function clearSampleMarker() {
  if (!state) {
    return;
  }

  for (const book of state.books) {
    if (book.extensions && book.extensions.sample) {
      delete book.extensions.sample;
    }
  }
}

function captureHistory(key = "", coalesce = true) {
  if (!state) {
    return;
  }

  const now = Date.now();

  if (coalesce && key && key === lastHistoryKey && now - lastHistoryAt < HISTORY_GROUP_MS) {
    lastHistoryAt = now;
    future = [];
    clearSampleMarker();
    notifyHistory();
    return;
  }

  past.push(snapshot());

  if (past.length > HISTORY_LIMIT) {
    past.shift();
  }

  future = [];
  lastHistoryKey = key;
  lastHistoryAt = now;
  clearSampleMarker();
  notifyHistory();
}

export function isSampleProject() {
  return Boolean(state?.books?.some((book) => book.extensions?.sample === true));
}

function resetHistory() {
  past = [];
  future = [];
  lastHistoryKey = "";
  lastHistoryAt = 0;
  notifyHistory();
}

export function getHistory() {
  return { past: past.slice(), future: future.slice() };
}

export function hydrateHistory({ past: nextPast, future: nextFuture } = {}) {
  past = Array.isArray(nextPast) ? nextPast.slice(-HISTORY_LIMIT) : [];
  future = Array.isArray(nextFuture) ? nextFuture.slice(-HISTORY_LIMIT) : [];
  lastHistoryKey = "";
  lastHistoryAt = 0;
  notifyHistory();
}

export function onHistoryChange(listener) {
  historyListener = listener;
}

function notifyHistory() {
  historyListener?.(canUndo(), canRedo());
}

function validEntryIds() {
  return new Set((getActiveBook()?.entries ?? []).map((entry) => entry.id));
}

function normalizeSelection() {
  const validIds = validEntryIds();
  selectedEntryIds = new Set([...selectedEntryIds].filter((id) => validIds.has(id)));

  if (selectionAnchorId && !validIds.has(selectionAnchorId)) {
    selectionAnchorId = null;
  }
}

function nextCopyTitle(title, entries) {  const base = title.trim() || "Untitled entry";
  const first = `${base} (copy)`;

  if (!entries.some((entry) => entry.title === first)) {
    return first;
  }

  let index = 2;

  while (entries.some((entry) => entry.title === `${base} (copy ${index})`)) {
    index += 1;
  }

  return `${base} (copy ${index})`;
}

export function initStore(project, { history = null } = {}) {
  state = project;
  resetHistory();
  clearSelection();
  ensureSelections();

  if (history) {
    hydrateHistory(history);
  }

  return state;
}

export function getState() {
  return state;
}

export function canUndo() {
  return past.length > 0;
}

export function canRedo() {
  return future.length > 0;
}

export function undo() {
  if (!past.length) {
    return false;
  }

  future.push(snapshot());
  restore(past.pop());
  lastHistoryKey = "";
  lastHistoryAt = 0;
  notifyHistory();
  return true;
}

export function redo() {
  if (!future.length) {
    return false;
  }

  past.push(snapshot());
  restore(future.pop());
  lastHistoryKey = "";
  lastHistoryAt = 0;
  notifyHistory();
  return true;
}

export function getActiveBook() {
  if (!state) {
    return null;
  }

  return state.books.find((book) => book.id === state.activeBookId) ?? state.books[0] ?? null;
}

export function getActiveEntry() {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  return book.entries.find((entry) => entry.id === state.activeEntryId) ?? null;
}

export function getSelectedEntryIds() {
  return [...selectedEntryIds];
}

export function getSelectionAnchorId() {
  return selectionAnchorId;
}

export function isEntrySelected(id) {
  return selectedEntryIds.has(id);
}

export function clearSelection() {
  selectedEntryIds = new Set();
  selectionAnchorId = null;
}

export function toggleEntrySelection(id) {
  if (!validEntryIds().has(id)) {
    return false;
  }

  if (!selectedEntryIds.size && state.activeEntryId && state.activeEntryId !== id) {
    selectedEntryIds.add(state.activeEntryId);
  }

  if (selectedEntryIds.has(id)) {
    selectedEntryIds.delete(id);

    if (selectionAnchorId === id) {
      selectionAnchorId = selectedEntryIds.has(state.activeEntryId)
        ? state.activeEntryId
        : [...selectedEntryIds].at(-1) ?? null;
    }
  } else {
    selectedEntryIds.add(id);
    selectionAnchorId = id;
  }

  if (!selectedEntryIds.size) {
    selectionAnchorId = null;
  }

  return selectedEntryIds.has(id);
}

export function selectEntryRange(ids, anchorId = null) {
  const validIds = validEntryIds();
  selectedEntryIds = new Set(ids.filter((id) => validIds.has(id)));

  if (anchorId && validIds.has(anchorId)) {
    selectionAnchorId = anchorId;
  } else if (selectionAnchorId && !validIds.has(selectionAnchorId)) {
    selectionAnchorId = null;
  }

  if (!selectedEntryIds.size) {
    selectionAnchorId = null;
  } else if (!selectionAnchorId || !selectedEntryIds.has(selectionAnchorId)) {
    selectionAnchorId = [...selectedEntryIds][0];
  }
}

export function addEntriesToSelection(ids) {
  const validIds = validEntryIds();
  let added = 0;

  for (const id of ids) {
    if (!validIds.has(id) || selectedEntryIds.has(id)) {
      continue;
    }

    selectedEntryIds.add(id);
    added += 1;
  }

  if (added) {
    selectionAnchorId = [...selectedEntryIds][0] ?? null;
  }

  return added;
}

export function ensureSelections() {
  if (!state) {
    return;
  }

  if (!state.ui || typeof state.ui !== "object") {
    state.ui = {};
  }

  if (typeof state.ui.searchQuery !== "string") {
    state.ui.searchQuery = "";
  }

  if (!SORT_MODES.has(state.ui.sortMode)) {
    state.ui.sortMode = "manual";
  }

  if (!state.ui.filters || typeof state.ui.filters !== "object") {
    state.ui.filters = {};
  }

  for (const name of ENTRY_FILTERS) {
    state.ui.filters[name] = state.ui.filters[name] === true;
  }

  if (!Array.isArray(state.ui.tagFilters)) {
    state.ui.tagFilters = [];
  }

  if (!state.books.length) {
    state.books.push(createBook({ name: "Untitled Lorebook" }));
  }

  if (!Array.isArray(state.cards)) {
    state.cards = [];
  }

  if (!Array.isArray(state.customTemplates)) {
    state.customTemplates = [];
  }

  if (!Array.isArray(state.ui.pinnedEntryIds)) {
    state.ui.pinnedEntryIds = [];
  } else {
    const validIds = new Set(state.books.flatMap((book) => book.entries.map((entry) => entry.id)));
    state.ui.pinnedEntryIds = state.ui.pinnedEntryIds.filter((id) => validIds.has(id));
  }

  const activeBook = state.books.find((book) => book.id === state.activeBookId) ?? state.books[0];
  state.activeBookId = activeBook.id;

  if (!activeBook.entries.some((entry) => entry.id === state.activeEntryId)) {
    state.activeEntryId = activeBook.entries[0]?.id ?? null;
  }

  if (state.activeCardId && !state.cards.some((card) => card.id === state.activeCardId)) {
    state.activeCardId = null;
  }

  normalizeSelection();
}

export function setActiveBook(id) {
  const book = state.books.find((item) => item.id === id);

  if (!book) {
    return;
  }

  if (!state.ui.lastEntryByBook) {
    state.ui.lastEntryByBook = {};
  }

  if (state.activeBookId && state.activeEntryId) {
    state.ui.lastEntryByBook[state.activeBookId] = state.activeEntryId;
  }

  const remembered = state.ui.lastEntryByBook[book.id];

  state.activeBookId = book.id;
  state.activeEntryId = book.entries.some((entry) => entry.id === remembered)
    ? remembered
    : book.entries[0]?.id ?? null;
  clearSelection();
}

export function setActiveEntry(id) {
  const book = getActiveBook();

  if (book?.entries.some((entry) => entry.id === id)) {
    state.activeEntryId = id;
  }
}

export function setSortMode(mode) {
  if (!SORT_MODES.has(mode)) {
    return;
  }

  if (state.ui.sortMode !== mode) {
    state.ui.sortMode = mode;
    clearSelection();
  }
}

export function getEntryFilters() {
  const filters = {};

  for (const name of ENTRY_FILTERS) {
    filters[name] = state?.ui?.filters?.[name] === true;
  }

  return filters;
}

export function setEntryFilters(next) {
  if (!state?.ui) {
    return getEntryFilters();
  }

  const filters = {};

  for (const name of ENTRY_FILTERS) {
    filters[name] = next?.[name] === true;
  }

  if (filters.enabled && filters.disabled) {
    filters.disabled = false;
  }

  state.ui.filters = filters;
  return filters;
}

export function toggleEntryFilter(name) {
  if (!ENTRY_FILTER_NAMES.has(name)) {
    return false;
  }

  const next = getEntryFilters();
  next[name] = !next[name];

  if (name === "enabled" && next.enabled) {
    next.disabled = false;
  }

  if (name === "disabled" && next.disabled) {
    next.enabled = false;
  }

  setEntryFilters(next);
  clearSelection();
  return next[name];
}

export function getTagFilters() {
  return Array.isArray(state?.ui?.tagFilters) ? [...state.ui.tagFilters] : [];
}

export function setTagFilters(tags) {
  if (!state?.ui) {
    return [];
  }

  const next = normalizeTagList(tags);

  state.ui.tagFilters = next;
  clearSelection();
  return [...next];
}

export function resetFilters() {
  if (!state?.ui) {
    return;
  }

  for (const name of ENTRY_FILTERS) {
    state.ui.filters[name] = false;
  }

  state.ui.tagFilters = [];
  clearSelection();
}

export function toggleTagFilter(tag) {
  const value = String(tag).trim();

  if (!value) {
    return false;
  }

  const current = getTagFilters();
  const next = current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];

  setTagFilters(next);
  return next.includes(value);
}

export function addBook() {
  captureHistory("add-book", false);
  const book = createBook({ name: "Untitled Lorebook" });
  state.books.push(book);
  state.activeBookId = book.id;
  state.activeEntryId = null;
  clearSelection();
  return book;
}

export function renameActiveBook(name) {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  const nextName = String(name);

  if (book.name === nextName) {
    return book;
  }

  captureHistory(`rename-book:${book.id}`);
  book.name = nextName;
  book.updatedAt = Date.now();
  return book;
}

export function updateActiveBookDescription(description) {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  const nextDescription = String(description);

  if (book.description === nextDescription) {
    return book;
  }

  captureHistory(`edit-book-description:${book.id}`);
  book.description = nextDescription;
  book.updatedAt = Date.now();
  return book;
}

export function updateActiveBookTags(tags) {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  const next = normalizeTagList(tags);

  if (JSON.stringify(book.tags ?? []) === JSON.stringify(next)) {
    return book;
  }

  captureHistory(`edit-book-tags:${book.id}`);
  book.tags = next;
  book.updatedAt = Date.now();
  return book;
}

export function updateActiveBookTokenBudget(value) {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  const next = clamp(Math.round(Number(value) || 0), 0, 10_000_000);

  if (book.tokenBudget === next) {
    return book;
  }

  captureHistory(`edit-book-budget:${book.id}`);
  book.tokenBudget = next;
  book.updatedAt = Date.now();
  return book;
}

export function duplicateActiveBook() {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  captureHistory("duplicate-book", false);
  const copy = duplicateBook(book);
  const index = state.books.findIndex((item) => item.id === book.id);
  state.books.splice(index + 1, 0, copy);
  state.activeBookId = copy.id;
  state.activeEntryId = copy.entries[0]?.id ?? null;
  clearSelection();
  return copy;
}

export function splitActiveBook(entryIds) {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  const ids = Array.isArray(entryIds) && entryIds.length ? entryIds : splitPoint(book.entries);

  if (!ids.length || ids.length >= book.entries.length) {
    return null;
  }

  captureHistory("split-book", false);
  const { kept, moved } = splitBook(book, ids);
  const index = state.books.findIndex((item) => item.id === book.id);
  state.books.splice(index, 1, kept, moved);
  state.activeBookId = moved.id;
  state.activeEntryId = moved.entries[0]?.id ?? null;
  clearSelection();
  return moved;
}

export function mergeActiveBookInto(targetId) {
  const source = getActiveBook();
  const target = state.books.find((book) => book.id === targetId);

  if (!source || !target || source.id === target.id) {
    return null;
  }

  captureHistory("merge-book", false);
  const merged = mergeBookEntries(target, source);
  const targetIndex = state.books.findIndex((book) => book.id === target.id);
  state.books[targetIndex] = merged;
  state.books = state.books.filter((book) => book.id !== source.id);
  state.activeBookId = merged.id;
  state.activeEntryId = merged.entries[0]?.id ?? null;
  clearSelection();
  return merged;
}

export function deleteBook(id = state.activeBookId) {
  const index = state.books.findIndex((book) => book.id === id);

  if (index === -1) {
    return null;
  }

  captureHistory("delete-book", false);
  const [removed] = state.books.splice(index, 1);

  if (!state.books.length) {
    state.books.push(createBook({ name: "Untitled Lorebook" }));
  }

  if (!state.books.some((book) => book.id === state.activeBookId)) {
    state.activeBookId = state.books[0].id;
    state.activeEntryId = state.books[0].entries[0]?.id ?? null;
  }

  clearSelection();
  return removed;
}

export function addEntry(patch = {}) {
  const book = getActiveBook();

  if (!book) {
    return null;
  }

  captureHistory("add-entry", false);
  const highestOrder = book.entries.reduce((highest, entry) => Math.max(highest, entry.order), 0);
  const defaults = state.ui?.entryDefaults ?? {};
  const merged = { ...defaults, ...patch };
  const entry = createEntry({
    ...merged,
    order: highestOrder + 10
  });
  book.entries.push(entry);
  book.updatedAt = Date.now();
  state.activeEntryId = entry.id;
  clearSelection();
  return entry;
}

export function duplicateEntry(id = state.activeEntryId) {
  const book = getActiveBook();
  const sourceIndex = book?.entries.findIndex((entry) => entry.id === id) ?? -1;

  if (!book || sourceIndex === -1) {
    return null;
  }

  const source = book.entries[sourceIndex];
  captureHistory("duplicate-entry", false);
  const extensions = clone(source.extensions ?? {});

  if (extensions.sourceId) {
    extensions.duplicatedFromSourceId = extensions.sourceId;
    delete extensions.sourceId;
  }

  const {
    id: sourceId,
    createdAt,
    updatedAt,
    ...entryFields
  } = source;
  const copy = createEntry({
    ...entryFields,
    title: nextCopyTitle(source.title, book.entries),
    extensions
  });

  book.entries.splice(sourceIndex + 1, 0, copy);
  book.updatedAt = Date.now();
  state.activeEntryId = copy.id;
  clearSelection();
  return copy;
}

export function updateActiveEntry(patch) {
  const entry = getActiveEntry();
  const book = getActiveBook();

  if (!entry || !book) {
    return null;
  }

  const fields = Object.keys(patch);

  if (!fields.some((field) => entry[field] !== patch[field])) {
    return entry;
  }

  captureHistory(`${entry.id}:${fields.sort().join(",")}`);
  Object.assign(entry, patch, { updatedAt: Date.now() });
  book.updatedAt = Date.now();
  return entry;
}

export function deleteActiveEntry() {
  const book = getActiveBook();
  const entry = getActiveEntry();

  if (!book || !entry) {
    return null;
  }

  captureHistory("delete-entry", false);
  const index = book.entries.findIndex((item) => item.id === entry.id);
  book.entries.splice(index, 1);
  const nextEntry = book.entries[index] ?? book.entries[index - 1] ?? null;
  state.activeEntryId = nextEntry?.id ?? null;
  book.updatedAt = Date.now();
  clearSelection();
  return entry;
}

export function deleteEntries(ids) {
  const book = getActiveBook();

  if (!book) {
    return 0;
  }

  const targets = new Set(ids);
  const removed = book.entries.filter((entry) => targets.has(entry.id));

  if (!removed.length) {
    return 0;
  }

  captureHistory("delete-entries", false);
  const activeRemoved = targets.has(state.activeEntryId);
  const firstIndex = book.entries.findIndex((entry) => targets.has(entry.id));
  book.entries = book.entries.filter((entry) => !targets.has(entry.id));
  book.updatedAt = Date.now();

  if (activeRemoved) {
    const nextIndex = Math.min(firstIndex, book.entries.length - 1);
    state.activeEntryId = book.entries[nextIndex]?.id ?? null;
  }

  clearSelection();
  return removed.length;
}

export function setEntriesEnabled(ids, enabled) {
  const book = getActiveBook();

  if (!book) {
    return 0;
  }

  const targets = new Set(ids);
  const changed = book.entries.filter((entry) => targets.has(entry.id) && entry.enabled !== enabled);

  if (!changed.length) {
    return 0;
  }

  captureHistory(`bulk-enabled:${enabled}`, false);
  const now = Date.now();

  for (const entry of changed) {
    entry.enabled = enabled;
    entry.updatedAt = now;
  }

  book.updatedAt = now;
  return changed.length;
}

export function setEntriesOrder(ids, order) {
  const book = getActiveBook();

  if (!book) {
    return 0;
  }

  const targets = new Set(ids);
  const next = clamp(Math.round(Number(order) || 0), 0, 9999);
  const changed = book.entries.filter((entry) => targets.has(entry.id) && entry.order !== next);

  if (!changed.length) {
    return 0;
  }

  captureHistory(`bulk-order:${next}`, false);
  const now = Date.now();

  for (const entry of changed) {
    entry.order = next;
    entry.updatedAt = now;
  }

  book.updatedAt = now;
  return changed.length;
}

export function addTagToEntries(ids, tag) {
  const book = getActiveBook();
  const value = String(tag ?? "").trim();

  if (!book || !value) {
    return 0;
  }

  const targets = new Set(ids);
  const changed = book.entries.filter((entry) => targets.has(entry.id) && !entry.tags.includes(value));

  if (!changed.length) {
    return 0;
  }

  captureHistory(`bulk-tag-add:${value}`, false);
  const now = Date.now();

  for (const entry of changed) {
    entry.tags = normalizeTagList([...entry.tags, value]);
    entry.updatedAt = now;
  }

  book.updatedAt = now;
  return changed.length;
}

export function removeTagFromEntries(ids, tag) {
  const book = getActiveBook();
  const value = String(tag ?? "").trim();

  if (!book || !value) {
    return 0;
  }

  const targets = new Set(ids);
  const changed = book.entries.filter((entry) => targets.has(entry.id) && entry.tags.includes(value));

  if (!changed.length) {
    return 0;
  }

  captureHistory(`bulk-tag-remove:${value}`, false);
  const now = Date.now();

  for (const entry of changed) {
    entry.tags = entry.tags.filter((item) => item !== value);
    entry.updatedAt = now;
  }

  book.updatedAt = now;
  return changed.length;
}

export function adjustEntriesOrder(ids, delta) {  const book = getActiveBook();

  if (!book) {
    return 0;
  }

  const targets = new Set(ids);
  const changed = book.entries.filter((entry) => targets.has(entry.id));

  if (!changed.length) {
    return 0;
  }

  captureHistory(`bulk-order-shift:${delta}`, false);
  const now = Date.now();

  for (const entry of changed) {
    entry.order = clamp(Math.round(entry.order + delta), 0, 9999);
    entry.updatedAt = now;
  }

  book.updatedAt = now;
  return changed.length;
}

export function applyReplacePlan(plan) {
  const book = getActiveBook();

  if (!book || !plan?.changes?.length) {
    return 0;
  }

  captureHistory("bulk-replace", false);
  const touched = applyReplace(book, plan);
  return touched;
}

export function moveEntry(sourceId, targetId, place = "before") {
  const book = getActiveBook();

  if (!book || sourceId === targetId) {
    return false;
  }

  const sourceIndex = book.entries.findIndex((entry) => entry.id === sourceId);

  if (sourceIndex === -1) {
    return false;
  }

  captureHistory("move-entry", false);
  const [entry] = book.entries.splice(sourceIndex, 1);
  const targetIndex = book.entries.findIndex((item) => item.id === targetId);

  if (targetIndex === -1) {
    book.entries.splice(sourceIndex, 0, entry);
    return false;
  }

  const insertIndex = place === "after" ? targetIndex + 1 : targetIndex;
  book.entries.splice(insertIndex, 0, entry);
  book.updatedAt = Date.now();
  return true;
}

export function setSearchQuery(query) {
  const nextQuery = String(query);

  if (state.ui.searchQuery !== nextQuery) {
    clearSelection();
  }

  state.ui.searchQuery = nextQuery;
}

export function replaceProject(project) {
  captureHistory("replace-project", false);
  state = project;
  clearSelection();
  ensureSelections();
  return state;
}

export function getCards() {
  return state?.cards ?? [];
}

export function getCard(id) {
  return (state?.cards ?? []).find((card) => card.id === id) ?? null;
}

export function getActiveCard() {
  if (!state?.activeCardId) {
    return null;
  }

  return getCard(state.activeCardId);
}

export function addCard(card) {
  if (!state || !card) {
    return null;
  }

  captureHistory("add-card", false);
  state.cards = state.cards ?? [];
  state.cards.push(card);
  state.activeCardId = card.id;
  return card;
}

export function updateCard(id, patch) {
  const card = getCard(id);

  if (!card) {
    return null;
  }

  captureHistory(`update-card:${id}:${Object.keys(patch).join(",")}`);
  Object.assign(card, patch, { updatedAt: Date.now() });
  return card;
}

export function deleteCard(id) {
  if (!state?.cards) {
    return false;
  }

  const index = state.cards.findIndex((card) => card.id === id);

  if (index === -1) {
    return false;
  }

  captureHistory("delete-card", false);
  state.cards.splice(index, 1);

  if (state.activeCardId === id) {
    state.activeCardId = state.cards[Math.min(index, state.cards.length - 1)]?.id ?? null;
  }

  return true;
}

export function setActiveCard(id) {
  if (id === null || (state?.cards ?? []).some((card) => card.id === id)) {
    state.activeCardId = id;
  }
}

export function linkCardBook(cardId, bookId) {
  const card = getCard(cardId);

  if (!card) {
    return false;
  }

  if (bookId !== null && !state.books.some((book) => book.id === bookId)) {
    return false;
  }

  captureHistory("link-card-book", false);
  card.bookId = bookId;
  card.updatedAt = Date.now();
  return true;
}

export function getCustomTemplates() {
  return state?.customTemplates ?? [];
}

export function saveCustomTemplate({ name, patch }) {
  if (!state) {
    return null;
  }

  const label = String(name ?? "").trim() || "Untitled template";
  captureHistory("save-template", false);
  state.customTemplates = state.customTemplates ?? [];
  state.customTemplates.push({
    id: `template_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: label,
    patch: clone(patch)
  });
  return state.customTemplates.at(-1);
}

export function deleteCustomTemplate(id) {
  if (!state?.customTemplates) {
    return false;
  }

  const index = state.customTemplates.findIndex((template) => template.id === id);

  if (index === -1) {
    return false;
  }

  captureHistory("delete-template", false);
  state.customTemplates.splice(index, 1);
  return true;
}

export function togglePinnedEntry(id) {
  const book = getActiveBook();

  if (!book || !book.entries.some((entry) => entry.id === id)) {
    return false;
  }

  const pinned = state.ui.pinnedEntryIds ?? [];
  const index = pinned.indexOf(id);

  if (index === -1) {
    pinned.push(id);
  } else {
    pinned.splice(index, 1);
  }

  state.ui.pinnedEntryIds = pinned;
  return index === -1;
}

export function getPinnedEntryIds() {
  return [...(state?.ui?.pinnedEntryIds ?? [])];
}

export function getRecentEntries() {
  const book = getActiveBook();

  if (!book) {
    return [];
  }

  return [...book.entries]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 5)
    .map((entry) => ({ id: entry.id, title: entry.title.trim() || "Untitled entry" }));
}

export function setSearchRegex(active) {
  if (!state?.ui) {
    return false;
  }

  state.ui.searchRegex = active === true;
  return state.ui.searchRegex;
}

export function getSearchRegex() {
  return state?.ui?.searchRegex === true;
}

export function getEntryDefaults() {
  const defaults = state?.ui?.entryDefaults ?? {};

  return {
    constant: defaults.constant === true,
    selective: defaults.selective === true,
    caseSensitive: defaults.caseSensitive === true,
    matchWholeWords: defaults.matchWholeWords === true
  };
}

export function setEntryDefaults(patch = {}) {
  if (!state) {
    return getEntryDefaults();
  }

  captureHistory("set-entry-defaults", false);
  state.ui.entryDefaults = {
    ...getEntryDefaults(),
    ...patch
  };
  return getEntryDefaults();
}
