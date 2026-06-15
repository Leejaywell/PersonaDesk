import type { Character, MemoryCandidate, MemoryItem, MemoryLayer, PersonaDeskState, Sensitivity } from "./types";

export interface MemoryCandidateInput {
  layer: MemoryLayer;
  ownerCharacterId: string | null;
  text: string;
  source: string;
  sensitivity: Sensitivity;
  reason: string;
}

export interface MemoryCandidateReview {
  layer?: MemoryLayer;
  ownerCharacterId?: string | null;
  text?: string;
  sensitivity?: Sensitivity;
  syncPolicy?: MemoryItem["syncPolicy"];
}

export interface MemoryContextRequest {
  characterId: string;
  taskId?: string | null;
  includeHighSensitivity?: boolean;
  limit?: number;
}

export interface MemoryContextPreviewItem {
  id: string;
  layer: MemoryLayer;
  text: string;
  reason: string;
}

export interface MemoryContextExcludedItem {
  id: string;
  layer: MemoryLayer;
  reason: string;
}

export interface MemoryContextPreview {
  characterId: string;
  taskId: string | null;
  included: MemoryContextPreviewItem[];
  excluded: MemoryContextExcludedItem[];
  disclosure: string;
}

type MemoryContextState = Pick<PersonaDeskState, "characters" | "memories" | "taskRuns">;

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function proposeMemoryCandidate(
  state: PersonaDeskState,
  input: MemoryCandidateInput
): PersonaDeskState {
  const candidate: MemoryCandidate = {
    id: createId("memory-candidate"),
    proposedLayer: input.layer,
    proposedOwnerCharacterId: input.ownerCharacterId,
    proposedText: input.text.trim(),
    sourceEvent: input.source,
    sensitivity: input.sensitivity,
    reason: input.reason.trim(),
    status: "pending"
  };

  if (!candidate.proposedText) {
    return state;
  }

  return {
    ...state,
    memoryCandidates: [...state.memoryCandidates, candidate]
  };
}

function validOwnerCharacterId(state: PersonaDeskState, ownerCharacterId: string | null | undefined): string | null {
  if (!ownerCharacterId) {
    return null;
  }

  return state.characters.some((character) => character.id === ownerCharacterId) ? ownerCharacterId : null;
}

export function canUseSharedMemoryOwner(layer: MemoryLayer): boolean {
  return layer !== "character-private";
}

export function canCharacterOwnMemoryLayer(character: Character, layer: MemoryLayer): boolean {
  if (layer === "character-private") {
    return character.memoryPermissionProfile.some((permission) =>
      ["relationship", "preferences", "observation-summaries", "character-private"].includes(permission)
    );
  }

  if (layer === "task") {
    return character.memoryPermissionProfile.includes("task");
  }

  if (layer === "shared-world") {
    return character.memoryPermissionProfile.includes("shared-world");
  }

  return false;
}

export function canWriteMemoryLayer(
  state: PersonaDeskState,
  layer: MemoryLayer,
  ownerCharacterId: string | null
): boolean {
  if (!ownerCharacterId) {
    return canUseSharedMemoryOwner(layer);
  }

  const owner = state.characters.find((character) => character.id === ownerCharacterId);

  return Boolean(owner && canCharacterOwnMemoryLayer(owner, layer));
}

function taskRunIdsForTask(state: MemoryContextState, taskId: string | null | undefined): Set<string> {
  return new Set(state.taskRuns.filter((run) => run.taskId === taskId).map((run) => run.id));
}

function readableMemoryReason(
  state: MemoryContextState,
  character: Character,
  memory: MemoryItem,
  taskId: string | null | undefined,
  includeHighSensitivity: boolean
): string | null {
  if (memory.sensitivity === "high" && !includeHighSensitivity) {
    return null;
  }

  if (memory.layer === "user-profile") {
    return "User profile memory is shared into role context after confirmation.";
  }

  if (memory.layer === "shared-world") {
    return character.memoryPermissionProfile.includes("shared-world")
      ? "Shared-world memory is available to roles with shared-world memory permission."
      : null;
  }

  if (memory.layer === "character-private") {
    return memory.ownerCharacterId === character.id ? "Private memory belongs to this character." : null;
  }

  if (memory.layer === "task") {
    if (!character.memoryPermissionProfile.includes("task")) {
      return null;
    }

    const taskRunIds = taskRunIdsForTask(state, taskId);
    const memoryComesFromTaskRun = state.taskRuns.some((run) => run.id === memory.source);

    if (taskId && taskRunIds.has(memory.source)) {
      return "Task memory is tied to the selected task run history.";
    }

    if (taskId && memoryComesFromTaskRun) {
      return null;
    }

    if (memory.ownerCharacterId === character.id) {
      return "Task memory belongs to this task character.";
    }

    return character.kind === "task" && !memory.ownerCharacterId
      ? "Shared task memory is available to task characters."
      : null;
  }

  if (memory.layer === "short-term" || memory.layer === "import-summary") {
    return !memory.ownerCharacterId || memory.ownerCharacterId === character.id
      ? `${memory.layer} memory is available within owner scope.`
      : null;
  }

  return null;
}

