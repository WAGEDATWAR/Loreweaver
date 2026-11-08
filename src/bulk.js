import { estimateTokens } from "./tokenizer/client.js";

export function measureEntry(entry, tokenCount = null) {
  const measured = tokenCount ? tokenCount(entry.content) : null;
  return Number.isFinite(measured) ? measured : estimateTokens(entry.content);
}

export function selectEntriesByTokenSize(book, {
  min = 0,
  max = null,
  includeDisabled = true,
  tokenCount = null
} = {}) {
  const low = Math.max(0, Math.round(Number(min) || 0));
  const high = max === null || max === "" || !Number.isFinite(Number(max))
    ? Infinity
    : Math.max(low, Math.round(Number(max)));
  const entries = book?.entries ?? [];

  return entries
    .filter((entry) => includeDisabled || entry.enabled)
    .map((entry) => ({ entry, tokens: measureEntry(entry, tokenCount) }))
    .filter((item) => item.tokens >= low && item.tokens <= high)
    .sort((left, right) => right.tokens - left.tokens)
    .map((item) => item.entry);
}

export function summarizeSizes(entries, tokenCount = null) {
  const sizes = entries.map((entry) => measureEntry(entry, tokenCount));
  const total = sizes.reduce((sum, value) => sum + value, 0);

  return {
    count: sizes.length,
    total,
    longest: sizes.length ? Math.max(...sizes) : 0,
    shortest: sizes.length ? Math.min(...sizes) : 0
  };
}
