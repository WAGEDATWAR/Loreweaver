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
    meta.textContent = card.bookId
      ? getState().books.find((book) => book.id === card.bookId)?.name ?? "Linked book gone"
      : "No linked book";
    main.append(name, meta);
    item.append(avatar, main);
    item.title = cardLabel(card);
    fragment.append(item);
  }

  refs.cardList.append(fragment);
}

export function fillCardForm(refs, card) {
  refs.cardName.value = card?.name ?? "";
  refs.cardPersonality.value = card?.personality ?? "";
  refs.cardScenario.value = card?.scenario ?? "";
  refs.cardFirstMessage.value = card?.firstMessage ?? "";
  refs.cardExampleMessages.value = card?.exampleMessages ?? "";
  refs.cardSystemPrompt.value = card?.systemPrompt ?? "";
  refs.cardPostHistory.value = card?.postHistoryInstructions ?? "";
  refs.cardCreator.value = card?.creator ?? "";
  refs.cardVersion.value = card?.characterVersion ?? "";
  refs.cardCreatorNotes.value = card?.creatorNotes ?? "";
  refs.cardAvatar.replaceChildren();

  if (card?.avatarDataUrl) {
    const img = document.createElement("img");
    img.alt = "Card image";
    img.src = card.avatarDataUrl;
    refs.cardAvatar.append(img);
  }

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
  return {
    name: refs.cardName.value,
    personality: refs.cardPersonality.value,
    scenario: refs.cardScenario.value,
    firstMessage: refs.cardFirstMessage.value,
    exampleMessages: refs.cardExampleMessages.value,
    systemPrompt: refs.cardSystemPrompt.value,
    postHistoryInstructions: refs.cardPostHistory.value,
    creator: refs.cardCreator.value,
    characterVersion: refs.cardVersion.value,
    creatorNotes: refs.cardCreatorNotes.value,
    bookId: refs.cardLinkBook.value || null
  };
}
