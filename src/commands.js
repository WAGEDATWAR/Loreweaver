/**
 * Command scopes. A command with a scope is offered on the pages that can act on it; commands without one
 * are offered everywhere. Typing always searches every command, so nothing becomes unreachable.
 */
export const COMMAND_SCOPES = Object.freeze({
  entries: ["book"],
  book: ["book", "book-settings", "book-review"],
  card: ["card", "card-review"],
  editor: ["book", "book-settings", "book-review", "card", "card-review"]
});

const ENTRY_COMMAND = /^(Sort|Filter): /;

const SCOPE_BY_TITLE = new Map([
  ["Lorebook settings", "book"],
  ["Lorebook actions", "book"],
  ["Print lorebook", "book"],
  ["Overview", "book"],
  ["Context simulation", "book"],
  ["Issues", "book"],
  ["Revision history", "book"],
  ["Bulk find and replace", "book"],
  ["New entry", "entries"],
  ["New entry from template", "entries"],
  ["Select entries by token size", "entries"],
  ["Toggle library sidebar", "entries"],
  ["Toggle entry details", "entries"],
  ["Toggle focus mode", "entries"],
  ["Duplicate entry", "entries"],
  ["Copy entry", "entries"],
  ["Pin entry", "entries"],
  ["Unpin entry", "entries"],
  ["Delete entry", "entries"],
  ["Clear search", "entries"],
  ["Toggle editor menu", "editor"],
  ["Review", "editor"]
]);

export function scopeOf(command) {
  if (command.scope) {
    return command.scope;
  }

  return ENTRY_COMMAND.test(command.title) ? "entries" : SCOPE_BY_TITLE.get(command.title) ?? null;
}

/** Mark each command that does not apply to `view`; the palette hides those until the user types. */
export function applyScopes(commands, view) {
  return commands.map((command) => {
    const scope = scopeOf(command);
    const outOfScope = Boolean(scope) && !COMMAND_SCOPES[scope]?.includes(view);
    return outOfScope ? { ...command, outOfScope } : command;
  });
}

/** Commands run most recently come first, then the rest in their given order. */
export function orderByRecent(commands, recentTitles = []) {
  const rank = new Map(recentTitles.map((title, index) => [title, index]));
  const recent = commands.filter((command) => rank.has(command.title) && !command.outOfScope)
    .sort((a, b) => rank.get(a.title) - rank.get(b.title));
  const rest = commands.filter((command) => !recent.includes(command));

  return [...recent, ...rest];
}

export function pushRecent(recentTitles, title, limit = 5) {
  return [title, ...recentTitles.filter((item) => item !== title)].slice(0, limit);
}

export function filterCommands(items, query) {
  const needle = String(query ?? "").trim().toLowerCase();

  if (!needle) {
    return items.filter((command) => !command.outOfScope);
  }

  const matches = items.filter((command) => {
    const haystack = [
      command.title,
      command.hint ?? "",
      ...(command.keywords ?? [])
    ].join(" ").toLowerCase();

    return haystack.includes(needle);
  });

  return [...matches.filter((command) => !command.outOfScope), ...matches.filter((command) => command.outOfScope)];
}
