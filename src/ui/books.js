import { getState } from "../store.js";

function bookLabel(book) {
  return book.name.trim() || "Untitled Lorebook";
}

export function renderBookList(refs) {
  const state = getState();
  const books = state.books;
  refs.bookCount.textContent = String(books.length);
  refs.bookList.replaceChildren();

  const fragment = document.createDocumentFragment();

  for (const book of books) {
    const row = document.createElement("div");
    const button = document.createElement("button");
    const name = document.createElement("span");
    const meta = document.createElement("span");
    const active = book.id === state.activeBookId;

    row.setAttribute("role", "listitem");
    button.type = "button";
    button.className = "book-item";
    button.dataset.bookId = book.id;
    name.className = "book-item-name";
    name.textContent = bookLabel(book);
    meta.className = "book-item-meta";

    const parts = [`${book.entries.length} ${book.entries.length === 1 ? "entry" : "entries"}`];

    if (book.tokenBudget > 0) {
      parts.push(`${book.tokenBudget} token budget`);
    }

    if (book.tags.length) {
      parts.push(book.tags.slice(0, 3).join(", "));
    }

    meta.textContent = parts.join(" · ");
    button.append(name, meta);
    button.title = bookLabel(book);

    if (active) {
      button.classList.add("is-active");
      button.setAttribute("aria-current", "true");
    }

    row.append(button);
    fragment.append(row);
  }

  refs.bookList.append(fragment);
}
