import { createInitialState } from "./defaultState";
import type { CloudUploadApproval, ObservationSession, PersonaDeskState } from "./types";

const STORAGE_VERSION = 2;
const STORAGE_KEY = "personadesk-state";

interface StorageEnvelope {
  version: number;
  state: PersonaDeskState;
}

export function serializeState(state: PersonaDeskState): string {
  const envelope: StorageEnvelope = {
    version: STORAGE_VERSION,
    state
  };

  return JSON.stringify(envelope);
}

export function deserializeState(serialized: string | null): PersonaDeskState {
  if (!serialized) {
    return createInitialState();
  }

  try {
    const parsed = JSON.parse(serialized) as Partial<StorageEnvelope>;

    if (!parsed.state) {
      return createInitialState();
    }

    if (parsed.version === STORAGE_VERSION) {
      return normalizeState(parsed.state);
    }

    if (parsed.version === 1) {
      return normalizeState(parsed.state);
    }

    return createInitialState();
  } catch {
    return createInitialState();
  }
}

function isCloudUploadApproval(value: unknown): value is CloudUploadApproval {
  return (
    typeof value === "object" &&
    value !== null &&
    "summaryId" in value &&
    "disclosure" in value &&
    "approvedAt" in value
  );
}

function normalizeObservationSession(session: ObservationSession): ObservationSession {
  return {
    ...session,
    cloudUploadApprovals: Array.isArray(session.cloudUploadApprovals)
      ? session.cloudUploadApprovals.filter(isCloudUploadApproval)
      : []
  };
}

function normalizeState(state: PersonaDeskState): PersonaDeskState {
  return {
    ...state,
    observationSessions: Array.isArray(state.observationSessions)
      ? state.observationSessions.map(normalizeObservationSession)
      : []
  };
}

export function loadState(storage: Storage = window.localStorage): PersonaDeskState {
  return deserializeState(storage.getItem(STORAGE_KEY));
}

export function saveState(state: PersonaDeskState, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, serializeState(state));
}
