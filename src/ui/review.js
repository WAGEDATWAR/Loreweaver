import { VALIDATION_LABELS } from "../validation.js";
import { CARD_ISSUE_LABELS } from "../cardValidation.js";

const number = new Intl.NumberFormat();

function el(tag, className, text) {
  const node = document.createElement(tag);

  if (className) {
    node.className = className;
  }

  if (text !== undefined) {
    node.textContent = text;
  }

  return node;
}

function stat(label, value, over = false) {
  const block = el("div", `review-stat${over ? " is-over" : ""}`);
  block.append(el("span", "review-stat-value", value), el("span", "review-stat-label", label));
  return block;
}

function section(title, id) {
  const node = el("section", "page-section");
  const head = el("div", "page-section-head");
  const heading = el("h3", "", title);

  node.setAttribute("aria-labelledby", id);
  heading.id = id;
  head.append(heading);
  node.append(head);
  return node;
}

function limitText(limit, prefix) {
  return `${prefix}${number.format(limit.used)} of ${number.format(limit.limit)}${limit.over ? " (over)" : ""}`;
}

function issueList(issues, describe) {
  const list = el("div", "review-issues");

  if (!issues.length) {
    list.append(el("p", "validation-empty", "Everything looks good."));
    return list;
  }

  for (const issue of issues) {
    const { label, title, dataset } = describe(issue);
    const button = el("button", "validation-issue");
    const head = el("span", "validation-issue-head");

    button.type = "button";
    Object.assign(button.dataset, dataset);
    head.append(el("span", "validation-issue-type", label));

    if (title) {
      head.append(el("span", "validation-issue-entry", title));
    }

    button.append(head, el("span", "validation-issue-message", issue.message));
    list.append(button);
  }

  return list;
}

export function renderBookReview(root, review, { name, approximate }) {
  const { overview } = review;
  const prefix = approximate ? "~" : "";
  const stats = el("div", "review-stats");

  stats.append(
    stat("Entries", `${overview.enabled} of ${overview.entries} enabled`),
    stat("Tokens (enabled)", `${prefix}${number.format(overview.enabledTotals.tokens)}`),
    stat("Trigger coverage", `${Math.round(overview.coverage * 100)}%`),
    stat("Always on", number.format(overview.alwaysOn)),
    stat("Missing keys", number.format(overview.missingKeys), overview.missingKeys > 0),
    stat("Shared keys", number.format(overview.sharedKeys))
  );

  if (review.budget) {
    stats.append(stat("Token budget", limitText(review.budget, prefix), review.budget.over));
  }

  if (review.context) {
    stats.append(stat("Context window", limitText(review.context, prefix), review.context.over));
  }

  const overviewSection = section(`Overview of ${name}`, "review-overview-title");
  overviewSection.append(stats);

  if (overview.longestEntry) {
    overviewSection.append(el("p", "hint", `Longest entry: ${overview.longestEntry.title} (${prefix}${number.format(overview.longestEntry.tokens)} tokens)`));
  }

  const issuesSection = section(`Issues (${review.issues.length})`, "review-issues-title");
  issuesSection.append(issueList(review.issues, (issue) => ({
    label: issue.label ?? VALIDATION_LABELS[issue.code] ?? issue.code,
    title: issue.entryTitle,
    dataset: { reviewEntry: issue.entryId }
  })));

  const simulateSection = section("Simulation", "review-simulation-title");
  const simulate = el("button", "btn", "Open context simulation");
  simulate.type = "button";
  simulate.id = "review-simulate-btn";
  simulateSection.append(el("p", "hint", "Paste a chat excerpt to see which entries activate and what is injected."), simulate);

  root.replaceChildren(overviewSection, issuesSection, simulateSection);
}

export function renderCardReview(root, review, { name, approximate }) {
  const { tokens } = review;
  const prefix = approximate ? "~" : "";
  const stats = el("div", "review-stats");

  stats.append(
    stat("Sent every turn", `${prefix}${number.format(tokens.always)} of ${number.format(review.permanentLimit)} advised`, review.permanentOver),
    stat("Example messages", `${prefix}${number.format(tokens.examples)}`),
    stat("Opening message", `${prefix}${number.format(tokens.opening)}`),
    stat("Total", `${prefix}${number.format(tokens.total)}`)
  );

  const overviewSection = section(`Overview of ${name}`, "review-overview-title");
  overviewSection.append(stats);

  const issuesSection = section(`Checks (${review.issues.length})`, "review-issues-title");
  issuesSection.append(issueList(review.issues, (issue) => ({
    label: `${issue.severity === "error" ? "Error" : issue.severity === "warning" ? "Warning" : "Note"}: ${CARD_ISSUE_LABELS[issue.code] ?? issue.code}`,
    title: "",
    dataset: { reviewField: issue.field }
  })));

  root.replaceChildren(overviewSection, issuesSection);
}
