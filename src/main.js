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
  deleteCustomTemplate,
  deleteEntries,
  duplicateActiveBook,
  duplicateEntry,
  getActiveBook,
  getCustomTemplates,
  saveCustomTemplate,
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
  getEntryDefaults,
  setEntryDefaults,
  getSearchRegex,
  setSearchRegex,
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
  getPinnedEntryIds,
  getRecentEntries,
  togglePinnedEntry,
  addCard,
  getActiveCard,
  getCards,
  updateCard,
  deleteCard,
  setActiveCard,
  linkCardBook,
  duplicateCard
} from "./store.js";
import {
  getProjectBackupInfo,
  getRevisionIntegrity,
  getRevisions,
  getStorageUsage,
  initStorage,
  requestPersistence,
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
import { createCard, createProject, normalizeTagList, ENTRY_COLOR_VALUES } from "./schema.js";
import { formatAudit, recordAudit } from "./auditLog.js";
import { writeAdvancedField } from "./advanced.js";
import { buildSchemaPage } from "./schemaPage.js";
import { buildPrintRows } from "./printView.js";
import { applyHeight, readHeights, serializeHeights } from "./textAreaHeights.js";
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
import { CARD_TEMPLATES, ENTRY_TEMPLATES, buildTemplatePatch, getCardTemplate, getEntryTemplate } from "./templates.js";
import { cardRestorePatch, cardTemplateFromCard, compareCardVersion, matchCardInProject } from "./cardHistory.js";import { showDiffDialog } from "./ui/diff.js";
import { applyScopes, orderByRecent, pushRecent } from "./commands.js";
import { openCommandPalette } from "./ui/commandPalette.js";
import { renderEditor, syncEntryStats } from "./ui/editor.js";
import { createKeyChips } from "./ui/keyChips.js";
import { confirmAction, toast } from "./ui/overlays.js";
import { getVisibleEntryIds, renderSidebar } from "./ui/sidebar.js";
import {
  addGreetingRow,
  fillCardForm,
  handleGreetingClick,
  readCardForm,
  renderCardAvatar,
  renderCardSummary,
  renderRecentList
} from "./ui/cards.js";
import { buildCardTokenReport } from "./cardTokens.js";
import { validateCardRecord } from "./cardValidation.js";
import { clamp } from "./utils.js";
import { createTabGuard } from "./tabGuard.js";
import { VIEWS, getView, isBookView, isEditorView, parseRoute, routeHref, viewForShortcut } from "./views.js";
import { buildBookReview, buildCardReview, CARD_FIELD_TARGETS } from "./review.js";
import { buildPromptPreview } from "./promptPreview.js";
import { buildCardPrint } from "./printView.js";
import { renderBookReview, renderCardReview, renderPromptPreview } from "./ui/review.js";
import { buildProjectItems, collectTags, filterProjects, sortProjects } from "./projects.js";
import { renderProjectList } from "./ui/projects.js";
import { selectEntriesByTokenSize } from "./bulk.js";
import { applyReplace, parseReplaceQuery, planReplace } from "./replace.js";
import { VALIDATION_LABELS, validateBook } from "./validation.js";

const refs = {
  workspace: document.querySelector(".workspace"),
  sidebar: document.querySelector("#sidebar"),
  editorMain: document.querySelector("main.editor"),
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
  defaultConstant: document.querySelector("#default-constant"),
  defaultSelective: document.querySelector("#default-selective"),
  defaultCaseSensitive: document.querySelector("#default-case-sensitive"),
  defaultWholeWords: document.querySelector("#default-whole-words"),
  recentList: document.querySelector("#recent-list"),
  recentSection: document.querySelector(".recent-section"),
  newCardBtn: document.querySelector("#new-card-btn"),
  cardDialog: document.querySelector("#page-card"),
  cardTitle: document.querySelector("#card-title"),
  cardName: document.querySelector("#card-name"),
  cardNickname: document.querySelector("#card-nickname"),
  cardDescription: document.querySelector("#card-description"),
  cardAltGreetings: document.querySelector("#card-alt-greetings"),
  cardAltAdd: document.querySelector("#card-alt-add"),
  cardAltTokens: document.querySelector("#card-alt-tokens"),
  cardGroupGreetings: document.querySelector("#card-group-greetings"),
  cardGroupAdd: document.querySelector("#card-group-add"),
  cardGroupTokens: document.querySelector("#card-group-tokens"),
  cardTagsContainer: document.querySelector("#card-tags"),
  cardTagsInput: document.querySelector("#card-tags-input"),
  cardAdvanced: document.querySelector(".card-advanced"),
  cardDepthPrompt: document.querySelector("#card-depth-prompt"),
  cardDepthDepth: document.querySelector("#card-depth-depth"),
  cardDepthRole: document.querySelector("#card-depth-role"),
  cardTalkativeness: document.querySelector("#card-talkativeness"),
  cardTalkativenessOutput: document.querySelector("#card-talkativeness-output"),
  cardBookInfo: document.querySelector("#card-book-info"),
  cardTokensAlways: document.querySelector("#card-tokens-always"),
  cardTokensExamples: document.querySelector("#card-tokens-examples"),
  cardTokensOpening: document.querySelector("#card-tokens-opening"),
  cardTokensTotal: document.querySelector("#card-tokens-total"),
  cardIssues: document.querySelector("#card-issues"),
  cardAvatarRemove: document.querySelector("#card-avatar-remove"),
  cardDuplicate: document.querySelector("#card-duplicate"),
  cardExportFormat: document.querySelector("#card-export-format"),
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
  saveState: document.querySelector("#save-state"),
  storageBanner: document.querySelector("#storage-banner"),
  storageBannerMessage: document.querySelector("#storage-banner-message"),
  storageExportBtn: document.querySelector("#storage-export-btn"),
  shell: document.querySelector(".shell"),
  appNav: document.querySelector("#app-nav"),
  pages: [...document.querySelectorAll(".page")],
  appMenuBtn: document.querySelector("#app-menu-btn"),
  appMenu: document.querySelector("#app-menu"),
  menuItems: [...document.querySelectorAll("#app-menu [data-view]")],
  menuPaletteBtn: document.querySelector("#menu-palette-btn"),
  menuShortcutsBtn: document.querySelector("#menu-shortcuts-btn"),
  navCollapse: document.querySelector("#nav-collapse"),
  navOpenBtn: document.querySelector("#nav-open-btn"),
  navBack: document.querySelector("#nav-back"),
  navContextKind: document.querySelector("#nav-context-kind"),
  navContextName: document.querySelector("#nav-context-name"),
  navViewLinks: [...document.querySelectorAll("#app-nav a[data-view]")],
  navGroups: [...document.querySelectorAll("#app-nav [data-nav-for]")],
  navAnchors: [...document.querySelectorAll("#app-nav [data-scroll-to]")],
  reviewBody: document.querySelector("#review-body"),
  reviewSubtitle: document.querySelector("#review-subtitle"),
  hubSearch: document.querySelector("#hub-search"),
  hubFilters: document.querySelector("#hub-filters"),
  hubSort: document.querySelector("#hub-sort"),
  hubTag: document.querySelector("#hub-tag"),
  hubLayout: document.querySelector("#hub-layout"),
  hubSelectBtn: document.querySelector("#hub-select-btn"),
  hubBulkBar: document.querySelector("#hub-bulk-bar"),
  hubBulkCount: document.querySelector("#hub-bulk-count"),
  hubBulkTag: document.querySelector("#hub-bulk-tag"),
  hubCount: document.querySelector("#hub-count"),
  hubImportBtn: document.querySelector("#hub-import-btn"),
  hubEmpty: document.querySelector("#hub-empty"),
  hubEmptyText: document.querySelector("#hub-empty-text"),
  hubEmptyClear: document.querySelector("#hub-empty-clear"),
  projectList: document.querySelector("#project-list"),
  dataImportBtn: document.querySelector("#data-import-btn"),
  dataExportBtn: document.querySelector("#data-export-btn"),
  dataOpenBtn: document.querySelector("#data-open-btn"),
  dataSaveBtn: document.querySelector("#data-save-btn"),
  navSearchBtn: document.querySelector("#nav-search-btn"),
  navReplaceBtn: document.querySelector("#nav-replace-btn"),
  settingsGuideBtn: document.querySelector("#settings-guide-btn"),
  exportDataLink: document.querySelector("#export-data-link"),
  tabBanner: document.querySelector("#tab-banner"),
  tabBannerTitle: document.querySelector("#tab-banner-title"),
  tabBannerMessage: document.querySelector("#tab-banner-message"),
  tabReloadBtn: document.querySelector("#tab-reload-btn"),
  tabKeepBtn: document.querySelector("#tab-keep-btn"),
  tabDismissBtn: document.querySelector("#tab-dismiss-btn"),
  storageUsagePersisted: document.querySelector("#storage-usage-persisted"),
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
  fileMenuBtn: document.querySelector("#file-menu-btn"),
  fileMenu: document.querySelector("#file-menu"),
  openFileBtn: document.querySelector("#open-file-btn"),
  saveFileBtn: document.querySelector("#save-file-btn"),
  fileName: document.querySelector("#file-name"),
  importInput: document.querySelector("#import-input"),
  dropOverlay: document.querySelector("#drop-overlay"),
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
  themeButtons: [...document.querySelectorAll("[data-theme-choice]")],
  densityButtons: [...document.querySelectorAll("[data-density-choice]")],
  aboutAuditLog: document.querySelector("#about-audit"),
  shortcutsDialog: document.querySelector("#shortcuts-dialog"),
  shortcutsList: document.querySelector("#shortcuts-list"),
  shortcutsClose: document.querySelector("#shortcuts-close"),
  aboutShortcutsBtn: document.querySelector("#about-shortcuts-btn"),
  schemaDialog: document.querySelector("#schema-dialog"),
  schemaBody: document.querySelector("#schema-body"),
  schemaVersion: document.querySelector("#schema-version"),
  schemaClose: document.querySelector("#schema-close"),
  aboutSchemaBtn: document.querySelector("#about-schema-btn"),
  printRoot: document.querySelector("#print-root"),
  drawerToggle: document.querySelector("#drawer-toggle"),
  aboutIntegrityBtn: document.querySelector("#about-integrity-btn"),
  tokenizerPreset: document.querySelector("#tokenizer-preset"),
  tokenizerPresetHint: document.querySelector("#tokenizer-preset-hint"),
  contextWindowPreset: document.querySelector("#context-window-preset"),
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
  regexToggle: document.querySelector("#regex-toggle"),
  globalRegexToggle: document.querySelector("#global-regex-toggle"),
  entrySort: document.querySelector("#entry-sort"),
  entryFilters: document.querySelector("#entry-filters"),
  tagFilters: document.querySelector("#tag-filters"),
  entryCount: document.querySelector("#entry-count"),
  overviewBtn: document.querySelector("#overview-btn"),
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
  simulationInput: document.querySelector("#simulation-input"),
  simulationRunBtn: document.querySelector("#simulation-run"),
  simulationSummary: document.querySelector("#simulation-summary"),
  simulationResults: document.querySelector("#simulation-results"),
  overviewLongest: document.querySelector("#overview-longest"),
  validationBtn: document.querySelector("#validation-btn"),
  validationCount: document.querySelector("#validation-count"),
  validationSummary: document.querySelector("#validation-summary"),
  validationCategories: document.querySelector("#validation-categories"),
  validationIssues: document.querySelector("#validation-issues"),
  entryList: document.querySelector("#entry-list"),
  templateBtn: document.querySelector("#template-btn"),
  templateDialog: document.querySelector("#template-dialog"),
  templateList: document.querySelector("#template-list"),
  templateCloseBtn: document.querySelector("#template-close"),
  cardTemplateBtn: document.querySelector("#card-template-btn"),
  cardHistoryBtn: document.querySelector("#card-history-btn"),
  cardPrintBtn: document.querySelector("#card-print-btn"),
  newCardTemplateBtn: document.querySelector("#new-card-template-btn"),
  cardTemplateDialog: document.querySelector("#card-template-dialog"),
  cardTemplateList: document.querySelector("#card-template-list"),
  cardTemplateCloseBtn: document.querySelector("#card-template-close"),
  cardHistoryDialog: document.querySelector("#card-history-dialog"),
  cardHistoryList: document.querySelector("#card-history-list"),
  cardHistorySummary: document.querySelector("#card-history-summary"),
  cardHistoryCloseBtn: document.querySelector("#card-history-close"),
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
  detailsOpenBtn: document.querySelector("#details-open-btn"),
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
  entryColorRow: document.querySelector(".entry-color-row"),
  advancedFields: document.querySelector("#advanced-fields"),
  advancedFieldsBody: document.querySelector("#advanced-fields-body"),
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

refs.cardTagChips = createKeyChips({
  container: refs.cardTagsContainer,
  input: refs.cardTagsInput,
  label: "card tag",
  regex: false,
  onChange: () => {
    markCardDirty();
  }
});

const tokenizer = createTokenizer({ onUpdate: handleTokenUpdate });

refs.tokenCount = (text) => tokenizer.count(text);
refs.requestTokens = (text) => tokenizer.request(text);

let saveTimer = 0;
let historySaveTimer = 0;
let saveFailed = false;
let staleFromPeer = false;
let skipUnloadWarning = false;

const tabGuard = createTabGuard({
  name: storageKey("tabs:v1"),
  channelFactory: typeof BroadcastChannel === "function" ? (name) => new BroadcastChannel(name) : null,
  onPeerPresent: () => showTabBanner("open"),
  onPeerSaved: () => {
    if (!staleFromPeer) {
      staleFromPeer = true;
      window.clearTimeout(saveTimer);
      setSaveState("paused");
    }

    showTabBanner("stale");
  }
});
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
const THEME_KEY = storageKey("theme:v1");
const DENSITY_KEY = storageKey("density:v1");
const TEXTAREA_HEIGHTS_KEY = storageKey("textarea-heights:v1");
const AUDIT_KEY = storageKey("audit:v1");
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
  refs.detailsOpenBtn.setAttribute("aria-expanded", String(!collapsed));

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
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - 640));
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

