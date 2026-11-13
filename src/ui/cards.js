import { getActiveCard, getCards, getRecentEntries, getState } from "../store.js";

function cardLabel(card) {
  return card.name.trim() || "Untitled card";
}

export function renderRecentList(refs) {
  if (!refs.recentList || !refs.recentSection) {
    return;
  }

  const recent = getRecentEntries();
  refs.recentList.replaceChildren();

  if (!recent.length) {
    refs.recentList.hidden = true;
    refs.recentSection.hidden = true;
    return;
  }

  refs.recentList.hidden = false;
  refs.recentSection.hidden = false;
  const fragment = document.createDocumentFragment();

  for (const item of recent) {
    const row = document.createElement("div");
    row.setAttribute("role", "listitem");

    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-item";
    button.dataset.recentEntryId = item.id;
    button.textContent = item.title;
    row.append(button);
    fragment.append(row);
  }

  refs.recentList.append(fragment);
}

export function renderCardList(refs) {
  const cards = getCards();
  const active = getActiveCard();
  refs.cardCount.textContent = String(cards.length);
  refs.cardList.replaceChildren();

  if (!cards.length) {
    const empty = document.createElement("p");
    empty.className = "card-list-empty";
    empty.setAttribute("role", "listitem");
    empty.textContent = "No cards yet. Add one to bundle a character with its book.";
    refs.cardList.append(empty);
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const card of cards) {
    const item = document.createElement("div");
    const avatar = document.createElement("span");
    const main = document.createElement("span");
    const name = document.createElement("span");
    const meta = document.createElement("span");

    item.className = "card-item";
    item.dataset.cardId = card.id;
    item.tabIndex = 0;
    item.setAttribute("role", "listitem");
    item.setAttribute("aria-selected", String(card.id === active?.id));

    if (card.id === active?.id) {
      item.classList.add("is-active");
      item.setAttribute("aria-current", "true");
    }

    avatar.className = "card-item-avatar";

    if (card.avatarDataUrl) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = card.avatarDataUrl;
      avatar.append(img);
    }

    main.className = "card-item-main";
    name.className = "card-item-name";
    name.textContent = cardLabel(card);
    meta.className = "card-item-meta";
    const linked = card.bookId
      ? getState().books.find((book) => book.id === card.bookId)?.name ?? "Linked book gone"
      : "No linked book";
    meta.textContent = card.tags?.length ? `${linked} · ${card.tags.slice(0, 3).join(", ")}` : linked;
    main.append(name, meta);
    item.append(avatar, main);
    item.title = cardLabel(card);
    fragment.append(item);
  }

  refs.cardList.append(fragment);
}

const SEVERITY_LABELS = { error: "Error", warning: "Warning", info: "Note" };

function setGreetingRowState(container) {
  const rows = [...container.querySelectorAll(".greeting-row")];

  rows.forEach((row, index) => {
    row.querySelector("textarea").setAttribute("aria-label", `${container.dataset.label} ${index + 1}`);
    row.querySelector("[data-greeting-up]").disabled = index === 0;
    row.querySelector("[data-greeting-down]").disabled = index === rows.length - 1;
  });
}

