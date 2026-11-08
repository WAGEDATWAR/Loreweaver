import {
  CARD_ADAPTER,
  EXPORT_FORMATS,
  buildExport,
  downloadBytes,
  downloadJson,
  parseProject,
  serializeLorebook
} from "./format.js";
import {
  addBook,
  addEntriesToSelection,
  addTagToEntries,
  removeTagFromEntries,
  addEntry,
  adjustEntriesOrder,
  applyReplacePlan,
  canRedo,
  canUndo,
  clearSelection,
  deleteActiveEntry,
  deleteBook,
  deleteEntries,
  duplicateActiveBook,
  duplicateEntry,
  getActiveBook,
  getActiveEntry,
  getEntryFilters,
  getHistory,
  getSelectedEntryIds,
  getSelectionAnchorId,
  getState,
  getTagFilters,
  hydrateHistory,
  isSampleProject,
  initStore,
  mergeActiveBookInto,
  moveEntry,
  onHistoryChange,
  redo,
  renameActiveBook,
  replaceProject,
  selectEntryRange,
  setActiveBook,
  setActiveEntry,
  setEntriesEnabled,
  setEntriesOrder,
  setEntryFilters,
  resetFilters,
  setSearchQuery,
  setSortMode,
  setTagFilters,
  splitActiveBook,
  toggleEntryFilter,
  toggleEntrySelection,
  toggleTagFilter,
  undo,
  updateActiveBookDescription,
  updateActiveBookTags,
  updateActiveBookTokenBudget,
  updateActiveEntry,
  addCard,
  getActiveCard,
  getCards,
  updateCard,
  deleteCard,
  setActiveCard,
  linkCardBook
} from "./store.js";
import {
  getProjectBackupInfo,
  getRevisionIntegrity,
  getRevisions,
  getStorageUsage,
  initStorage,
  loadHistory,
  loadProject,
  loadProjectBackup,
  loadRevision,
  repairRevisions,
  saveHistory,
  saveProjectBackup,
  saveProjectDetailed,
  saveRevision
} from "./storage.js";
import { diffProjects } from "./diff.js";
import { checkProjectIntegrity, repairProject } from "./integrity.js";
import { MAX_IMPORT_BYTES } from "./limits.js";
import { parseHistory, serializeHistory } from "./history.js";
import { IMPORT_STRATEGIES, mergeProject } from "./merge.js";
import { createSampleProject } from "./sample.js";
import { createCard, createProject, normalizeTagList } from "./schema.js";
import { searchProject } from "./search.js";
import { suggestKeys } from "./suggestKeys.js";
import { storageKey } from "./storage/namespace.js";
import {
  CONTEXT_WINDOW_PRESETS,
  DEFAULT_TOKEN_SETTINGS,
  TOKENIZER_PRESETS,
  getContextWindowPreset,
  getTokenizerPreset,
  normalizeTokenSettings
} from "./settings.js";
import { SIMULATION_REASONS, simulateContext } from "./simulation.js";
import { buildActivationGraph } from "./activationGraph.js";
import { createTokenizer, estimateTokens } from "./tokenizer/client.js";
import { buildBookOverview } from "./overview.js";
import { ENTRY_TEMPLATES, buildTemplatePatch, getEntryTemplate } from "./templates.js";
import { showDiffDialog } from "./ui/diff.js";
import { openCommandPalette } from "./ui/commandPalette.js";
import { renderEditor, syncEntryStats } from "./ui/editor.js";
import { createKeyChips } from "./ui/keyChips.js";
import { confirmAction, toast } from "./ui/overlays.js";
import { getVisibleEntryIds, renderSidebar } from "./ui/sidebar.js";
import { fillCardForm, readCardForm, renderCardList } from "./ui/cards.js";
import { clamp } from "./utils.js";
import { selectEntriesByTokenSize } from "./bulk.js";
import { applyReplace, parseReplaceQuery, planReplace } from "./replace.js";
import { VALIDATION_LABELS, validateBook } from "./validation.js";

const refs = {
  workspace: document.querySelector(".workspace"),
  sidebar: document.querySelector("#sidebar"),
  sidebarContent: document.querySelector("#sidebar-content"),
  sidebarToggle: document.querySelector("#sidebar-toggle"),
  sidebarResizer: document.querySelector("#sidebar-resizer"),
  bookName: document.querySelector("#book-name"),
  bookDescription: document.querySelector("#book-description"),
  bookDescriptionPreview: document.querySelector("#book-description-preview"),
  bookTagsContainer: document.querySelector("#book-tags"),
  bookTagsInput: document.querySelector("#book-tags-input"),
  bookTokenBudget: document.querySelector("#book-token-budget"),
  bookBudgetStatus: document.querySelector("#book-budget-status"),
  cardList: document.querySelector("#card-list"),
  cardCount: document.querySelector("#card-count"),
  newCardBtn: document.querySelector("#new-card-btn"),
  cardDialog: document.querySelector("#card-dialog"),
  cardName: document.querySelector("#card-name"),
  cardPersonality: document.querySelector("#card-personality"),
  cardScenario: document.querySelector("#card-scenario"),
  cardFirstMessage: document.querySelector("#card-first-message"),
  cardExampleMessages: document.querySelector("#card-example-messages"),
  cardSystemPrompt: document.querySelector("#card-system-prompt"),
  cardPostHistory: document.querySelector("#card-post-history"),
  cardCreator: document.querySelector("#card-creator"),
  cardVersion: document.querySelector("#card-version"),
  cardCreatorNotes: document.querySelector("#card-creator-notes"),
  cardLinkBook: document.querySelector("#card-link-book"),
  cardAvatar: document.querySelector("#card-avatar"),
  cardAvatarInput: document.querySelector("#card-avatar-input"),
  cardStatus: document.querySelector("#card-status"),
  cardDelete: document.querySelector("#card-delete"),
  cardExport: document.querySelector("#card-export"),
  cardCancel: document.querySelector("#card-cancel"),
  cardSave: document.querySelector("#card-save"),
  saveState: document.querySelector("#save-state"),
  storageBanner: document.querySelector("#storage-banner"),
  storageBannerMessage: document.querySelector("#storage-banner-message"),
  storageExportBtn: document.querySelector("#storage-export-btn"),
  storageRetryBtn: document.querySelector("#storage-retry-btn"),
  storageDismissBtn: document.querySelector("#storage-dismiss-btn"),
  undoBtn: document.querySelector("#undo-btn"),
  redoBtn: document.querySelector("#redo-btn"),
  historyBtn: document.querySelector("#history-btn"),
  historyDialog: document.querySelector("#history-dialog"),
  historyCount: document.querySelector("#history-count"),
  historyStatus: document.querySelector("#history-status"),
  historyList: document.querySelector("#history-list"),
  historySaveBtn: document.querySelector("#history-save-btn"),
  historyCloseBtn: document.querySelector("#history-close"),
  importBtn: document.querySelector("#import-btn"),
  exportBtn: document.querySelector("#export-btn"),
  openFileBtn: document.querySelector("#open-file-btn"),
  saveFileBtn: document.querySelector("#save-file-btn"),
  fileName: document.querySelector("#file-name"),
  importInput: document.querySelector("#import-input"),
  exportDialog: document.querySelector("#export-dialog"),
  exportBookName: document.querySelector("#export-book-name"),
  exportOptions: document.querySelector("#export-options"),
  exportCancelBtn: document.querySelector("#export-cancel"),
  backupStatus: document.querySelector("#backup-status"),
  restoreBackupBtn: document.querySelector("#restore-backup-btn"),
  backupReminder: document.querySelector("#backup-reminder"),
  backupReminderExportBtn: document.querySelector("#backup-reminder-export-btn"),
  backupReminderDismissBtn: document.querySelector("#backup-reminder-dismiss-btn"),
  sessionSummary: document.querySelector("#session-summary"),
  sessionSummaryMessage: document.querySelector("#session-summary-message"),
  sessionSummaryExportBtn: document.querySelector("#session-summary-export-btn"),
  sessionSummaryDismissBtn: document.querySelector("#session-summary-dismiss-btn"),
  storageUsageTotal: document.querySelector("#storage-usage-total"),
  storageUsageBackend: document.querySelector("#storage-usage-backend"),
  storageUsageProject: document.querySelector("#storage-usage-project"),
  storageUsageRevisions: document.querySelector("#storage-usage-revisions"),
  commandBtn: document.querySelector("#command-btn"),
  sampleBadge: document.querySelector("#sample-badge"),
  onboardingDialog: document.querySelector("#onboarding-dialog"),
  onboardingSampleBtn: document.querySelector("#onboarding-sample"),
  onboardingEmptyBtn: document.querySelector("#onboarding-empty"),
  onboardingGuideBtn: document.querySelector("#onboarding-guide"),
  sampleDialog: document.querySelector("#sample-dialog"),
  sampleResetBtn: document.querySelector("#sample-reset"),
  sampleEmptyBtn: document.querySelector("#sample-empty"),
  sampleCancelBtn: document.querySelector("#sample-cancel"),
  aboutBtn: document.querySelector("#about-btn"),
  aboutDialog: document.querySelector("#about-dialog"),
  aboutVersion: document.querySelector("#about-version"),
  aboutImportFormats: document.querySelector("#about-import-formats"),
  aboutExportFormats: document.querySelector("#about-export-formats"),
  aboutStorage: document.querySelector("#about-storage"),
  aboutGuideBtn: document.querySelector("#about-guide-btn"),
  aboutTokenBtn: document.querySelector("#about-token-btn"),
  aboutIntegrityBtn: document.querySelector("#about-integrity-btn"),
  tokenSettingsDialog: document.querySelector("#token-settings-dialog"),
  tokenizerPreset: document.querySelector("#tokenizer-preset"),
  tokenizerPresetHint: document.querySelector("#tokenizer-preset-hint"),
  contextWindowPreset: document.querySelector("#context-window-preset"),
  tokenSettingsCloseBtn: document.querySelector("#token-settings-close"),
  overviewContext: document.querySelector("#overview-context"),
  overviewTokenizer: document.querySelector("#overview-tokenizer"),
  aboutCloseBtn: document.querySelector("#about-close"),
  integrityDialog: document.querySelector("#integrity-dialog"),
  integritySummary: document.querySelector("#integrity-summary"),
  integrityResults: document.querySelector("#integrity-results"),
  integrityRepairBtn: document.querySelector("#integrity-repair"),
  integrityCloseBtn: document.querySelector("#integrity-close"),
  globalSearchDialog: document.querySelector("#global-search-dialog"),
  globalSearchInput: document.querySelector("#global-search-input"),
  globalSearchSummary: document.querySelector("#global-search-summary"),
  globalSearchResults: document.querySelector("#global-search-results"),
  globalSearchCloseBtn: document.querySelector("#global-search-close"),
  guideDialog: document.querySelector("#guide-dialog"),
  guideCloseBtn: document.querySelector("#guide-close"),
  bookSelect: document.querySelector("#book-select"),
  bookActionsBtn: document.querySelector("#book-actions-btn"),
  bookActionsDialog: document.querySelector("#book-actions-dialog"),
  bookActionsSummary: document.querySelector("#book-actions-summary"),
  bookDuplicateBtn: document.querySelector("#book-duplicate"),
  bookSplitBtn: document.querySelector("#book-split"),
  bookMergeTarget: document.querySelector("#book-merge-target"),
  bookMergeBtn: document.querySelector("#book-merge"),
  bookActionsCloseBtn: document.querySelector("#book-actions-close"),
  newBookBtn: document.querySelector("#new-book-btn"),
  deleteBookBtn: document.querySelector("#delete-book-btn"),
  entrySearch: document.querySelector("#entry-search"),
  entrySort: document.querySelector("#entry-sort"),
  entryFilters: document.querySelector("#entry-filters"),
  tagFilters: document.querySelector("#tag-filters"),
  entryCount: document.querySelector("#entry-count"),
  overviewBtn: document.querySelector("#overview-btn"),
  overviewDialog: document.querySelector("#overview-dialog"),
  overviewSummary: document.querySelector("#overview-summary"),
  overviewEntries: document.querySelector("#overview-entries"),
  overviewEnabled: document.querySelector("#overview-enabled"),
  overviewTokens: document.querySelector("#overview-tokens"),
  overviewEnabledTokens: document.querySelector("#overview-enabled-tokens"),
  overviewKeys: document.querySelector("#overview-keys"),
  overviewCoverage: document.querySelector("#overview-coverage"),
  overviewMeterBar: document.querySelector("#overview-meter-bar"),
  overviewAlwaysOn: document.querySelector("#overview-always-on"),
  overviewMissingKeys: document.querySelector("#overview-missing-keys"),
  overviewSharedKeys: document.querySelector("#overview-shared-keys"),
  overviewAverage: document.querySelector("#overview-average"),
  overviewBudget: document.querySelector("#overview-budget"),
  simulationBtn: document.querySelector("#simulation-btn"),
  simulationDialog: document.querySelector("#simulation-dialog"),
  simulationInput: document.querySelector("#simulation-input"),
  simulationRunBtn: document.querySelector("#simulation-run"),
  simulationSummary: document.querySelector("#simulation-summary"),
  simulationResults: document.querySelector("#simulation-results"),
  simulationCloseBtn: document.querySelector("#simulation-close"),
  overviewLongest: document.querySelector("#overview-longest"),
  overviewCloseBtn: document.querySelector("#overview-close"),
  validationBtn: document.querySelector("#validation-btn"),
  validationCount: document.querySelector("#validation-count"),
  validationDialog: document.querySelector("#validation-dialog"),
  validationSummary: document.querySelector("#validation-summary"),
  validationCategories: document.querySelector("#validation-categories"),
  validationIssues: document.querySelector("#validation-issues"),
  validationCloseBtn: document.querySelector("#validation-close"),
  entryList: document.querySelector("#entry-list"),
  templateBtn: document.querySelector("#template-btn"),
  templateDialog: document.querySelector("#template-dialog"),
  templateList: document.querySelector("#template-list"),
  templateCloseBtn: document.querySelector("#template-close"),
  bulkBar: document.querySelector("#bulk-bar"),
  bulkCount: document.querySelector("#bulk-count"),
  bulkEnableBtn: document.querySelector("#bulk-enable-btn"),
  bulkDisableBtn: document.querySelector("#bulk-disable-btn"),
  bulkDeleteBtn: document.querySelector("#bulk-delete-btn"),
  bulkClearBtn: document.querySelector("#bulk-clear-btn"),
  bulkSizeBtn: document.querySelector("#bulk-size-btn"),
  bulkSizeDialog: document.querySelector("#bulk-size-dialog"),
  bulkSizeMin: document.querySelector("#bulk-size-min"),
  bulkSizeMax: document.querySelector("#bulk-size-max"),
  bulkSizeDisabled: document.querySelector("#bulk-size-disabled"),
  bulkSizeSummary: document.querySelector("#bulk-size-summary"),
  bulkSizeCancel: document.querySelector("#bulk-size-cancel"),
  bulkSizeApply: document.querySelector("#bulk-size-apply"),
  bulkTagBtn: document.querySelector("#bulk-tag-btn"),
  bulkTagDialog: document.querySelector("#bulk-tag-dialog"),
  bulkTagInput: document.querySelector("#bulk-tag-input"),
  bulkTagCancel: document.querySelector("#bulk-tag-cancel"),
  bulkTagAdd: document.querySelector("#bulk-tag-add"),
  bulkTagRemove: document.querySelector("#bulk-tag-remove"),
  replaceDialog: document.querySelector("#replace-dialog"),
  replaceFind: document.querySelector("#replace-find"),
  replaceWith: document.querySelector("#replace-with"),
  replaceRegex: document.querySelector("#replace-regex"),
  replaceCase: document.querySelector("#replace-case"),
  replaceFieldContent: document.querySelector("#replace-field-content"),
  replaceFieldTitle: document.querySelector("#replace-field-title"),
  replaceFieldKeys: document.querySelector("#replace-field-keys"),
  replaceFieldNotes: document.querySelector("#replace-field-notes"),
  replaceSummary: document.querySelector("#replace-summary"),
  replaceCancel: document.querySelector("#replace-cancel"),
  replacePreview: document.querySelector("#replace-preview"),
  replaceApply: document.querySelector("#replace-apply"),
  bulkOrderDownBtn: document.querySelector("#bulk-order-down"),
  bulkOrderUpBtn: document.querySelector("#bulk-order-up"),
  bulkOrderApplyBtn: document.querySelector("#bulk-order-apply"),
  bulkOrderInput: document.querySelector("#bulk-order-input"),
  addEntryBtn: document.querySelector("#add-entry-btn"),
  emptyAddBtn: document.querySelector("#empty-add-btn"),
  editorEmpty: document.querySelector("#editor-empty"),
  editorPane: document.querySelector("#editor-pane"),
  detailsPanel: document.querySelector("#details-panel"),
  detailsToggle: document.querySelector("#details-toggle"),
  emptyTitle: document.querySelector("#empty-title"),
  emptyText: document.querySelector("#empty-text"),
  entryTitle: document.querySelector("#entry-title"),
  entryEnabled: document.querySelector("#entry-enabled"),
  duplicateEntryBtn: document.querySelector("#duplicate-entry-btn"),
  deleteEntryBtn: document.querySelector("#delete-entry-btn"),
  entryKeysContainer: document.querySelector("#entry-keys"),
  entryKeysInput: document.querySelector("#entry-keys-input"),
  suggestKeysBtn: document.querySelector("#suggest-keys-btn"),
  peekBtn: document.querySelector("#peek-btn"),
  peekDialog: document.querySelector("#peek-dialog"),
  peekMeta: document.querySelector("#peek-meta"),
  peekBody: document.querySelector("#peek-body"),
  peekClose: document.querySelector("#peek-close"),
  entrySecondaryKeysContainer: document.querySelector("#entry-secondary-keys"),
  entrySecondaryKeysInput: document.querySelector("#entry-secondary-keys-input"),
  entryTagsContainer: document.querySelector("#entry-tags"),
  entryTagsInput: document.querySelector("#entry-tags-input"),
  entryContent: document.querySelector("#entry-content"),
  entryNotes: document.querySelector("#entry-notes"),
  entryStatChars: document.querySelector("#entry-stat-chars"),
  entryStatWords: document.querySelector("#entry-stat-words"),
  entryStatTokens: document.querySelector("#entry-stat-tokens"),
  entryOrder: document.querySelector("#entry-order"),
  entryPosition: document.querySelector("#entry-position"),
  entryProbability: document.querySelector("#entry-probability"),
  entryTokenLimit: document.querySelector("#entry-token-limit"),
  entryCharLimit: document.querySelector("#entry-char-limit"),
  entryProbabilityOutput: document.querySelector("#entry-probability-output"),
  entryConstant: document.querySelector("#entry-constant"),
  entrySelective: document.querySelector("#entry-selective"),
  entryCaseSensitive: document.querySelector("#entry-case-sensitive"),
  entryWholeWords: document.querySelector("#entry-whole-words")
};

