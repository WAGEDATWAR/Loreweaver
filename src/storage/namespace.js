export const STORAGE_PREFIX = "loreweaver";
export const LEGACY_STORAGE_PREFIX = "lorebook-studio";

export function storageKey(suffix) {
  return `${STORAGE_PREFIX}:${suffix}`;
}

export function legacyKeyToCurrent(key) {
  const prefix = `${LEGACY_STORAGE_PREFIX}:`;

  if (typeof key !== "string" || !key.startsWith(prefix)) {
    return null;
  }

  return `${STORAGE_PREFIX}:${key.slice(prefix.length)}`;
}
