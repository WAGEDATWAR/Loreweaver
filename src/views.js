export const VIEWS = Object.freeze([
  { id: "entries", label: "Entries", shortcut: "Alt+1", key: "1", description: "Write and organize the active lorebook's entries." },
  { id: "library", label: "Library", shortcut: "Alt+2", key: "2", description: "Manage lorebooks, their settings and character cards." },
  { id: "data", label: "Data", shortcut: "Alt+3", key: "3", description: "Import, export, back up and check your project." },
  { id: "settings", label: "Settings", shortcut: "Alt+4", key: "4", description: "Appearance, tokenizer, shortcuts and reference." }
]);

export const DEFAULT_VIEW = "entries";

const VIEW_IDS = new Set(VIEWS.map((view) => view.id));

export function isView(value) {
  return VIEW_IDS.has(value);
}

export function viewHref(id) {
  return `#/${isView(id) ? id : DEFAULT_VIEW}`;
}

/** The view named by a location hash such as `#/library`; anything unknown is the default view. */
export function parseViewHash(hash) {
  const match = /^#\/?([a-z-]+)/.exec(String(hash ?? ""));
  return match && isView(match[1]) ? match[1] : DEFAULT_VIEW;
}

export function viewForShortcut(key) {
  return VIEWS.find((view) => view.key === key)?.id ?? null;
}

export function getView(id) {
  return VIEWS.find((view) => view.id === id) ?? VIEWS[0];
}