refs.keyChips = createKeyChips({
  container: refs.entryKeysContainer,
  input: refs.entryKeysInput,
  label: "trigger key",
  onChange: (keys) => {
    updateActiveEntry({ keys });
    renderSidebar(refs);
    scheduleSave();
  }
});

refs.secondaryKeyChips = createKeyChips({
  container: refs.entrySecondaryKeysContainer,
  input: refs.entrySecondaryKeysInput,
  label: "secondary key",
  onChange: (keys) => {
    updateActiveEntry({ secondaryKeys: keys });
    renderSidebar(refs);
    scheduleSave();
  }
});

refs.entryTagChips = createKeyChips({
  container: refs.entryTagsContainer,
  input: refs.entryTagsInput,
  label: "tag",
  regex: false,
  onChange: (tags) => {
    updateActiveEntry({ tags: normalizeTagList(tags) });
    renderSidebar(refs);
    scheduleSave();
  }
});

refs.bookTagChips = createKeyChips({
  container: refs.bookTagsContainer,
  input: refs.bookTagsInput,
  label: "book tag",
  regex: false,
  onChange: (tags) => {
    updateActiveBookTags(tags);
    renderSidebar(refs);
    scheduleSave();
  }
});

const tokenizer = createTokenizer({ onUpdate: handleTokenUpdate });

refs.tokenCount = (text) => tokenizer.count(text);
refs.requestTokens = (text) => tokenizer.request(text);

let saveTimer = 0;
let historySaveTimer = 0;
let saveFailed = false;
let unsavedChanges = false;
let projectFileHandle = null;
let simulationTimer = 0;
let validationFilters = new Set();
let tokenSettings = { ...DEFAULT_TOKEN_SETTINGS };
const numberFormatter = new Intl.NumberFormat("en-US");

const DETAILS_STATE_KEY = storageKey("details-collapsed:v1");
const SIDEBAR_STATE_KEY = storageKey("sidebar-collapsed:v1");
const SIDEBAR_WIDTH_KEY = storageKey("sidebar-width:v1");
const SORT_STATE_KEY = storageKey("sort:v1");
const FILTER_STATE_KEY = storageKey("filters:v1");
const TAG_FILTER_STATE_KEY = storageKey("tag-filters:v1");
const ONBOARDED_KEY = storageKey("onboarded:v1");
const TOKEN_SETTINGS_KEY = storageKey("token-settings:v1");
const LAST_BACKUP_KEY = storageKey("last-backup:v1");
const BACKUP_SNOOZE_KEY = storageKey("backup-reminder-snooze:v1");
const LAST_SESSION_KEY = storageKey("last-session:v1");
const BACKUP_REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const BACKUP_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const SORT_MODES = new Set(["manual", "title", "order", "updated", "enabled"]);
const AUTO_REVISION_INTERVAL_MS = 5 * 60 * 1000;
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 460;
const SIDEBAR_RESIZE_STEP = 16;

let draggedEntryId = null;
let dropTargetId = null;
let dropPlace = "before";
let sidebarWidth = 0;
let sidebarWidthMode = "auto";
let sidebarDrag = null;
let virtualScrollFrame = 0;
let sessionStart = null;

function readSortMode() {
  try {
    const value = localStorage.getItem(SORT_STATE_KEY);
    return SORT_MODES.has(value) ? value : null;
  } catch {
    return null;
  }
}

function persistSortMode(mode) {
  try {
    localStorage.setItem(SORT_STATE_KEY, mode);
  } catch {
    return;
  }
}