const NAV_STATE_KEY = storageKey("nav-expanded:v1");
const MOBILE_NAV_QUERY = window.matchMedia("(max-width: 780px)");
let currentView = "library";
let currentRouteId = null;
const HUB_LAYOUT_KEY = storageKey("hub-layout:v1");

function readHubLayout() {
  try {
    return localStorage.getItem(HUB_LAYOUT_KEY) === "list" ? "list" : "grid";
  } catch {
    return "grid";
  }
}

const hubState = { query: "", kind: "all", sort: "updated", tag: "", selecting: false, layout: readHubLayout() };
const hubSelected = new Set();
const PINNED_KEY = storageKey("pinned-projects:v1");

function readPinned() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PINNED_KEY) ?? "[]");
    return new Set(Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : []);
  } catch {
    return new Set();
  }
}

function togglePinned(id) {
  const pinned = readPinned();

  if (!pinned.delete(id)) {
    pinned.add(id);
  }

  try {
    localStorage.setItem(PINNED_KEY, JSON.stringify([...pinned]));
  } catch {
    return;
  }
}

function readNavExpanded() {
  try {
    const stored = localStorage.getItem(NAV_STATE_KEY);

    if (stored === "1" || stored === "0") {
      return stored === "1";
    }
  } catch {
    return window.innerWidth >= 1200;
  }

  return window.innerWidth >= 1200;
}

function setNavExpanded(expanded, persist = true) {
  refs.shell.dataset.nav = expanded ? "expanded" : "collapsed";
  refs.navCollapse.setAttribute("aria-expanded", String(expanded));
  refs.navCollapse.title = expanded ? "Collapse menu" : "Expand menu";

  if (persist) {
    try {
      localStorage.setItem(NAV_STATE_KEY, expanded ? "1" : "0");
    } catch {
      return;
    }
  }
}

function setMobileNavOpen(open) {
  refs.shell.classList.toggle("is-nav-open", open);
  refs.navOpenBtn.setAttribute("aria-expanded", String(open));
}

function toggleNav() {
  if (MOBILE_NAV_QUERY.matches) {
    setMobileNavOpen(!refs.shell.classList.contains("is-nav-open"));
    return;
  }

  setNavExpanded(refs.shell.dataset.nav !== "expanded");
}

function setFileMenuOpen(open) {
  refs.fileMenu.hidden = !open;
  refs.fileMenuBtn.setAttribute("aria-expanded", String(open));
}

function setAppMenuOpen(open) {
  refs.appMenu.hidden = !open;
  refs.appMenuBtn.setAttribute("aria-expanded", String(open));
}

function hubEstimate(text) {
  return Math.ceil(String(text ?? "").length / 4);
}

function renderHub() {
  if (currentView !== "library") {
    return;
  }

  const state = getState();
  const bookExists = (id) => state.books.some((book) => book.id === id);
  const items = buildProjectItems(state, {
    estimate: hubEstimate,
    countBookIssues: (book) => validateBook(book, hubEstimate).length,
    countCardIssues: (card) => validateCardRecord(card, { bookExists, count: hubEstimate }).filter((issue) => issue.severity !== "info").length
  });
  const tags = collectTags(items);

  if (hubState.tag && !tags.some((entry) => entry.tag === hubState.tag)) {
    hubState.tag = "";
  }

  const pinnedIds = readPinned();
  const visible = sortProjects(filterProjects(items, hubState), hubState.sort, pinnedIds);
  const recentIds = new Set([state.activeBookId, state.activeCardId].filter(Boolean));
  const knownIds = new Set(items.map((item) => item.id));

  for (const id of [...hubSelected]) {
    if (!knownIds.has(id)) {
      hubSelected.delete(id);
    }
  }

  refs.projectList.dataset.layout = hubState.layout;

  for (const button of refs.hubLayout.querySelectorAll("[data-layout]")) {
    button.setAttribute("aria-pressed", String(button.dataset.layout === hubState.layout));
  }

  refs.hubSelectBtn.setAttribute("aria-pressed", String(hubState.selecting));
  refs.hubBulkBar.hidden = !hubState.selecting;
  refs.hubBulkCount.textContent = `${hubSelected.size} selected`;

  renderProjectList(refs, visible, {
    selecting: hubState.selecting,
    selectedIds: hubSelected,
    total: items.length,
    hasFilters: Boolean(hubState.query.trim()) || hubState.kind !== "all" || Boolean(hubState.tag),
    recentIds,
    pinnedIds,
    tags,
    tag: hubState.tag
  });
}

function reviewCount(text) {
  const measured = tokenizer.count(text);
  return Number.isFinite(measured) ? measured : hubEstimate(text);
}

let previewScene = "";
let previewUser = "You";
let previewPrompt = "";

function renderPreviewOutput() {
  const output = document.querySelector("#preview-output");
  const card = getCards().find((item) => item.id === currentRouteId);

  if (!output || !card) {
    return;
  }

  const book = getState().books.find((item) => item.id === card.bookId) ?? null;

  if (book) {
    for (const entry of book.entries) {
      tokenizer.request(entry.content);
    }
  }

  const preview = buildPromptPreview(card, book, { scene: previewScene, user: previewUser, count: reviewCount, contextWindow: tokenSettings.contextWindow });
  previewPrompt = preview.text;
  renderPromptPreview(output, preview, { approximate: !tokenizer.isReady() });
}

function renderReview() {
  const state = getState();

  if (currentView === "card-review") {
    const card = getCards().find((item) => item.id === currentRouteId);

    if (!card) {
      return;
    }

    const linked = state.books.find((book) => book.id === card.bookId) ?? null;

    refs.reviewSubtitle.textContent = "What a frontend sends for this card, what it would assemble, and what to fix first.";
    renderCardReview(refs.reviewBody, buildCardReview(card, { count: reviewCount, bookExists: (id) => state.books.some((book) => book.id === id) }), {
      name: card.name.trim() || "Untitled card",
      approximate: !tokenizer.isReady(),
      preview: { scene: previewScene, user: previewUser, linkedBook: linked ? linked.name.trim() || "Untitled Lorebook" : "" }
    });
    renderPreviewOutput();
    return;
  }

  const book = getActiveBook();

  if (!book) {
    return;
  }

  for (const entry of book.entries) {
    tokenizer.request(entry.content);
  }

  refs.reviewSubtitle.textContent = "Size, checks and activation for this lorebook before you export it.";
  renderBookReview(refs.reviewBody, buildBookReview(book, { count: reviewCount, contextWindow: tokenSettings.contextWindow }), { name: book.name.trim() || "Untitled Lorebook", approximate: !tokenizer.isReady() });
}

function currentCardName() {
  const card = getCards().find((item) => item.id === currentRouteId);
  return card?.name.trim() || "Untitled card";
}

function updateNavContext() {
  const onCard = currentView === "card" || currentView === "card-review";
  const book = getActiveBook();

  refs.navContextKind.textContent = onCard ? "Character card" : "Lorebook";
  refs.navContextName.textContent = onCard ? currentCardName() : book?.name.trim() || "Untitled Lorebook";
}

function resolveRoute(route) {
  const state = getState();

  if (isBookView(route.view)) {
    const id = route.id ?? state.activeBookId;
    return state.books.some((book) => book.id === id) ? { view: route.view, id } : { view: "library", id: null };
  }

  if (route.view === "card" || route.view === "card-review") {
    return getCards().some((card) => card.id === route.id) ? route : { view: "library", id: null };
  }

  return route;
}

const HEADING_FOR_VIEW = {
  library: "#library-title",
  data: "#data-title",
  settings: "#settings-title",
  "book-settings": "#book-settings-title",
  card: "#card-title",
  "book-review": "#review-title",
  "book-overview": "#overview-title",
  "book-simulate": "#simulation-title",
  "book-issues": "#validation-title",
  "card-review": "#review-title"
};

function pageIdFor(view) {
  return view === "book-review" || view === "card-review" ? "page-review" : `page-${view}`;
}

