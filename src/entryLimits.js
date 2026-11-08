import { getTextStats } from "./utils.js";
import { estimateTokens } from "./tokenizer/client.js";

export const LIMIT_LABELS = {
  tokenLimit: "Token limit",
  charLimit: "Character limit"
};

export function checkEntryLimits(entry, tokenCount = null) {
  const stats = getTextStats(entry.content);
  const measured = tokenCount ? tokenCount(entry.content) : null;
  const tokens = Number.isFinite(measured) ? measured : estimateTokens(entry.content);
  const issues = [];

  if (Number.isFinite(entry.tokenLimit) && entry.tokenLimit > 0 && tokens > entry.tokenLimit) {
    issues.push({
      code: "tokenLimit",
      label: LIMIT_LABELS.tokenLimit,
      field: "entry-content",
      entryId: entry.id,
      entryTitle: entry.title.trim() || "Untitled entry",
      message: `${tokens} tokens exceeds the ${entry.tokenLimit} limit.`
    });
  }

  if (Number.isFinite(entry.charLimit) && entry.charLimit > 0 && stats.chars > entry.charLimit) {
    issues.push({
      code: "charLimit",
      label: LIMIT_LABELS.charLimit,
      field: "entry-content",
      entryId: entry.id,
      entryTitle: entry.title.trim() || "Untitled entry",
      message: `${stats.chars} characters exceeds the ${entry.charLimit} limit.`
    });
  }

  return issues;
}

export function checkBookLimits(book, tokenCount = null) {
  const issues = [];

  for (const entry of book?.entries ?? []) {
    issues.push(...checkEntryLimits(entry, tokenCount));
  }

  return issues;
}
