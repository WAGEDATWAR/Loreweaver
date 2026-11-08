export const MAX_GRAPH_ROWS = 24;

export function buildActivationGraph(result, { maxRows = MAX_GRAPH_ROWS } = {}) {
  const activated = (result?.activated ?? []).slice(0, maxRows);
  const skipped = (result?.skipped ?? []).slice(0, maxRows);
  const longest = [...activated, ...skipped]
    .reduce((max, item) => Math.max(max, String(item.entry?.title ?? "").length, 1), 1);

  return {
    activated: activated.map((item, index) => ({
      id: item.entry.id,
      title: item.entry.title.trim() || "Untitled entry",
      order: item.entry.order,
      reason: item.reason,
      rank: index + 1,
      width: Math.max(6, Math.round((String(item.entry.title).length / longest) * 100))
    })),
    skipped: skipped.map((item) => ({
      id: item.entry.id,
      title: item.entry.title.trim() || "Untitled entry",
      reason: item.reason,
      width: Math.max(6, Math.round((String(item.entry.title).length / longest) * 100))
    })),
    activatedTotal: result?.activated?.length ?? 0,
    skippedTotal: result?.skipped?.length ?? 0
  };
}
