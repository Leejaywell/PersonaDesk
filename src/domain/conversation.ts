import { proposeMemoryCandidate } from "./memory";
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
    return `${characterName}: I received this as local transcript text. I can respond here without any model provider call.`;
  }

  if (trimmed.endsWith("?")) {
    return `${characterName}: I can stay with this and reflect it back locally. No model provider was called.`;
  }

  if (trimmed.toLowerCase().includes("remember")) {
    return `${characterName}: I heard a memory-shaped note. I can only keep it long-term after you confirm it in Memory Center.`;
  }

  return `${characterName}: I am here with you. I will keep this as local desktop conversation context.`;
}

function memoryCandidateText(text: string): string | null {
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();
  const memorySignals = ["remember", "prefers", "prefer", "likes", "like", "usually", "important"];

  if (!memorySignals.some((signal) => lower.includes(signal))) {
    return null;
  }

  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

function proposeCompanionMemoryIfUseful(
  state: PersonaDeskState,
  characterId: string,
  sourceEventId: string,
  text: string,
  reason: string
): PersonaDeskState {
  const candidateText = memoryCandidateText(text);

  if (!candidateText) {
    return state;
  }

  return proposeMemoryCandidate(state, {
    layer: "character-private",
    ownerCharacterId: characterId,
    text: candidateText,
    source: sourceEventId,
    sensitivity: "low",
    reason
  });
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

  const nextState = {
    ...state,
    conversationMessages: [...state.conversationMessages, userMessage, characterMessage]
  };

  return proposeCompanionMemoryIfUseful(
    nextState,
    character.id,
    userMessage.id,
    text,
    "Companion identified a relationship or preference note. User confirmation is required before long-term memory write."
  );
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

function observationReactionText(characterName: string, appName: string, summary: string): string {
  return `${characterName}: I noticed ${appName} locally: "${summary}". I can stay with this observation inside your allowlist; no raw screen frames were stored or uploaded.`;
}

export function addObservationSummaryCompanionReactions(state: PersonaDeskState, sessionId: string): PersonaDeskState {
  const session = state.observationSessions.find((item) => item.id === sessionId);

  if (!session) {
    return state;
  }

  const alreadyReacted = new Set(
    state.conversationMessages
      .filter((message) => message.source === "observation-reaction")
      .map((message) => `${message.characterId}:${message.sourceEventId}`)
  );
  const eligibleCharacters = state.characters.filter((character) => {
    const boundary = state.roleBoundaries[character.roleBoundaryId];

    return (
      character.kind === "emotional" &&
      boundary?.canAccessObservationSummaries &&
      character.proactiveBehavior.triggers.includes("observation-note") &&
      !character.proactiveBehavior.doNotDisturb
    );
  });

  if (eligibleCharacters.length === 0) {
    return state;
  }

  const timestamp = nowIso();
  const reactions = session.localSummaryStream.flatMap((summary) =>
    eligibleCharacters
      .filter((character) => !alreadyReacted.has(`${character.id}:${summary.id}`))
      .map<ConversationMessage>((character) => ({
        id: createId("conversation-observation-reaction"),
        characterId: character.id,
        speaker: "character",
        text: observationReactionText(character.name, summary.appName, summary.summary),
        source: "observation-reaction",
        sourceEventId: summary.id,
        createdAt: timestamp
      }))
  );

  if (reactions.length === 0) {
    return state;
  }

  const nextState = {
    ...state,
    conversationMessages: [...state.conversationMessages, ...reactions]
  };

  return reactions.reduce((current, reaction) => {
    const summary = session.localSummaryStream.find((item) => item.id === reaction.sourceEventId);

    return proposeCompanionMemoryIfUseful(
      current,
      reaction.characterId,
      reaction.sourceEventId ?? reaction.id,
      summary?.summary ?? reaction.text,
      "Observation companion identified a possible preference from an allowlisted local summary. User confirmation is required before long-term memory write."
    );
  }, nextState);
}

export function proposeCompanionMemory(
  state: PersonaDeskState,
  characterId: string,
  sourceEventId: string,
  text: string,
  reason: string
): PersonaDeskState {
  return proposeCompanionMemoryIfUseful(state, characterId, sourceEventId, text, reason);
}

export function appendConversationMessage(
  state: PersonaDeskState,
  message: Omit<ConversationMessage, "id" | "createdAt">
): { state: PersonaDeskState; message: ConversationMessage } {
  const fullMessage: ConversationMessage = {
    ...message,
    id: createId(message.speaker === "user" ? "conversation-user" : "conversation-character"),
    createdAt: nowIso()
  };
  return {
    state: {
      ...state,
      conversationMessages: [...state.conversationMessages, fullMessage]
    },
    message: fullMessage
  };
}

export function updateConversationMessageText(
  state: PersonaDeskState,
  messageId: string,
  newText: string
): PersonaDeskState {
  return {
    ...state,
    conversationMessages: state.conversationMessages.map((msg) =>
      msg.id === messageId ? { ...msg, text: newText } : msg
    )
  };
}

