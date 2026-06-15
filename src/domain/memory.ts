import type { MemoryCandidate, MemoryItem, MemoryLayer, PersonaDeskState, Sensitivity } from "./types";

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
  const timestamp = nowIso();
  const memory: MemoryItem = {
    id: createId("memory"),
    layer: review.layer ?? candidate.proposedLayer,
    ownerCharacterId: validOwnerCharacterId(state, review.ownerCharacterId ?? candidate.proposedOwnerCharacterId),
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