function readEntryFilters() {
  try {
    const raw = localStorage.getItem(FILTER_STATE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function persistEntryFilters(filters) {
  try {
    localStorage.setItem(FILTER_STATE_KEY, JSON.stringify(filters));
  } catch {
    return;
  }
}

function readTagFilters() {
  try {
    const raw = localStorage.getItem(TAG_FILTER_STATE_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistTagFilters(tags) {
  try {
    localStorage.setItem(TAG_FILTER_STATE_KEY, JSON.stringify(tags));
  } catch {
    return;
  }
}

function readTokenSettings() {
  try {
    const raw = localStorage.getItem(TOKEN_SETTINGS_KEY);
    return raw ? normalizeTokenSettings(JSON.parse(raw)) : { ...DEFAULT_TOKEN_SETTINGS };
  } catch {
    return { ...DEFAULT_TOKEN_SETTINGS };
  }
}

function persistTokenSettings() {
  try {
    localStorage.setItem(TOKEN_SETTINGS_KEY, JSON.stringify(tokenSettings));
  } catch {
    return;
  }
}

function readDetailsState() {
  try {
    const value = localStorage.getItem(DETAILS_STATE_KEY);
    return value === null ? null : value === "1";
  } catch {
    return null;
  }
}

function setDetailsCollapsed(collapsed, persist = true) {
  refs.detailsPanel.classList.toggle("is-collapsed", collapsed);
  refs.detailsToggle.setAttribute("aria-expanded", String(!collapsed));
  const label = collapsed ? "Show entry details" : "Hide entry details";
  refs.detailsToggle.setAttribute("aria-label", label);
  refs.detailsToggle.title = label;

  if (persist) {
    try {
      localStorage.setItem(DETAILS_STATE_KEY, collapsed ? "1" : "0");
    } catch {
      return;
    }
  }
}

function readSidebarState() {
  try {
    const value = localStorage.getItem(SIDEBAR_STATE_KEY);
    return value === null ? null : value === "1";
  } catch {
    return null;
  }
}

function readSidebarWidth() {
  try {
    const value = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function persistSidebarWidth(width) {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  } catch {
    return;
  }
}

function getSidebarMaxWidth() {
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - 360));
}

function applySidebarWidth(width, persist = false) {
  const next = Math.round(clamp(width, SIDEBAR_MIN_WIDTH, getSidebarMaxWidth()));
  sidebarWidth = next;
  refs.workspace.style.setProperty("--sidebar-width", `${next}px`);
  refs.sidebarResizer.setAttribute("aria-valuemin", String(SIDEBAR_MIN_WIDTH));
  refs.sidebarResizer.setAttribute("aria-valuemax", String(getSidebarMaxWidth()));
  refs.sidebarResizer.setAttribute("aria-valuenow", String(next));

  if (persist) {
    sidebarWidthMode = "manual";
    persistSidebarWidth(next);
  }

  return next;
}

function measureSidebarContentWidth() {
  const probe = document.createElement("div");
  const content = document.createElement("div");
  probe.className = "sidebar sidebar-probe";
  probe.setAttribute("aria-hidden", "true");
  content.className = "sidebar-content";

  for (const selector of [".sidebar-top", ".entry-list-head", ".sidebar-footer"]) {
    const source = refs.sidebar.querySelector(selector);

    if (!source) {
      continue;
    }

    const clone = source.cloneNode(true);
    clone.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    content.append(clone);
  }

  const preview = content.querySelector(".book-description-preview");
  const bookControls = content.querySelector(".book-controls");
  const bookMetaActions = content.querySelector(".book-meta-actions");

  if (preview) {
    preview.textContent = "Description preview";
  }

  if (bookControls) {
    bookControls.style.flexWrap = "nowrap";
  }

  if (bookMetaActions) {
    bookMetaActions.style.flexWrap = "nowrap";
  }

  probe.append(content);
  document.body.append(probe);

  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

function applyAutomaticSidebarWidth() {
  sidebarWidthMode = "auto";

  try {
    localStorage.removeItem(SIDEBAR_WIDTH_KEY);
  } catch {
    return applySidebarWidth(measureSidebarContentWidth());
  }

  applySidebarWidth(measureSidebarContentWidth());
}

function syncSidebarWidthToViewport() {
  if (sidebarDrag) {
    return;
  }

  applySidebarWidth(sidebarWidthMode === "auto" ? measureSidebarContentWidth() : readSidebarWidth() ?? sidebarWidth);
}

function setSidebarCollapsed(collapsed, persist = true) {
  refs.sidebar.classList.toggle("is-collapsed", collapsed);
  refs.workspace.classList.toggle("is-sidebar-collapsed", collapsed);
  refs.sidebarToggle.setAttribute("aria-expanded", String(!collapsed));
  refs.sidebarResizer.hidden = collapsed;

  const label = collapsed ? "Expand library sidebar" : "Collapse library sidebar";
  refs.sidebarToggle.setAttribute("aria-label", label);
  refs.sidebarToggle.title = label;

  if (persist) {
    try {
      localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? "1" : "0");
    } catch {
      return;
    }
  }
}

function finishSidebarResize() {
  if (!sidebarDrag) {
    return;
  }

  const moved = sidebarDrag.moved;
  sidebarDrag = null;
  refs.workspace.classList.remove("is-resizing-sidebar");
  document.body.classList.remove("is-resizing-sidebar");

  if (moved) {
    sidebarWidthMode = "manual";
    persistSidebarWidth(sidebarWidth);
  }
}

function setSaveState(mode) {
  refs.saveState.dataset.state = mode;
  const label = refs.saveState.querySelector(".save-label");
  label.textContent = mode === "saving" ? "Saving" : mode === "error" ? "Unsaved" : "Saved";
}

function showStorageBanner(result) {
  if (!refs.storageBanner) {
    return;
  }

  refs.storageBannerMessage.textContent = result?.quotaExceeded
    ? "Browser storage is full, so your latest changes are only in memory. Export a project backup now, then remove old revisions or free up space and retry."
    : "Your latest changes could not be saved to this browser. Export a project backup to protect your work, then retry.";
  refs.storageBanner.hidden = false;
}

function hideStorageBanner() {
  if (refs.storageBanner) {
    refs.storageBanner.hidden = true;
  }
}

function readTimestamp(key) {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeTimestamp(key, value = Date.now()) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    return;
  }
}

function markBackupExported() {
  writeTimestamp(LAST_BACKUP_KEY);
}

function showBackupReminder() {
  if (refs.backupReminder) {
    refs.backupReminder.hidden = false;
  }
}

function hideBackupReminder() {
  if (refs.backupReminder) {
    refs.backupReminder.hidden = true;
  }
}

function snoozeBackupReminder() {
  writeTimestamp(BACKUP_SNOOZE_KEY);
  hideBackupReminder();
}

function hideSessionSummary() {
  if (refs.sessionSummary) {
    refs.sessionSummary.hidden = true;
  }
}

function sessionSummaryText(diff) {
  const { summary } = diff;
  const parts = [];

  if (summary.entriesAdded) {
    parts.push(`${summary.entriesAdded} ${summary.entriesAdded === 1 ? "entry added" : "entries added"}`);
  }

  if (summary.entriesRemoved) {
    parts.push(`${summary.entriesRemoved} removed`);
  }

  if (summary.entriesChanged) {
    parts.push(`${summary.entriesChanged} edited`);
  }

  if (summary.booksAdded) {
    parts.push(`${summary.booksAdded} new ${summary.booksAdded === 1 ? "lorebook" : "lorebooks"}`);
  }

  if (summary.booksRemoved) {
    parts.push(`${summary.booksRemoved} ${summary.booksRemoved === 1 ? "lorebook removed" : "lorebooks removed"}`);
  }

  return parts.join(", ");
}

function maybeShowSessionSummary() {
  const record = readSessionRecord();

  if (!record?.text || !refs.sessionSummary) {
    return;
  }

  refs.sessionSummaryMessage.textContent = `Your last session ended with changes: ${record.text}.`;
  refs.sessionSummary.hidden = false;
}

function readSessionRecord() {
  try {
    const raw = localStorage.getItem(LAST_SESSION_KEY);

    if (!raw) {
      return null;
    }

    const record = JSON.parse(raw);
    return record && typeof record.text === "string" ? record : null;
  } catch {
    return null;
  }
}

function recordSessionChanges() {
  try {
    if (!sessionStart || !getState()) {
      return;
    }

    const diff = diffProjects(sessionStart, getState());

    if (!diff.hasChanges) {
      return;
    }

    const text = sessionSummaryText(diff);

    if (!text) {
      return;
    }

    localStorage.setItem(LAST_SESSION_KEY, JSON.stringify({ text, at: Date.now() }));
  } catch {
    return;
  }
}

function maybeRemindBackup() {
  const last = readTimestamp(LAST_BACKUP_KEY);

  if (last === null) {
    writeTimestamp(LAST_BACKUP_KEY);
    return;
  }

  if (Date.now() - last < BACKUP_REMINDER_INTERVAL_MS) {
    return;
  }

  const snoozed = readTimestamp(BACKUP_SNOOZE_KEY);

  if (snoozed && Date.now() - snoozed < BACKUP_SNOOZE_MS) {
    return;
  }

  showBackupReminder();
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  const precision = value >= 10 || index === 0 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[index]}`;
}

async function refreshStorageUsage() {
  const usage = await getStorageUsage();

  refs.storageUsageBackend.textContent = usage.backend === "indexeddb" ? "IndexedDB" : "localStorage";
  refs.storageUsageProject.textContent = formatBytes(usage.projectBytes);
  refs.storageUsageRevisions.textContent = `${usage.revisionCount} · ${formatBytes(usage.revisionBytes)}`;

  if (Number.isFinite(usage.usage) && Number.isFinite(usage.quota) && usage.quota > 0) {
    const percent = Math.round((usage.usage / usage.quota) * 100);
    refs.storageUsageTotal.textContent = `${formatBytes(usage.usage)} of ${formatBytes(usage.quota)} used (${percent}%)`;
  } else {
    refs.storageUsageTotal.textContent = "Browser estimate unavailable";
  }
}

function appVersion() {
  return document.querySelector('meta[name="app-version"]')?.content ?? "unknown";
}

async function renderAboutDialog() {
  refs.aboutVersion.textContent = `Version ${appVersion()}`;
  refs.aboutImportFormats.textContent = "Loreweaver project, SillyTavern World Info v2, Chub lorebook, character book";
  refs.aboutExportFormats.textContent = [
    "Project backup",
    ...EXPORT_FORMATS.map((format) => format.label)
  ].join(", ");

  const usage = await getStorageUsage();
  const backend = usage.backend === "indexeddb" ? "IndexedDB" : "localStorage";
  const total = Number.isFinite(usage.usage) ? `, ${formatBytes(usage.usage)} used` : "";
  refs.aboutStorage.textContent = `${backend}${total}`;
}

async function openAboutDialog() {
  if (!refs.aboutDialog.open) {
    refs.aboutDialog.showModal();
  }

  await renderAboutDialog();
}

async function renderIntegrityDialog() {
  const projectReport = checkProjectIntegrity(getState());
  const revisionReport = await getRevisionIntegrity();
  const problems = [...projectReport.problems];

  if (revisionReport.missingPayloads.length) {
    problems.push({
      code: "revisionMissing",
      label: "Snapshots with missing data",
      count: revisionReport.missingPayloads.length
    });
  }

  if (revisionReport.orphanedPayloads.length) {
    problems.push({
      code: "revisionOrphaned",
      label: "Orphaned snapshot data",
      count: revisionReport.orphanedPayloads.length
    });
  }

  refs.integritySummary.textContent = problems.length
    ? `${problems.length} ${problems.length === 1 ? "issue" : "issues"} found. Repair to fix them.`
    : "No integrity issues found. The project and snapshots are consistent.";
  refs.integrityResults.replaceChildren();

  for (const problem of problems) {
    const row = document.createElement("div");
    const label = document.createElement("span");
    const count = document.createElement("span");
    row.className = "integrity-problem";
    label.className = "integrity-problem-label";
    count.className = "integrity-problem-count";
    label.textContent = problem.label;
    count.textContent = String(problem.count);
    row.append(label, count);
    refs.integrityResults.append(row);
  }

  refs.integrityRepairBtn.disabled = problems.length === 0;
  refs.integrityRepairBtn.hidden = problems.length === 0;
}

async function openIntegrityDialog() {
  if (!refs.integrityDialog.open) {
    refs.integrityDialog.showModal();
  }

  await renderIntegrityDialog();
}

async function handleIntegrityRepair() {
  const projectReport = checkProjectIntegrity(getState());

  if (projectReport.problems.length) {
    replaceProject(repairProject(getState()));
    clearSearch();
    renderAll();
  }

  const revisionReport = await getRevisionIntegrity();

  if (revisionReport.missingPayloads.length || revisionReport.orphanedPayloads.length) {
    await repairRevisions();
  }

  await flushSave();
  await renderIntegrityDialog();
  toast("Repaired project data", "success");
}

function renderGlobalSearch() {
  const query = refs.globalSearchInput.value;
  const result = searchProject(getState(), query);

  refs.globalSearchResults.replaceChildren();

  if (!result.query) {
    refs.globalSearchSummary.textContent = "Type to search every lorebook.";
    return;
  }

  refs.globalSearchSummary.textContent = result.total
    ? `${result.total} ${result.total === 1 ? "entry" : "entries"} in ${result.groups.length} ${result.groups.length === 1 ? "lorebook" : "lorebooks"}.`
    : `No entries match "${query.trim()}".`;

  for (const group of result.groups) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const count = document.createElement("span");
    const list = document.createElement("div");

    section.className = "global-search-group";
    heading.className = "global-search-group-title";
    heading.textContent = group.book.name.trim() || "Untitled Lorebook";
    count.className = "global-search-group-count";
    count.textContent = String(group.entries.length);
    heading.append(count);
    list.className = "global-search-list";

    for (const item of group.entries) {
      const button = document.createElement("button");
      const title = document.createElement("span");
      const meta = document.createElement("span");

      button.type = "button";
      button.className = "global-search-item";
      button.dataset.bookId = group.book.id;
      button.dataset.entryId = item.entry.id;
      title.className = "global-search-item-title";
      title.textContent = item.entry.title.trim() || "Untitled entry";
      meta.className = "global-search-item-meta";
      meta.textContent = `Matched: ${item.fields.join(", ")}`;
      button.append(title, meta);
      list.append(button);
    }

    section.append(heading, list);
    refs.globalSearchResults.append(section);
  }
}

function openGlobalSearchDialog() {
  refs.globalSearchInput.value = "";
  renderGlobalSearch();

  if (!refs.globalSearchDialog.open) {
    refs.globalSearchDialog.showModal();
  }

  refs.globalSearchInput.focus();
}

function handleGlobalSearchJump(bookId, entryId) {
  refs.globalSearchDialog.close();
  setActiveBook(bookId);
  clearSearch();
  setActiveEntry(entryId);
  renderAll();
  scrollEntryCardIntoView(entryId);
  focusEntryCard(entryId);
  scheduleSave();
}

function applyTokenSettings() {
  tokenizer.setEncoding(getTokenizerPreset(tokenSettings.tokenizer).encoding);
}

function renderTokenSettingsDialog() {
  const tokenizerOptions = TOKENIZER_PRESETS.map((preset) => {
    const option = document.createElement("option");
    option.value = preset.id;
    option.textContent = preset.label;
    return option;
  });

  refs.tokenizerPreset.replaceChildren(...tokenizerOptions);
  refs.tokenizerPreset.value = tokenSettings.tokenizer;
  refs.tokenizerPresetHint.textContent = getTokenizerPreset(tokenSettings.tokenizer).detail;

  const windowOptions = CONTEXT_WINDOW_PRESETS.map((preset) => {
    const option = document.createElement("option");
    option.value = String(preset.value);
    option.textContent = `${preset.label} tokens`;
    return option;
  });

  refs.contextWindowPreset.replaceChildren(...windowOptions);
  refs.contextWindowPreset.value = String(tokenSettings.contextWindow);
}

function openTokenSettingsDialog() {
  renderTokenSettingsDialog();

  if (!refs.tokenSettingsDialog.open) {
    refs.tokenSettingsDialog.showModal();
  }
}

function handleTokenizerChange() {
  tokenSettings.tokenizer = refs.tokenizerPreset.value;
  persistTokenSettings();
  applyTokenSettings();
  renderTokenSettingsDialog();
  renderAll();

  if (refs.overviewDialog.open) {
    renderOverviewDialog();
  }

  if (refs.simulationDialog.open) {
    renderSimulationResults();
  }
}

function handleContextWindowChange() {
  tokenSettings.contextWindow = Number(refs.contextWindowPreset.value);
  persistTokenSettings();

  if (refs.overviewDialog.open) {
    renderOverviewDialog();
  }

  if (refs.simulationDialog.open) {
    renderSimulationResults();
  }
}

function openGuideDialog() {
  if (!refs.guideDialog.open) {
    refs.guideDialog.showModal();
  }
}

function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    return;
  }
}

function openOnboardingDialog() {
  if (!refs.onboardingDialog.open) {
    refs.onboardingDialog.showModal();
  }
}

function maybeShowOnboarding() {
  let seen = null;

  try {
    seen = localStorage.getItem(ONBOARDED_KEY);
  } catch {
    seen = null;
  }

  if (!seen) {
    openOnboardingDialog();
  }
}

function updateSampleBadge() {
  refs.sampleBadge.hidden = !isSampleProject();
}

function openSampleDialog() {
  if (!refs.sampleDialog.open) {
    refs.sampleDialog.showModal();
  }
}

function startEmptyProject() {
  replaceProject(createProject({ books: [{ name: "Untitled Lorebook" }] }));
  clearSearch();
  setSortMode("manual");
  renderAll();
  scheduleSave();
  toast("Started an empty lorebook", "success");
}

function resetSampleProject() {
  replaceProject(createSampleProject());
  clearSearch();
  setSortMode("manual");
  renderAll();
  scheduleSave();
  toast("Sample project restored", "success");
}

function commandRunSort(mode) {
  return () => {
    setSortMode(mode);
    persistSortMode(getState().ui.sortMode);
    renderSidebar(refs);
  };
}

function commandToggleFilter(name) {
  return () => {
    toggleEntryFilter(name);
    persistEntryFilters(getEntryFilters());
    renderSidebar(refs);
  };
}

function buildCommands() {
  const entry = getActiveEntry();
  const commands = [
    { title: "New entry", hint: "Alt+N", keywords: ["add", "create"], run: handleAddEntry },
    { title: "New entry from template", keywords: ["add", "create", "starter"], run: openTemplateDialog },
    { title: "New lorebook", keywords: ["add", "create", "book"], run: () => {
      addBook();
      clearSearch();
      renderAll();
      refs.bookName.focus();
      refs.bookName.select();
      scheduleSave();
    } },
    { title: "Lorebook actions", keywords: ["duplicate", "merge", "split", "book"], run: openBookActionsDialog },
    { title: "Select entries by token size", keywords: ["bulk", "select", "tokens", "size"], run: openBulkSizeDialog },
    { title: "Bulk find and replace", hint: "Ctrl+H", keywords: ["replace", "bulk", "find"], run: openReplaceDialog },
    { title: "New character card", keywords: ["card", "character", "avatar"], run: () => openCardDialog() },
    { title: "Save project", hint: "Ctrl+S", keywords: ["persist"], run: async () => {
      if (await flushSave()) {
        toast("Project saved", "success");
      }
    } },
    { title: "Import lorebook", keywords: ["file", "open"], run: () => refs.importInput.click() },
    { title: "Export…", keywords: ["download", "save", "file"], run: openExportDialog },
    { title: "Export project backup", keywords: ["download", "backup"], run: exportProjectBackup },
    { title: "Overview", keywords: ["stats", "metrics", "tokens"], run: openOverviewDialog },
    { title: "Context simulation", keywords: ["simulate", "activation", "preview"], run: openSimulationDialog },
    { title: "Issues", keywords: ["validation", "problems", "errors"], run: openValidationDialog },
    { title: "Revision history", keywords: ["snapshots", "restore"], run: () => openHistoryDialog() },
    { title: "Toggle library sidebar", keywords: ["collapse", "layout"], run: () => setSidebarCollapsed(!refs.sidebar.classList.contains("is-collapsed")) },
    { title: "Toggle entry details", keywords: ["collapse", "layout", "panel"], run: () => setDetailsCollapsed(!refs.detailsPanel.classList.contains("is-collapsed")) },
    { title: "Sort: manual order", keywords: ["sort"], run: commandRunSort("manual") },
    { title: "Sort: title", keywords: ["sort", "alphabetical"], run: commandRunSort("title") },
    { title: "Sort: insertion order", keywords: ["sort"], run: commandRunSort("order") },
    { title: "Sort: last edited", keywords: ["sort", "recent"], run: commandRunSort("updated") },
    { title: "Sort: enabled first", keywords: ["sort"], run: commandRunSort("enabled") },
    { title: "Filter: enabled entries", keywords: ["filter"], run: commandToggleFilter("enabled") },
    { title: "Filter: disabled entries", keywords: ["filter"], run: commandToggleFilter("disabled") },
    { title: "Filter: always-on entries", keywords: ["filter"], run: commandToggleFilter("alwaysOn") },
    { title: "Filter: entries missing keys", keywords: ["filter"], run: commandToggleFilter("missingKeys") },
    { title: "Getting started", keywords: ["guide", "help", "docs"], run: openGuideDialog },
    { title: "Show welcome", keywords: ["onboarding", "start"], run: openOnboardingDialog },
    { title: "Start empty lorebook", keywords: ["new", "blank", "reset"], run: startEmptyProject },
    { title: "Search all lorebooks", hint: "Ctrl+Shift+F", keywords: ["global", "find", "everywhere"], run: openGlobalSearchDialog },
    { title: "Token settings", keywords: ["tokenizer", "model", "context window"], run: openTokenSettingsDialog },
    { title: "Check data integrity", keywords: ["repair", "diagnostics", "snapshots"], run: () => openIntegrityDialog() },
    { title: "About Loreweaver", keywords: ["version", "privacy", "info"], run: () => openAboutDialog() }
  ];

  if (entry) {
    commands.splice(2, 0,
      { title: "Duplicate entry", hint: "Ctrl+D", keywords: ["copy"], run: handleDuplicateEntry },
      { title: "Copy entry", keywords: ["clipboard", "copy"], run: handleCopyEntry },
      { title: "Delete entry", keywords: ["remove"], run: handleDeleteEntry }
    );
  }

  if (canUndo()) {
    commands.push({ title: "Undo", hint: "Ctrl+Z", keywords: ["history"], run: handleUndo });
  }

  if (canRedo()) {
    commands.push({ title: "Redo", hint: "Ctrl+Shift+Z", keywords: ["history"], run: handleRedo });
  }

  if (getState().ui.searchQuery.trim()) {
    commands.push({ title: "Clear search", keywords: ["reset"], run: () => {
      clearSearch();
      renderSidebar(refs);
    } });
  }

  if (supportsFileSystemAccess()) {
    commands.push(
      { title: "Open project file…", hint: "Ctrl+O", keywords: ["file"], run: openProjectFile },
      { title: "Save project file…", hint: "Ctrl+Shift+S", keywords: ["file"], run: () => saveProjectFile({ saveAs: true }) }
    );
  }

  return commands;
}

function supportsFileSystemAccess() {
  return typeof window.showOpenFilePicker === "function" && typeof window.showSaveFilePicker === "function";
}

function suggestedProjectFilename() {
  const stamp = new Date().toISOString().slice(0, 10);
  return `loreweaver-project-${stamp}.lwproj`;
}

async function ensureWritePermission(handle) {
  if (typeof handle.queryPermission !== "function") {
    return true;
  }

  const options = { mode: "readwrite" };

  if (await handle.queryPermission(options) === "granted") {
    return true;
  }

  return (await handle.requestPermission(options)) === "granted";
}

function updateFileLabel() {
  if (!refs.fileName) {
    return;
  }

  if (projectFileHandle) {
    refs.fileName.textContent = projectFileHandle.name;
    refs.fileName.hidden = false;
  } else {
    refs.fileName.textContent = "";
    refs.fileName.hidden = true;
  }
}

async function openProjectFile() {
  if (!supportsFileSystemAccess()) {
    refs.importInput.click();
    return;
  }

  let handle;

  try {
    [handle] = await window.showOpenFilePicker({
      types: [
        { description: "Loreweaver project", accept: { "application/json": [".lwproj", ".json"] } }
      ],
      multiple: false
    });
  } catch {
    return;
  }

  let file;

  try {
    file = await handle.getFile();
  } catch {
    toast("Couldn't read that file.", "error");
    return;
  }

  await handleImport(file, { fileHandle: handle });
}

async function saveProjectFile({ saveAs = false } = {}) {
  if (!supportsFileSystemAccess()) {
    saveProjectDownload();
    return;
  }

  try {
    let handle = projectFileHandle;

    if (!handle || saveAs) {
      handle = await window.showSaveFilePicker({
        suggestedName: suggestedProjectFilename(),
        types: [
          { description: "Loreweaver project", accept: { "application/json": [".lwproj"] } }
        ]
      });
    }

    if (!await ensureWritePermission(handle)) {
      toast("Write permission for that file was denied.", "error");
      return;
    }

    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(buildExport(getState()), null, 2));
    await writable.close();
    projectFileHandle = handle;
    updateFileLabel();
    markBackupExported();
    hideBackupReminder();
    toast(`Saved to ${handle.name}`, "success");
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }

    toast("Couldn't save to that file.", "error");
  }
}

function updateDocumentTitle() {
  const book = getActiveBook();
  document.title = `${book?.name.trim() || "Untitled Lorebook"} — Loreweaver ${appVersion()}`;
}

function updateHistoryButtons() {
  refs.undoBtn.disabled = !canUndo();
  refs.redoBtn.disabled = !canRedo();
}

function updateBookDescriptionPreview(description) {
  const preview = String(description).replace(/\s+/g, " ").trim();
  refs.bookDescriptionPreview.textContent = preview || "Add a description";
  refs.bookDescriptionPreview.title = preview;
}

function renderAll() {
  const book = getActiveBook();
  refs.bookName.value = book?.name ?? "";
  refs.bookDescription.value = book?.description ?? "";
  updateBookDescriptionPreview(book?.description ?? "");
  refs.bookTagChips?.setKeys(book?.tags ?? []);
  renderSidebar(refs);
  renderCardList(refs);
  renderEditor(refs);
  updateHistoryButtons();
  updateValidationIndicator();
  updateBudgetStatus();
  updateSampleBadge();
  updateDocumentTitle();
}

function updateBudgetStatus() {
  const book = getActiveBook();
  const budget = Number.isFinite(book?.tokenBudget) ? book.tokenBudget : 0;
  const entries = book?.entries ?? [];
  let enabledTokens = 0;
  let enabledCount = 0;
  let measuredCount = 0;

  for (const entry of entries) {
    if (!entry.enabled) {
      continue;
    }

    enabledCount += 1;
    tokenizer.request(entry.content);
    const measured = tokenizer.count(entry.content);

    if (Number.isFinite(measured)) {
      enabledTokens += measured;
      measuredCount += 1;
    } else {
      enabledTokens += estimateTokens(entry.content);
    }
  }

  const measured = enabledCount > 0 && measuredCount === enabledCount;
  const prefix = measured ? "" : "~";

  refs.bookTokenBudget.value = String(budget);

  if (budget > 0) {
    const over = enabledTokens > budget;

    refs.bookBudgetStatus.textContent = over
      ? `Over budget by ${numberFormatter.format(enabledTokens - budget)} tokens (${prefix}${numberFormatter.format(enabledTokens)} / ${numberFormatter.format(budget)})`
      : `${prefix}${numberFormatter.format(enabledTokens)} of ${numberFormatter.format(budget)} tokens`;
    refs.bookBudgetStatus.classList.toggle("is-over", over);
    return;
  }

  refs.bookBudgetStatus.classList.remove("is-over");
  refs.bookBudgetStatus.textContent = `${prefix}${numberFormatter.format(enabledTokens)} enabled tokens`;
}

function handleTokenUpdate() {
  const entry = getActiveEntry();

  if (entry) {
    syncEntryStats(refs, entry.content);
  }

  updateBudgetStatus();

  if (refs.overviewDialog.open) {
    renderOverviewDialog();
  }

  if (refs.simulationDialog.open) {
    renderSimulationResults();
  }
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  unsavedChanges = true;
  setSaveState("saving");
  updateHistoryButtons();
  updateValidationIndicator();
  saveTimer = window.setTimeout(flushSave, 400);
}

function updateValidationIndicator() {
  const count = validateBook(getActiveBook(), (text) => tokenizer.count(text)).length;
  const label = count
    ? `${count} ${count === 1 ? "validation issue" : "validation issues"}`
    : "No validation issues";

  refs.validationCount.textContent = String(count);
  refs.validationBtn.classList.toggle("has-issues", count > 0);
  refs.validationBtn.title = label;
}

function createValidationChip(label, count, code) {
  const chip = document.createElement("button");
  const value = document.createElement("strong");
  const active = code ? validationFilters.has(code) : validationFilters.size === 0;

  chip.type = "button";
  chip.className = "validation-chip";
  chip.setAttribute("aria-pressed", String(active));
  chip.classList.toggle("is-active", active);

  if (code) {
    chip.dataset.validationFilter = code;
  } else {
    chip.dataset.validationAll = "1";
  }

  chip.append(document.createTextNode(`${label} `), value);
  value.textContent = String(count);
  return chip;
}

function renderValidationDialog() {
  const issues = validateBook(getActiveBook(), (text) => tokenizer.count(text));
  const entryCount = new Set(issues.map((issue) => issue.entryId)).size;
  const filtered = validationFilters.size
    ? issues.filter((issue) => validationFilters.has(issue.code))
    : issues;

  refs.validationSummary.textContent = issues.length
    ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"} across ${entryCount} ${entryCount === 1 ? "entry" : "entries"}.`
    : "No issues found. Empty content, duplicate keys, key collisions, missing keys, unreachable entries, and insertion-order collisions will appear here.";
  refs.validationCategories.replaceChildren();
  refs.validationIssues.replaceChildren();

  if (!issues.length) {
    const empty = document.createElement("div");
    empty.className = "validation-empty";
    empty.textContent = "Everything looks good.";
    refs.validationIssues.append(empty);
    refs.validationCategories.hidden = true;
    return;
  }

  refs.validationCategories.append(createValidationChip("All", issues.length, null));

  for (const [code, label] of Object.entries(VALIDATION_LABELS)) {
    const count = issues.filter((issue) => issue.code === code).length;

    if (!count) {
      continue;
    }

    refs.validationCategories.append(createValidationChip(label, count, code));
  }

  refs.validationCategories.hidden = false;
  const fragment = document.createDocumentFragment();

  for (const issue of filtered) {
    const button = document.createElement("button");
    const head = document.createElement("span");
    const type = document.createElement("span");
    const entry = document.createElement("span");
    const message = document.createElement("span");

    button.type = "button";
    button.className = "validation-issue";
    button.dataset.entryId = issue.entryId;
    button.title = `Select ${issue.entryTitle}`;
    head.className = "validation-issue-head";
    type.className = "validation-issue-type";
    type.textContent = issue.label;
    entry.className = "validation-issue-entry";
    entry.textContent = issue.entryTitle;
    message.className = "validation-issue-message";
    message.textContent = issue.message;
    head.append(type, entry);
    button.append(head, message);
    fragment.append(button);
  }

  refs.validationIssues.append(fragment);
}

function openValidationDialog() {
  validationFilters = new Set();
  renderValidationDialog();
  refs.validationDialog.showModal();
}

function renderOverviewDialog() {
  const book = getActiveBook();

  if (book) {
    for (const entry of book.entries) {
      tokenizer.request(entry.content);
    }
  }

  const ready = tokenizer.isReady();
  const prefix = ready ? "" : "~";
  const overview = buildBookOverview(book, (text) => tokenizer.count(text));
  const percent = Math.round(overview.coverage * 100);
  const bookName = book?.name?.trim() || "this lorebook";

  refs.overviewSummary.textContent = overview.entries
    ? `${overview.enabled} of ${overview.entries} ${overview.entries === 1 ? "entry" : "entries"} enabled in ${bookName}.`
    : "This lorebook has no entries yet.";
  refs.overviewEntries.textContent = numberFormatter.format(overview.entries);
  refs.overviewEnabled.textContent = numberFormatter.format(overview.enabled);
  refs.overviewTokens.textContent = `${prefix}${numberFormatter.format(overview.totals.tokens)}`;
  refs.overviewEnabledTokens.textContent = `${prefix}${numberFormatter.format(overview.enabledTotals.tokens)}`;
  refs.overviewKeys.textContent = numberFormatter.format(overview.uniqueKeys);
  refs.overviewCoverage.textContent = `${percent}%`;
  refs.overviewMeterBar.style.width = `${percent}%`;
  refs.overviewMeterBar.parentElement.setAttribute("aria-label", `Trigger key coverage: ${percent}%`);
  refs.overviewAlwaysOn.textContent = numberFormatter.format(overview.alwaysOn);
  refs.overviewMissingKeys.textContent = numberFormatter.format(overview.missingKeys);
  refs.overviewSharedKeys.textContent = numberFormatter.format(overview.sharedKeys);
  refs.overviewAverage.textContent = `${prefix}${numberFormatter.format(overview.averageTokens)} tokens`;

  const budget = Number.isFinite(book?.tokenBudget) ? book.tokenBudget : 0;

  if (budget > 0) {
    const over = overview.enabledTotals.tokens > budget;
    refs.overviewBudget.textContent = `${prefix}${numberFormatter.format(overview.enabledTotals.tokens)} of ${numberFormatter.format(budget)}${over ? " (over)" : ""}`;
    refs.overviewBudget.classList.toggle("is-over", over);
  } else {
    refs.overviewBudget.textContent = "Off";
    refs.overviewBudget.classList.remove("is-over");
  }

  const window = tokenSettings.contextWindow;
  const used = overview.enabledTotals.tokens;
  const windowPercent = window > 0 ? Math.round((used / window) * 100) : 0;

  refs.overviewContext.textContent = `${prefix}${numberFormatter.format(used)} of ${numberFormatter.format(window)} (${windowPercent}%)`;
  refs.overviewContext.classList.toggle("is-over", used > window);
  refs.overviewTokenizer.textContent = getTokenizerPreset(tokenSettings.tokenizer).detail;

  refs.overviewLongest.replaceChildren();

  if (overview.longestEntry) {
    const name = document.createElement("span");
    name.textContent = overview.longestEntry.title;
    refs.overviewLongest.append(
      document.createTextNode("Longest entry: "),
      name,
      document.createTextNode(` (${prefix}${numberFormatter.format(overview.longestEntry.tokens)} tokens)`)
    );
  }
}

function openOverviewDialog() {
  renderOverviewDialog();
  refs.overviewDialog.showModal();
}

function createSimulationItem(item) {
  const listItem = document.createElement("li");
  const order = document.createElement("span");
  const main = document.createElement("div");
  const title = document.createElement("button");
  const meta = document.createElement("span");
  const measured = tokenizer.count(item.entry.content);
  const tokens = Number.isFinite(measured) ? measured : estimateTokens(item.entry.content);
  const prefix = Number.isFinite(measured) ? "" : "~";
  const matchLabel = item.reason === "alwaysOn"
    ? "Always on"
    : item.matchedKeys.length
      ? `Keys: ${item.matchedKeys.join(", ")}`
      : "Matched";

  listItem.className = "simulation-item";
  listItem.dataset.entryId = item.entry.id;
  order.className = "simulation-order";
  order.textContent = String(item.entry.order);
  main.className = "simulation-item-main";
  title.type = "button";
  title.className = "simulation-item-title";
  title.dataset.entryId = item.entry.id;
  title.textContent = item.entry.title.trim() || "Untitled entry";
  meta.className = "simulation-item-meta";
  meta.textContent = `${matchLabel} \u00b7 ${prefix}${numberFormatter.format(tokens)} tokens`;
  main.append(title, meta);
  listItem.append(order, main);

  return listItem;
}

function renderSimulationResults() {
  const book = getActiveBook();
  const entries = book?.entries ?? [];
  const enabledCount = entries.filter((entry) => entry.enabled).length;
  const result = simulateContext(book, refs.simulationInput.value);

  for (const item of result.activated) {
    tokenizer.request(item.entry.content);
  }

  tokenizer.request(result.injectedText);

  const measuredTotal = tokenizer.count(result.injectedText);
  const totalTokens = Number.isFinite(measuredTotal) ? measuredTotal : estimateTokens(result.injectedText);
  const prefix = Number.isFinite(measuredTotal) ? "" : "~";

  const window = tokenSettings.contextWindow;
  const windowPercent = window > 0 ? Math.round((totalTokens / window) * 100) : 0;

  refs.simulationSummary.textContent = `${result.activated.length} of ${enabledCount} enabled ${enabledCount === 1 ? "entry" : "entries"} activate \u00b7 ${prefix}${numberFormatter.format(totalTokens)} tokens injected (${windowPercent}% of ${numberFormatter.format(window)})`;
  refs.simulationResults.replaceChildren();

  if (!entries.length) {
    const empty = document.createElement("p");
    empty.className = "simulation-empty";
    empty.textContent = "This lorebook has no entries to simulate.";
    refs.simulationResults.append(empty);
    return;
  }

  if (!result.context.trim()) {
    const hint = document.createElement("p");
    hint.className = "simulation-empty";
    hint.textContent = "Add context above to simulate activation.";
    refs.simulationResults.append(hint);
    return;
  }

  const activatedSection = document.createElement("section");
  const activatedHeading = document.createElement("h3");
  activatedSection.className = "simulation-section";
  activatedHeading.textContent = `Activation order (${result.activated.length})`;
  activatedSection.append(activatedHeading);

  if (result.activated.length) {
    const list = document.createElement("ol");
    list.className = "simulation-list";

    for (const item of result.activated) {
      list.append(createSimulationItem(item));
    }

    activatedSection.append(list);
  } else {
    const none = document.createElement("p");
    none.className = "simulation-empty";
    none.textContent = "No entries activate with this context.";
    activatedSection.append(none);
  }

  refs.simulationResults.append(activatedSection);
  refs.simulationResults.append(createActivationGraph(result));

  if (result.injectedText) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const output = document.createElement("pre");
    section.className = "simulation-section";
    heading.textContent = "Injected text";
    output.className = "simulation-output";
    output.textContent = result.injectedText;
    section.append(heading, output);
    refs.simulationResults.append(section);
  }

  if (result.skipped.length) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const list = document.createElement("ul");
    details.className = "simulation-skipped";
    summary.textContent = `Not activated (${result.skipped.length})`;
    list.className = "simulation-skipped-list";

    for (const item of result.skipped) {
      const listItem = document.createElement("li");
      const button = document.createElement("button");
      const reason = document.createElement("span");
      button.type = "button";
      button.className = "simulation-skip-entry";
      button.dataset.entryId = item.entry.id;
      button.textContent = item.entry.title.trim() || "Untitled entry";
      reason.className = "simulation-skip-reason";
      reason.textContent = SIMULATION_REASONS[item.reason] ?? item.reason;
      listItem.append(button, reason);
      list.append(listItem);
    }

    details.append(summary, list);
    refs.simulationResults.append(details);
  }
}

function createActivationGraph(result) {
  const graph = buildActivationGraph(result);
  const section = document.createElement("section");
  const heading = document.createElement("h3");
  const legend = document.createElement("div");
  const wrap = document.createElement("div");

  section.className = "simulation-section";
  heading.textContent = "Activation graph";

  const legendItems = [
    { tone: "is-activated", label: `Activated (${graph.activatedTotal})` },
    { tone: "is-skipped", label: `Inactive (${graph.skippedTotal})` }
  ];

  legend.className = "simulation-graph-legend";

  for (const item of legendItems) {
    const entry = document.createElement("span");
    const swatch = document.createElement("span");
    swatch.className = `simulation-graph-swatch ${item.tone}`;
    swatch.setAttribute("aria-hidden", "true");
    entry.append(swatch, document.createTextNode(item.label));
    legend.append(entry);
  }

  wrap.className = "simulation-graph";
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${graph.activatedTotal} activated and ${graph.skippedTotal} inactive entries; key bars are sized by title length.`);

  for (const item of graph.activated) {
    wrap.append(graphRow(item, `#${item.rank}`, false));
  }

  for (const item of graph.skipped) {
    wrap.append(graphRow(item, "\u2013", true));
  }

  if (!graph.activated.length && !graph.skipped.length) {
    const empty = document.createElement("p");
    empty.className = "simulation-empty";
    empty.textContent = "Nothing to graph yet.";
    wrap.append(empty);
  }

  section.append(heading, legend, wrap);
  return section;
}

