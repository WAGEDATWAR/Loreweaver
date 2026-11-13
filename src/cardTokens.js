const ALWAYS_SENT = [
  ["description", "Description"],
  ["personality", "Personality"],
  ["scenario", "Scenario"],
  ["systemPrompt", "System prompt"],
  ["postHistoryInstructions", "Post-history instructions"]
];

export const CARD_PERMANENT_WARN_TOKENS = 1500;

function sum(list) {
  return list.reduce((total, value) => total + value, 0);
}

/**
 * Token cost of a card by when a frontend sends it: "always" every turn, "examples" dialogue examples,
 * and "opening" the greeting. `count` is the shared tokenizer function.
 */
export function buildCardTokenReport(card, count) {
  const fields = {};

  for (const [key] of ALWAYS_SENT) {
    fields[key] = count(card[key] ?? "");
  }

  fields.depthPrompt = count(card.depthPrompt?.prompt ?? "");
  fields.exampleMessages = count(card.exampleMessages ?? "");
  fields.firstMessage = count(card.firstMessage ?? "");
  fields.alternateGreetings = sum((card.alternateGreetings ?? []).map((greeting) => count(greeting)));
  fields.groupOnlyGreetings = sum((card.groupOnlyGreetings ?? []).map((greeting) => count(greeting)));

  const always = sum([...ALWAYS_SENT.map(([key]) => fields[key]), fields.depthPrompt]);

  return {
    fields,
    always,
    examples: fields.exampleMessages,
    opening: fields.firstMessage,
    total: always + fields.exampleMessages + fields.firstMessage
  };
}
