import { createInitialState } from "./defaultState";
import type { PersonaDeskState } from "./types";

const STORAGE_VERSION = 1;
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

    if (parsed.version !== STORAGE_VERSION || !parsed.state) {
      return createInitialState();
    }

    return parsed.state;
  } catch {
    return createInitialState();
  }
}

export function loadState(storage: Storage = window.localStorage): PersonaDeskState {
  return deserializeState(storage.getItem(STORAGE_KEY));
}

export function saveState(state: PersonaDeskState, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, serializeState(state));
}