function graphRow(item, marker, skipped) {
  const row = document.createElement("div");
  const rank = document.createElement("span");
  const bar = document.createElement("span");
  const reason = SIMULATION_REASONS[item.reason] ?? item.reason;

  row.className = `simulation-graph-row${skipped ? " is-skipped" : ""}`;
  rank.className = "simulation-graph-rank";
  rank.textContent = marker;
  bar.className = "simulation-graph-bar";
  bar.style.width = `${item.width}%`;
  bar.title = `${item.title} \u00b7 ${reason}`;
  bar.textContent = item.title;
  row.append(rank, bar);
  return row;
}

function openSimulationDialog() {
  renderSimulationResults();

  if (!refs.simulationDialog.open) {
    refs.simulationDialog.showModal();
  }

  refs.simulationInput.focus();
}

function handleSimulationJump(entryId) {
  refs.simulationDialog.close();
  clearSearch();
  setActiveEntry(entryId);
  renderAll();
  scrollEntryCardIntoView(entryId);
  focusEntryCard(entryId);
  scheduleSave();
}

function jumpToValidationEntry(entryId, field = "") {
  refs.validationDialog.close();
  clearSearch();
  setActiveEntry(entryId);
  renderAll();
  scrollEntryCardIntoView(entryId);
  focusEntryCard(entryId);
  scheduleSave();

  if (field) {
    const target = refs.editorPane.querySelector(`#${field}`);
    target?.focus({ preventScroll: false });
    target?.scrollIntoView({ block: "center" });
  }
}

function focusEntryCard(id) {
  let card = findEntryCard(id);

  if (!card) {
    scrollEntryCardIntoView(id);
    card = findEntryCard(id);
  }

  card?.focus({ preventScroll: true });
}

function findEntryCard(id) {
  return Array.from(refs.entryList.querySelectorAll("[data-entry-id]"))
    .find((element) => element.dataset.entryId === id) ?? null;
}

function scrollEntryCardIntoView(id) {
  const card = findEntryCard(id);

  if (card) {
    card.scrollIntoView({ block: "nearest" });
    return;
  }

  const index = visibleEntryIds().indexOf(id);

  if (index === -1) {
    return;
  }

  const rowHeight = parseFloat(getComputedStyle(refs.entryList).getPropertyValue("--entry-row-height")) || 56;
  const top = index * rowHeight;
  const bottom = top + rowHeight;

  if (top < refs.entryList.scrollTop) {
    refs.entryList.scrollTop = top;
  } else if (bottom > refs.entryList.scrollTop + refs.entryList.clientHeight) {
    refs.entryList.scrollTop = bottom - refs.entryList.clientHeight;
  }

  renderSidebar(refs);
}

async function flushSave() {
  window.clearTimeout(saveTimer);
  const result = await saveProjectDetailed(getState());
  setSaveState(result.ok ? "saved" : "error");

  if (!result.ok) {
    unsavedChanges = true;

    if (!saveFailed) {
      toast("Couldn't save locally. Export a backup to protect your work.", "error");
    }

    saveFailed = true;
    showStorageBanner(result);
  } else {
    saveFailed = false;
    unsavedChanges = false;
    hideStorageBanner();
    await maybeSaveRevision();
  }

  return result.ok;
}

function createExportOption({ id, title, description, meta }) {
  const button = document.createElement("button");
  const main = document.createElement("span");
  const titleElement = document.createElement("span");
  const descriptionElement = document.createElement("span");
  const metaElement = document.createElement("span");

  button.type = "button";
  button.className = "export-option";
  button.dataset.exportFormat = id;
  main.className = "export-option-main";
  titleElement.className = "export-option-title";
  titleElement.textContent = title;
  descriptionElement.className = "export-option-desc";
  descriptionElement.textContent = description;
  metaElement.className = "export-option-meta";
  metaElement.textContent = meta;
  main.append(titleElement, descriptionElement);
  button.append(main, metaElement);

  return button;
}

function renderExportOptions() {
  const card = getActiveCard();
  const options = [
    createExportOption({
      id: "project",
      title: "Project backup",
      description: "Every lorebook, card and setting in one restorable file.",
      meta: "Project"
    }),
    ...EXPORT_FORMATS.map((format) => createExportOption({
      id: format.id,
      title: format.label,
      description: format.description,
      meta: format.primary ? "Book \u00b7 primary" : "Book"
    }))
  ];

  if (card) {
    const label = card.name.trim() || "Untitled card";
    options.push(createExportOption({
      id: "card-png",
      title: `Card PNG \u00b7 ${label}`,
      description: card.bookId
        ? "The card PNG with its linked lorebook embedded."
        : "The card PNG without a linked lorebook.",
      meta: "Card"
    }));

    options.push(createExportOption({
      id: "card-charx",
      title: `Card CHARX \u00b7 ${label}`,
      description: "The card as a CHARX zip with its image and linked lorebook.",
      meta: "Card"
    }));
  }

  refs.exportOptions.replaceChildren(...options);
}

