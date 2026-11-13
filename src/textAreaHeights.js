const HEIGHT_SUFFIX = "px";
const MIN_HEIGHT = 60;
const MAX_HEIGHT = 720;

export function clampHeight(px, { min = MIN_HEIGHT, max = MAX_HEIGHT } = {}) {
  return Math.min(max, Math.max(min, Math.round(Number(px) || 0)));
}

export function readHeights(raw, { minHeight = MIN_HEIGHT, maxHeight = MAX_HEIGHT } = {}) {
  let parsed;

  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    return {};
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return {};
  }

  const heights = {};

  for (const [key, value] of Object.entries(parsed)) {
    if (typeof key !== "string" || !/^[a-z-]{1,40}$/.test(key)) {
      continue;
    }

    if (typeof value !== "number" || !Number.isFinite(value)) {
      continue;
    }

    const height = clampHeight(value, { min: minHeight, max: maxHeight });

    if (height) {
      heights[key] = height;
    }
  }

  return heights;
}

export function applyHeight(element, height) {
  if (!element || !height) {
    return;
  }

  element.style.height = `${height}${HEIGHT_SUFFIX}`;
}

export function serializeHeights(heights) {
  try {
    return JSON.stringify(heights);
  } catch {
    return "{}";
  }
}
