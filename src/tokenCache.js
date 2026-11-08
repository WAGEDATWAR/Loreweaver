export const DEFAULT_CACHE_LIMIT = 20000;

export function hashText(text) {
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `${(hash >>> 0).toString(16)}:${text.length}`;
}

export function createTokenCache(limit = DEFAULT_CACHE_LIMIT) {
  const counts = new Map();
  const stats = { hits: 0, misses: 0, evictions: 0 };

  function evictOverflow() {
    while (counts.size > limit) {
      const oldest = counts.keys().next().value;
      counts.delete(oldest);
      stats.evictions += 1;
    }
  }

  return {
    get(text) {
      const key = hashText(text);

      if (!counts.has(key)) {
        stats.misses += 1;
        return null;
      }

      const value = counts.get(key);
      counts.delete(key);
      counts.set(key, value);
      stats.hits += 1;
      return value;
    },
    has(text) {
      return counts.has(hashText(text));
    },
    set(text, value) {
      if (!Number.isFinite(value)) {
        return;
      }

      const key = hashText(text);
      counts.delete(key);
      counts.set(key, value);
      evictOverflow();
    },
    clear() {
      counts.clear();
    },
    get size() {
      return counts.size;
    },
    stats() {
      return { ...stats, size: counts.size };
    }
  };
}