function formatBackupDate(timestamp) {
  if (!timestamp) {
    return "unknown date";
  }

  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

async function refreshBackupStatus() {
  const info = await getProjectBackupInfo();

  if (!info.ok) {
    refs.backupStatus.textContent = "No backup saved.";
    refs.restoreBackupBtn.disabled = true;
    return;
  }

  const bookLabel = `${info.books} ${info.books === 1 ? "lorebook" : "lorebooks"}`;
  const entryLabel = `${info.entries} ${info.entries === 1 ? "entry" : "entries"}`;
  refs.backupStatus.textContent = `${bookLabel} · ${entryLabel}\n${formatBackupDate(info.createdAt)}`;
  refs.restoreBackupBtn.disabled = false;
}

function recordRevision(reason) {
  return saveRevision(getState(), reason);
}

function setHistoryStatus(message, tone = "") {
  refs.historyStatus.textContent = message;
  refs.historyStatus.hidden = !message;
  refs.historyStatus.classList.toggle("is-error", tone === "error");
  refs.historyStatus.classList.toggle("is-success", tone === "success");
}

async function maybeSaveRevision() {
  const latest = (await getRevisions()).revisions[0] ?? null;

  if (!latest) {
    await recordRevision("Initial snapshot");
    return;
  }

  if (Date.now() - latest.createdAt >= AUTO_REVISION_INTERVAL_MS) {
    await recordRevision("Automatic snapshot");
  }
}

async function getRevisionComparison(id, knownRevisions = null) {
  const revisions = knownRevisions ?? (await getRevisions()).revisions;
  const index = revisions.findIndex((revision) => revision.id === id);

  if (index < 0) {
    return { ok: false, error: "That revision is no longer available." };
  }

  const revision = revisions[index];
  const current = await loadRevision(id);

  if (!current.ok) {
    return current;
  }

  const previousRevision = revisions[index + 1] ?? null;
  let previousProject = { books: [] };

  if (previousRevision) {
    const previous = await loadRevision(previousRevision.id);

    if (!previous.ok) {
      return previous;
    }

    previousProject = previous.project;
  }

  return {
    ok: true,
    revision,
    previousRevision,
    diff: diffProjects(previousProject, current.project),
    project: current.project
  };
}

function renderRevisionDelta(diff) {
  const { summary } = diff;
  const additions = summary.booksAdded + summary.entriesAdded;
  const removals = summary.booksRemoved + summary.entriesRemoved;
  const changes = summary.booksMetadataChanged + summary.entriesChanged;
  const delta = document.createElement("span");
  const parts = [];

  delta.className = "history-item-delta";

  if (!additions && !removals && !changes) {
    delta.classList.add("is-empty");
    delta.textContent = "No changes";
    return delta;
  }

  if (additions) {
    parts.push(`${additions} added`);
    const chip = document.createElement("span");
    chip.className = "history-delta-add";
    chip.textContent = `+${additions}`;
    delta.append(chip);
  }

  if (removals) {
    parts.push(`${removals} removed`);
    const chip = document.createElement("span");
    chip.className = "history-delta-remove";
    chip.textContent = `-${removals}`;
    delta.append(chip);
  }

  if (changes) {
    parts.push(`${changes} changed`);
    const chip = document.createElement("span");
    chip.className = "history-delta-change";
    chip.textContent = `~${changes}`;
    delta.append(chip);
  }

  delta.setAttribute("aria-label", parts.join(", "));
  delta.title = parts.join(", ");
  return delta;
}

async function renderHistoryDialog() {
  const revisions = (await getRevisions()).revisions;
  const count = revisions.length;

  refs.historyCount.textContent = `${count} ${count === 1 ? "snapshot" : "snapshots"}`;
  refs.historyList.replaceChildren();

  if (!count) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    empty.textContent = "No snapshots yet. Save one now or keep editing to create automatic snapshots.";
    refs.historyList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const revision of revisions) {
    const item = document.createElement("article");
    const info = document.createElement("div");
    const reason = document.createElement("span");
    const meta = document.createElement("span");
    const actions = document.createElement("div");
    const compare = document.createElement("button");
    const restore = document.createElement("button");
    const createdAt = formatBackupDate(revision.createdAt);
    const comparison = await getRevisionComparison(revision.id, revisions);

    item.className = "history-item";
    info.className = "history-item-info";
    reason.className = "history-item-reason";
    reason.textContent = revision.reason;
    meta.className = "history-item-meta";
    meta.textContent = `${createdAt} · ${revision.books} ${revision.books === 1 ? "lorebook" : "lorebooks"} · ${revision.entries} ${revision.entries === 1 ? "entry" : "entries"}`;
    actions.className = "history-item-actions";
    compare.type = "button";
    compare.className = "btn";
    compare.dataset.revisionCompare = revision.id;
    compare.setAttribute("aria-label", `Compare snapshot: ${revision.reason}, ${createdAt}`);
    compare.textContent = "Compare";
    restore.type = "button";
    restore.className = "btn";
    restore.dataset.revisionRestore = revision.id;
    restore.setAttribute("aria-label", `Restore snapshot: ${revision.reason}, ${createdAt}`);
    restore.textContent = "Restore";
    actions.append(compare, restore);
    info.append(reason, meta);

    if (comparison.ok) {
      info.append(renderRevisionDelta(comparison.diff));
    }

    item.append(info, actions);
    fragment.append(item);
  }

  refs.historyList.append(fragment);
}

async function openHistoryDialog() {
  setHistoryStatus("");

  if (!refs.historyDialog.open) {
    refs.historyDialog.showModal();
  }

  await renderHistoryDialog();
}

async function handleCompareRevision(id) {
  const comparison = await getRevisionComparison(id);

  if (!comparison.ok) {
    toast(comparison.error, "error");
    return;
  }

  const previous = comparison.previousRevision;
  const entries = comparison.project.books.reduce((total, book) => total + book.entries.length, 0);

  await showDiffDialog({
    eyebrow: "Revision changes",
    title: comparison.revision.reason,
    message: previous
      ? "Changes in this snapshot compared with the previous snapshot."
      : "This is the oldest snapshot, shown against an empty project.",
    details: [
      { label: "Snapshot", value: comparison.revision.reason },
      { label: "Created", value: formatBackupDate(comparison.revision.createdAt) },
      {
        label: "Compared with",
        value: previous
          ? `${previous.reason}, ${formatBackupDate(previous.createdAt)}`
          : "Empty project"
      },
      { label: "Entries", value: String(entries) }
    ],
    diff: comparison.diff,
    confirmLabel: "Close"
  });
}

async function handleRestoreRevision(id) {
  const revision = (await getRevisions()).revisions.find((item) => item.id === id);
  const loaded = await loadRevision(id);

  if (!loaded.ok) {
    refs.historyDialog.close();
    toast(loaded.error, "error");
    return;
  }

  refs.historyDialog.close();
  const accepted = await confirmAction({
    title: "Restore this revision?",
    message: "The current project will be replaced by the snapshot. Its current state will be saved as a revision first.",
    details: [
      { label: "Snapshot", value: revision?.reason ?? "Revision" },
      { label: "Created", value: formatBackupDate(revision?.createdAt) },
      { label: "Lorebooks", value: String(loaded.project.books.length) },
      {
        label: "Entries",
        value: String(loaded.project.books.reduce((total, book) => total + book.entries.length, 0))
      }
    ],
    confirmLabel: "Restore revision",
    tone: "primary"
  });

  if (!accepted) {
    await openHistoryDialog();
    return;
  }

  const current = await recordRevision("Before restoring a revision");

  if (!current.ok && !current.skipped) {
    const proceed = await confirmAction({
      title: "Snapshot failed",
      message: "The current project could not be saved as a revision. Restore anyway? You can undo the restore in this session.",
      confirmLabel: "Restore anyway"
    });

    if (!proceed) {
      await openHistoryDialog();
      return;
    }
  }

  replaceProject(loaded.project);
  clearSearch();
  const sortMode = readSortMode();

  if (sortMode) {
    setSortMode(sortMode);
  }

  renderAll();
  await flushSave();
  toast("Revision restored", "success");
}

async function openExportDialog() {
  const book = getActiveBook();

  if (!book) {
    toast("There is no lorebook to export.", "error");
    return;
  }

  renderExportOptions();
  refs.exportBookName.textContent = `${book.name.trim() || "Untitled Lorebook"} · ${book.entries.length} ${book.entries.length === 1 ? "entry" : "entries"} · book exports use the active lorebook`;
  refs.exportDialog.showModal();
  await refreshBackupStatus();
  await refreshStorageUsage();
}

function exportProjectBackup() {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(buildExport(getState()), `loreweaver-project-${stamp}.lwproj`);
  markBackupExported();
  hideBackupReminder();
  toast("Project backup exported", "success");
}

function saveProjectDownload() {
  downloadJson(buildExport(getState()), suggestedProjectFilename());
  markBackupExported();
  hideBackupReminder();
  toast("Project downloaded", "success");
}

async function exportActiveCard(asCharx = false) {
  const card = getActiveCard();

  if (!card) {
    toast("There is no active card to export.", "error");
    return;
  }

  const label = card.name.trim() || "Untitled card";
  const book = card.bookId ? getState().books.find((item) => item.id === card.bookId) : null;
  const exported = asCharx
    ? CARD_ADAPTER.serializeCharx(card, { book })
    : CARD_ADAPTER.serialize(card, { book });

  if (!exported.ok) {
    toast(exported.error, "error");
    return;
  }

  if (exported.warnings.length) {
    refs.exportDialog.close();
    const accepted = await confirmAction({
      title: `Export ${label}?`,
      message: "The card exports with what it has. Some abilities stay unavailable in this build.",
      warnings: exported.warnings,
      confirmLabel: "Export anyway",
      tone: "primary"
    });

    if (!accepted) {
      openExportDialog();
      return;
    }
  } else {
    refs.exportDialog.close();
  }

  if (exported.dataUrl) {
    downloadJson(JSON.parse(exported.json), exported.filename);
  } else {
    downloadBytes(exported.bytes, exported.filename, exported.type);
  }

  toast(`Exported ${label}`, "success");
}

async function handleExport(formatId) {
  if (formatId === "project") {
    exportProjectBackup();
    refs.exportDialog.close();
    return;
  }

  if (formatId === "card-png" || formatId === "card-charx") {
    await exportActiveCard(formatId === "card-charx");
    return;
  }

  const book = getActiveBook();

  if (!book) {
    toast("There is no lorebook to export.", "error");
    return;
  }

  const exported = serializeLorebook(formatId, book);

  if (!exported.ok) {
    toast(exported.error, "error");
    return;
  }

  if (exported.warnings.length) {
    refs.exportDialog.close();
    const accepted = await confirmAction({
      title: `Export as ${exported.label}?`,
      message: "Some fields cannot survive this format. They stay in Loreweaver, but the exported file drops them.",
      warnings: exported.warnings,
      confirmLabel: "Export anyway",
      tone: "primary"
    });

    if (!accepted) {
      openExportDialog();
      return;
    }
  } else {
    refs.exportDialog.close();
  }

  downloadJson(exported.data, exported.filename);
  toast(`Exported ${book.name.trim() || "Untitled Lorebook"} as ${exported.label}`, "success");
}

async function handleRestoreBackup() {
  const backup = await loadProjectBackup();

  if (!backup.ok) {
    toast(backup.error, "error");
    return;
  }

  const bookCount = backup.project.books.length;
  const entryCount = backup.project.books.reduce((total, book) => total + book.entries.length, 0);
  refs.exportDialog.close();

  const accepted = await confirmAction({
    title: "Restore pre-import backup?",
    message: "This replaces the current project. You can undo the restore afterward.",
    details: [
      { label: "Backup from", value: formatBackupDate(backup.createdAt) },
      { label: "Lorebooks", value: String(bookCount) },
      { label: "Entries", value: String(entryCount) }
    ],
    confirmLabel: "Restore backup",
    tone: "primary"
  });

  if (!accepted) {
    return;
  }

  replaceProject(backup.project);
  clearSearch();
  const sortMode = readSortMode();

  if (sortMode) {
    setSortMode(sortMode);
  }

  renderAll();
  await flushSave();
  toast("Pre-import backup restored", "success");
}

function clearSearch() {
  refs.entrySearch.value = "";
  setSearchQuery("");
}

function visibleEntryIds() {
  return getVisibleEntryIds();
}

function activateEntryCard(id, { toggle = false, range = false } = {}) {
  const ids = visibleEntryIds();
  const clickedIndex = ids.indexOf(id);

  if (clickedIndex === -1) {
    return;
  }

  if (range) {
    const activeId = getState().activeEntryId;
    const anchorCandidate = getSelectionAnchorId() ?? activeId ?? id;
    const candidateIndex = ids.indexOf(anchorCandidate);
    const anchorIndex = candidateIndex === -1 ? clickedIndex : candidateIndex;
    const start = Math.min(anchorIndex, clickedIndex);
    const end = Math.max(anchorIndex, clickedIndex);
    selectEntryRange(ids.slice(start, end + 1), ids[anchorIndex]);
    setActiveEntry(id);
    renderSidebar(refs);
    renderEditor(refs);
    focusEntryCard(id);
    scheduleSave();
    return;
  }

  if (toggle) {
    toggleEntrySelection(id);
    renderSidebar(refs);
    focusEntryCard(id);
    return;
  }

  const changed = getState().activeEntryId !== id;
  clearSelection();

  if (changed) {
    setActiveEntry(id);
  }

  renderSidebar(refs);
  renderEditor(refs);
  focusEntryCard(id);

  if (changed) {
    scheduleSave();
  }
}

function canReorderEntries() {
  const state = getState();
  return state.ui.sortMode === "manual" && !state.ui.searchQuery.trim();
}

function clearDropIndicators() {
  dropTargetId = null;

  for (const card of refs.entryList.querySelectorAll(".is-drop-before, .is-drop-after")) {
    card.classList.remove("is-drop-before", "is-drop-after");
  }
}

function clearDragState() {
  clearDropIndicators();
  draggedEntryId = null;

  for (const card of refs.entryList.querySelectorAll(".is-dragging")) {
    card.classList.remove("is-dragging");
  }
}

function dropPlaceFor(event, card) {
  const rect = card.getBoundingClientRect();
  return event.clientY >= rect.top + rect.height / 2 ? "after" : "before";
}

function handleAddEntry() {
  clearSearch();
  addEntry();
  renderAll();
  refs.entryTitle.focus();
  scheduleSave();
}

function renderTemplateDialog() {
  refs.templateList.replaceChildren();
  const fragment = document.createDocumentFragment();

  for (const template of ENTRY_TEMPLATES) {
    const option = document.createElement("button");
    const info = document.createElement("span");
    const name = document.createElement("span");
    const description = document.createElement("span");
    const action = document.createElement("span");

    option.type = "button";
    option.className = "template-option";
    option.dataset.templateId = template.id;
    info.className = "template-option-info";
    name.className = "template-option-name";
    name.textContent = template.name;
    description.className = "template-option-description";
    description.textContent = template.description;
    action.className = "template-option-action";
    action.textContent = "Use";
    info.append(name, description);
    option.append(info, action);
    fragment.append(option);
  }

  refs.templateList.append(fragment);
}

function openTemplateDialog() {
  renderTemplateDialog();
  refs.templateDialog.showModal();
}

function handleTemplatePick(templateId) {
  const template = getEntryTemplate(templateId);
  const patch = buildTemplatePatch(template);

  if (!patch) {
    return;
  }

  refs.templateDialog.close();
  clearSearch();
  const entry = addEntry(patch);

  if (!entry) {
    return;
  }

  renderAll();
  refs.entryTitle.focus();
  refs.entryTitle.select();
  scheduleSave();
  toast(`${template.name} entry added`, "success");
}

function handleUndo() {
  if (!undo()) {
    return;
  }

  clearSelection();
  renderAll();
  scheduleSave();
}

function handleRedo() {
  if (!redo()) {
    return;
  }

  clearSelection();
  renderAll();
  scheduleSave();
}

async function handleCopyEntry() {
  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const text = [
    entry.title,
    entry.keys.length ? `Keys: ${entry.keys.join(", ")}` : "",
    "",
    entry.content
  ].filter((part, index) => part !== "" || index === 2).join("\n");

  try {
    await navigator.clipboard.writeText(text);
    toast("Entry copied", "success");
  } catch {
    toast("Couldn't copy the entry to the clipboard.", "error");
  }
}

function handleDuplicateEntry() {
  const copy = duplicateEntry();

  if (!copy) {
    return;
  }

  renderAll();
  scrollEntryCardIntoView(copy.id);
  refs.entryTitle.focus();
  refs.entryTitle.select();
  scheduleSave();
  toast("Entry duplicated", "success");
}

async function handleDeleteEntry() {
  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const title = entry.title.trim() || "Untitled entry";
  const accepted = await confirmAction({
    title: "Delete entry?",
    message: `"${title}" will be permanently removed.`,
    confirmLabel: "Delete entry"
  });

  if (!accepted) {
    return;
  }

  deleteActiveEntry();
  clearSearch();
  renderAll();
  const nextId = getState().activeEntryId;

  if (nextId) {
    scrollEntryCardIntoView(nextId);
    focusEntryCard(nextId);
  } else {
    refs.addEntryBtn.focus();
  }

  scheduleSave();
  toast("Entry deleted");
}

