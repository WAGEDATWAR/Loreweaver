/**
 * Pages and routes. The location hash is the only view state.
 *
 * Hub pages (library, data, settings) have no editor menu. Editor routes open one project, a lorebook
 * or a character card, and show the editor menu for that project.
 */
export const VIEWS = Object.freeze([
  { id: "library", label: "Library", shortcut: "Alt+1", key: "1", description: "Your lorebooks and character cards." },
  { id: "data", label: "Data", shortcut: "Alt+2", key: "2", description: "Import, export, back up and check your data." },
  { id: "settings", label: "Settings", shortcut: "Alt+3", key: "3", description: "Appearance, tokenizer, shortcuts and reference." }
]);

export const DEFAULT_VIEW = "library";

const HUB_IDS = new Set(VIEWS.map((view) => view.id));
const EDITOR_VIEWS = new Set(["book", "book-settings", "book-review", "card", "card-review"]);

export function isHubView(value) {
  return HUB_IDS.has(value);
}

export function isEditorView(value) {
  return EDITOR_VIEWS.has(value);
}

export function isView(value) {
  return isHubView(value) || isEditorView(value);
}

export function getView(id) {
  return VIEWS.find((view) => view.id === id) ?? VIEWS[0];
}

export function viewForShortcut(key) {
  return VIEWS.find((view) => view.key === key)?.id ?? null;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

/** `#/book/<id>` and friends become `{ view, id }`; anything unknown is the library. */
export function parseRoute(hash) {
  const parts = String(hash ?? "").replace(/^#\/?/, "").split("?")[0].split("/").filter(Boolean);
  const [head, id, tail] = parts;

  if (head === "entries") {
    return { view: "book", id: null };
  }

  if (isHubView(head) && parts.length === 1) {
    return { view: head, id: null };
  }

  if (head === "book" && ID_PATTERN.test(id ?? "")) {
    if (tail === "settings" && parts.length === 3) {
      return { view: "book-settings", id };
    }

    if (tail === "review" && parts.length === 3) {
      return { view: "book-review", id };
    }

    if (parts.length === 2) {
      return { view: "book", id };
    }
  }

  if (head === "card" && ID_PATTERN.test(id ?? "") && parts.length === 2) {
    return { view: "card", id };
  }

  if (head === "card" && ID_PATTERN.test(id ?? "") && tail === "review" && parts.length === 3) {
    return { view: "card-review", id };
  }

  return { view: DEFAULT_VIEW, id: null };
}

export function routeHref(view, id = null) {
  if (view === "book" && id) {
    return `#/book/${id}`;
  }

  if (view === "book-settings" && id) {
    return `#/book/${id}/settings`;
  }

  if (view === "book-review" && id) {
    return `#/book/${id}/review`;
  }

  if (view === "card-review" && id) {
    return `#/card/${id}/review`;
  }

  if (view === "card" && id) {
    return `#/card/${id}`;
  }

  return `#/${isHubView(view) ? view : DEFAULT_VIEW}`;
}
