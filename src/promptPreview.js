import { simulateContext } from "./simulation.js";

/**
 * A preview of the prompt a frontend would assemble for one card, its linked lorebook and a pasted scene.
 * It follows the common order (system prompt, character definition, examples, chat, author's note, depth
 * text, post-history instructions) but, like the simulation (C-5), it is a preview and not a runtime:
 * recursion, groups, scan depth and each frontend's own template stay with the frontend.
 */

const LORE_SLOTS = [
  ["before_char", "Lorebook, before the character"],
  ["after_char", "Lorebook, after the character"],
  ["before_an", "Lorebook, before the author's note"],
  ["after_an", "Lorebook, after the author's note"],
  ["at_depth", "Lorebook, inserted at depth"]
];

export const PREVIEW_SECTIONS = Object.freeze({
  always: "Sent every turn",
  lore: "Lorebook",
  examples: "Examples",
  opening: "Opening",
  chat: "Chat"
});

export function applyMacros(text, { char = "", user = "" } = {}) {
  return String(text ?? "")
    .replace(/\{\{char\}\}|<BOT>/gi, char || "the character")
    .replace(/\{\{user\}\}|<USER>/gi, user || "You");
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

export function buildPromptPreview(card, book, { scene = "", user = "You", count, contextWindow = 0 }) {
  const macros = { char: card.name.trim(), user: user.trim() };
  const fill = (text) => applyMacros(text, macros).trim();
  const segments = [];
  const add = (id, label, section, text, extra = {}) => {
    const value = fill(text);

    if (value) {
      segments.push({ id, label, section, text: value, tokens: count(value), ...extra });
    }
  };

  const scanText = [card.firstMessage, scene].filter(Boolean).join("\n");
  const lore = book ? simulateContext(book, scanText) : null;
  const loreBySlot = (slot) => (lore?.activated ?? []).filter((item) => (item.entry.position ?? "before_char") === slot);
  const addLore = (slot, label) => {
    const items = loreBySlot(slot);

    if (items.length) {
      add(`lore-${slot}`, label, "lore", items.map((item) => item.entry.content).filter(Boolean).join("\n\n"), {
        entries: items.map((item) => item.entry.title.trim() || "Untitled entry")
      });
    }
  };
  const slotLabel = (slot) => LORE_SLOTS.find(([value]) => value === slot)[1];

  add("system", "System prompt", "always", card.systemPrompt);
  addLore("before_char", slotLabel("before_char"));
  add("description", "Description", "always", card.description);
  add("personality", "Personality", "always", card.personality);
  add("scenario", "Scenario", "always", card.scenario);
  addLore("after_char", slotLabel("after_char"));
  add("examples", "Example messages", "examples", card.exampleMessages);
  add("opening", "Opening message", "opening", card.firstMessage);
  add("chat", "Chat so far", "chat", scene);
  addLore("before_an", slotLabel("before_an"));
  addLore("after_an", slotLabel("after_an"));
  addLore("at_depth", slotLabel("at_depth"));

  if (card.depthPrompt?.prompt?.trim()) {
    add("depth", `Depth prompt (${card.depthPrompt.role}, depth ${card.depthPrompt.depth})`, "always", card.depthPrompt.prompt);
  }

  add("post-history", "Post-history instructions", "always", card.postHistoryInstructions);

  let running = 0;

  for (const segment of segments) {
    running += segment.tokens;
    segment.cumulative = running;
  }

  const bySection = (section) => sum(segments.filter((segment) => segment.section === section).map((segment) => segment.tokens));
  const total = running;
  const loreTokens = bySection("lore");
  const budget = book?.tokenBudget > 0 ? book.tokenBudget : 0;

  return {
    segments,
    sections: {
      always: bySection("always"),
      lore: loreTokens,
      examples: bySection("examples"),
      opening: bySection("opening"),
      chat: bySection("chat")
    },
    total,
    window: contextWindow > 0
      ? { limit: contextWindow, used: total, percent: Math.round((total / contextWindow) * 100), over: total > contextWindow }
      : null,
    lore: lore
      ? { activated: lore.activated.length, skipped: lore.skipped.length, tokens: loreTokens, budget, overBudget: budget > 0 && loreTokens > budget }
      : null,
    text: segments.map((segment) => segment.text).join("\n\n")
  };
}
