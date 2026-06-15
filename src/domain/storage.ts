import { createInitialState } from "./defaultState";
import type {
  Character,
  CloudUploadApproval,
  ConversationMessage,
  Executor,
  ExecutorConfiguration,
  MemoryCandidate,
  MemoryItem,
  ObservationSession,
  PersonaDeskState,
  RoleBoundary,
  SyncProfile,
  Task,
  TaskRun,
  VoiceRequest
} from "./types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function arrayOrEmpty<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function mergeById<T extends { id: string }>(persisted: unknown, defaults: T[]): T[] {
  const persistedItems = arrayOrEmpty<T>(persisted);
  const persistedIds = new Set(persistedItems.map((item) => item.id));
  const missingDefaults = defaults.filter((item) => !persistedIds.has(item.id));

  return [...persistedItems, ...missingDefaults];
}

function defaultConfiguration(): ExecutorConfiguration {
  return {
    endpoint: "",
    model: "",
    secretRef: "",
    notes: "",
    configuredAt: null
  };
}

function normalizeExecutors(persisted: unknown, defaults: Executor[]): Executor[] {
  const defaultById = new Map(defaults.map((executor) => [executor.id, executor]));

  return mergeById<Executor>(persisted, defaults).map((executor) => ({
    ...executor,
    configuration: {
      ...(defaultById.get(executor.id)?.configuration ?? defaultConfiguration()),
      ...(isRecord(executor.configuration) ? executor.configuration : {})
    }
  }));
}

function normalizeConversationMessages(persisted: unknown): ConversationMessage[] {
  return arrayOrEmpty<ConversationMessage>(persisted).map((message) => ({
    ...message,
    sourceEventId: message.sourceEventId ?? null
  }));
}

function normalizeTasks(persisted: unknown): Task[] {
  return arrayOrEmpty<Task>(persisted).map((task) => ({
    ...task,
    allowedExecutorIds: Array.isArray(task.allowedExecutorIds) && task.allowedExecutorIds.length > 0
      ? task.allowedExecutorIds
      : ["local-planner"]
  }));
}

function normalizeTaskRuns(persisted: unknown): TaskRun[] {
  return arrayOrEmpty<TaskRun>(persisted).map((run) => ({
    ...run,
    acceptance:
      isRecord(run.acceptance)
        ? {
            status:
              run.acceptance.status === "accepted" || run.acceptance.status === "revision-requested"
                ? run.acceptance.status
                : "pending",
            note: typeof run.acceptance.note === "string" ? run.acceptance.note : "Awaiting final user acceptance.",
            decidedAt: typeof run.acceptance.decidedAt === "string" ? run.acceptance.decidedAt : null
          }
        : run.status === "delivered"
          ? {
              status: "pending",
              note: "Awaiting final user acceptance.",
              decidedAt: null
            }
          : null
  }));
}

function mergeRoleBoundaries(persisted: unknown, defaults: Record<string, RoleBoundary>): Record<string, RoleBoundary> {
  return {
    ...defaults,
    ...(isRecord(persisted) ? (persisted as Record<string, RoleBoundary>) : {})
  };
}

function mergeList(persisted: unknown, defaults: string[]): string[] {
  return Array.from(new Set([...defaults, ...arrayOrEmpty<string>(persisted)]));
}

function mergeSyncProfile(persisted: unknown, defaults: SyncProfile): SyncProfile {
  if (!isRecord(persisted)) {
    return defaults;
  }

  const profile = persisted as Partial<SyncProfile>;

  return {
    ...defaults,
    ...profile,
    allowedDataClasses: mergeList(profile.allowedDataClasses, defaults.allowedDataClasses),
    localOnlyClasses: mergeList(profile.localOnlyClasses, defaults.localOnlyClasses)
  };
}

function normalizeState(state: PersonaDeskState): PersonaDeskState {
  const defaults = createInitialState();

  return {
    ...defaults,
    ...state,
    characters: mergeById<Character>(state.characters, defaults.characters),
    characterDrafts: arrayOrEmpty(state.characterDrafts),
    roleBoundaries: mergeRoleBoundaries(state.roleBoundaries, defaults.roleBoundaries),
    executors: normalizeExecutors(state.executors, defaults.executors),
    tasks: normalizeTasks(state.tasks),
    taskRuns: normalizeTaskRuns(state.taskRuns),
    memories: arrayOrEmpty<MemoryItem>(state.memories),
    memoryCandidates: arrayOrEmpty<MemoryCandidate>(state.memoryCandidates),
    conversationMessages: normalizeConversationMessages(state.conversationMessages),
    voiceRequests: arrayOrEmpty<VoiceRequest>(state.voiceRequests),
    observationSessions: arrayOrEmpty<ObservationSession>(state.observationSessions).map(normalizeObservationSession),
    syncProfile: mergeSyncProfile(state.syncProfile, defaults.syncProfile)
  };
}

export function loadState(storage: Storage = window.localStorage): PersonaDeskState {
  return deserializeState(storage.getItem(STORAGE_KEY));
}

export function saveState(state: PersonaDeskState, storage: Storage = window.localStorage): void {
  storage.setItem(STORAGE_KEY, serializeState(state));
}
