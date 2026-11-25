import { createId } from "./utils.js";

/**
 * Editable views of the card data a frontend reads but the main editor does not model: the attached world
 * name, the favourite flag, regex scripts (SillyTavern `extensions.regex_scripts`), V3 assets, source links
 * and multilingual creator notes. Everything stays inside the card's preserved buckets
 * (`extensions.cardExtensions` and `extensions.sourceFields`, I-2). Each edited item keeps the fields the
 * editor does not show, so a round trip through the editor never loses data.
 */

export const REGEX_PLACEMENTS = Object.freeze([
  { value: 1, label: "User input" },
  { value: 2, label: "AI output" },
  { value: 3, label: "Slash commands" },
  { value: 5, label: "Lorebook content" },
  { value: 6, label: "Reasoning" }
]);

export const ASSET_TYPES = Object.freeze(["icon", "background", "user_icon", "emotion"]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function text(value) {
  return typeof value === "string" ? value : "";
}

function depth(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
}

function readScript(raw) {
  const source = isRecord(raw) ? raw : {};

  return {
    raw: structuredClone(source),
    scriptName: text(source.scriptName),
    findRegex: text(source.findRegex),
    replaceString: text(source.replaceString),
    trimStrings: Array.isArray(source.trimStrings) ? source.trimStrings.filter((item) => typeof item === "string") : [],
    placement: Array.isArray(source.placement) ? source.placement.filter((item) => Number.isInteger(item)) : [],
    disabled: source.disabled === true,
    markdownOnly: source.markdownOnly === true,
    promptOnly: source.promptOnly === true,
    runOnEdit: source.runOnEdit === true,
    minDepth: depth(source.minDepth),
    maxDepth: depth(source.maxDepth)
  };
}

function readAsset(raw) {
  const source = isRecord(raw) ? raw : {};

  return { raw: structuredClone(source), type: text(source.type), name: text(source.name), uri: text(source.uri), ext: text(source.ext) };
}

export function createRegexScript(newId = () => createId("regex")) {
  return { ...readScript({ id: newId(), placement: [2] }), raw: { id: newId() } };
}

export function createAsset() {
  return readAsset({ type: "icon", name: "main", ext: "png" });
}

export function readCardExtras(extensions) {
  const bucket = isRecord(extensions?.cardExtensions) ? extensions.cardExtensions : {};
  const source = isRecord(extensions?.sourceFields) ? extensions.sourceFields : {};
  const notes = isRecord(source.creator_notes_multilingual) ? source.creator_notes_multilingual : {};

  return {
    world: text(bucket.world),
    fav: bucket.fav === true || bucket.fav === "true",
    regexScripts: Array.isArray(bucket.regex_scripts) ? bucket.regex_scripts.map(readScript) : [],
    assets: Array.isArray(source.assets) ? source.assets.map(readAsset) : [],
    sources: Array.isArray(source.source) ? source.source.filter((item) => typeof item === "string") : [],
    notes: Object.entries(notes).filter(([, value]) => typeof value === "string").map(([lang, value]) => ({ lang, text: value }))
  };
}

function writeScript(script, newId) {
  const raw = script.raw ?? {};
  const next = {
    ...raw,
    id: raw.id ?? newId(),
    scriptName: script.scriptName,
    findRegex: script.findRegex,
    replaceString: script.replaceString,
    placement: [...script.placement]
  };

  for (const key of ["disabled", "markdownOnly", "promptOnly", "runOnEdit"]) {
    if (script[key] || key in raw) {
      next[key] = script[key];
    } else {
      delete next[key];
    }
  }

  if (script.trimStrings.length || "trimStrings" in raw) {
    next.trimStrings = [...script.trimStrings];
  }

  for (const key of ["minDepth", "maxDepth"]) {
    if (script[key] === null) {
      if (next[key] !== null) {
        delete next[key];
      }
    } else {
      next[key] = script[key];
    }
  }

  return next;
}

/** Returns a new card `extensions` object with the edited extras written into the preserved buckets. */
export function applyCardExtras(extensions, extras, { newId = () => createId("regex") } = {}) {
  const base = isRecord(extensions) ? structuredClone(extensions) : {};
  const bucket = isRecord(base.cardExtensions) ? base.cardExtensions : {};
  const source = isRecord(base.sourceFields) ? base.sourceFields : {};
  const setOrDrop = (target, key, value, keep) => {
    if (keep) {
      target[key] = value;
    } else {
      delete target[key];
    }
  };

  setOrDrop(bucket, "world", extras.world.trim(), extras.world.trim() !== "");
  setOrDrop(bucket, "fav", extras.fav, extras.fav || "fav" in bucket);
  setOrDrop(bucket, "regex_scripts", extras.regexScripts.map((script) => writeScript(script, newId)), extras.regexScripts.length > 0);
  setOrDrop(source, "assets", extras.assets.map((asset) => ({ ...asset.raw, type: asset.type, name: asset.name, uri: asset.uri, ext: asset.ext })), extras.assets.length > 0);
  setOrDrop(source, "source", extras.sources.filter((item) => item.trim()), extras.sources.some((item) => item.trim()));

  const notes = Object.fromEntries(extras.notes.filter((note) => note.lang.trim()).map((note) => [note.lang.trim(), note.text]));
  setOrDrop(source, "creator_notes_multilingual", notes, Object.keys(notes).length > 0);

  base.cardExtensions = bucket;
  base.sourceFields = source;
  return base;
}

/** How a regex script's find pattern is read: `/pattern/flags`, or a bare pattern. */
export function compileFindRegex(value) {
  const input = String(value ?? "");
  const wrapped = /^\/([\s\S]*)\/([a-z]*)$/.exec(input);

  try {
    return { ok: true, regex: wrapped ? new RegExp(wrapped[1], wrapped[2]) : new RegExp(input) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

export function hasCardExtras(extras) {
  return Boolean(extras.world || extras.fav || extras.regexScripts.length || extras.assets.length || extras.sources.length || extras.notes.length);
}

/** Problems a frontend would trip over. `{ code, message }` each; the card checks surface them. */
export function checkCardExtras(extras) {
  const issues = [];

  extras.regexScripts.forEach((script, index) => {
    const label = script.scriptName.trim() || `Regex script ${index + 1}`;

    if (!script.findRegex.trim()) {
      issues.push({ code: "empty-regex-script", message: `${label} has no find pattern, so it never matches.` });
      return;
    }

    const compiled = compileFindRegex(script.findRegex);

    if (!compiled.ok) {
      issues.push({ code: "bad-regex-script", message: `${label}: the find pattern is not a valid regular expression (${compiled.error}).` });
    }

    if (!script.placement.length) {
      issues.push({ code: "regex-script-no-placement", message: `${label} is not applied anywhere; pick at least one placement.` });
    }
  });

  extras.assets.forEach((asset, index) => {
    const label = asset.name.trim() || `Asset ${index + 1}`;

    if (!asset.uri.trim()) {
      issues.push({ code: "asset-no-uri", message: `${label} has no URI.` });
    } else if (/^\s*javascript:/i.test(asset.uri)) {
      issues.push({ code: "asset-unsafe-uri", message: `${label} points at a script URI; frontends may refuse or run it.` });
    }
  });

  return issues;
}