function showRoute(requested, { focusHeading = false } = {}) {
  const previousView = currentView;
  const leavingCard = currentView === "card" ? editingCardId : null;
  const route = resolveRoute(requested);

  if (leavingCard && !(route.view === "card" && route.id === leavingCard)) {
    leaveCard(leavingCard);
  }

  currentView = route.view;
  currentRouteId = route.id;
  const editor = isEditorView(route.view);
  const onBook = route.view === "book";

  document.body.dataset.view = route.view;
  document.body.dataset.mode = editor ? "editor" : "hub";
  refs.workspace.dataset.view = route.view;
  refs.sidebar.hidden = !onBook;
  refs.editorMain.hidden = !onBook;
  refs.appNav.hidden = !editor;

  for (const page of refs.pages) {
    page.hidden = page.id !== pageIdFor(route.view);
  }

  const target = routeHref(route.view, route.id);

  if (window.location.hash !== target) {
    window.history.replaceState(null, "", target);
  }

  if (isBookView(route.view)) {
    if (getState().activeBookId !== route.id) {
      setActiveBook(route.id);
      setTagFilters([]);
      persistTagFilters([]);
      clearSearch();
      scheduleSave();
    }

    renderAll();
  } else if (route.view === "card") {
    setActiveCard(route.id);
    openCardEditor(route.id);
  }

  for (const item of refs.menuItems) {
    if (item.dataset.view === route.view) {
      item.setAttribute("aria-current", "page");
    } else {
      item.removeAttribute("aria-current");
    }
  }

  const bookId = getState().activeBookId;
  const cardId = route.view === "card" || route.view === "card-review" ? route.id : getState().activeCardId;

  for (const link of refs.navViewLinks) {
    link.href = routeHref(link.dataset.view, link.dataset.view.startsWith("card") ? cardId : bookId);

    if (link.dataset.view === route.view) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }

  const group = route.view === "card" || route.view === "card-review" ? "card" : "book";

  for (const element of refs.navGroups) {
    element.hidden = element.dataset.navFor !== group;
  }

  setMobileNavOpen(false);
  setAppMenuOpen(false);

  if (MOBILE_NAV_QUERY.matches) {
    if (onBook && previousView !== "book" && !refs.sidebar.classList.contains("is-drawer")) {
      setDrawerOpen(true);
    } else if (!onBook && refs.sidebar.classList.contains("is-drawer")) {
      setDrawerOpen(false);
    }
  }

  if (route.view === "library") {
    renderHub();
  } else if (route.view === "data") {
    refreshBackupStatus();
    refreshStorageUsage();
    refs.aboutAuditLog.textContent = formatAudit(readAuditLog());
  } else if (route.view === "book-review" || route.view === "card-review") {
    renderReview();
  } else if (route.view === "book-overview") {
    renderOverviewPage();
  } else if (route.view === "book-simulate") {
    renderSimulationResults();
  } else if (route.view === "book-issues") {
    validationFilters = new Set();
    renderIssuesPage();
  } else if (route.view === "settings") {
    syncThemeButton();
    syncDensityButton();
    renderTokenSettings();
  }

  updateDocumentTitle();

  if (focusHeading && HEADING_FOR_VIEW[route.view]) {
    document.querySelector(HEADING_FOR_VIEW[route.view])?.focus({ preventScroll: true });
  }
}

function goToView(view, id = null) {
  const resolvedId = id ?? (isBookView(view) ? getState().activeBookId : view === "card-review" ? getState().activeCardId : null);
  const target = routeHref(view, resolvedId);

  if (window.location.hash !== target) {
    window.location.hash = target;
  }

  showRoute({ view, id: resolvedId }, { focusHeading: true });
}

function ensureEntriesView() {
  if (currentView !== "book") {
    goToView("book", getState().activeBookId);
  }
}

window.addEventListener("hashchange", () => {
  if (!getState()) {
    return;
  }

  const next = resolveRoute(parseRoute(window.location.hash));

  if (next.view !== currentView || next.id !== currentRouteId) {
    showRoute(parseRoute(window.location.hash), { focusHeading: true });
  }
});

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

function toggleFocusMode() {
  const collapsed = !refs.sidebar.classList.contains("is-collapsed");
  setSidebarCollapsed(collapsed);

  if (collapsed) {
    refs.editorPane?.scrollIntoView({ block: "start" });
  }

  toast(collapsed ? "Focus mode on — Ctrl+\\ to exit" : "Focus mode off");
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
  label.textContent = mode === "saving" ? "Saving" : mode === "error" ? "Unsaved" : mode === "paused" ? "Paused" : "Saved";
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

function showTabBanner(kind) {
  if (!refs.tabBanner) {
    return;
  }

  const stale = kind === "stale";

  refs.tabBannerTitle.textContent = stale ? "Changed in another tab" : "Open in another tab";
  refs.tabBannerMessage.textContent = stale
    ? "Another tab saved this project, so saving is paused here to avoid overwriting its work. Load the latest version, or keep this tab's version and replace the other."
    : "Loreweaver is open in more than one tab. Edits in one tab can overwrite the other, so keep editing in a single tab.";
  refs.tabReloadBtn.hidden = !stale;
  refs.tabKeepBtn.hidden = !stale;
  refs.tabBanner.hidden = false;
}

function hideTabBanner() {
  if (refs.tabBanner) {
    refs.tabBanner.hidden = true;
  }
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

  if (summary.cardsAdded) {
    parts.push(`${summary.cardsAdded} ${summary.cardsAdded === 1 ? "card added" : "cards added"}`);
  }

  if (summary.cardsRemoved) {
    parts.push(`${summary.cardsRemoved} ${summary.cardsRemoved === 1 ? "card removed" : "cards removed"}`);
  }

  if (summary.cardsChanged) {
    parts.push(`${summary.cardsChanged} ${summary.cardsChanged === 1 ? "card edited" : "cards edited"}`);
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
  refs.storageUsagePersisted.textContent = usage.persisted === null
    ? "Not supported"
    : usage.persisted ? "Protected from eviction" : "Best effort (the browser may clear it under pressure)";

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

  if (refs.aboutAuditLog) {
    refs.aboutAuditLog.textContent = formatAudit(readAuditLog());
  }
}

async function openAboutDialog() {
  if (!refs.aboutDialog.open) {
    refs.aboutDialog.showModal();
  }

  syncThemeButton();
  await renderAboutDialog();
}

function readTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function applyTheme(theme) {
  const value = theme === "light" ? "light" : "dark";

  if (value === "light") {
    document.documentElement.dataset.theme = "light";
  } else {
    delete document.documentElement.dataset.theme;
  }

  try {
    localStorage.setItem(THEME_KEY, value);
  } catch {
    return;
  }
}

function syncThemeButton() {
  const current = document.documentElement.dataset.theme === "light" ? "light" : "dark";

  for (const button of refs.themeButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.themeChoice === current));
  }
}

function toggleTheme() {
  chooseTheme(document.documentElement.dataset.theme === "light" ? "dark" : "light");
}

function chooseTheme(theme) {
  applyTheme(theme);
  syncThemeButton();
  const meta = document.querySelector('meta[name="theme-color"]');

  if (meta) {
    meta.content = document.documentElement.dataset.theme === "light" ? "#f6f7fa" : "#0b0d12";
  }
}

function readDensity() {
  try {
    return localStorage.getItem(DENSITY_KEY) === "compact" ? "compact" : "cozy";
  } catch {
    return "cozy";
  }
}

function applyDensity(density) {
  const value = density === "compact" ? "compact" : "cozy";

  if (value === "compact") {
    document.documentElement.dataset.density = "compact";
  } else {
    delete document.documentElement.dataset.density;
  }

  try {
    localStorage.setItem(DENSITY_KEY, value);
  } catch {
    return;
  }

  syncDensityButton();
}

function syncDensityButton() {
  const current = document.documentElement.dataset.density === "compact" ? "compact" : "cozy";

  for (const button of refs.densityButtons) {
    button.setAttribute("aria-pressed", String(button.dataset.densityChoice === current));
  }
}

function toggleDensity() {
  applyDensity(document.documentElement.dataset.density === "compact" ? "cozy" : "compact");
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
  const regex = getSearchRegex();
  const result = searchProject(getState(), query, { regex });

  refs.globalRegexToggle?.setAttribute("aria-pressed", String(regex));
  refs.globalSearchResults.replaceChildren();

  if (!result.query) {
    refs.globalSearchSummary.textContent = "Type to search every lorebook and character card.";
    return;
  }

  const found = result.total + result.cards.length;

  if (!found) {
    refs.globalSearchSummary.textContent = regex ? "Nothing matches this pattern." : `Nothing matches "${query.trim()}".`;
    return;
  }

  const parts = [];

  if (result.total) {
    parts.push(`${result.total} ${result.total === 1 ? "entry" : "entries"} in ${result.groups.length} ${result.groups.length === 1 ? "lorebook" : "lorebooks"}`);
  }

  if (result.cards.length) {
    parts.push(`${result.cards.length} ${result.cards.length === 1 ? "card" : "cards"}`);
  }

  refs.globalSearchSummary.textContent = `${parts.join(" and ")}.`;

  if (result.cards.length) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const count = document.createElement("span");
    const list = document.createElement("div");

    section.className = "global-search-group";
    heading.className = "global-search-group-title";
    heading.textContent = "Character cards";
    count.className = "global-search-group-count";
    count.textContent = String(result.cards.length);
    heading.append(count);
    list.className = "global-search-list";

    for (const item of result.cards) {
      const button = document.createElement("button");
      const title = document.createElement("span");
      const meta = document.createElement("span");

      button.type = "button";
      button.className = "global-search-item";
      button.dataset.cardId = item.card.id;
      title.className = "global-search-item-title";
      title.textContent = item.card.name.trim() || "Untitled card";
      meta.className = "global-search-item-meta";
      meta.textContent = `Matched: ${item.fields.join(", ")}`;
      button.append(title, meta);
      list.append(button);
    }

    section.append(heading, list);
    refs.globalSearchResults.append(section);
  }

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
  ensureEntriesView();
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