function createGreetingRow(container, value) {
  const row = document.createElement("div");
  const area = document.createElement("textarea");
  const actions = document.createElement("div");

  row.className = "greeting-row";
  area.rows = 3;
  area.value = value;
  actions.className = "greeting-actions";

  for (const [attribute, label, glyph] of [
    ["data-greeting-up", "Move up", "↑"],
    ["data-greeting-down", "Move down", "↓"],
    ["data-greeting-remove", "Remove", "×"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-btn";
    button.setAttribute(attribute, "");
    button.setAttribute("aria-label", `${label} ${container.dataset.label.toLowerCase()}`);
    button.title = label;
    button.textContent = glyph;
    actions.append(button);
  }

  row.append(area, actions);
  return row;
}

export function renderGreetingList(container, values, label) {
  container.dataset.label = label;
  container.replaceChildren(...values.map((value) => createGreetingRow(container, value)));
  setGreetingRowState(container);
}

export function addGreetingRow(container, value = "") {
  const row = createGreetingRow(container, value);
  container.append(row);
  setGreetingRowState(container);
  row.querySelector("textarea").focus();
}

export function handleGreetingClick(container, target) {
  const row = target.closest(".greeting-row");

  if (!row || !container.contains(row)) {
    return false;
  }

  if (target.closest("[data-greeting-remove]")) {
    row.remove();
  } else if (target.closest("[data-greeting-up]") && row.previousElementSibling) {
    row.previousElementSibling.before(row);
  } else if (target.closest("[data-greeting-down]") && row.nextElementSibling) {
    row.nextElementSibling.after(row);
  } else {
    return false;
  }

  setGreetingRowState(container);
  return true;
}

export function readGreetingList(container) {
  return [...container.querySelectorAll("textarea")].map((area) => area.value).filter((value) => value.trim());
}

export function renderCardSummary(refs, report, issues) {
  refs.cardTokensAlways.textContent = String(report.always);
  refs.cardTokensExamples.textContent = String(report.examples);
  refs.cardTokensOpening.textContent = String(report.opening);
  refs.cardTokensTotal.textContent = String(report.total);

  const badges = {
    "card-description": report.fields.description,
    "card-personality": report.fields.personality,
    "card-scenario": report.fields.scenario,
    "card-first-message": report.fields.firstMessage,
    "card-example-messages": report.fields.exampleMessages,
    "card-system-prompt": report.fields.systemPrompt,
    "card-post-history": report.fields.postHistoryInstructions,
    "card-depth-prompt": report.fields.depthPrompt
  };

  for (const badge of refs.cardDialog.querySelectorAll("[data-token-for]")) {
    const value = badges[badge.dataset.tokenFor];
    badge.textContent = value ? `${value} tokens` : "";
  }

  refs.cardAltTokens.textContent = report.fields.alternateGreetings ? `${report.fields.alternateGreetings} tokens` : "";
  refs.cardGroupTokens.textContent = report.fields.groupOnlyGreetings ? `${report.fields.groupOnlyGreetings} tokens` : "";
  refs.cardIssues.replaceChildren();

  if (!issues.length) {
    const ok = document.createElement("li");
    ok.className = "card-issue is-ok";
    ok.textContent = "No problems found.";
    refs.cardIssues.append(ok);
    return;
  }

  for (const issue of issues) {
    const item = document.createElement("li");
    const tag = document.createElement("strong");
    item.className = `card-issue is-${issue.severity}`;
    tag.textContent = SEVERITY_LABELS[issue.severity];
    item.append(tag, document.createTextNode(` ${issue.message}`));
    refs.cardIssues.append(item);
  }
}

export function renderCardAvatar(refs, dataUrl) {
  refs.cardAvatar.replaceChildren();

  if (dataUrl) {
    const img = document.createElement("img");
    img.alt = "Card image";
    img.src = dataUrl;
    refs.cardAvatar.append(img);
  }

  refs.cardAvatarRemove.hidden = !dataUrl;
}

export function fillCardForm(refs, card) {
  refs.cardName.value = card?.name ?? "";
  refs.cardNickname.value = card?.nickname ?? "";
  refs.cardDescription.value = card?.description ?? "";
  refs.cardPersonality.value = card?.personality ?? "";
  refs.cardScenario.value = card?.scenario ?? "";
  refs.cardFirstMessage.value = card?.firstMessage ?? "";
  refs.cardExampleMessages.value = card?.exampleMessages ?? "";
  refs.cardSystemPrompt.value = card?.systemPrompt ?? "";
  refs.cardPostHistory.value = card?.postHistoryInstructions ?? "";
  refs.cardCreator.value = card?.creator ?? "";
  refs.cardVersion.value = card?.characterVersion ?? "";
  refs.cardCreatorNotes.value = card?.creatorNotes ?? "";
  refs.cardDepthPrompt.value = card?.depthPrompt?.prompt ?? "";
  refs.cardDepthDepth.value = String(card?.depthPrompt?.depth ?? 4);
  refs.cardDepthRole.value = card?.depthPrompt?.role ?? "system";
  refs.cardTalkativeness.value = String(card?.talkativeness ?? 0.5);
  refs.cardTalkativenessOutput.textContent = Number(refs.cardTalkativeness.value).toFixed(2);
  refs.cardTagChips.setKeys(card?.tags ?? []);
  renderGreetingList(refs.cardAltGreetings, card?.alternateGreetings ?? [], "Alternate greeting");
  renderGreetingList(refs.cardGroupGreetings, card?.groupOnlyGreetings ?? [], "Group greeting");
  refs.cardAdvanced.open = Boolean(
    card?.groupOnlyGreetings?.length || card?.depthPrompt?.prompt || (card?.talkativeness ?? 0.5) !== 0.5
  );
  renderCardAvatar(refs, card?.avatarDataUrl ?? "");

  const options = [{ value: "", label: "No linked lorebook" }];

  for (const book of getState().books) {
    options.push({ value: book.id, label: book.name.trim() || "Untitled Lorebook" });
  }

  refs.cardLinkBook.replaceChildren(...options.map((option) => {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    return element;
  }));
  refs.cardLinkBook.value = card?.bookId ?? "";
}

export function readCardForm(refs) {
  const depth = Number.parseInt(refs.cardDepthDepth.value, 10);

  return {
    name: refs.cardName.value,
    nickname: refs.cardNickname.value,
    description: refs.cardDescription.value,
    personality: refs.cardPersonality.value,
    scenario: refs.cardScenario.value,
    firstMessage: refs.cardFirstMessage.value,
    alternateGreetings: readGreetingList(refs.cardAltGreetings),
    groupOnlyGreetings: readGreetingList(refs.cardGroupGreetings),
    exampleMessages: refs.cardExampleMessages.value,
    systemPrompt: refs.cardSystemPrompt.value,
    postHistoryInstructions: refs.cardPostHistory.value,
    creator: refs.cardCreator.value,
    characterVersion: refs.cardVersion.value,
    creatorNotes: refs.cardCreatorNotes.value,
    tags: refs.cardTagChips.getKeys(),
    depthPrompt: {
      prompt: refs.cardDepthPrompt.value,
      depth: Number.isFinite(depth) ? depth : 4,
      role: refs.cardDepthRole.value
    },
    talkativeness: Number(refs.cardTalkativeness.value),
    bookId: refs.cardLinkBook.value || null
  };
}