async function handleDeleteBook() {
  const book = getActiveBook();

  if (!book) {
    return;
  }

  const name = book.name.trim() || "Untitled Lorebook";
  const count = book.entries.length;
  const accepted = await confirmAction({
    title: "Delete lorebook?",
    message: `"${name}" and its ${count} ${count === 1 ? "entry" : "entries"} will be permanently removed.`,
    confirmLabel: "Delete lorebook"
  });

  if (!accepted) {
    return;
  }

  deleteBook(book.id);
  clearSearch();
  renderAll();
  refs.bookSelect.focus();
  scheduleSave();
  toast("Lorebook deleted");
}

function renderBookActionsDialog() {
  const book = getActiveBook();
  const entries = book?.entries ?? [];
  const selected = getSelectedEntryIds().length;
  const others = getState().books.filter((item) => item.id !== book?.id);

  refs.bookActionsSummary.textContent = selected
    ? `${selected} of ${entries.length} entries selected.`
    : `${entries.length} ${entries.length === 1 ? "entry" : "entries"} in this lorebook.`;

  const options = others.map((item) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = item.name.trim() || "Untitled Lorebook";
    return option;
  });

  refs.bookMergeTarget.replaceChildren(...options);
  refs.bookMergeTarget.disabled = !others.length;
  refs.bookMergeBtn.disabled = !others.length;
  refs.bookSplitBtn.disabled = entries.length < 2;
}

function openBookActionsDialog() {
  renderBookActionsDialog();

  if (!refs.bookActionsDialog.open) {
    refs.bookActionsDialog.showModal();
  }
}

function handleDuplicateBook() {
  const copy = duplicateActiveBook();

  if (!copy) {
    return;
  }

  refs.bookActionsDialog.close();
  clearSearch();
  renderAll();
  scheduleSave();
  toast(`Duplicated as ${copy.name}`, "success");
}

function handleSplitBook() {
  const moved = splitActiveBook(getSelectedEntryIds());

  if (!moved) {
    toast("Select some entries to split, or keep at least one entry behind.", "error");
    return;
  }

  refs.bookActionsDialog.close();
  clearSearch();
  renderAll();
  scheduleSave();
  toast(`Split ${moved.entries.length} ${moved.entries.length === 1 ? "entry" : "entries"} into ${moved.name}`, "success");
}

function handleMergeBook() {
  const merged = mergeActiveBookInto(refs.bookMergeTarget.value);

  if (!merged) {
    toast("Choose a different lorebook to merge into.", "error");
    return;
  }

  refs.bookActionsDialog.close();
  clearSearch();
  renderAll();
  scheduleSave();
  toast(`Merged into ${merged.name}`, "success");
}

function handleBulkEnabled(enabled) {
  const changed = setEntriesEnabled(getSelectedEntryIds(), enabled);

  if (!changed) {
    return;
  }

  renderAll();
  scheduleSave();
  toast(`${changed} ${changed === 1 ? "entry" : "entries"} ${enabled ? "enabled" : "disabled"}`, "success");
}

function renderBulkSizeSummary() {
  const book = getActiveBook();
  const min = Number(refs.bulkSizeMin.value) || 0;
  const max = refs.bulkSizeMax.value === "" ? null : Number(refs.bulkSizeMax.value);
  const matches = selectEntriesByTokenSize(book, {
    min,
    max,
    includeDisabled: refs.bulkSizeDisabled.checked,
    tokenCount: (text) => tokenizer.count(text)
  });

  refs.bulkSizeSummary.textContent = matches.length
    ? `${matches.length} ${matches.length === 1 ? "entry matches" : "entries match"} this range.`
    : "No entries match this range.";
  refs.bulkSizeApply.disabled = matches.length === 0;
  return matches;
}

function openBulkSizeDialog() {
  refs.bulkSizeMin.value = "0";
  refs.bulkSizeMax.value = "";
  refs.bulkSizeDisabled.checked = true;
  renderBulkSizeSummary();
  refs.bulkSizeDialog.showModal();
  refs.bulkSizeMin.focus();
  refs.bulkSizeMin.select();
}

function openBulkTagDialog() {
  const ids = getSelectedEntryIds();

  if (!ids.length) {
    return;
  }

  refs.bulkTagInput.value = "";
  refs.bulkTagDialog.showModal();
  refs.bulkTagInput.focus();
}

function applyBulkTag(mode) {
  const ids = getSelectedEntryIds();
  const tag = refs.bulkTagInput.value.trim();

  if (!ids.length) {
    return;
  }

  if (!tag) {
    refs.bulkTagInput.focus();
    return;
  }

  const changed = mode === "add"
    ? addTagToEntries(ids, tag)
    : removeTagFromEntries(ids, tag);

  refs.bulkTagDialog.close();

  if (!changed) {
    toast(mode === "add"
      ? `Selected entries already have "${tag}".`
      : `Selected entries don't have "${tag}".`);
    return;
  }

  renderAll();
  scheduleSave();
  toast(`${mode === "add" ? "Added" : "Removed"} "${tag}" ${mode === "add" ? "to" : "from"} ${changed} ${changed === 1 ? "entry" : "entries"}`, "success");
}

function handleBulkSizeApply() {
  const matches = renderBulkSizeSummary();

  if (!matches.length) {
    return;
  }

  const added = addEntriesToSelection(matches.map((entry) => entry.id));
  refs.bulkSizeDialog.close();
  clearSearch();
  renderAll();
  toast(`Added ${added} ${added === 1 ? "entry" : "entries"} to the selection`, "success");
}

function replaceFields() {
  const fields = [];

  if (refs.replaceFieldContent.checked) {
    fields.push("content");
  }

  if (refs.replaceFieldTitle.checked) {
    fields.push("title");
  }

  if (refs.replaceFieldNotes.checked) {
    fields.push("notes");
  }

  if (refs.replaceFieldKeys.checked) {
    fields.push("keys");
  }

  return fields;
}

function replaceQuery() {
  return parseReplaceQuery({
    find: refs.replaceFind.value,
    replacement: refs.replaceWith.value,
    regex: refs.replaceRegex.checked,
    caseSensitive: refs.replaceCase.checked
  });
}

function replaceTargets() {
  const selected = getSelectedEntryIds();
  return selected.length ? selected : null;
}

function currentReplacePlan() {
  const parsed = replaceQuery();

  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const fields = replaceFields();

  if (!fields.length) {
    return { ok: false, error: "Pick at least one field to search." };
  }

  const plan = planReplace(getActiveBook(), parsed.query, {
    fields,
    onlySelected: replaceTargets()
  });

  return { ok: true, plan, query: parsed.query };
}

function updateReplaceControls() {
  const parsed = replaceQuery();
  const ready = parsed.ok && replaceFields().length > 0;

  refs.replacePreview.disabled = !ready;
  refs.replaceApply.disabled = !ready;
  refs.replaceSummary.textContent = parsed.ok
    ? replaceFields().length
      ? "Preview the matches before replacing."
      : "Pick at least one field to search."
    : parsed.error;
}

function openReplaceDialog() {
  refs.replaceFind.value = "";
  refs.replaceWith.value = "";
  refs.replaceRegex.checked = false;
  refs.replaceCase.checked = false;
  refs.replaceFieldContent.checked = true;
  refs.replaceFieldTitle.checked = false;
  refs.replaceFieldKeys.checked = false;
  refs.replaceFieldNotes.checked = false;
  updateReplaceControls();
  refs.replaceDialog.showModal();
  refs.replaceFind.focus();
}

function replaceScopeLabel() {
  const selected = getSelectedEntryIds();
  return selected.length ? `the ${selected.length} selected ${selected.length === 1 ? "entry" : "entries"}` : "the whole lorebook";
}

async function previewReplace() {
  const result = currentReplacePlan();

  if (!result.ok) {
    refs.replaceSummary.textContent = result.error;
    return;
  }

  if (!result.plan.entryCount) {
    refs.replaceSummary.textContent = `No matches in ${replaceScopeLabel()}.`;
    return;
  }

  const before = getActiveBook();
  const after = structuredClone(before);
  applyReplace(after, result.plan);

  const accepted = await showDiffDialog({
    eyebrow: "Bulk replace",
    title: "Review replacements",
    message: `${result.plan.totalMatches} ${result.plan.totalMatches === 1 ? "match" : "matches"} across ${result.plan.entryCount} ${result.plan.entryCount === 1 ? "entry" : "entries"} in ${replaceScopeLabel()}.`,
    diff: diffProjects(
      { books: [before], activeBookId: before.id, activeEntryId: null },
      { books: [after], activeBookId: after.id, activeEntryId: null }
    ),
    confirmLabel: "Replace",
    cancelLabel: "Back",
    tone: "primary"
  });

  if (accepted) {
    refs.replaceDialog.close();
    handleReplaceApply(result);
  }
}

function handleReplaceApply(result = currentReplacePlan()) {
  if (!result.ok) {
    refs.replaceSummary.textContent = result.error;
    return;
  }

  const touched = applyReplacePlan(result.plan);

  if (!touched) {
    toast("No matches to replace.");
    return;
  }

  renderAll();
  scheduleSave();
  toast(`Replaced ${result.plan.totalMatches} ${result.plan.totalMatches === 1 ? "match" : "matches"} in ${touched} ${touched === 1 ? "entry" : "entries"}`, "success");
}

function handleBulkOrderSet() {  const ids = getSelectedEntryIds();

  if (!ids.length) {
    return;
  }

  const value = Number(refs.bulkOrderInput.value);

  if (!Number.isFinite(value)) {
    toast("Enter a valid insertion order.", "error");
    return;
  }

  const changed = setEntriesOrder(ids, value);

  if (!changed) {
    toast("Selected entries already use that insertion order.");
    return;
  }

  renderAll();
  scheduleSave();
  toast(`Insertion order set to ${Math.round(value)} for ${changed} ${changed === 1 ? "entry" : "entries"}`, "success");
}

function handleBulkOrderShift(delta) {
  const ids = getSelectedEntryIds();

  if (!ids.length) {
    return;
  }

  const changed = adjustEntriesOrder(ids, delta);

  if (!changed) {
    return;
  }

  renderAll();
  scheduleSave();
  toast(`Insertion order ${delta > 0 ? "increased" : "decreased"} by ${Math.abs(delta)} for ${changed} ${changed === 1 ? "entry" : "entries"}`, "success");
}

async function handleBulkDelete() {
  const ids = getSelectedEntryIds();

  if (!ids.length) {
    return;
  }

  const accepted = await confirmAction({
    title: `Delete ${ids.length} ${ids.length === 1 ? "entry" : "entries"}?`,
    message: `The selected ${ids.length === 1 ? "entry" : "entries"} will be permanently removed.`,
    confirmLabel: "Delete entries"
  });

  if (!accepted) {
    return;
  }

  deleteEntries(ids);
  renderAll();
  const nextId = getState().activeEntryId;

  if (nextId) {
    scrollEntryCardIntoView(nextId);
    focusEntryCard(nextId);
  } else {
    refs.addEntryBtn.focus();
  }

  scheduleSave();
  toast(`${ids.length} ${ids.length === 1 ? "entry" : "entries"} deleted`);
}

function importStrategyMessage(strategy, fileName, isCard = false) {
  if (isCard) {
    return `"${fileName}" is a character card and is added to the project; an embedded lorebook is extracted with it. The current project is saved as a local backup first.`;
  }

  if (strategy === "append") {
    return `"${fileName}" is ready to append. Existing lorebooks are kept and imported entries are added after matching ones. The current project will be saved as a local backup first.`;
  }

  if (strategy === "merge") {
    return `"${fileName}" is ready to merge by title. Matching entries are updated and new entries are added. The current project will be saved as a local backup first.`;
  }

  return `"${fileName}" is ready to import. The current project will be saved as a local backup before it is replaced.`;
}

function importConfirmLabel(strategy) {
  if (strategy === "append") {
    return "Append to project";
  }

  if (strategy === "merge") {
    return "Merge by title";
  }

  return "Import and replace";
}

function importResultMessage(strategy, parsed, stats, entryCount) {
  if (strategy === "append") {
    const count = stats.entriesAdded;
    return `Appended ${count} ${count === 1 ? "entry" : "entries"} from ${parsed.format}`;
  }

  if (strategy === "merge") {
    const parts = [];

    if (stats.entriesUpdated) {
      parts.push(`${stats.entriesUpdated} updated`);
    }

    if (stats.entriesAdded) {
      parts.push(`${stats.entriesAdded} added`);
    }

    return `Merged ${parsed.format}: ${parts.join(", ") || "no entry changes"}`;
  }

  return `Imported ${parsed.format}: ${entryCount} ${entryCount === 1 ? "entry" : "entries"}`;
}

let editingCardId = null;
let editingAvatarDataUrl = "";

function openCardDialog(cardId = null) {
  const card = cardId ? getCards().find((item) => item.id === cardId) : null;
  editingCardId = card?.id ?? null;
  editingAvatarDataUrl = card?.avatarDataUrl ?? "";
  refs.cardDialog.querySelector("#card-title").textContent = card ? "Edit card" : "New character card";
  refs.cardDelete.hidden = !card;
  refs.cardExport.hidden = !card;
  refs.cardStatus.textContent = "";
  fillCardForm(refs, card ?? {});
  refs.cardDialog.showModal();
  refs.cardName.focus();
}

function closeCardDialog() {
  refs.cardDialog.close();
  editingCardId = null;
  editingAvatarDataUrl = "";
}

async function readAvatarFile(file) {
  if (!file) {
    return "";
  }

  if (!/^image\/(png|webp|jpeg)$/.test(file.type)) {
    toast("Choose a PNG, WebP or JPEG image.", "error");
    return null;
  }

  if (file.size > 8 * 1024 * 1024) {
    toast("That image is too large (8 MB limit).", "error");
    return null;
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  }).catch(() => "");

  if (!dataUrl) {
    toast("Couldn't read that image.", "error");
    return null;
  }

  return dataUrl;
}

function handleSaveCard() {
  const values = readCardForm(refs);

  if (!values.name.trim()) {
    refs.cardStatus.textContent = "Give the card a name first.";
    refs.cardName.focus();
    return;
  }

  if (editingCardId) {
    updateCard(editingCardId, { ...values, avatarDataUrl: editingAvatarDataUrl });
    toast("Card saved", "success");
  } else {
    const card = addCard(createCard({ ...values, avatarDataUrl: editingAvatarDataUrl }));

    if (card) {
      toast("Card added", "success");
    }
  }

  closeCardDialog();
  renderAll();
  scheduleSave();
}

async function handleDeleteCard() {
  const card = editingCardId ? getCards().find((item) => item.id === editingCardId) : null;

  if (!card) {
    return;
  }

  const accepted = await confirmAction({
    title: "Delete card?",
    message: `"${card.name.trim() || "Untitled card"}" will be permanently removed. Its linked lorebook stays.`,
    confirmLabel: "Delete card"
  });

  if (!accepted) {
    return;
  }

  deleteCard(card.id);
  closeCardDialog();
  renderAll();
  scheduleSave();
  toast("Card deleted");
}

async function handleExportCard() {
  const card = editingCardId ? getCards().find((item) => item.id === editingCardId) : null;

  if (!card) {
    return;
  }

  const values = readCardForm(refs);
  const book = values.bookId ? getState().books.find((item) => item.id === values.bookId) : null;
  const exported = CARD_ADAPTER.serialize(
    { ...card, ...values, avatarDataUrl: editingAvatarDataUrl },
    { book, avatarDataUrl: editingAvatarDataUrl }
  );

  if (!exported.ok) {
    refs.cardStatus.textContent = exported.error;
    return;
  }

  if (exported.dataUrl) {
    downloadJson(JSON.parse(exported.json), exported.filename);
  } else {
    downloadBytes(exported.bytes, exported.filename, exported.type);
  }

  toast(`Exported ${values.name.trim()} as a card`, "success");
}