function renderTokenSettings() {
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

function openTokenSettings() {
  goToView("settings");
  refs.tokenizerPreset.focus();
}

function handleTokenizerChange() {
  tokenSettings.tokenizer = refs.tokenizerPreset.value;
  persistTokenSettings();
  applyTokenSettings();
  renderTokenSettings();
  renderAll();

  if (currentView === "book-overview") {
    renderOverviewPage();
  }

  if (currentView === "book-simulate") {
    renderSimulationResults();
  }
}

function handleContextWindowChange() {
  tokenSettings.contextWindow = Number(refs.contextWindowPreset.value);
  persistTokenSettings();

  if (currentView === "book-overview") {
    renderOverviewPage();
  }

  if (currentView === "book-simulate") {
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
    ...VIEWS.map((view) => ({
      title: `Go to ${view.label}`,
      hint: view.shortcut,
      keywords: ["page", "navigate", "open", view.id],
      run: () => goToView(view.id)
    })),
    { title: "Go to entries", keywords: ["editor", "lorebook", "write"], run: () => goToView("book") },
    { title: "Lorebook settings", keywords: ["description", "tags", "budget", "defaults"], run: () => goToView("book-settings") },
    ...getState().books.map((book) => ({
      title: `Open lorebook: ${book.name.trim() || "Untitled Lorebook"}`,
      keywords: ["open", "edit", "book"],
      run: () => goToView("book", book.id)
    })),
    ...getCards().map((card) => ({
      title: `Open card: ${card.name.trim() || "Untitled card"}`,
      keywords: ["open", "edit", "character"],
      run: () => goToView("card", card.id)
    })),
    { title: "Review", keywords: ["check", "validate", "audit"], run: () => goToView(currentView === "card" || currentView === "card-review" ? "card-review" : "book-review") },
    { title: "Toggle editor menu", keywords: ["menu", "sidebar", "collapse", "layout"], run: toggleNav },
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
    { title: "New character card", keywords: ["card", "character", "avatar"], run: handleNewCard },
    { title: "New character card from template", keywords: ["card", "character", "starter"], run: openCardTemplateDialog },
    ...(currentView === "card" ? [{ title: "Print character card", keywords: ["print", "pdf", "paper"], run: printCard }, { title: "Card history", keywords: ["card", "snapshots", "restore", "versions"], run: () => refs.cardHistoryBtn.click() }] : []),
    { title: "Toggle light theme", keywords: ["theme", "colour", "dark"], run: toggleTheme },
    { title: "Keyboard shortcuts", keywords: ["keys", "help"], run: openShortcutsDialog },
    { title: "Schema reference", keywords: ["schema", "docs", "fields"], run: openSchemaDialog },
    { title: "Print lorebook", keywords: ["print", "pdf", "review"], run: printActiveBook },
    { title: "Toggle focus mode", hint: "Ctrl+\\", keywords: ["focus", "sidebar"], run: toggleFocusMode },
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
    { title: "Search lorebooks and cards", hint: "Ctrl+Shift+F", keywords: ["global", "find", "everywhere"], run: openGlobalSearchDialog },
    { title: "Token settings", keywords: ["tokenizer", "model", "context window"], run: openTokenSettings },
    { title: "Check data integrity", keywords: ["repair", "diagnostics", "snapshots"], run: () => openIntegrityDialog() },
    { title: "About Loreweaver", keywords: ["version", "privacy", "info"], run: () => openAboutDialog() }
  ];

  if (entry) {
    commands.splice(commands.findIndex((command) => command.title === "New entry from template") + 1, 0,
      { title: "Duplicate entry", hint: "Ctrl+D", keywords: ["copy"], run: handleDuplicateEntry },
      { title: "Copy entry", keywords: ["clipboard", "copy"], run: handleCopyEntry },
      {
        title: getPinnedEntryIds().includes(entry.id) ? "Unpin entry" : "Pin entry",
        hint: "Alt+P",
        keywords: ["pin", "favourite"],
        run: handleTogglePin
      },
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

  return orderByRecent(applyScopes(commands, currentView), readRecentCommands()).map((command) => ({
    ...command,
    run: () => {
      rememberCommand(command.title);
      return command.run();
    }
  }));
}

const RECENT_COMMANDS_KEY = storageKey("recent-commands:v1");

function readRecentCommands() {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_COMMANDS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((title) => typeof title === "string") : [];
  } catch {
    return [];
  }
}

function rememberCommand(title) {
  if (/^Open (lorebook|card): /.test(title)) {
    return;
  }

  try {
    localStorage.setItem(RECENT_COMMANDS_KEY, JSON.stringify(pushRecent(readRecentCommands(), title)));
  } catch {
    return;
  }
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
  const bookName = book?.name.trim() || "Untitled Lorebook";
  const subject = currentView === "card"
    ? currentCardName()
    : currentView === "book-settings"
      ? `Settings · ${bookName}`
      : currentView === "book-review"
        ? `Review · ${bookName}`
        : currentView === "card-review"
          ? `Review · ${currentCardName()}`
      : currentView === "book"
        ? bookName
        : getView(currentView).label;
  document.title = `${subject} — Loreweaver ${appVersion()}`;
  updateNavContext();
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
  const defaults = getEntryDefaults();
  refs.defaultConstant.checked = defaults.constant;
  refs.defaultSelective.checked = defaults.selective;
  refs.defaultCaseSensitive.checked = defaults.caseSensitive;
  refs.defaultWholeWords.checked = defaults.matchWholeWords;
  refs.bookName.value = book?.name ?? "";
  refs.bookDescription.value = book?.description ?? "";
  updateBookDescriptionPreview(book?.description ?? "");
  refs.bookTagChips?.setKeys(book?.tags ?? []);
  renderSidebar(refs);
  renderHub();
  renderRecentList(refs);
  renderEditor(refs);
  updateHistoryButtons();
  applyTextareaHeights();
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
  if (currentView === "card") {
    refreshCardSummary();
  }

  const entry = getActiveEntry();

  if (entry) {
    syncEntryStats(refs, entry.content);
  }

  updateBudgetStatus();

  if (currentView === "book-overview") {
    renderOverviewPage();
  }

  if (currentView === "book-simulate") {
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

function renderIssuesPage() {
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
  goToView("book-issues");
}

function renderOverviewPage() {
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
  goToView("book-overview");
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
  goToView("book-simulate");
  refs.simulationInput.focus();
}

function handleSimulationJump(entryId) {
  ensureEntriesView();
  clearSearch();
  setActiveEntry(entryId);
  renderAll();
  scrollEntryCardIntoView(entryId);
  focusEntryCard(entryId);
  scheduleSave();
}

function jumpToValidationEntry(entryId, field = "") {
  ensureEntriesView();
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

  if (staleFromPeer) {
    setSaveState("paused");
    return false;
  }

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
    tabGuard.notifySaved();
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

const EXPORT_GROUPS = [
  { label: "Recommended", ids: ["sillytavern", "project"] },
  { label: "Other frontends", ids: ["chub", "risu", "characterbook", "content-format"] },
  { label: "Loreweaver files", ids: ["native"] }
];

function createExportGroup(label, options) {
  const group = document.createElement("div");
  const heading = document.createElement("h3");

  group.className = "export-group";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", label);
  heading.className = "export-group-title";
  heading.textContent = label;
  group.append(heading, ...options);
  return group;
}

function renderExportOptions() {
  const card = getActiveCard();
  const byId = new Map([
    ["project", createExportOption({
      id: "project",
      title: "Project backup",
      description: "Every lorebook, card and setting in one restorable file.",
      meta: "Project"
    })],
    ...EXPORT_FORMATS.map((format) => [format.id, createExportOption({
      id: format.id,
      title: format.label,
      description: format.description,
      meta: format.primary ? "Book \u00b7 primary" : "Book"
    })])
  ]);
  const groups = [];
  const used = new Set();

  for (const group of EXPORT_GROUPS) {
    const options = group.ids.filter((id) => byId.has(id)).map((id) => {
      used.add(id);
      return byId.get(id);
    });

    if (options.length) {
      groups.push(createExportGroup(group.label, options));
    }
  }

  const leftover = [...byId.entries()].filter(([id]) => !used.has(id)).map(([, option]) => option);

  if (leftover.length) {
    groups.push(createExportGroup("More formats", leftover));
  }

  if (card) {
    const label = card.name.trim() || "Untitled card";
    const cardOptions = [
      ["card-png", `PNG card \u00b7 ${label}`, card.bookId
        ? "A PNG with V3 and V2 data and the linked lorebook embedded. Opens in any frontend."
        : "A PNG with V3 and V2 data. Link a lorebook to embed it."],
      ["card-charx", `CHARX \u00b7 ${label}`, "A zip with the card, its image and the linked lorebook."],
      ["card-json-v3", `JSON, V3 \u00b7 ${label}`, "Plain V3 JSON, for scripting or frontends that import JSON."],
      ["card-json-v2", `JSON, V2 \u00b7 ${label}`, "The older V2 format, for frontends that do not read V3."]
    ].map(([id, title, description]) => createExportOption({ id, title, description, meta: "Card" }));
    groups.push(createExportGroup("Character card", cardOptions));
  }

  refs.exportOptions.replaceChildren(...groups);
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
  const additions = summary.booksAdded + summary.entriesAdded + summary.cardsAdded;
  const removals = summary.booksRemoved + summary.entriesRemoved + summary.cardsRemoved;
  const changes = summary.booksMetadataChanged + summary.entriesChanged + summary.cardsChanged;
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
    meta.textContent = `${createdAt} · ${revision.books} ${revision.books === 1 ? "lorebook" : "lorebooks"} · ${revision.entries} ${revision.entries === 1 ? "entry" : "entries"}${revision.cards ? ` · ${revision.cards} ${revision.cards === 1 ? "card" : "cards"}` : ""}`;
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

async function exportActiveCard(format = "png") {
  const card = getActiveCard();

  if (!card) {
    toast("There is no active card to export.", "error");
    return;
  }

  const label = card.name.trim() || "Untitled card";
  const book = card.bookId ? getState().books.find((item) => item.id === card.bookId) : null;
  const exported = CARD_ADAPTER.exportCard(card, { format, book });

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

  if (exported.json) {
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

  if (formatId.startsWith("card-")) {
    await exportActiveCard(formatId.slice("card-".length));
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
  closeDrawerAfterSelection();

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
  ensureEntriesView();
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
    fragment.append(templateOption(template, "Use"));
  }

  for (const template of getCustomTemplates()) {
    const option = templateOption(template, "Use");
    option.dataset.customTemplateId = template.id;

    const remove = document.createElement("span");
    remove.className = "template-option-remove";
    remove.dataset.removeTemplateId = template.id;
    remove.textContent = "Delete";
    remove.setAttribute("role", "button");
    remove.tabIndex = 0;
    option.append(remove);
    fragment.append(option);
  }

  const entry = getActiveEntry();

  if (entry) {
    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-block";
    save.dataset.saveAsTemplate = "1";
    save.textContent = "Save the active entry as a template";
    fragment.append(save);
  }

  refs.templateList.append(fragment);
}

function templateOption(template, actionLabel) {
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
  description.textContent = template.description ?? "Custom template";
  action.className = "template-option-action";
  action.textContent = actionLabel;
  info.append(name, description);
  option.append(info, action);
  return option;
}

async function handleSaveAsTemplate() {
  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const accepted = await confirmAction({
    title: "Save as template?",
    message: `"${entry.title.trim() || "Untitled entry"}" is saved as a reusable template with its keys and content.`,
    confirmLabel: "Save template",
    tone: "primary"
  });

  if (!accepted) {
    return;
  }

  saveCustomTemplate({
    name: entry.title.trim() || "Untitled template",
    patch: {
      title: entry.title,
      keys: entry.keys,
      secondaryKeys: entry.secondaryKeys,
      content: entry.content,
      notes: entry.notes
    }
  });
  renderTemplateDialog();
  scheduleSave();
  toast("Template saved", "success");
}

function openTemplateDialog() {
  ensureEntriesView();
  renderTemplateDialog();
  refs.templateDialog.showModal();
}

function handleTemplatePick(templateId) {
  const custom = getCustomTemplates().find((template) => template.id === templateId);
  const template = custom ?? getEntryTemplate(templateId);
  const patch = custom ? { ...custom.patch } : buildTemplatePatch(template);

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
  toast(`${(custom ? custom.name : template.name) || "Custom"} entry added`, "success");
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

function handleTogglePin() {
  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const pinned = togglePinnedEntry(entry.id);
  renderSidebar(refs);
  scheduleSave();
  toast(pinned ? "Entry pinned" : "Entry unpinned");
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
  ensureEntriesView();
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
  scheduleSave();
  toast("Lorebook deleted");
  goToView("library");
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
    if (strategy === "merge") {
      return `"${fileName}" is a character card. A card with the same name is updated in place and keeps its identity; an embedded lorebook merges into the lorebook of the same name. The current project is saved as a local backup first.`;
    }

    return `"${fileName}" is a character card and is added to the project as a new card; an embedded lorebook is extracted with it. The current project is saved as a local backup first.`;
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

    if (stats.cardsUpdated) {
      parts.push(`${stats.cardsUpdated} ${stats.cardsUpdated === 1 ? "card" : "cards"} updated`);
    }

    return `Merged ${parsed.format}: ${parts.join(", ") || "no entry changes"}`;
  }

  return `Imported ${parsed.format}: ${entryCount} ${entryCount === 1 ? "entry" : "entries"}`;
}

let editingCardId = null;
let editingAvatarDataUrl = "";

let cardSummaryFrame = 0;
let cardCommitTimer = 0;

function cardIsBlank(card) {
  return !card.name.trim()
    && !card.nickname.trim()
    && !card.description.trim()
    && !card.personality.trim()
    && !card.scenario.trim()
    && !card.firstMessage.trim()
    && !card.exampleMessages.trim()
    && !card.systemPrompt.trim()
    && !card.postHistoryInstructions.trim()
    && !card.creator.trim()
    && !card.creatorNotes.trim()
    && !card.characterVersion.trim()
    && !card.depthPrompt.prompt.trim()
    && card.alternateGreetings.length === 0
    && card.groupOnlyGreetings.length === 0
    && card.tags.length === 0
    && !card.avatarDataUrl
    && !card.bookId;
}

function markCardDirty() {
  window.clearTimeout(cardCommitTimer);
  cardCommitTimer = window.setTimeout(commitCard, 250);
  refreshCardSummary();
}

function commitCard() {
  window.clearTimeout(cardCommitTimer);
  cardCommitTimer = 0;

  if (!editingCardId || !getCards().some((item) => item.id === editingCardId)) {
    return;
  }

  updateCard(editingCardId, { ...readCardForm(refs), avatarDataUrl: editingAvatarDataUrl });
  refs.cardTitle.textContent = currentCardName();
  scheduleSave();
  renderHub();
  updateDocumentTitle();
}

function leaveCard(id) {
  commitCard();
  const card = getCards().find((item) => item.id === id);
  editingCardId = null;
  editingAvatarDataUrl = "";

  if (card && cardIsBlank(card)) {
    deleteCard(id);
    scheduleSave();
  }
}

function currentCardDraft() {
  const base = editingCardId ? getCards().find((item) => item.id === editingCardId) : null;
  return { ...(base ?? createCard()), ...readCardForm(refs), avatarDataUrl: editingAvatarDataUrl };
}

function refreshCardSummary() {
  if (cardSummaryFrame) {
    return;
  }

  cardSummaryFrame = window.requestAnimationFrame(() => {
    cardSummaryFrame = 0;

    if (currentView !== "card") {
      return;
    }

    const draft = currentCardDraft();
    const count = (text) => {
      tokenizer.request(text);
      return tokenizer.count(text) ?? Math.ceil(String(text ?? "").length / 4);
    };
    const books = getState().books;
    const book = draft.bookId ? books.find((item) => item.id === draft.bookId) : null;
    const issues = validateCardRecord(draft, { bookExists: (id) => books.some((item) => item.id === id), count });
    renderCardSummary(refs, buildCardTokenReport(draft, count), issues);
    refs.cardBookInfo.textContent = book
      ? `${book.entries.length} ${book.entries.length === 1 ? "entry" : "entries"} travel inside the card.`
      : "Linking a lorebook embeds it in exported cards.";
  });
}

function openCardEditor(cardId) {
  const card = getCards().find((item) => item.id === cardId);

  if (!card) {
    return;
  }

  editingCardId = card.id;
  editingAvatarDataUrl = card.avatarDataUrl ?? "";
  refs.cardTitle.textContent = card.name.trim() || "New character card";
  refs.cardStatus.textContent = "";
  fillCardForm(refs, card);
  refreshCardSummary();
}

function openCardTemplateDialog() {
  renderCardTemplateDialog();
  refs.cardTemplateDialog.showModal();
}

function renderCardTemplateDialog() {
  const fragment = document.createDocumentFragment();

  for (const template of CARD_TEMPLATES) {
    fragment.append(templateOption(template, "Use"));
  }

  for (const template of getCustomTemplates("card")) {
    const option = templateOption(template, "Use");
    const remove = document.createElement("span");

    remove.className = "template-option-remove";
    remove.dataset.removeTemplateId = template.id;
    remove.textContent = "Delete";
    remove.setAttribute("role", "button");
    remove.tabIndex = 0;
    option.append(remove);
    fragment.append(option);
  }

  if (currentView === "card" && editingCardId) {
    const save = document.createElement("button");
    save.type = "button";
    save.className = "btn btn-block";
    save.dataset.saveCardTemplate = "1";
    save.textContent = "Save this card as a template";
    fragment.append(save);
  }

  refs.cardTemplateList.replaceChildren(fragment);
}

function handleCardTemplatePick(templateId) {
  const custom = getCustomTemplates("card").find((template) => template.id === templateId);
  const template = custom ?? getCardTemplate(templateId);

  if (!template) {
    return;
  }

  refs.cardTemplateDialog.close();
  const card = addCard(createCard({ ...structuredClone(template.patch), name: "" }));

  if (!card) {
    return;
  }

  renderAll();
  scheduleSave();
  goToView("card", card.id);
  refs.cardName.focus();
  toast(`${template.name} card started`, "success");
}

async function handleSaveCardAsTemplate() {
  const draft = currentCardDraft();
  const accepted = await confirmAction({
    title: "Save as template?",
    message: `The text fields, greetings and settings of "${draft.name.trim() || "Untitled card"}" are saved as a reusable template. The name, picture and lorebook link are not.`,
    confirmLabel: "Save template",
    tone: "primary"
  });

  if (!accepted) {
    return;
  }

  saveCustomTemplate({ name: draft.name.trim() || "Untitled card template", patch: cardTemplateFromCard(draft), kind: "card" });
  scheduleSave();
  renderCardTemplateDialog();
  toast("Card template saved", "success");
}

let cardHistoryContext = null;

async function openCardHistory() {
  commitCard();
  const card = getCards().find((item) => item.id === editingCardId);

  if (!card) {
    return;
  }

  cardHistoryContext = { cardId: card.id, versions: new Map() };
  refs.cardHistorySummary.textContent = "Looking through your snapshots…";
  refs.cardHistoryList.replaceChildren();

  if (!refs.cardHistoryDialog.open) {
    refs.cardHistoryDialog.showModal();
  }

  const revisions = (await getRevisions()).revisions;
  const fragment = document.createDocumentFragment();
  let identical = 0;

  for (const revision of revisions) {
    const loaded = await loadRevision(revision.id);
    const past = loaded.ok ? matchCardInProject(loaded.project, card) : null;

    if (!past) {
      continue;
    }

    const comparison = compareCardVersion(card, past);

    if (comparison.same) {
      identical += 1;
      continue;
    }

    cardHistoryContext.versions.set(revision.id, { past, comparison, revision });
    fragment.append(createCardVersionRow(revision, comparison));
  }

  refs.cardHistoryList.replaceChildren(fragment);
  const shown = cardHistoryContext.versions.size;
  refs.cardHistorySummary.textContent = shown
    ? `${shown} earlier ${shown === 1 ? "version differs" : "versions differ"} from the current card.`
    : identical
      ? "Every snapshot that has this card matches the current version."
      : "No snapshot contains this card yet. Save a snapshot from the lorebook History to keep one.";
}

function createCardVersionRow(revision, comparison) {
  const item = document.createElement("article");
  const info = document.createElement("div");
  const reason = document.createElement("span");
  const meta = document.createElement("span");
  const fields = document.createElement("span");
  const actions = document.createElement("div");
  const createdAt = formatBackupDate(revision.createdAt);
  const labels = comparison.labels.length > 4 ? `${comparison.labels.slice(0, 4).join(", ")} and ${comparison.labels.length - 4} more` : comparison.labels.join(", ");

  item.className = "history-item";
  info.className = "history-item-info";
  reason.className = "history-item-reason";
  reason.textContent = revision.reason;
  meta.className = "history-item-meta";
  meta.textContent = createdAt;
  fields.className = "history-item-meta";
  fields.textContent = `Differs in: ${labels}`;
  actions.className = "history-item-actions";

  for (const [action, label] of [["compare", "Compare"], ["restore", "Restore"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn";
    button.dataset.cardRevisionAction = action;
    button.dataset.revisionId = revision.id;
    button.setAttribute("aria-label", `${label} card version: ${revision.reason}, ${createdAt}`);
    button.textContent = label;
    actions.append(button);
  }

  info.append(reason, meta, fields);
  item.append(info, actions);
  return item;
}

async function handleCardVersionAction(action, revisionId) {
  const version = cardHistoryContext?.versions.get(revisionId);
  const card = getCards().find((item) => item.id === cardHistoryContext?.cardId);

  if (!version || !card) {
    return;
  }

  if (action === "compare") {
    await showDiffDialog({
      eyebrow: "Card history",
      title: version.revision.reason,
      message: "What changed in this card since that snapshot.",
      details: [
        { label: "Snapshot", value: version.revision.reason },
        { label: "Created", value: formatBackupDate(version.revision.createdAt) }
      ],
      diff: version.comparison.diff,
      confirmLabel: "Close"
    });
    return;
  }

  refs.cardHistoryDialog.close();
  const accepted = await confirmAction({
    title: "Restore this version of the card?",
    message: `The text fields, name and settings of "${card.name.trim() || "Untitled card"}" return to the snapshot. The lorebook link stays. The current state is saved as a snapshot first.`,
    details: [
      { label: "Snapshot", value: version.revision.reason },
      { label: "Differs in", value: version.comparison.labels.join(", ") }
    ],
    confirmLabel: "Restore card",
    tone: "primary"
  });

  if (!accepted) {
    return;
  }

  await recordRevision("Before restoring a card version");
  updateCard(card.id, cardRestorePatch(version.past));
  openCardEditor(card.id);
  renderAll();
  scheduleSave();
  toast("Card version restored", "success");
}

function handleNewCard() {
  const card = addCard(createCard());

  if (!card) {
    return;
  }

  renderAll();
  scheduleSave();
  goToView("card", card.id);
  refs.cardName.focus();
}

function convertImageToPng(dataUrl) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      canvas.getContext("2d").drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve("");
    image.src = dataUrl;
  });
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

  if (file.type === "image/png") {
    return dataUrl;
  }

  const converted = await convertImageToPng(dataUrl);

  if (!converted) {
    toast("Couldn't convert that image to PNG.", "error");
    return null;
  }

  return converted;
}

function handleDuplicateCard() {
  if (!editingCardId) {
    return;
  }

  commitCard();
  const copy = duplicateCard(editingCardId);

  if (!copy) {
    return;
  }

  scheduleSave();
  goToView("card", copy.id);
  toast(`Duplicated as "${copy.name}"`, "success");
}

async function confirmDeleteCard(card) {
  return confirmAction({
    title: "Delete card?",
    message: `"${card.name.trim() || "Untitled card"}" will be permanently removed. Its linked lorebook stays.`,
    confirmLabel: "Delete card"
  });
}

async function handleDeleteCard() {
  const card = editingCardId ? getCards().find((item) => item.id === editingCardId) : null;

  if (!card || !await confirmDeleteCard(card)) {
    return;
  }

  window.clearTimeout(cardCommitTimer);
  editingCardId = null;
  deleteCard(card.id);
  scheduleSave();
  toast("Card deleted");
  goToView("library");
}

async function handleExportCard() {
  const draft = currentCardDraft();
  const book = draft.bookId ? getState().books.find((item) => item.id === draft.bookId) : null;
  const exported = CARD_ADAPTER.exportCard(draft, { format: refs.cardExportFormat.value, book });

  if (!exported.ok) {
    refs.cardStatus.textContent = exported.error;
    return;
  }

  if (exported.warnings.length) {
    const accepted = await confirmAction({
      title: `Export ${draft.name.trim() || "card"}?`,
      message: "The card exports with what it has. These points affect the file:",
      warnings: exported.warnings,
      confirmLabel: "Export anyway",
      tone: "primary"
    });

    if (!accepted) {
      return;
    }
  }

  if (exported.json) {
    downloadJson(JSON.parse(exported.json), exported.filename);
  } else {
    downloadBytes(exported.bytes, exported.filename, exported.type);
  }

  toast(`Exported ${draft.name.trim() || "card"}`, "success");
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
  const reimport = parsed.formatId === "card" && (parsed.project.cards ?? []).some((card) => getCards().some((existing) => existing.name.trim().toLowerCase() === card.name.trim().toLowerCase() && card.name.trim()));
  let strategy = parsed.formatId === "card" ? (reimport ? "merge" : "append") : "replace";
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
  recordAndSaveAudit({
    file: file.name,
    format: parsed.format,
    books: parsed.project.books.length,
    entries: entryCount,
    cards: parsed.project.cards?.length ?? 0,
    strategy,
    warnings: (parsed.warnings ?? []).length
  });
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
  scheduleSave();
  goToView("book", getState().activeBookId);
  refs.bookName.focus();
  refs.bookName.select();
});

refs.deleteBookBtn.addEventListener("click", () => {
  handleDeleteBook();
});

refs.drawerToggle.addEventListener("click", () => {
  toggleDrawer();
});

function closeDrawerAfterSelection() {
  if (drawerOpen) {
    setDrawerOpen(false);
  }
}

refs.newCardBtn.addEventListener("click", () => {
  handleNewCard();
});

refs.recentList.addEventListener("click", (event) => {
  const item = event.target.closest("[data-recent-entry-id]");

  if (!item) {
    return;
  }

  clearSearch();
  setActiveEntry(item.dataset.entryId);
  renderAll();
  scrollEntryCardIntoView(item.dataset.entryId);
  focusEntryCard(item.dataset.entryId);
});

refs.cardAvatarInput.addEventListener("change", async (event) => {
  const dataUrl = await readAvatarFile(event.target.files?.[0]);
  event.target.value = "";

  if (!dataUrl) {
    return;
  }

  editingAvatarDataUrl = dataUrl;
  renderCardAvatar(refs, dataUrl);
  markCardDirty();
});

refs.cardAvatarRemove.addEventListener("click", () => {
  editingAvatarDataUrl = "";
  renderCardAvatar(refs, "");
  markCardDirty();
});

refs.cardAltAdd.addEventListener("click", () => {
  addGreetingRow(refs.cardAltGreetings);
  markCardDirty();
});

refs.cardGroupAdd.addEventListener("click", () => {
  addGreetingRow(refs.cardGroupGreetings);
  markCardDirty();
});

for (const container of [refs.cardAltGreetings, refs.cardGroupGreetings]) {
  container.addEventListener("click", (event) => {
    if (handleGreetingClick(container, event.target)) {
      markCardDirty();
    }
  });
}

refs.cardDialog.addEventListener("input", (event) => {
  if (event.target === refs.cardTalkativeness) {
    refs.cardTalkativenessOutput.textContent = Number(refs.cardTalkativeness.value).toFixed(2);
  }

  markCardDirty();
});

refs.cardDialog.addEventListener("change", (event) => {
  if (event.target === refs.cardLinkBook || event.target === refs.cardDepthRole) {
    markCardDirty();
  }
});

refs.cardDelete.addEventListener("click", handleDeleteCard);
refs.cardTemplateBtn.addEventListener("click", openCardTemplateDialog);
refs.cardPrintBtn.addEventListener("click", printCard);
refs.newCardTemplateBtn.addEventListener("click", openCardTemplateDialog);
refs.cardHistoryBtn.addEventListener("click", () => {
  openCardHistory().catch(() => {
    refs.cardHistorySummary.textContent = "Couldn't read local snapshots.";
  });
});
refs.cardTemplateCloseBtn.addEventListener("click", () => refs.cardTemplateDialog.close());
refs.cardHistoryCloseBtn.addEventListener("click", () => refs.cardHistoryDialog.close());

refs.cardTemplateList.addEventListener("click", (event) => {
  const remove = event.target.closest("[data-remove-template-id]");

  if (remove) {
    deleteCustomTemplate(remove.dataset.removeTemplateId);
    renderCardTemplateDialog();
    scheduleSave();
    toast("Template deleted");
    return;
  }

  if (event.target.closest("[data-save-card-template]")) {
    handleSaveCardAsTemplate();
    return;
  }

  const option = event.target.closest("[data-template-id]");

  if (option) {
    handleCardTemplatePick(option.dataset.templateId);
  }
});

refs.cardHistoryList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-card-revision-action]");

  if (button) {
    handleCardVersionAction(button.dataset.cardRevisionAction, button.dataset.revisionId);
  }
});

for (const dialog of [refs.cardTemplateDialog, refs.cardHistoryDialog]) {
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
}
refs.cardDuplicate.addEventListener("click", handleDuplicateCard);
refs.cardExport.addEventListener("click", handleExportCard);

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
  goToView("book", event.target.value);
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

const defaultBindings = [
  [refs.defaultConstant, "constant"],
  [refs.defaultSelective, "selective"],
  [refs.defaultCaseSensitive, "caseSensitive"],
  [refs.defaultWholeWords, "matchWholeWords"]
];

for (const [checkbox, field] of defaultBindings) {
  checkbox.addEventListener("change", () => {
    setEntryDefaults({ [field]: checkbox.checked });
    scheduleSave();
  });
}

refs.entrySearch.addEventListener("input", (event) => {
  setSearchQuery(event.target.value);
  renderSidebar(refs);
});

function syncRegexToggles() {
  const active = getSearchRegex();
  refs.regexToggle.setAttribute("aria-pressed", String(active));
  refs.regexToggle.classList.toggle("is-active", active);
  refs.globalRegexToggle.setAttribute("aria-pressed", String(active));
  refs.globalRegexToggle.classList.toggle("is-active", active);
}

function handleRegexToggle() {
  setSearchRegex(!getSearchRegex());
  syncRegexToggles();
  renderSidebar(refs);

  if (refs.globalSearchDialog.open) {
    renderGlobalSearch();
  }
}

refs.regexToggle.addEventListener("click", handleRegexToggle);
refs.globalRegexToggle.addEventListener("click", handleRegexToggle);

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
  const remove = event.target.closest("[data-remove-template-id]");

  if (remove) {
    deleteCustomTemplate(remove.dataset.removeTemplateId);
    renderTemplateDialog();
    scheduleSave();
    toast("Template deleted");
    return;
  }

  if (event.target.closest("[data-save-as-template]")) {
    handleSaveAsTemplate();
    return;
  }

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

function renderEntryColorOptions() {
  if (!refs.entryColorRow || refs.entryColorRow.childElementCount) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const labels = new Map([
    ["", "No colour"],
    ["blue", "Blue"],
    ["green", "Green"],
    ["amber", "Amber"],
    ["red", "Red"],
    ["purple", "Purple"],
    ["teal", "Teal"]
  ]);

  for (const value of ENTRY_COLOR_VALUES) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `entry-color-option${value ? ` color-${value}` : ""}`;
    option.dataset.color = value;
    option.title = labels.get(value);
    option.setAttribute("aria-label", labels.get(value));
    option.setAttribute("aria-pressed", "false");
    fragment.append(option);
  }

  refs.entryColorRow.append(fragment);
}

renderEntryColorOptions();

refs.entryColorRow?.addEventListener("click", (event) => {
  const option = event.target.closest("[data-color]");

  if (!option) {
    return;
  }

  updateActiveEntry({ color: option.dataset.color });
  renderEditor(refs);
  renderSidebar(refs);
  scheduleSave();
});

refs.advancedFieldsBody?.addEventListener("change", handleAdvancedFieldChange);
refs.advancedFieldsBody?.addEventListener("input", (event) => {
  // Number and text fields commit on input; the save debounce absorbs the churn.
  if (event.target.closest("[data-advanced-key]")?.dataset.advancedType === "number") {
    handleAdvancedFieldChange(event);
  }
});

function handleAdvancedFieldChange(event) {
  const input = event.target.closest("[data-advanced-key]");

  if (!input) {
    return;
  }

  const entry = getActiveEntry();

  if (!entry) {
    return;
  }

  const key = input.dataset.advancedKey;
  let value;

  if (input.dataset.advancedType === "boolean") {
    value = input.checked;
  } else if (input.dataset.advancedType === "number") {
    value = input.value === "" ? "" : Math.round(Number(input.value));
    value = Number.isFinite(value) ? value : "";
  } else {
    value = input.value;
  }

  const updated = writeAdvancedField(entry, key, value);
  updateActiveEntry({ extensions: updated.extensions });
  scheduleSave();
}

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

refs.detailsOpenBtn.addEventListener("click", () => {
  setDetailsCollapsed(false);
  refs.detailsToggle.focus();
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

window.addEventListener("dragover", (event) => {
  if (event.dataTransfer?.types?.includes("Files")) {
    event.preventDefault();
    refs.dropOverlay.hidden = false;
  }
});

window.addEventListener("dragleave", (event) => {
  if (!event.relatedTarget && refs.dropOverlay && !refs.dropOverlay.hidden) {
    refs.dropOverlay.hidden = true;
  }
});

window.addEventListener("drop", async (event) => {
  if (!event.dataTransfer?.types?.includes("Files")) {
    return;
  }

  event.preventDefault();
  refs.dropOverlay.hidden = true;
  const file = event.dataTransfer.files?.[0];

  if (file) {
    await handleImport(file);
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
  goToView("book", getState().activeBookId);
});

refs.onboardingEmptyBtn.addEventListener("click", () => {
  markOnboarded();
  refs.onboardingDialog.close();
  startEmptyProject();
  goToView("book", getState().activeBookId);
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

document.querySelector("#skip-link").addEventListener("click", (event) => {
  event.preventDefault();
  const target = [...document.querySelectorAll("main")].find((element) => !element.hidden);

  if (target) {
    target.tabIndex = -1;
    target.focus();
  }
});

refs.appMenuBtn.addEventListener("click", () => {
  setFileMenuOpen(false);
  setAppMenuOpen(refs.appMenu.hidden);
});

refs.fileMenuBtn.addEventListener("click", () => {
  setAppMenuOpen(false);
  setFileMenuOpen(refs.fileMenu.hidden);
});

refs.fileMenu.addEventListener("click", (event) => {
  if (event.target.closest(".menu-item")) {
    setFileMenuOpen(false);
  }
});

refs.appMenu.addEventListener("click", (event) => {
  if (event.target.closest(".menu-item")) {
    setAppMenuOpen(false);
  }
});

document.addEventListener("click", (event) => {
  if (!refs.fileMenu.hidden && !refs.fileMenu.contains(event.target) && !refs.fileMenuBtn.contains(event.target)) {
    setFileMenuOpen(false);
  }

  if (!refs.appMenu.hidden && !refs.appMenu.contains(event.target) && !refs.appMenuBtn.contains(event.target)) {
    setAppMenuOpen(false);
  }
});

refs.menuPaletteBtn.addEventListener("click", () => openCommandPalette(buildCommands()));
refs.menuShortcutsBtn.addEventListener("click", openShortcutsDialog);

refs.navCollapse.addEventListener("click", toggleNav);
refs.navOpenBtn.addEventListener("click", () => setMobileNavOpen(!refs.shell.classList.contains("is-nav-open")));

refs.reviewBody.addEventListener("input", (event) => {
  if (event.target.id === "preview-scene") {
    previewScene = event.target.value;
    renderPreviewOutput();
  } else if (event.target.id === "preview-user") {
    previewUser = event.target.value;
    renderPreviewOutput();
  }
});

refs.reviewBody.addEventListener("click", async (event) => {
  if (event.target.closest("#preview-copy-btn")) {
    try {
      await navigator.clipboard.writeText(previewPrompt);
      toast("Assembled prompt copied", "success");
    } catch {
      toast("Couldn't copy to the clipboard.", "error");
    }

    return;
  }

  if (event.target.closest("#review-simulate-btn")) {
    openSimulationDialog();
    return;
  }

  const entry = event.target.closest("[data-review-entry]");

  if (entry) {
    goToView("book", getState().activeBookId);
    clearSearch();
    setActiveEntry(entry.dataset.reviewEntry);
    renderAll();
    scrollEntryCardIntoView(entry.dataset.reviewEntry);
    focusEntryCard(entry.dataset.reviewEntry);
    scheduleSave();
    return;
  }

  const field = event.target.closest("[data-review-field]");

  if (field) {
    goToView("card", currentRouteId);
    const target = document.getElementById(CARD_FIELD_TARGETS[field.dataset.reviewField] ?? "card-name");
    target?.scrollIntoView({ block: "center" });
    target?.focus();
  }
});

refs.appNav.addEventListener("click", (event) => {
  const anchor = event.target.closest("[data-scroll-to]");

  if (anchor) {
    const target = document.getElementById(anchor.dataset.scrollTo);
    target?.scrollIntoView({ block: "center" });
    target?.focus();
  }

  if (MOBILE_NAV_QUERY.matches && event.target.closest(".nav-item:not(#nav-collapse)")) {
    setMobileNavOpen(false);
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || document.querySelector("dialog[open]")) {
    return;
  }

  if (!refs.fileMenu.hidden) {
    setFileMenuOpen(false);
    refs.fileMenuBtn.focus();
  } else if (!refs.appMenu.hidden) {
    setAppMenuOpen(false);
    refs.appMenuBtn.focus();
  } else if (refs.shell.classList.contains("is-nav-open")) {
    setMobileNavOpen(false);
    refs.navOpenBtn.focus();
  }
});

refs.hubSearch.addEventListener("input", (event) => {
  hubState.query = event.target.value;
  renderHub();
});

refs.hubFilters.addEventListener("click", (event) => {
  const chip = event.target.closest("[data-kind]");

  if (!chip) {
    return;
  }

  hubState.kind = chip.dataset.kind;

  for (const button of refs.hubFilters.querySelectorAll("[data-kind]")) {
    button.setAttribute("aria-pressed", String(button === chip));
  }

  renderHub();
});

refs.hubSort.addEventListener("change", (event) => {
  hubState.sort = event.target.value;
  renderHub();
});

refs.hubTag.addEventListener("change", (event) => {
  hubState.tag = event.target.value;
  renderHub();
});

refs.hubEmptyClear.addEventListener("click", () => {
  hubState.query = "";
  hubState.kind = "all";
  hubState.tag = "";
  refs.hubSearch.value = "";

  for (const button of refs.hubFilters.querySelectorAll("[data-kind]")) {
    button.setAttribute("aria-pressed", String(button.dataset.kind === "all"));
  }

  renderHub();
});

refs.hubImportBtn.addEventListener("click", () => refs.importInput.click());

function setProjectSelected(id, selected) {
  if (selected) {
    hubSelected.add(id);
  } else {
    hubSelected.delete(id);
  }
}

function selectedProjects() {
  const state = getState();

  return {
    books: state.books.filter((book) => hubSelected.has(book.id)),
    cards: getCards().filter((card) => hubSelected.has(card.id))
  };
}

function describeSelection({ books, cards }) {
  const parts = [];

  if (books.length) {
    parts.push(`${books.length} ${books.length === 1 ? "lorebook" : "lorebooks"}`);
  }

  if (cards.length) {
    parts.push(`${cards.length} ${cards.length === 1 ? "card" : "cards"}`);
  }

  return parts.join(" and ");
}

refs.hubLayout.addEventListener("click", (event) => {
  const button = event.target.closest("[data-layout]");

  if (!button) {
    return;
  }

  hubState.layout = button.dataset.layout === "list" ? "list" : "grid";

  try {
    localStorage.setItem(HUB_LAYOUT_KEY, hubState.layout);
  } catch {
    // The layout still applies for this visit.
  }

  renderHub();
});

refs.hubSelectBtn.addEventListener("click", () => {
  hubState.selecting = !hubState.selecting;
  hubSelected.clear();
  renderHub();
});

refs.hubBulkBar.addEventListener("click", async (event) => {
  const button = event.target.closest("button");

  if (!button) {
    return;
  }

  const selection = selectedProjects();
  const total = selection.books.length + selection.cards.length;

  if (button.id === "hub-bulk-done") {
    hubState.selecting = false;
    hubSelected.clear();
    renderHub();
    refs.hubSelectBtn.focus();
    return;
  }

  if (button.id === "hub-bulk-all") {
    for (const box of refs.projectList.querySelectorAll("[data-project-select]")) {
      hubSelected.add(box.dataset.projectId);
    }

    renderHub();
    return;
  }

  if (!total) {
    toast("Select at least one lorebook or card first.");
    return;
  }

  if (button.id === "hub-bulk-tag-add" || button.id === "hub-bulk-tag-remove") {
    const [tag] = normalizeTagList([refs.hubBulkTag.value]);

    if (!tag) {
      toast("Type a tag first.");
      refs.hubBulkTag.focus();
      return;
    }

    const adding = button.id === "hub-bulk-tag-add";
    const change = (tags) => normalizeTagList(adding ? [...tags, tag] : tags.filter((value) => value !== tag));
    const previousBookId = getState().activeBookId;

    for (const book of selection.books) {
      setActiveBook(book.id);
      updateActiveBookTags(change(book.tags ?? []));
    }

    setActiveBook(previousBookId);

    for (const card of selection.cards) {
      updateCard(card.id, { tags: change(card.tags ?? []) });
    }

    renderAll();
    scheduleSave();
    toast(`${adding ? "Added" : "Removed"} tag "${tag}" on ${describeSelection(selection)}`, "success");
    return;
  }

  if (button.id === "hub-bulk-export") {
    const state = getState();
    const subset = { ...state, books: selection.books, cards: selection.cards, activeBookId: selection.books[0]?.id ?? null, activeEntryId: selection.books[0]?.entries[0]?.id ?? null };
    downloadJson(buildExport(subset), `loreweaver-selection-${new Date().toISOString().slice(0, 10)}.lwproj`);
    toast(`Exported ${describeSelection(selection)}`, "success");
    return;
  }

  if (button.id === "hub-bulk-delete") {
    const accepted = await confirmAction({
      title: "Delete selected projects?",
      message: `${describeSelection(selection)} will be permanently removed, including every entry in the lorebooks.`,
      confirmLabel: "Delete selected"
    });

    if (!accepted) {
      return;
    }

    for (const book of selection.books) {
      deleteBook(book.id);
    }

    for (const card of selection.cards) {
      deleteCard(card.id);
    }

    hubSelected.clear();
    renderAll();
    scheduleSave();
    toast(`Deleted ${describeSelection(selection)}`);
  }
});

refs.projectList.addEventListener("change", (event) => {
  const box = event.target.closest("[data-project-select]");

  if (box) {
    setProjectSelected(box.dataset.projectId, box.checked);
    renderHub();
    refs.projectList.querySelector(`[data-project-select][data-project-id="${box.dataset.projectId}"]`)?.focus();
  }
});

refs.projectList.addEventListener("click", async (event) => {
  if (hubState.selecting) {
    const open = event.target.closest(".project-open");

    if (open) {
      event.preventDefault();
      setProjectSelected(open.dataset.projectId, !hubSelected.has(open.dataset.projectId));
      renderHub();
      return;
    }
  }

  const button = event.target.closest("[data-project-action]");

  if (!button) {
    return;
  }

  const { projectAction: action, projectKind: kind, projectId: id } = button.dataset;

  if (action === "pin") {
    togglePinned(id);
    renderHub();
    refs.projectList.querySelector(`[data-project-action="pin"][data-project-id="${id}"]`)?.focus();
    return;
  }

  if (kind === "book") {
    if (action === "duplicate") {
      setActiveBook(id);
      duplicateActiveBook();
      renderAll();
      scheduleSave();
      toast("Lorebook duplicated", "success");
    } else {
      const book = getState().books.find((item) => item.id === id);
      const count = book?.entries.length ?? 0;
      const accepted = book && await confirmAction({
        title: "Delete lorebook?",
        message: `"${book.name.trim() || "Untitled Lorebook"}" and its ${count} ${count === 1 ? "entry" : "entries"} will be permanently removed.`,
        confirmLabel: "Delete lorebook"
      });

      if (accepted) {
        deleteBook(id);
        renderAll();
        scheduleSave();
        toast("Lorebook deleted");
      }
    }

    return;
  }

  const card = getCards().find((item) => item.id === id);

  if (!card) {
    return;
  }

  if (action === "duplicate") {
    duplicateCard(id);
    renderAll();
    scheduleSave();
    toast("Card duplicated", "success");
  } else if (await confirmDeleteCard(card)) {
    deleteCard(id);
    renderAll();
    scheduleSave();
    toast("Card deleted");
  }
});

refs.dataImportBtn.addEventListener("click", () => refs.importInput.click());
refs.dataExportBtn.addEventListener("click", openExportDialog);
refs.dataOpenBtn.addEventListener("click", () => openProjectFile());
refs.dataSaveBtn.addEventListener("click", () => saveProjectFile());
refs.navSearchBtn.addEventListener("click", openGlobalSearchDialog);
refs.navReplaceBtn.addEventListener("click", openReplaceDialog);
refs.settingsGuideBtn.addEventListener("click", openGuideDialog);
refs.exportDataLink.addEventListener("click", () => refs.exportDialog.close());

refs.aboutGuideBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openGuideDialog();
});

refs.aboutSchemaBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openSchemaDialog();
});

refs.schemaClose.addEventListener("click", () => refs.schemaDialog.close());

refs.schemaDialog.addEventListener("click", (event) => {
  if (event.target === refs.schemaDialog) {
    refs.schemaDialog.close();
  }
});

refs.aboutShortcutsBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openShortcutsDialog();
});

