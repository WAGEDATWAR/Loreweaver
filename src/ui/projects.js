import { routeHref } from "../views.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const ICONS = {
  book: ["M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5V5.5Z", "M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5V5.5Z"],
  card: ["M4 5h16v14H4z", "M8 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0", "M7 16c.5-1.5 1.5-2 3-2s2.5.5 3 2", "M15 9h2", "M15 13h2"],
  copy: ["M9 9h11v11H9z", "M15 5V4H4v11h1"],
  pin: ["M9 4h6l-1 6 3 3H7l3-3-1-6Z", "M12 13v7"],
  trash: ["M4 7h16", "M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2", "m6 7 1 13h10l1-13"]
};

function icon(name) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.7");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");

  for (const d of ICONS[name]) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }

  return svg;
}

function span(className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function plural(count, one, many) {
  return `${count} ${count === 1 ? one : many}`;
}

function subtitle(item) {
  if (item.kind === "book") {
    const parts = [plural(item.entries, "entry", "entries"), `~${item.tokens} tokens`];

    if (item.budget > 0) {
      parts.push(`budget ${item.budget}`);
    }

    return parts.join(" · ");
  }

  const parts = [`~${item.tokens} tokens`];
  parts.push(item.linkedBook ? `book: ${item.linkedBook}` : "no linked lorebook");
  return parts.join(" · ");
}

function createTile(item, activeIds, pinnedIds, selection) {
  const row = document.createElement("div");
  const link = document.createElement("a");
  const thumb = document.createElement("span");
  const body = document.createElement("span");
  const actions = document.createElement("div");
  const kindLabel = item.kind === "book" ? "Lorebook" : "Character card";

  row.setAttribute("role", "listitem");
  row.className = "project-tile";
  row.dataset.kind = item.kind;

  const pinned = pinnedIds.has(item.id);

  if (pinned) {
    row.classList.add("is-pinned");
  }

  if (activeIds.has(item.id)) {
    row.classList.add("is-recent");
  }

  link.className = "project-open";
  link.href = routeHref(item.kind, item.id);
  link.dataset.projectId = item.id;
  link.dataset.projectKind = item.kind;

  thumb.className = "project-thumb";

  if (item.kind === "card" && item.avatarDataUrl) {
    const img = document.createElement("img");
    img.alt = "";
    img.src = item.avatarDataUrl;
    thumb.append(img);
  } else {
    thumb.append(icon(item.kind));
  }

  body.className = "project-body";
  body.append(span("project-kind", kindLabel), span("project-name", item.name), span("project-sub", subtitle(item)));

  const excerpt = (item.description ?? "").trim();

  if (excerpt) {
    body.append(span("project-excerpt", excerpt));
  }

  const meta = document.createElement("span");
  meta.className = "project-meta";

  for (const tag of item.tags.slice(0, 3)) {
    meta.append(span("project-tag", tag));
  }

  if (item.issues) {
    meta.append(span("project-issues", plural(item.issues, "issue", "issues")));
  }

  if (meta.childElementCount) {
    body.append(meta);
  }

  link.append(thumb, body);
  actions.className = "project-actions";

  for (const [action, label, name] of [["pin", pinned ? "Unpin" : "Pin", "pin"], ["duplicate", "Duplicate", "copy"], ["delete", "Delete", "trash"]]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = action === "delete" ? "icon-btn danger" : "icon-btn";
    button.dataset.projectAction = action;
    button.dataset.projectKind = item.kind;
    button.dataset.projectId = item.id;
    button.title = `${label} ${item.name}`;
    button.setAttribute("aria-label", `${label} ${kindLabel.toLowerCase()} ${item.name}`);

    if (action === "pin") {
      button.setAttribute("aria-pressed", String(pinned));
    }
    button.append(icon(name));
    actions.append(button);
  }

  if (selection.active) {
    const label = document.createElement("label");
    const box = document.createElement("input");

    label.className = "project-select";
    box.type = "checkbox";
    box.dataset.projectId = item.id;
    box.dataset.projectSelect = "1";
    box.checked = selection.ids.has(item.id);
    box.setAttribute("aria-label", `Select ${kindLabel.toLowerCase()} ${item.name}`);
    label.append(box);
    row.classList.add("is-selecting");
    row.classList.toggle("is-selected", box.checked);
    row.append(label);
  }

  row.append(link, actions);
  return row;
}

export function renderProjectList(refs, items, { total, hasFilters, recentIds = new Set(), pinnedIds = new Set(), tags = [], tag = "", selecting = false, selectedIds = new Set() }) {
  const selection = { active: selecting, ids: selectedIds };
  refs.projectList.replaceChildren(...items.map((item) => createTile(item, recentIds, pinnedIds, selection)));

  const options = [new Option("All tags", ""), ...tags.map(({ tag: name, count }) => new Option(`${name} (${count})`, name))];
  refs.hubTag.replaceChildren(...options);
  refs.hubTag.value = tags.some((entry) => entry.tag === tag) ? tag : "";
  refs.hubCount.textContent = String(items.length);
  refs.hubEmpty.hidden = items.length > 0;

  if (items.length) {
    return;
  }

  if (total === 0) {
    refs.hubEmptyText.textContent = "Nothing here yet. Create a lorebook or a character card, or import a file to begin.";
    refs.hubEmptyClear.hidden = true;
  } else {
    refs.hubEmptyText.textContent = hasFilters ? "Nothing matches the current search and filters." : "Nothing here yet.";
    refs.hubEmptyClear.hidden = !hasFilters;
  }
}