async function handleImport(file, { fileHandle = null } = {}) {
  if (!file) {
    return;
  }

  if (Number.isFinite(file.size) && file.size > MAX_IMPORT_BYTES) {
    toast(`That file is too large (about ${Math.round(file.size / (1024 * 1024))} MB). The import limit is 25 MB.`, "error");
    return;
  }

  const isCardContainer = /\.(png|charx|webp|jpg|jpeg)$/i.test(file.name);
  let payload;

  try {
    payload = isCardContainer ? await file.arrayBuffer() : await file.text();
  } catch {
    toast("Couldn't read that file.", "error");
    return;
  }

  const parsed = await parseProject(payload, { filename: file.name });

  if (!parsed.ok) {
    toast(parsed.error, "error");
    return;
  }

  const bookCount = parsed.project.books.length;
  const entryCount = parsed.project.books.reduce((total, book) => total + book.entries.length, 0);
  const cardCount = parsed.project.cards?.length ?? 0;
  const cardName = parsed.project.cards?.[0]?.name?.trim() ?? "";
  let strategy = parsed.formatId === "card" ? "append" : "replace";
  const buildImportReview = (value) => {
    const merged = mergeProject(getState(), parsed.project, value);
    const details = [
      { label: "Format", value: parsed.format },
      { label: "File", value: file.name }
    ];

    if (cardCount) {
      details.push({ label: "Character card", value: cardName || "Untitled card" });
    }

    details.push({ label: "Lorebooks", value: String(bookCount) }, { label: "Entries", value: String(entryCount) });

    return {
      diff: diffProjects(getState(), merged.project),
      message: importStrategyMessage(value, file.name, cardCount > 0),
      details,
      warnings: parsed.warnings || [],
      confirmLabel: importConfirmLabel(value)
    };
  };
  const accepted = await showDiffDialog({
    eyebrow: "Import",
    title: "Review import changes",
    ...buildImportReview(strategy),
    controls: [{
      id: "strategy",
      label: "Import strategy",
      value: strategy,
      options: IMPORT_STRATEGIES.map(({ value, label }) => ({ value, label }))
    }],
    onChange: (value) => {
      strategy = value;
      return buildImportReview(value);
    },
    cancelLabel: "Cancel"
  });

  if (!accepted) {
    return;
  }

  const backup = await saveProjectBackup(getState(), `Before importing ${file.name}`);

  if (!backup.ok) {
    const proceed = await confirmAction({
      title: "Backup failed",
      message: "The current project could not be backed up. Importing will replace it without a recovery copy.",
      confirmLabel: "Import without backup"
    });

    if (!proceed) {
      return;
    }
  }

  const merged = mergeProject(getState(), parsed.project, strategy);
  await recordRevision(`Before importing ${file.name}`);
  replaceProject(merged.project);

  const sortMode = readSortMode();

  if (sortMode) {
    setSortMode(sortMode);
  }

  clearSearch();
  renderAll();
  await flushSave();
  await recordRevision(`Imported ${file.name}`);
  toast(importResultMessage(strategy, parsed, merged.stats, entryCount), "success");

  if (backup.ok) {
    toast("Previous project saved as a pre-import backup");
  }

  if (fileHandle) {
    projectFileHandle = fileHandle;
    updateFileLabel();
  }
}

refs.newBookBtn.addEventListener("click", () => {
  addBook();
  clearSearch();
  renderAll();
  refs.bookName.focus();
  refs.bookName.select();
  scheduleSave();
});

refs.deleteBookBtn.addEventListener("click", () => {
  handleDeleteBook();
});

refs.newCardBtn.addEventListener("click", () => {
  openCardDialog();
});

refs.cardList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-card-id]");

  if (item) {
    openCardDialog(item.dataset.cardId);
  }
});

refs.cardList.addEventListener("keydown", (event) => {
  const item = event.target.closest("[data-card-id]");

  if (!item) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openCardDialog(item.dataset.cardId);
  }
});

refs.cardAvatarInput.addEventListener("change", async (event) => {
  const dataUrl = await readAvatarFile(event.target.files?.[0]);
  event.target.value = "";

  if (!dataUrl) {
    return;
  }

  editingAvatarDataUrl = dataUrl;
  refs.cardAvatar.replaceChildren();

  const img = document.createElement("img");
  img.alt = "Card image";
  img.src = dataUrl;
  refs.cardAvatar.append(img);
});

refs.cardCancel.addEventListener("click", closeCardDialog);
refs.cardSave.addEventListener("click", handleSaveCard);
refs.cardDelete.addEventListener("click", handleDeleteCard);
refs.cardExport.addEventListener("click", handleExportCard);

refs.cardDialog.addEventListener("click", (event) => {
  if (event.target === refs.cardDialog) {
    closeCardDialog();
  }
});

refs.bookActionsBtn.addEventListener("click", () => {
  openBookActionsDialog();
});

refs.bookDuplicateBtn.addEventListener("click", () => {
  handleDuplicateBook();
});

refs.bookSplitBtn.addEventListener("click", () => {
  handleSplitBook();
});

refs.bookMergeBtn.addEventListener("click", () => {
  handleMergeBook();
});

refs.bookActionsCloseBtn.addEventListener("click", () => {
  refs.bookActionsDialog.close();
});

refs.bookActionsDialog.addEventListener("click", (event) => {
  if (event.target === refs.bookActionsDialog) {
    refs.bookActionsDialog.close();
  }
});

refs.bookSelect.addEventListener("change", (event) => {
  setActiveBook(event.target.value);
  setTagFilters([]);
  persistTagFilters([]);
  clearSearch();
  renderAll();
  scheduleSave();
});

refs.bookName.addEventListener("input", (event) => {
  const name = event.target.value;
  renameActiveBook(name);
  const option = refs.bookSelect.selectedOptions[0];

  if (option) {
    option.textContent = name.trim() || "Untitled Lorebook";
  }

  updateDocumentTitle();
  scheduleSave();
});

refs.bookName.addEventListener("blur", () => {
  const name = refs.bookName.value.trim() || "Untitled Lorebook";
  refs.bookName.value = name;
  renameActiveBook(name);
  const option = refs.bookSelect.selectedOptions[0];

  if (option) {
    option.textContent = name;
  }

  updateDocumentTitle();
  scheduleSave();
});

refs.bookDescription.addEventListener("input", (event) => {
  updateActiveBookDescription(event.target.value);
  updateBookDescriptionPreview(event.target.value);
  scheduleSave();
});

refs.bookTokenBudget.addEventListener("input", (event) => {
  updateActiveBookTokenBudget(event.target.value);
  updateBudgetStatus();
  scheduleSave();
});

refs.bookTokenBudget.addEventListener("blur", () => {
  refs.bookTokenBudget.value = String(getActiveBook()?.tokenBudget ?? 0);
});

refs.entrySearch.addEventListener("input", (event) => {
  setSearchQuery(event.target.value);
  renderSidebar(refs);
});

refs.entrySearch.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    event.preventDefault();
    clearSearch();
    renderSidebar(refs);
    refs.entrySearch.blur();
  }
});

refs.addEntryBtn.addEventListener("click", handleAddEntry);
refs.emptyAddBtn.addEventListener("click", handleAddEntry);
refs.templateBtn.addEventListener("click", openTemplateDialog);

refs.templateCloseBtn.addEventListener("click", () => {
  refs.templateDialog.close();
});

refs.templateList.addEventListener("click", (event) => {
  const option = event.target.closest("[data-template-id]");

  if (option) {
    handleTemplatePick(option.dataset.templateId);
  }
});

refs.templateDialog.addEventListener("click", (event) => {
  if (event.target === refs.templateDialog) {
    refs.templateDialog.close();
  }
});

refs.entryList.addEventListener("click", (event) => {
  const action = event.target.closest("[data-empty-action]");

  if (action) {
    if (action.dataset.emptyAction === "clear-search") {
      clearSearch();
      renderSidebar(refs);
      refs.entrySearch.focus();
    } else {
      resetFilters();
      persistEntryFilters(getEntryFilters());
      persistTagFilters(getTagFilters());
      renderSidebar(refs);
    }

    return;
  }

  const card = event.target.closest("[data-entry-id]");

  if (!card) {
    return;
  }

  activateEntryCard(card.dataset.entryId, {
    toggle: event.ctrlKey || event.metaKey,
    range: event.shiftKey
  });
});

refs.entryList.addEventListener("keydown", (event) => {
  const card = event.target.closest("[data-entry-id]");

  if (!card) {
    return;
  }

  const id = card.dataset.entryId;

  if (!event.altKey && (event.key === "Enter" || event.key === " ")) {
    event.preventDefault();
    activateEntryCard(id, {
      toggle: event.ctrlKey || event.metaKey,
      range: event.shiftKey
    });
    return;
  }

  if (!event.altKey && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End")) {
    event.preventDefault();
    const ids = visibleEntryIds();
    const index = ids.indexOf(id);

    if (index === -1) {
      return;
    }

    const targetIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? ids.length - 1
        : index + (event.key === "ArrowDown" ? 1 : -1);

    if (targetIndex < 0 || targetIndex >= ids.length || targetIndex === index) {
      return;
    }

    const targetId = ids[targetIndex];
    activateEntryCard(targetId, {
      toggle: event.ctrlKey || event.metaKey,
      range: event.shiftKey
    });
    scrollEntryCardIntoView(targetId);
    return;
  }

  if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
    event.preventDefault();

    if (!canReorderEntries()) {
      toast("Switch to Manual order and clear search to reorder entries.");
      return;
    }

    const ids = visibleEntryIds();
    const index = ids.indexOf(id);
    const targetIndex = index + (event.key === "ArrowUp" ? -1 : 1);

    if (index === -1 || targetIndex < 0 || targetIndex >= ids.length) {
      return;
    }

    const place = event.key === "ArrowUp" ? "before" : "after";

    if (!moveEntry(id, ids[targetIndex], place)) {
      return;
    }

    setActiveEntry(id);
    renderSidebar(refs);
    renderEditor(refs);
    focusEntryCard(id);
    scheduleSave();
  }
});

refs.entryList.addEventListener("dragstart", (event) => {
  const card = event.target.closest("[data-entry-id]");

  if (!card || !canReorderEntries()) {
    event.preventDefault();
    return;
  }

  draggedEntryId = card.dataset.entryId;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedEntryId);
  card.classList.add("is-dragging");
});

refs.entryList.addEventListener("dragover", (event) => {
  if (!draggedEntryId) {
    return;
  }

  const card = event.target.closest("[data-entry-id]");

  if (!card || !refs.entryList.contains(card)) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";

  if (card.dataset.entryId === draggedEntryId) {
    clearDropIndicators();
    return;
  }

  const place = dropPlaceFor(event, card);

  if (dropTargetId === card.dataset.entryId && dropPlace === place) {
    return;
  }

  clearDropIndicators();
  dropTargetId = card.dataset.entryId;
  dropPlace = place;
  card.classList.add(place === "after" ? "is-drop-after" : "is-drop-before");
});

refs.entryList.addEventListener("dragleave", (event) => {
  if (!refs.entryList.contains(event.relatedTarget)) {
    clearDropIndicators();
  }
});

refs.entryList.addEventListener("drop", (event) => {
  if (!draggedEntryId) {
    return;
  }

  event.preventDefault();

  const card = event.target.closest("[data-entry-id]");
  const targetId = card?.dataset.entryId ?? dropTargetId;
  const place = card ? dropPlaceFor(event, card) : dropPlace;
  const sourceId = draggedEntryId;
  clearDragState();

  if (!targetId || targetId === sourceId || !moveEntry(sourceId, targetId, place)) {
    return;
  }

  setActiveEntry(sourceId);
  renderSidebar(refs);
  renderEditor(refs);
  focusEntryCard(sourceId);
  scheduleSave();
});

refs.entryList.addEventListener("dragend", () => {
  clearDragState();
});

refs.entryList.addEventListener("scroll", () => {
  if (!refs.entryList.classList.contains("is-virtual") || virtualScrollFrame) {
    return;
  }

  virtualScrollFrame = window.requestAnimationFrame(() => {
    virtualScrollFrame = 0;
    renderSidebar(refs);
  });
});

refs.entrySort.addEventListener("change", (event) => {
  const mode = event.target.value;
  setSortMode(mode);
  persistSortMode(getState().ui.sortMode);
  renderSidebar(refs);
});

refs.entryFilters.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-filter]");

  if (!chip) {
    return;
  }

  toggleEntryFilter(chip.dataset.filter);
  persistEntryFilters(getEntryFilters());
  renderSidebar(refs);
});

refs.tagFilters.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-tag]");

  if (!chip) {
    return;
  }

  toggleTagFilter(chip.dataset.tag);
  persistTagFilters(getTagFilters());
  renderSidebar(refs);
});

refs.bulkEnableBtn.addEventListener("click", () => {
  handleBulkEnabled(true);
});

refs.bulkDisableBtn.addEventListener("click", () => {
  handleBulkEnabled(false);
});

refs.bulkDeleteBtn.addEventListener("click", () => {
  handleBulkDelete();
});

refs.bulkOrderApplyBtn.addEventListener("click", () => {
  handleBulkOrderSet();
});

refs.bulkOrderDownBtn.addEventListener("click", () => {
  handleBulkOrderShift(-10);
});

refs.bulkOrderUpBtn.addEventListener("click", () => {
  handleBulkOrderShift(10);
});

refs.bulkOrderInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    handleBulkOrderSet();
  }
});

refs.bulkClearBtn.addEventListener("click", () => {
  clearSelection();
  renderSidebar(refs);
  refs.entryList.focus({ preventScroll: true });
});

refs.duplicateEntryBtn.addEventListener("click", () => {
  handleDuplicateEntry();
});

refs.bulkSizeBtn.addEventListener("click", () => {
  openBulkSizeDialog();
});

for (const input of [refs.bulkSizeMin, refs.bulkSizeMax, refs.bulkSizeDisabled]) {
  input.addEventListener("input", renderBulkSizeSummary);
  input.addEventListener("change", renderBulkSizeSummary);
}

refs.bulkSizeCancel.addEventListener("click", () => {
  refs.bulkSizeDialog.close();
});

refs.bulkSizeApply.addEventListener("click", handleBulkSizeApply);

refs.bulkTagBtn.addEventListener("click", openBulkTagDialog);
refs.bulkTagCancel.addEventListener("click", () => refs.bulkTagDialog.close());
refs.bulkTagAdd.addEventListener("click", () => applyBulkTag("add"));
refs.bulkTagRemove.addEventListener("click", () => applyBulkTag("remove"));
refs.bulkTagInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    applyBulkTag("add");
  }
});
refs.bulkTagDialog.addEventListener("click", (event) => {
  if (event.target === refs.bulkTagDialog) {
    refs.bulkTagDialog.close();
  }
});

refs.bulkSizeDialog.addEventListener("click", (event) => {
  if (event.target === refs.bulkSizeDialog) {
    refs.bulkSizeDialog.close();
  }
});

refs.replaceDialog.addEventListener("click", (event) => {
  if (event.target === refs.replaceDialog) {
    refs.replaceDialog.close();
  }
});

for (const input of [
  refs.replaceFind,
  refs.replaceWith,
  refs.replaceRegex,
  refs.replaceCase,
  refs.replaceFieldContent,
  refs.replaceFieldTitle,
  refs.replaceFieldKeys,
  refs.replaceFieldNotes
]) {
  input.addEventListener("input", updateReplaceControls);
  input.addEventListener("change", updateReplaceControls);
}

refs.replaceFind.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !refs.replacePreview.disabled) {
    event.preventDefault();
    previewReplace();
  }
});

refs.replaceCancel.addEventListener("click", () => {
  refs.replaceDialog.close();
});

refs.replacePreview.addEventListener("click", () => {
  previewReplace();
});

refs.replaceApply.addEventListener("click", () => {
  handleReplaceApply();
});

refs.entryTitle.addEventListener("input", (event) => {
  updateActiveEntry({ title: event.target.value });
  renderSidebar(refs);
  scheduleSave();
});

refs.entryEnabled.addEventListener("change", (event) => {
  updateActiveEntry({ enabled: event.target.checked });
  renderSidebar(refs);
  scheduleSave();
});

refs.entryContent.addEventListener("input", (event) => {
  updateActiveEntry({ content: event.target.value });
  syncEntryStats(refs, event.target.value);
  scheduleSave();
});

refs.entryNotes.addEventListener("input", (event) => {
  updateActiveEntry({ notes: event.target.value });
  scheduleSave();
});

function openPeekDialog() {
  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const measured = tokenizer.count(entry.content);
  const tokens = Number.isFinite(measured) ? measured : estimateTokens(entry.content);
  const prefix = Number.isFinite(measured) ? "" : "~";
  refs.peekMeta.textContent = `${entry.title.trim() || "Untitled entry"} \u00b7 ${prefix}${numberFormatter.format(tokens)} tokens \u00b7 ${entry.constant ? "always on" : entry.keys.length ? `keys: ${entry.keys.join(", ")}` : "no keys"}`;
  refs.peekBody.textContent = entry.content || "(no content)";
  refs.peekDialog.showModal();
  refs.peekClose.focus();
}

refs.suggestKeysBtn.addEventListener("click", () => {
  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const suggested = suggestKeys({
    title: entry.title,
    content: entry.content,
    existing: entry.keys,
    limit: 5
  });

  if (!suggested.length) {
    toast("No new key suggestions for this entry.");
    return;
  }

  updateActiveEntry({ keys: [...entry.keys, ...suggested] });
  renderEditor(refs);
  renderSidebar(refs);
  scheduleSave();
  toast(`Added ${suggested.length} suggested ${suggested.length === 1 ? "key" : "keys"}`, "success");
});

refs.peekBtn.addEventListener("click", openPeekDialog);
refs.peekClose.addEventListener("click", () => refs.peekDialog.close());
refs.peekDialog.addEventListener("click", (event) => {
  if (event.target === refs.peekDialog) {
    refs.peekDialog.close();
  }
});

refs.entryOrder.addEventListener("input", (event) => {
  if (event.target.value === "") {
    return;
  }

  const value = Number(event.target.value);

  if (Number.isFinite(value)) {
    updateActiveEntry({ order: clamp(Math.round(value), 0, 9999) });
    scheduleSave();
  }
});

refs.entryOrder.addEventListener("blur", () => {
  const entry = getActiveEntry();

  if (entry) {
    refs.entryOrder.value = String(entry.order);
  }
});