refs.shortcutsClose.addEventListener("click", () => refs.shortcutsDialog.close());

refs.shortcutsDialog.addEventListener("click", (event) => {
  if (event.target === refs.shortcutsDialog) {
    refs.shortcutsDialog.close();
  }
});

for (const button of refs.themeButtons) {
  button.addEventListener("click", () => chooseTheme(button.dataset.themeChoice));
}

for (const button of refs.densityButtons) {
  button.addEventListener("click", () => applyDensity(button.dataset.densityChoice));
}

refs.aboutIntegrityBtn.addEventListener("click", () => {
  refs.aboutDialog.close();
  openIntegrityDialog();
});

refs.tokenizerPreset.addEventListener("change", handleTokenizerChange);
refs.contextWindowPreset.addEventListener("change", handleContextWindowChange);

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
  const cardItem = event.target.closest("[data-card-id]");

  if (cardItem) {
    refs.globalSearchDialog.close();
    goToView("card", cardItem.dataset.cardId);
    return;
  }

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

refs.tabReloadBtn.addEventListener("click", () => {
  skipUnloadWarning = true;
  window.location.reload();
});

refs.tabKeepBtn.addEventListener("click", async () => {
  staleFromPeer = false;
  hideTabBanner();
  scheduleSave();
  toast("This tab's version will replace the other tab's", "success");
});

