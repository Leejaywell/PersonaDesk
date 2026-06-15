import type { ConversationMessage, PersonaDeskState } from "./types";

export interface CompanionMessageInput {
  characterId: string;
  text: string;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function deterministicReply(characterName: string, text: string): string {
  const trimmed = text.trim();

  if (trimmed.endsWith("?")) {
    return `${characterName}: I can stay with this and reflect it back locally. No model provider was called.`;
  }

  if (trimmed.toLowerCase().includes("remember")) {
    return `${characterName}: I heard a memory-shaped note. I can only keep it long-term after you confirm it in Memory Center.`;
  }

  return `${characterName}: I am here with you. I will keep this as local desktop conversation context.`;
}

export function sendCompanionMessage(state: PersonaDeskState, input: CompanionMessageInput): PersonaDeskState {
  const character = state.characters.find((item) => item.id === input.characterId);
  const text = input.text.trim();

  if (!character || character.kind !== "emotional" || !text) {
    return state;
  }

  const timestamp = nowIso();
  const userMessage: ConversationMessage = {
    id: createId("conversation-user"),
    characterId: character.id,
    speaker: "user",
    text,
    source: "desktop-companion",
    createdAt: timestamp
  };
  const characterMessage: ConversationMessage = {
    id: createId("conversation-character"),
    characterId: character.id,
    speaker: "character",
    text: deterministicReply(character.name, text),
    source: "desktop-companion",
    createdAt: timestamp
  };

  return {
    ...state,
    conversationMessages: [...state.conversationMessages, userMessage, characterMessage]
  };
}
