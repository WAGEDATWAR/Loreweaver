export const ENTRY_TEMPLATES = [
  {
    id: "character",
    name: "Character",
    description: "Appearance, personality, history, and relationships.",
    title: "New character",
    keys: ["character name"],
    content: "## Appearance\n\n## Personality\n\n## Background\n\n## Relationships\n"
  },
  {
    id: "location",
    name: "Location",
    description: "A place with atmosphere, landmarks, and hidden details.",
    title: "New location",
    keys: ["location name"],
    content: "## Overview\n\n## Atmosphere\n\n## Notable places\n\n## Secrets\n"
  },
  {
    id: "faction",
    name: "Faction",
    description: "Goals, structure, and relationships with other groups.",
    title: "New faction",
    keys: ["faction name"],
    content: "## Overview\n\n## Goals\n\n## Structure\n\n## Relations\n"
  },
  {
    id: "item",
    name: "Item",
    description: "An object with history, powers, and an owner.",
    title: "New item",
    keys: ["item name"],
    content: "## Description\n\n## History\n\n## Powers\n\n## Owner\n"
  },
  {
    id: "event",
    name: "Event",
    description: "A pivotal moment with causes, participants, and fallout.",
    title: "New event",
    keys: ["event name"],
    content: "## Summary\n\n## Causes\n\n## Participants\n\n## Aftermath\n"
  }
];

export function getEntryTemplate(id) {
  return ENTRY_TEMPLATES.find((template) => template.id === id) ?? null;
}

export function buildTemplatePatch(template) {
  if (!template) {
    return null;
  }

  return {
    title: template.title,
    keys: [...template.keys],
    content: template.content
  };
}

export const CARD_TEMPLATES = [
  {
    id: "card-character",
    name: "Roleplay character",
    description: "A character with a description, personality, scenario and opening message.",
    patch: {
      description: "{{char}} is a ...\n\nAppearance: \nBackground: \nGoals: ",
      personality: "",
      scenario: "{{char}} and {{user}} meet at ...",
      firstMessage: "*{{char}} looks up as {{user}} approaches.* \"...\"",
      exampleMessages: "<START>\n{{user}}: Hello.\n{{char}}: \"...\""
    }
  },
  {
    id: "card-narrator",
    name: "Narrator / game master",
    description: "A narrator that runs the scene instead of speaking as one character.",
    patch: {
      description: "{{char}} is the narrator and game master of an interactive story. {{char}} describes the world, plays every non-player character and never acts for {{user}}.",
      scenario: "The story begins in ...",
      firstMessage: "*The scene opens on ...*",
      systemPrompt: "Narrate in the second person. Keep replies to a few paragraphs and end on a choice or a question for {{user}}.",
      talkativeness: 0.7
    }
  },
  {
    id: "card-companion",
    name: "Companion",
    description: "A conversational companion with a stable voice and short replies.",
    patch: {
      description: "{{char}} is a warm, curious companion who remembers what {{user}} shares.",
      personality: "friendly, attentive, a little playful",
      firstMessage: "Hi {{user}}! How was your day?",
      exampleMessages: "<START>\n{{user}}: I had a rough day.\n{{char}}: That sounds hard. Want to talk about it?"
    }
  }
];

export function getCardTemplate(id) {
  return CARD_TEMPLATES.find((template) => template.id === id) ?? null;
}