refs.tabDismissBtn.addEventListener("click", () => {
  hideTabBanner();
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

refs.validationCategories.addEventListener("click", (event) => {
  if (event.target.closest("[data-validation-all]")) {
    validationFilters = new Set();
    renderIssuesPage();
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

  renderIssuesPage();
});

refs.validationIssues.addEventListener("click", (event) => {
  const issue = event.target.closest("[data-entry-id]");

  if (issue) {
    jumpToValidationEntry(issue.dataset.entryId, issue.dataset.field);
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

  if (event.altKey && !modifier && !event.shiftKey && viewForShortcut(event.key)) {
    event.preventDefault();
    goToView(viewForShortcut(event.key));
    return;
  }

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

  if (modifier && !event.altKey && event.key === "\\") {
    event.preventDefault();
    toggleFocusMode();
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

  if (event.altKey && !modifier && (event.key === "p" || event.key === "P") && getActiveEntry()) {
    event.preventDefault();
    handleTogglePin();
    return;
  }

  if (modifier && !event.altKey && key === "d" && getActiveEntry()) {
    event.preventDefault();
    handleDuplicateEntry();
    return;
  }

  if (modifier && key === "Enter" && currentView === "book-simulate") {
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
    ensureEntriesView();
    refs.entrySearch.focus();
    refs.entrySearch.select();
  }
});

window.addEventListener("beforeunload", (event) => {
  recordSessionChanges();
  tabGuard.close();

  if (!skipUnloadWarning && (unsavedChanges || saveFailed || staleFromPeer)) {
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
const TEXTAREA_KEYS = ["entry-content", "entry-notes", "book-description"];
let textareaHeights = {};

function readTextareaHeights() {
  try {
    return readHeights(localStorage.getItem(TEXTAREA_HEIGHTS_KEY));
  } catch {
    return {};
  }
}

function persistTextareaHeights() {
  try {
    localStorage.setItem(TEXTAREA_HEIGHTS_KEY, serializeHeights(textareaHeights));
  } catch {
    return;
  }
}

function applyTextareaHeights() {
  for (const key of TEXTAREA_KEYS) {
    const element = document.querySelector(`#${key}`);
    applyHeight(element, textareaHeights[key]);
  }
}

function watchTextareaHeights() {
  for (const key of TEXTAREA_KEYS) {
    const element = document.querySelector(`#${key}`);

    if (!element) {
      continue;
    }

    element.addEventListener("mouseup", () => {
      const height = element.getBoundingClientRect().height;

      if (Math.round(height) !== textareaHeights[key]) {
        textareaHeights[key] = Math.round(height);
        persistTextareaHeights();
      }
    });
  }
}

let drawerOpen = false;

function setDrawerOpen(open) {
  drawerOpen = open;
  refs.sidebar.classList.toggle("is-drawer", open);
  refs.workspace.classList.toggle("drawer-open", open);
  refs.drawerToggle.setAttribute("aria-expanded", String(open));
  refs.drawerToggle.setAttribute("aria-label", open ? "Close library drawer" : "Open library drawer");
  refs.drawerToggle.title = open ? "Close library" : "Library";

  if (!open) {
    refs.entryList?.focus({ preventScroll: true });
  }
}

function toggleDrawer() {
  setDrawerOpen(!drawerOpen);
}
applyTheme(readTheme());
applyDensity(readDensity());
textareaHeights = readTextareaHeights();
watchTextareaHeights();

const storedDetailsState = readDetailsState();
setDetailsCollapsed(storedDetailsState ?? window.matchMedia("(max-width: 1180px)").matches, false);

window.matchMedia("(max-width: 1180px)").addEventListener("change", (event) => {
  if (readDetailsState() === null) {
    setDetailsCollapsed(event.matches, false);
  }
});

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

tabGuard.announce();
requestPersistence();
setNavExpanded(readNavExpanded(), false);

window.matchMedia("(min-width: 1200px)").addEventListener("change", (event) => {
  let stored = null;

  try {
    stored = localStorage.getItem(NAV_STATE_KEY);
  } catch {
    stored = null;
  }

  if (stored === null) {
    setNavExpanded(event.matches, false);
  }
});
showRoute(parseRoute(window.location.hash));

refs.saveFileBtn.hidden = false;
refs.dataSaveBtn.hidden = false;

if (supportsFileSystemAccess()) {
  refs.openFileBtn.hidden = false;
  refs.dataOpenBtn.hidden = false;
} else {
  refs.saveFileBtn.title = "Download the project as a file";
  refs.saveFileBtn.querySelector("span").textContent = "Download project file";
}

maybeRemindBackup();
maybeShowSessionSummary();
maybeShowOnboarding();


function readAuditLog() {
  try {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function recordAndSaveAudit(record) {
  try {
    localStorage.setItem(AUDIT_KEY, JSON.stringify(recordAudit(readAuditLog(), record)));
  } catch {
    return;
  }
}


const KEYBOARD_SHORTCUTS = [
  ...VIEWS.map((view) => ({ keys: view.shortcut, label: `Go to ${view.label}` })),
  { keys: "Ctrl+K", label: "Command palette" },
  { keys: "Alt+N", label: "New entry" },
  { keys: "Ctrl+D", label: "Duplicate entry" },
  { keys: "Alt+P", label: "Pin or unpin the active entry" },
  { keys: "Ctrl+Z", label: "Undo" },
  { keys: "Ctrl+Shift+Z", label: "Redo" },
  { keys: "/", label: "Search entries" },
  { keys: "Ctrl+Shift+F", label: "Search lorebooks and cards" },
  { keys: "Ctrl+H", label: "Bulk find and replace" },
  { keys: "Ctrl+Shift+E", label: "Export" },
  { keys: "Ctrl+S", label: "Save the project locally" },
  { keys: "Ctrl+Enter", label: "Run the simulation (dialog open)" },
  { keys: "Alt+ArrowUp / Alt+ArrowDown", label: "Reorder in manual order" },
  { keys: "ArrowUp / ArrowDown / Home / End", label: "Move in the entry list" },
  { keys: "Ctrl+Click / Shift+Click", label: "Multi-select entries" }
];

function openShortcutsDialog() {
  refs.shortcutsList.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (const shortcut of KEYBOARD_SHORTCUTS) {
    const row = document.createElement("div");
    const keys = document.createElement("dt");
    const label = document.createElement("dd");
    row.className = "shortcut-row";
    keys.className = "shortcut-keys";
    label.className = "shortcut-label";
    keys.setAttribute("aria-keyshortcuts", shortcut.keys);
    keys.textContent = shortcut.keys;
    label.textContent = shortcut.label;
    row.append(keys, label);
    fragment.append(row);
  }

  refs.shortcutsList.append(fragment);
  refs.shortcutsDialog.showModal();
  refs.shortcutsClose.focus();
}


function openSchemaDialog() {
  const page = buildSchemaPage();
  refs.schemaVersion.textContent = `Schema version ${page.version}. Generated from the canonical model; adapters map this to each frontend format.`;
  refs.schemaBody.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (const section of page.sections) {
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    const title = document.createElement("span");
    title.textContent = section.title;
    const count = document.createElement("span");
    count.className = "count";
    count.textContent = String(section.fields.length);
    summary.append(title, count);

    const list = document.createElement("dl");
    list.className = "schema-list";

    for (const field of section.fields) {
      const term = document.createElement("dt");
      term.textContent = field.name;
      const type = document.createElement("span");
      type.className = "schema-type";
      type.textContent = field.type;
      term.append(type);
      const note = document.createElement("dd");
      note.textContent = field.note;
      list.append(term, note);
    }

    details.append(summary, list);
    fragment.append(details);
  }

  refs.schemaBody.append(fragment);
  refs.schemaDialog.showModal();
  refs.schemaClose.focus();
}


function renderPrintView() {
  const view = buildPrintRows(getActiveBook(), (text) => tokenizer.count(text));
  refs.printRoot.replaceChildren();

  const head = document.createElement("header");
  head.className = "print-head";
  const title = document.createElement("h1");
  title.textContent = view.bookName;
  const meta = document.createElement("p");
  meta.textContent = `${view.description ? `${view.description} \u00b7 ` : ""}${view.totalEntries} ${view.totalEntries === 1 ? "entry" : "entries"} \u00b7 ~${numberFormatter.format(view.totalTokens)} tokens`;
  head.append(title, meta);

  const fragment = document.createDocumentFragment();

  for (const row of view.rows) {
    const article = document.createElement("article");
    article.className = "print-entry";
    const heading = document.createElement("h2");
    heading.className = "print-entry-title";
    heading.textContent = row.title;
    const info = document.createElement("p");
    info.className = "print-entry-meta";
    info.textContent = [
      row.constant ? "Always on" : row.keys ? `Keys: ${row.keys}` : "No keys",
      row.secondaryKeys ? `Secondary: ${row.secondaryKeys}` : "",
      `Order ${row.order}`,
      `~${numberFormatter.format(row.tokens)} tokens`,
      row.enabled ? "" : "Disabled"
    ].filter(Boolean).join(" \u00b7 ");
    const content = document.createElement("div");
    content.className = "print-entry-content";
    content.textContent = row.content;
    article.append(heading, info, content);

    if (row.notes) {
      const notes = document.createElement("div");
      notes.className = "print-entry-notes";
      notes.textContent = `Author notes: ${row.notes}`;
      article.append(notes);
    }

    fragment.append(article);
  }

  refs.printRoot.append(head, fragment);
}

function renderCardPrintView() {
  const card = getCards().find((item) => item.id === editingCardId);

  if (!card) {
    return false;
  }

  const book = getState().books.find((item) => item.id === card.bookId);
  const view = buildCardPrint({ ...card, ...readCardForm(refs) }, { tokenCount: (text) => tokenizer.count(text), bookName: book?.name.trim() ?? "" });
  const head = document.createElement("header");
  const title = document.createElement("h1");
  const meta = document.createElement("p");

  head.className = "print-head";
  title.textContent = view.nickname ? `${view.name} (${view.nickname})` : view.name;
  meta.textContent = [
    "Character card",
    view.creator,
    view.tags.length ? `Tags: ${view.tags.join(", ")}` : "",
    view.linkedBook ? `Lorebook: ${view.linkedBook}` : "",
    `~${numberFormatter.format(view.totalTokens)} tokens`
  ].filter(Boolean).join(" \u00b7 ");
  head.append(title, meta);

  const fragment = document.createDocumentFragment();

  for (const section of view.sections) {
    const article = document.createElement("article");
    const heading = document.createElement("h2");
    const info = document.createElement("p");
    const content = document.createElement("div");

    article.className = "print-entry";
    heading.className = "print-entry-title";
    heading.textContent = section.label;
    info.className = "print-entry-meta";
    info.textContent = `~${numberFormatter.format(section.tokens)} tokens`;
    content.className = "print-entry-content";
    content.textContent = section.text;
    article.append(heading, info, content);
    fragment.append(article);
  }

  refs.printRoot.replaceChildren(head, fragment);
  return true;
}

function printCard() {
  if (!renderCardPrintView()) {
    toast("There is no card to print.", "error");
    return;
  }

  window.print();
}

function printActiveBook() {
  const book = getActiveBook();

  if (!book) {
    toast("There is no lorebook to print.", "error");
    return;
  }

  renderPrintView();
  window.print();
}

if ("serviceWorker" in navigator && globalThis.location?.protocol?.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(() => {});
}