for (const button of refs.editorPane.querySelectorAll("[data-step]")) {
  button.addEventListener("click", () => {
    const entry = getActiveEntry();

    if (!entry) {
      return;
    }

    const nextOrder = clamp(entry.order + Number(button.dataset.step), 0, 9999);
    updateActiveEntry({ order: nextOrder });
    refs.entryOrder.value = String(nextOrder);
    scheduleSave();
  });
}

refs.entryPosition.addEventListener("change", (event) => {
  updateActiveEntry({ position: event.target.value });
  scheduleSave();
});

refs.entryProbability.addEventListener("input", (event) => {
  const value = clamp(Number(event.target.value), 0, 100);
  updateActiveEntry({ probability: value });
  refs.entryProbabilityOutput.textContent = `${value}%`;
  scheduleSave();
});

for (const [input, field] of [
  [refs.entryTokenLimit, "tokenLimit"],
  [refs.entryCharLimit, "charLimit"]
]) {
  input.addEventListener("input", (event) => {
    if (event.target.value === "") {
      return;
    }

    updateActiveEntry({ [field]: clamp(Math.round(Number(event.target.value) || 0), 0, 1_000_000) });
    scheduleSave();
  });
}

const checkboxBindings = [
  [refs.entryConstant, "constant"],
  [refs.entrySelective, "selective"],
  [refs.entryCaseSensitive, "caseSensitive"],
  [refs.entryWholeWords, "matchWholeWords"]
];

for (const [checkbox, field] of checkboxBindings) {
  checkbox.addEventListener("change", () => {
    updateActiveEntry({ [field]: checkbox.checked });
    renderSidebar(refs);
    scheduleSave();
  });
}

refs.deleteEntryBtn.addEventListener("click", () => {
  handleDeleteEntry();
});

refs.undoBtn.addEventListener("click", handleUndo);
refs.redoBtn.addEventListener("click", handleRedo);

refs.historyBtn.addEventListener("click", () => {
  openHistoryDialog().catch(() => setHistoryStatus("Couldn't read local snapshots.", "error"));
});

refs.historySaveBtn.addEventListener("click", async () => {
  const result = await recordRevision("Manual snapshot");

  if (!result.ok) {
    setHistoryStatus(result.error, "error");
  } else if (result.skipped) {
    setHistoryStatus(result.error);
  } else {
    setHistoryStatus("Snapshot saved.", "success");
  }

  await renderHistoryDialog();
});

refs.historyCloseBtn.addEventListener("click", () => {
  refs.historyDialog.close();
});

refs.historyList.addEventListener("click", (event) => {
  const compare = event.target.closest("[data-revision-compare]");
  const restore = event.target.closest("[data-revision-restore]");

  if (compare) {
    handleCompareRevision(compare.dataset.revisionCompare);
  } else if (restore) {
    handleRestoreRevision(restore.dataset.revisionRestore);
  }
});

refs.historyDialog.addEventListener("click", (event) => {
  if (event.target === refs.historyDialog) {
    refs.historyDialog.close();
  }
});

refs.detailsToggle.addEventListener("click", () => {
  setDetailsCollapsed(!refs.detailsPanel.classList.contains("is-collapsed"));
});

refs.sidebarToggle.addEventListener("click", () => {
  setSidebarCollapsed(!refs.sidebar.classList.contains("is-collapsed"));
});

refs.sidebarResizer.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || refs.sidebar.classList.contains("is-collapsed")) {
    return;
  }

  sidebarDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startWidth: refs.sidebar.getBoundingClientRect().width,
    moved: false
  };
  refs.sidebarResizer.setPointerCapture(event.pointerId);
  refs.workspace.classList.add("is-resizing-sidebar");
  document.body.classList.add("is-resizing-sidebar");
  event.preventDefault();
});

refs.sidebarResizer.addEventListener("pointermove", (event) => {
  if (!sidebarDrag || event.pointerId !== sidebarDrag.pointerId) {
    return;
  }

  const delta = event.clientX - sidebarDrag.startX;

  if (delta !== 0) {
    sidebarDrag.moved = true;
  }

  applySidebarWidth(sidebarDrag.startWidth + delta);
});

refs.sidebarResizer.addEventListener("pointerup", finishSidebarResize);
refs.sidebarResizer.addEventListener("pointercancel", finishSidebarResize);
refs.sidebarResizer.addEventListener("lostpointercapture", finishSidebarResize);

refs.sidebarResizer.addEventListener("keydown", (event) => {
  let next = null;

  if (event.key === "ArrowLeft") {
    next = sidebarWidth - (event.shiftKey ? SIDEBAR_RESIZE_STEP * 2 : SIDEBAR_RESIZE_STEP);
  } else if (event.key === "ArrowRight") {
    next = sidebarWidth + (event.shiftKey ? SIDEBAR_RESIZE_STEP * 2 : SIDEBAR_RESIZE_STEP);
  } else if (event.key === "Home") {
    next = SIDEBAR_MIN_WIDTH;
  } else if (event.key === "End") {
    next = getSidebarMaxWidth();
  }

  if (next === null) {
    return;
  }

  event.preventDefault();
  sidebarWidthMode = "manual";
  applySidebarWidth(next, true);
});

refs.sidebarResizer.addEventListener("dblclick", (event) => {
  event.preventDefault();
  applyAutomaticSidebarWidth();
});

window.addEventListener("resize", syncSidebarWidthToViewport);

refs.importBtn.addEventListener("click", () => {
  refs.importInput.click();
});

refs.importInput.addEventListener("change", async () => {
  const file = refs.importInput.files?.[0];

  try {
    await handleImport(file);
  } finally {
    refs.importInput.value = "";
  }
});

refs.commandBtn.addEventListener("click", () => {
  openCommandPalette(buildCommands());
});

refs.sampleBadge.addEventListener("click", () => {
  openSampleDialog();
});

refs.sampleResetBtn.addEventListener("click", () => {
  refs.sampleDialog.close();
  resetSampleProject();
});

refs.sampleEmptyBtn.addEventListener("click", () => {
  refs.sampleDialog.close();
  startEmptyProject();
});

refs.sampleCancelBtn.addEventListener("click", () => {
  refs.sampleDialog.close();
});

refs.sampleDialog.addEventListener("click", (event) => {
  if (event.target === refs.sampleDialog) {
    refs.sampleDialog.close();
  }
});

refs.onboardingSampleBtn.addEventListener("click", () => {
  markOnboarded();
  refs.onboardingDialog.close();
});

refs.onboardingEmptyBtn.addEventListener("click", () => {
  markOnboarded();
  refs.onboardingDialog.close();
  startEmptyProject();
});

refs.onboardingGuideBtn.addEventListener("click", () => {
  markOnboarded();
  refs.onboardingDialog.close();
  openGuideDialog();
});

refs.onboardingDialog.addEventListener("close", () => {
  markOnboarded();
});

refs.onboardingDialog.addEventListener("click", (event) => {
  if (event.target === refs.onboardingDialog) {
    refs.onboardingDialog.close();
  }
});

refs.aboutBtn.addEventListener("click", () => {
  openAboutDialog();
});

refs.aboutGuideBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openGuideDialog();
});

refs.aboutTokenBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openTokenSettingsDialog();
});

refs.aboutIntegrityBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openIntegrityDialog();
});

refs.tokenizerPreset.addEventListener("change", handleTokenizerChange);
refs.contextWindowPreset.addEventListener("change", handleContextWindowChange);

refs.tokenSettingsCloseBtn.addEventListener("click", () => {
  refs.tokenSettingsDialog.close();
});

refs.tokenSettingsDialog.addEventListener("click", (event) => {
  if (event.target === refs.tokenSettingsDialog) {
    refs.tokenSettingsDialog.close();
  }
});

refs.integrityRepairBtn.addEventListener("click", () => {
  handleIntegrityRepair();
});

refs.integrityCloseBtn.addEventListener("click", () => {
  refs.integrityDialog.close();
});

refs.integrityDialog.addEventListener("click", (event) => {
  if (event.target === refs.integrityDialog) {
    refs.integrityDialog.close();
  }
});

refs.globalSearchInput.addEventListener("input", renderGlobalSearch);

refs.globalSearchResults.addEventListener("click", (event) => {
  const item = event.target.closest("[data-entry-id]");

  if (item) {
    handleGlobalSearchJump(item.dataset.bookId, item.dataset.entryId);
  }
});

refs.globalSearchCloseBtn.addEventListener("click", () => {
  refs.globalSearchDialog.close();
});

refs.globalSearchDialog.addEventListener("click", (event) => {
  if (event.target === refs.globalSearchDialog) {
    refs.globalSearchDialog.close();
  }
});

refs.aboutCloseBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
});

refs.guideCloseBtn.addEventListener("click", () => {
  refs.guideDialog.close();
});

refs.aboutDialog.addEventListener("click", (event) => {
  if (event.target === refs.aboutDialog) {
    refs.aboutDialog.close();
  }
});

refs.guideDialog.addEventListener("click", (event) => {
  if (event.target === refs.guideDialog) {
    refs.guideDialog.close();
  }
});

refs.exportBtn.addEventListener("click", () => {
  openExportDialog();
});

refs.openFileBtn.addEventListener("click", () => {
  openProjectFile();
});

refs.saveFileBtn.addEventListener("click", () => {
  saveProjectFile();
});

refs.backupReminderExportBtn.addEventListener("click", () => {
  exportProjectBackup();
});

refs.backupReminderDismissBtn.addEventListener("click", () => {
  snoozeBackupReminder();
});

refs.sessionSummaryExportBtn.addEventListener("click", () => {
  exportProjectBackup();
});

refs.sessionSummaryDismissBtn.addEventListener("click", () => {
  hideSessionSummary();
});

refs.storageExportBtn.addEventListener("click", () => {
  exportProjectBackup();
});

refs.storageRetryBtn.addEventListener("click", async () => {
  if (await flushSave()) {
    toast("Changes saved locally", "success");
  } else {
    toast("Still unable to save. Export a backup to protect your work.", "error");
  }
});

refs.storageDismissBtn.addEventListener("click", () => {
  hideStorageBanner();
});

refs.exportCancelBtn.addEventListener("click", () => {
  refs.exportDialog.close();
});

refs.exportOptions.addEventListener("click", (event) => {
  const option = event.target.closest("[data-export-format]");

  if (option) {
    handleExport(option.dataset.exportFormat);
  }
});

refs.restoreBackupBtn.addEventListener("click", () => {
  handleRestoreBackup();
});

refs.exportDialog.addEventListener("click", (event) => {
  if (event.target === refs.exportDialog) {
    refs.exportDialog.close();
  }
});

refs.overviewBtn.addEventListener("click", openOverviewDialog);

refs.overviewCloseBtn.addEventListener("click", () => {
  refs.overviewDialog.close();
});

refs.simulationBtn.addEventListener("click", openSimulationDialog);

refs.simulationRunBtn.addEventListener("click", renderSimulationResults);

refs.simulationInput.addEventListener("input", () => {
  window.clearTimeout(simulationTimer);
  simulationTimer = window.setTimeout(renderSimulationResults, 180);
});

refs.simulationResults.addEventListener("click", (event) => {
  const target = event.target.closest("[data-entry-id]");

  if (target) {
    handleSimulationJump(target.dataset.entryId);
  }
});

refs.simulationCloseBtn.addEventListener("click", () => {
  refs.simulationDialog.close();
});

refs.simulationDialog.addEventListener("click", (event) => {
  if (event.target === refs.simulationDialog) {
    refs.simulationDialog.close();
  }
});

refs.overviewDialog.addEventListener("click", (event) => {
  if (event.target === refs.overviewDialog) {
    refs.overviewDialog.close();
  }
});

refs.validationBtn.addEventListener("click", openValidationDialog);

refs.validationCloseBtn.addEventListener("click", () => {
  refs.validationDialog.close();
});

refs.validationCategories.addEventListener("click", (event) => {
  if (event.target.closest("[data-validation-all]")) {
    validationFilters = new Set();
    renderValidationDialog();
    return;
  }

  const chip = event.target.closest("[data-validation-filter]");

  if (!chip) {
    return;
  }

  const code = chip.dataset.validationFilter;

  if (validationFilters.has(code)) {
    validationFilters.delete(code);
  } else {
    validationFilters.add(code);
  }

  renderValidationDialog();
});

refs.validationIssues.addEventListener("click", (event) => {
  const issue = event.target.closest("[data-entry-id]");

  if (issue) {
    jumpToValidationEntry(issue.dataset.entryId, issue.dataset.field);
  }
});

refs.validationDialog.addEventListener("click", (event) => {
  if (event.target === refs.validationDialog) {
    refs.validationDialog.close();
  }
});

function isTypingTarget(target) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

document.addEventListener("keydown", async (event) => {
  if (event.isComposing || document.querySelector("dialog[open]")) {
    return;
  }

  const modifier = event.ctrlKey || event.metaKey;
  const key = event.key.toLowerCase();

  if (modifier && !event.altKey && key === "k") {
    event.preventDefault();
    openCommandPalette(buildCommands());
    return;
  }

  if (modifier && event.shiftKey && !event.altKey && key === "f") {
    event.preventDefault();
    openGlobalSearchDialog();
    return;
  }

  if (modifier && !event.shiftKey && !event.altKey && key === "h") {
    event.preventDefault();
    openReplaceDialog();
    return;
  }

  if (modifier && event.shiftKey && !event.altKey && key === "e") {
    event.preventDefault();
    openExportDialog();
    return;
  }

  if (modifier && !event.altKey && key === "z") {
    event.preventDefault();

    if (event.shiftKey) {
      handleRedo();
    } else {
      handleUndo();
    }

    return;
  }

  if (modifier && !event.altKey && key === "y") {
    event.preventDefault();
    handleRedo();
    return;
  }

  if (event.key === "Escape" && !isTypingTarget(event.target) && getSelectedEntryIds().length) {
    clearSelection();
    renderSidebar(refs);
    return;
  }

  if (modifier && key === "o" && supportsFileSystemAccess()) {
    event.preventDefault();
    await openProjectFile();
    return;
  }

  if (modifier && event.shiftKey && key === "s" && supportsFileSystemAccess()) {
    event.preventDefault();
    await saveProjectFile({ saveAs: true });
    return;
  }

  if (modifier && !event.altKey && key === "d" && getActiveEntry()) {
    event.preventDefault();
    handleDuplicateEntry();
    return;
  }

  if (modifier && key === "Enter" && refs.simulationDialog.open) {
    event.preventDefault();
    renderSimulationResults();
    return;
  }

  if (modifier && key === "s") {
    event.preventDefault();
    const ok = await flushSave();

    if (ok) {
      toast("Project saved", "success");
    }

    return;
  }

  if (event.altKey && event.code === "KeyN") {
    event.preventDefault();
    handleAddEntry();
    return;
  }

  if (event.key === "/" && !modifier && !event.altKey && !isTypingTarget(event.target)) {
    event.preventDefault();
    refs.entrySearch.focus();
    refs.entrySearch.select();
  }
});

window.addEventListener("beforeunload", (event) => {
  recordSessionChanges();

  if (unsavedChanges || saveFailed) {
    event.preventDefault();
    event.returnValue = "";
  }
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    recordSessionChanges();
    flushSave();
  }
});

await initStorage();

const storedDetailsState = readDetailsState();
setDetailsCollapsed(storedDetailsState ?? window.matchMedia("(max-width: 720px)").matches, false);

const storedSidebarState = readSidebarState();
setSidebarCollapsed(storedSidebarState ?? false, false);

const persistedHistory = parseHistory(await loadHistory());
const loadedProject = await loadProject();
initStore(loadedProject, { history: persistedHistory });
sessionStart = structuredClone(loadedProject);
onHistoryChange(() => {
  updateHistoryButtons();
  window.clearTimeout(historySaveTimer);
  historySaveTimer = window.setTimeout(() => {
    saveHistory(serializeHistory(getHistory()));
  }, 500);
});

const initialSortMode = readSortMode();

if (initialSortMode) {
  setSortMode(initialSortMode);
}

const initialFilters = readEntryFilters();

if (initialFilters) {
  setEntryFilters(initialFilters);
}

const initialTagFilters = readTagFilters();

if (initialTagFilters) {
  setTagFilters(initialTagFilters);
}

tokenSettings = readTokenSettings();
applyTokenSettings();

tokenizer.start();
renderAll();

const storedSidebarWidth = readSidebarWidth();

if (storedSidebarWidth === null) {
  applyAutomaticSidebarWidth();
} else {
  sidebarWidthMode = "manual";
  applySidebarWidth(storedSidebarWidth);
}

const initialSave = await saveProjectDetailed(getState());

if (initialSave.ok) {
  setSaveState("saved");
  await maybeSaveRevision();
} else {
  saveFailed = true;
  unsavedChanges = true;
  setSaveState("error");
  showStorageBanner(initialSave);
}

refs.saveFileBtn.hidden = false;

if (supportsFileSystemAccess()) {
  refs.openFileBtn.hidden = false;
} else {
  refs.saveFileBtn.title = "Download the project as a file";
  refs.saveFileBtn.setAttribute("aria-label", "Download project file");
}

maybeRemindBackup();
maybeShowSessionSummary();
maybeShowOnboarding();
