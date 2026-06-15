import type { ConversationMessage, PersonaDeskState } from "./types";

export interface CompanionMessageInput {
  characterId: string;
  text: string;
  source?: ConversationMessage["source"];
  sourceEventId?: string | null;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function deterministicReply(characterName: string, text: string, source: ConversationMessage["source"]): string {
  const trimmed = text.trim();

  if (source === "voice-transcript") {
    return `${characterName}: I received this as local transcript text. I can respond here without any model provider or microphone capture.`;
  }

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
  const source = input.source ?? "desktop-companion";
  const sourceEventId = input.sourceEventId ?? null;
  const userMessage: ConversationMessage = {
    id: createId("conversation-user"),
    characterId: character.id,
    speaker: "user",
    text,
    source,
    sourceEventId,
    createdAt: timestamp
  };
  const characterMessage: ConversationMessage = {
    id: createId("conversation-character"),
    characterId: character.id,
    speaker: "character",
    text: deterministicReply(character.name, text, source),
    source,
    sourceEventId,
    createdAt: timestamp
  };

  return {
    ...state,
    conversationMessages: [...state.conversationMessages, userMessage, characterMessage]
  };
}

function taskReactionText(characterName: string, runStatus: string, taskTitle: string): string {
  if (runStatus === "blocked") {
    return `${characterName}: I saw "${taskTitle}" pause for permission. I will stay nearby while you decide what scope to grant. No model provider was called.`;
  }

  if (runStatus === "delivered") {
    return `${characterName}: I saw "${taskTitle}" land as delivered. I am here while you review the result and any memory candidate. No model provider was called.`;
  }

  return `${characterName}: I noticed "${taskTitle}" changed state. I am keeping this as local desktop context.`;
}

export function addTaskRunCompanionReactions(state: PersonaDeskState, runId: string): PersonaDeskState {
  const run = state.taskRuns.find((item) => item.id === runId);
  const task = run ? state.tasks.find((item) => item.id === run.taskId) : undefined;

  if (!run || !task) {
    return state;
  }

  const alreadyReacted = new Set(
    state.conversationMessages
      .filter((message) => message.source === "task-reaction" && message.sourceEventId === run.id)
      .map((message) => message.characterId)
  );
  const timestamp = nowIso();
  const reactions = state.characters
    .filter((character) => {
      const boundary = state.roleBoundaries[character.roleBoundaryId];

      return (
        character.kind === "emotional" &&
        boundary?.canObserveTasks &&
        boundary.canCommentInTaskRoom &&
        !character.proactiveBehavior.doNotDisturb &&
        !alreadyReacted.has(character.id)
      );
    })
    .map<ConversationMessage>((character) => ({
      id: createId("conversation-task-reaction"),
      characterId: character.id,
      speaker: "character",
      text: taskReactionText(character.name, run.status, task.title),
      source: "task-reaction",
      sourceEventId: run.id,
      createdAt: timestamp
    }));

  if (reactions.length === 0) {
    return state;
  }

  return {
    ...state,
    conversationMessages: [...state.conversationMessages, ...reactions]
  };
}
