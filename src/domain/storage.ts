import { createInitialState } from "./defaultState";
import type {
  Character,
  CloudUploadApproval,
  ConversationMessage,
  DesktopPresenceAudit,
  Executor,
  ExecutorCall,
  ExecutorCallStatus,
  ExecutorDispatchKind,
  ExecutorType,
  ExecutorConfiguration,
  ExecutorHealthCheck,
  MemoryCandidate,
  MemoryItem,
  ObservationBoundaryViolation,
  ObservationSession,
  ObservationSummary,
  PersonaDeskState,
  RoleBoundary,
  SyncProfile,
  Task,
  TaskPriority,
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

function isObservationBoundaryViolation(value: unknown): value is ObservationBoundaryViolation {
  return (
    typeof value === "object" &&
    value !== null &&
    "appName" in value &&
    "reason" in value &&
    "createdAt" in value
  );
}

function normalizeObservationBoundaryViolation(value: ObservationBoundaryViolation): ObservationBoundaryViolation {
  const legacyPreview = (value as ObservationBoundaryViolation & { ignoredSummaryPreview?: unknown }).ignoredSummaryPreview;

  return {
    id: value.id,
    appName: value.appName,
    reason: value.reason,
    discardedSummaryCharacters:
      typeof value.discardedSummaryCharacters === "number"
        ? value.discardedSummaryCharacters
        : typeof legacyPreview === "string"
          ? legacyPreview.length
          : 0,
    createdAt: value.createdAt
  };
}

function normalizeObservationSummary(value: ObservationSummary): ObservationSummary {
  return {
    id: value.id,
    appName: value.appName,
    source: value.source === "runtime-screen-capture" ? "runtime-screen-capture" : "manual-summary",
    summary: value.summary,
    captureDisclosure:
      value.captureDisclosure ??
      "Observation summary was restored from an older local state. PersonaDesk stored text only and captured no raw screen frames.",
    frameWidth: typeof value.frameWidth === "number" ? value.frameWidth : null,
    frameHeight: typeof value.frameHeight === "number" ? value.frameHeight : null,
    createdAt: value.createdAt
  };
}

function normalizeObservationSession(session: ObservationSession): ObservationSession {
  return {
    ...session,
    localSummaryStream: Array.isArray(session.localSummaryStream)
      ? session.localSummaryStream.map(normalizeObservationSummary)
      : [],
    boundaryViolations: Array.isArray(session.boundaryViolations)
      ? session.boundaryViolations.filter(isObservationBoundaryViolation).map(normalizeObservationBoundaryViolation)
      : [],
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

function normalizeVoiceRequests(persisted: unknown): VoiceRequest[] {
  return arrayOrEmpty<VoiceRequest>(persisted).map((request) => {
    const inputSource = request.inputSource === "runtime-speech-recognition" ? request.inputSource : "manual-text";
    const kind = request.kind === "tts-preview" ? request.kind : "asr-transcript";

    return {
      ...request,
      inputSource,
      routeTarget:
        request.routeTarget === "companion" || request.routeTarget === "task-goal"
          ? request.routeTarget
          : "audit-only",
      playbackStatus: request.playbackStatus ?? "not-requested",
      playbackDisclosure:
        request.playbackDisclosure ??
        (request.kind === "tts-preview"
          ? "Speech playback has not been requested yet."
          : "Playback does not apply to ASR transcript requests."),
      playedAt: request.playedAt ?? null,
      captureDisclosure:
        request.captureDisclosure ??
        (kind === "tts-preview"
          ? "Capture disclosure does not apply to TTS preview requests."
          : "Transcript text was entered manually. No microphone audio was captured.")
    };
  });
}

function normalizeTasks(persisted: unknown): Task[] {
  return arrayOrEmpty<Task>(persisted).map((task) => ({
    ...task,
    priority: normalizeTaskPriority(task.priority),
    deadline: typeof task.deadline === "string" && task.deadline.trim() ? task.deadline : null,
    allowedExecutorIds: Array.isArray(task.allowedExecutorIds) && task.allowedExecutorIds.length > 0
      ? task.allowedExecutorIds
      : ["local-planner"]
  }));
}

function normalizeTaskPriority(priority: unknown): TaskPriority {
  return priority === "low" || priority === "high" || priority === "urgent" ? priority : "normal";
}

const executorCallStatuses: ExecutorCallStatus[] = ["succeeded", "failed", "skipped", "blocked"];
const executorDispatchKinds: ExecutorDispatchKind[] = [
  "local-deterministic",
  "model-api",
  "local-model",
  "local-agent",
  "provider-slot"
];
const executorTypes: ExecutorType[] = ["model-api", "local-model", "local-agent", "asr", "tts", "vision", "deterministic"];

function normalizeExecutorCall(value: unknown): ExecutorCall | null {
  if (!isRecord(value)) {
    return null;
  }

  const executorId = typeof value.executorId === "string" ? value.executorId : "";
  const purpose = typeof value.purpose === "string" ? value.purpose : "Executor dispatch";

  if (!executorId) {
    return null;
  }

  return {
    executorId,
    executorType:
      typeof value.executorType === "string" && executorTypes.includes(value.executorType as ExecutorType)
        ? (value.executorType as ExecutorType)
        : "deterministic",
    characterId: typeof value.characterId === "string" ? value.characterId : "orion",
    purpose,
    status:
      typeof value.status === "string" && executorCallStatuses.includes(value.status as ExecutorCallStatus)
        ? (value.status as ExecutorCallStatus)
        : "skipped",
    dispatchKind:
      typeof value.dispatchKind === "string" && executorDispatchKinds.includes(value.dispatchKind as ExecutorDispatchKind)
        ? (value.dispatchKind as ExecutorDispatchKind)
        : "provider-slot",
    startedAt: typeof value.startedAt === "string" ? value.startedAt : "",
    completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    outputSummary:
      typeof value.outputSummary === "string"
        ? value.outputSummary
        : "Legacy executor call restored without a structured output summary.",
    disclosure: typeof value.disclosure === "string" ? value.disclosure : "Legacy executor call restored."
  };
}

function normalizeTaskRuns(persisted: unknown): TaskRun[] {
  return arrayOrEmpty<TaskRun>(persisted).map((run) => ({
    ...run,
    revisionOfRunId: typeof run.revisionOfRunId === "string" ? run.revisionOfRunId : null,
    openIssues: normalizeRunOpenIssues(run),
    executorCalls: arrayOrEmpty(run.executorCalls)
      .map(normalizeExecutorCall)
      .filter((call): call is ExecutorCall => Boolean(call)),
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

function normalizeRunOpenIssues(run: TaskRun): string[] {
  if (Array.isArray(run.openIssues)) {
    return run.openIssues.filter((issue): issue is string => typeof issue === "string" && issue.trim().length > 0);
  }

  if (run.status === "blocked" && Array.isArray(run.approvalRequests) && run.approvalRequests.length > 0) {
    return run.approvalRequests.map((request) => `${request.reason} Requested scope: ${request.requestedScope}.`);
  }

  if (run.status === "blocked" && typeof run.finalSummary === "string" && run.finalSummary.trim()) {
    return [run.finalSummary];
  }

  return [];
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
    voiceRequests: normalizeVoiceRequests(state.voiceRequests),
    desktopPresenceAudits: arrayOrEmpty<DesktopPresenceAudit>(state.desktopPresenceAudits),
    executorHealthChecks: arrayOrEmpty<ExecutorHealthCheck>(state.executorHealthChecks),
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
