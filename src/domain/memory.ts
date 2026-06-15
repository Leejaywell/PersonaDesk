import type { MemoryCandidate, MemoryItem, MemoryLayer, PersonaDeskState, Sensitivity } from "./types";

export interface MemoryCandidateInput {
  layer: MemoryLayer;
  ownerCharacterId: string | null;
  text: string;
  source: string;
  sensitivity: Sensitivity;
  reason: string;
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

export function confirmMemoryCandidate(state: PersonaDeskState, candidateId: string): PersonaDeskState {
  const candidate = state.memoryCandidates.find((item) => item.id === candidateId);

  if (!candidate) {
    return state;
  }

  const timestamp = nowIso();
  const memory: MemoryItem = {
    id: createId("memory"),
    layer: candidate.proposedLayer,
    ownerCharacterId: candidate.proposedOwnerCharacterId,
    text: candidate.proposedText,
    source: candidate.sourceEvent,
    sensitivity: candidate.sensitivity,
    createdAt: timestamp,
    updatedAt: timestamp,
    syncPolicy: candidate.sensitivity === "high" ? "local-only" : "sync-allowed"
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