function exclusionReason(
  state: MemoryContextState,
  character: Character,
  memory: MemoryItem,
  taskId: string | null | undefined,
  includeHighSensitivity: boolean
): string {
  if (memory.sensitivity === "high" && !includeHighSensitivity) {
    return "High-sensitivity memory requires explicit inclusion.";
  }

  if (memory.layer === "character-private") {
    return "Private memory belongs to a different character.";
  }

  if (memory.layer === "shared-world") {
    return "Selected character does not have shared-world memory permission.";
  }

  if (memory.layer === "task") {
    if (!character.memoryPermissionProfile.includes("task")) {
      return "Selected character does not have task memory permission.";
    }

    const taskRunIds = taskRunIdsForTask(state, taskId);

    if (taskId && !taskRunIds.has(memory.source)) {
      return "Task memory is not tied to the selected task.";
    }

    return "Selected character is not allowed to receive this task memory.";
  }

  return "Memory is outside the selected character or task scope.";
}

export function buildMemoryContextPreview(
  state: MemoryContextState,
  request: MemoryContextRequest
): MemoryContextPreview {
  const character = state.characters.find((item) => item.id === request.characterId);
  const taskId = request.taskId ?? null;
  const limit = Math.max(1, request.limit ?? 8);

  if (!character) {
    return {
      characterId: request.characterId,
      taskId,
      included: [],
      excluded: state.memories.map((memory) => ({
        id: memory.id,
        layer: memory.layer,
        reason: "Selected character does not exist."
      })),
      disclosure: "Context preview uses confirmed memories only. No model provider was called."
    };
  }

  const includedCandidates: MemoryContextPreviewItem[] = [];
  const excluded: MemoryContextExcludedItem[] = [];

  for (const memory of state.memories) {
    const reason = readableMemoryReason(state, character, memory, taskId, Boolean(request.includeHighSensitivity));

    if (reason) {
      includedCandidates.push({
        id: memory.id,
        layer: memory.layer,
        text: memory.text,
        reason
      });
      continue;
    }

    excluded.push({
      id: memory.id,
      layer: memory.layer,
      reason: exclusionReason(state, character, memory, taskId, Boolean(request.includeHighSensitivity))
    });
  }

  const included = includedCandidates.slice(-limit);
  const overflow = includedCandidates.slice(0, Math.max(0, includedCandidates.length - limit));

  return {
    characterId: character.id,
    taskId,
    included,
    excluded: [
      ...excluded,
      ...overflow.map((memory) => ({
        id: memory.id,
        layer: memory.layer,
        reason: "Omitted by context limit."
      }))
    ],
    disclosure: "Context preview uses confirmed memories only and does not inject every memory into every model call."
  };
}

function syncPolicyForSensitivity(
  sensitivity: Sensitivity,
  requestedSyncPolicy: MemoryItem["syncPolicy"] | undefined
): MemoryItem["syncPolicy"] {
  if (sensitivity === "high") {
    return "local-only";
  }

  return requestedSyncPolicy ?? "sync-allowed";
}

export function confirmMemoryCandidate(
  state: PersonaDeskState,
  candidateId: string,
  review: MemoryCandidateReview = {}
): PersonaDeskState {
  const candidate = state.memoryCandidates.find((item) => item.id === candidateId);

  if (!candidate) {
    return state;
  }

  const text = (review.text ?? candidate.proposedText).trim();

  if (!text) {
    return state;
  }

  const sensitivity = review.sensitivity ?? candidate.sensitivity;
  const layer = review.layer ?? candidate.proposedLayer;
  const ownerCharacterId = validOwnerCharacterId(state, review.ownerCharacterId ?? candidate.proposedOwnerCharacterId);

  if (!canWriteMemoryLayer(state, layer, ownerCharacterId)) {
    return state;
  }

  const timestamp = nowIso();
  const memory: MemoryItem = {
    id: createId("memory"),
    layer,
    ownerCharacterId,
    text,
    source: candidate.sourceEvent,
    sensitivity,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncPolicy: syncPolicyForSensitivity(sensitivity, review.syncPolicy)
  };

  return {
    ...state,
    memories: [...state.memories, memory],
    memoryCandidates: state.memoryCandidates.filter((item) => item.id !== candidateId)
  };
}

export function rejectMemoryCandidate(state: PersonaDeskState, candidateId: string): PersonaDeskState {
  return {
    ...state,
    memoryCandidates: state.memoryCandidates.filter((item) => item.id !== candidateId)
  };
}

export function deleteMemory(state: PersonaDeskState, memoryId: string): PersonaDeskState {
  return {
    ...state,
    memories: state.memories.filter((item) => item.id !== memoryId)
  };
}
