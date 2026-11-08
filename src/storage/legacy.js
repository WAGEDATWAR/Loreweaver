import { legacyKeyToCurrent } from "./namespace.js";

// Renames the old `lorebook-studio:*` preference and project keys in place so
// existing installs keep their layout, filters, onboarding state, backups, and
// revisions after the Loreweaver rename. Runs before any preference is read.
export function migrateLegacyLocalStorage(storage = globalThis.localStorage) {
  let keys = [];

  try {
    keys = Object.keys(storage);
  } catch {
    return { migrated: 0 };
  }

  let migrated = 0;

  for (const key of keys) {
    const currentKey = legacyKeyToCurrent(key);

    if (!currentKey) {
      continue;
    }

    try {
      if (storage.getItem(currentKey) === null) {
        const value = storage.getItem(key);

        if (value !== null) {
          storage.setItem(currentKey, value);
          migrated += 1;
        }
      }

      storage.removeItem(key);
    } catch {
      continue;
    }
  }

  return { migrated };
}
