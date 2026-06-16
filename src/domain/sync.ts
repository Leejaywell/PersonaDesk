import type {
  AppearanceProfile,
  Character,
  CharacterKind,
  Executor,
  MemoryItem,
  MemoryLayer,
  PersonaDeskState,
  ProactiveBehaviorProfile,
  Sensitivity,
  VoiceProfile
} from "./types";

export interface SyncPreviewItem {
  id: string;
  dataClass: string;
  label: string;
  detail: string;
}

export interface SyncPreviewExcludedItem {
  id: string;
  dataClass: string;
  label: string;
  reason: string;
}

export interface SyncPreview {
  generatedAt: string;
  included: SyncPreviewItem[];
  excluded: SyncPreviewExcludedItem[];
  disclosure: string;
}

export interface LocalSyncPackageItem {
  id: string;
  dataClass: string;
  label: string;
  detail: string;
  payload: unknown;
}

export interface LocalSyncPackage {
  schemaVersion: 1;
  origin: "personadesk-local-sync-package";
  generatedAt: string;
  included: LocalSyncPackageItem[];
  excluded: SyncPreviewExcludedItem[];
  disclosure: string;
}

export interface SyncPackageImportIssue {
  id: string;
  dataClass: string;
  label: string;
  reason: string;
}

export interface SyncPackageImportPreview {
  generatedAt: string;
  status: "ready" | "invalid";
  accepted: SyncPackageImportIssue[];
  conflicts: SyncPackageImportIssue[];
  rejected: SyncPackageImportIssue[];
  disclosure: string;
}

export interface SyncPackageImportApplyResult {
  appliedAt: string;
  status: "applied" | "blocked" | "invalid";
  imported: SyncPackageImportIssue[];
  conflicts: SyncPackageImportIssue[];
  rejected: SyncPackageImportIssue[];
  disclosure: string;
}

const SYNC_PACKAGE_DISCLOSURE =
  "Local sync packages include confirmed role settings, confirmed non-sensitive memory summaries, and non-sensitive configuration only. PersonaDesk does not include raw imports, raw audio, raw screen frames, detailed task logs, endpoints, or secret references.";

function nowIso(): string {
  return new Date().toISOString();
}

function canSyncMemory(memory: MemoryItem): boolean {
  return memory.syncPolicy === "sync-allowed" && memory.sensitivity !== "high";
}

function syncCharacterPayload(character: Character) {
  return {
    id: character.id,
    name: character.name,
    kind: character.kind,
    relationshipTemplate: character.relationshipTemplate,
    customRelationship: character.customRelationship,
    personaSummary: character.personaSummary,
    speakingStyle: character.speakingStyle,
    capabilityProfile: character.capabilityProfile,
    appearance: character.appearance,
    voice: character.voice,
    proactiveBehavior: character.proactiveBehavior,
    memoryPermissionProfile: character.memoryPermissionProfile,
    roleBoundaryId: character.roleBoundaryId,
    defaultExecutorId: character.defaultExecutorId
  };
}

function syncMemoryPayload(memory: MemoryItem) {
  return {
    id: memory.id,
    layer: memory.layer,
    ownerCharacterId: memory.ownerCharacterId,
    text: memory.text,
    source: memory.source,
    sensitivity: memory.sensitivity,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    syncPolicy: memory.syncPolicy
  };
}

function syncExecutorMetadataPayload(executor: Executor) {
  return {
    id: executor.id,
    displayName: executor.displayName,
    type: executor.type,
    capabilities: executor.capabilities,
    modalities: executor.modalities,
    contextLimit: executor.contextLimit,
    costProfile: executor.costProfile,
    latencyProfile: executor.latencyProfile,
    permissionRiskLevel: executor.permissionRiskLevel,
    status: executor.status,
    configuredAt: executor.configuration.configuredAt
  };
}

export function buildSyncPreview(state: PersonaDeskState): SyncPreview {
  const allowedClasses = new Set(state.syncProfile.allowedDataClasses);
  const included: SyncPreviewItem[] = [];
  const excluded: SyncPreviewExcludedItem[] = [];

  if (allowedClasses.has("confirmed-character-definitions")) {
    included.push(
      ...state.characters.map((character) => ({
        id: `character:${character.id}`,
        dataClass: "confirmed-character-definitions",
        label: character.name,
        detail: `${character.kind} character using ${character.relationshipTemplate} relationship template.`
      }))
    );
  }

  for (const memory of state.memories) {
    if (allowedClasses.has("confirmed-memory-summaries") && canSyncMemory(memory)) {
      included.push({
        id: `memory:${memory.id}`,
        dataClass: "confirmed-memory-summaries",
        label: memory.layer,
        detail: memory.text
      });
      continue;
    }

    excluded.push({
      id: `memory:${memory.id}`,
      dataClass: "confirmed-memory-summaries",
      label: memory.layer,
      reason:
        memory.sensitivity === "high"
          ? "High-sensitivity memory remains local-only."
          : `Memory sync policy is ${memory.syncPolicy}.`
    });
  }

  if (allowedClasses.has("non-sensitive-settings")) {
    included.push({
      id: "settings:sync-profile",
      dataClass: "non-sensitive-settings",
      label: "Sync profile",
      detail: `Conflict policy: ${state.syncProfile.conflictPolicy}; status: ${state.syncProfile.lastSyncStatus}.`
    });

    for (const executor of state.executors.filter((item) => item.configuration.configuredAt)) {
      included.push({
        id: `executor-config:${executor.id}`,
        dataClass: "non-sensitive-settings",
        label: executor.displayName,
        detail: `Configured metadata for ${executor.type}; secret reference intentionally omitted.`
      });
    }
  }

  for (const session of state.observationSessions) {
    excluded.push({
      id: `observation:${session.id}`,
      dataClass: "raw-screen-frames",
      label: "Observation session",
      reason: "Raw screen frames and observation streams remain local-only by default."
    });
  }

  for (const run of state.taskRuns) {
    excluded.push({
      id: `task-run:${run.id}`,
      dataClass: "local-agent-logs",
      label: run.finalSummary || run.status,
      reason: "Detailed task execution logs remain local-only by default."
    });
  }

  for (const message of state.conversationMessages) {
    excluded.push({
      id: `conversation:${message.id}`,
      dataClass: "raw-companion-conversations",
      label: message.speaker === "user" ? "User companion message" : "Character companion message",
      reason: "Raw companion conversations remain local-only by default."
    });
  }

  for (const request of state.voiceRequests) {
    excluded.push({
      id: `voice-request:${request.id}`,
      dataClass: "raw-audio",
      label: request.kind === "asr-transcript" ? "ASR transcript request" : "TTS preview request",
      reason: "Voice request text and audio-adjacent audit records remain local-only by default."
    });
  }

  for (const audit of state.desktopPresenceAudits) {
    excluded.push({
      id: `desktop-presence:${audit.id}`,
      dataClass: "desktop-presence-audits",
      label: audit.title,
      reason: "Desktop notification and tray audit records remain local-only by default."
    });
  }

  for (const check of state.executorHealthChecks) {
    excluded.push({
      id: `executor-health:${check.id}`,
      dataClass: "executor-health-checks",
      label: check.displayName,
      reason: "Executor health check audit records remain local-only by default."
    });
  }

  return {
    generatedAt: nowIso(),
    included: state.syncProfile.enabled ? included : [],
    excluded: state.syncProfile.enabled
      ? excluded
      : [
          ...excluded,
          {
            id: "sync:disabled",
            dataClass: "sync-disabled",
            label: "Optional sync",
            reason: "Sync is disabled; no data is prepared for upload."
          }
        ],
    disclosure:
      "This is a local preview only. PersonaDesk does not upload data or store raw secrets in Phase 1."
  };
}

export function buildLocalSyncPackage(state: PersonaDeskState): LocalSyncPackage {
  const preview = buildSyncPreview(state);
  const allowedClasses = new Set(state.syncProfile.allowedDataClasses);
  const included: LocalSyncPackageItem[] = [];

  if (state.syncProfile.enabled && allowedClasses.has("confirmed-character-definitions")) {
    included.push(
      ...state.characters.map((character) => ({
        id: `character:${character.id}`,
        dataClass: "confirmed-character-definitions",
        label: character.name,
        detail: `${character.kind} character using ${character.relationshipTemplate} relationship template.`,
        payload: syncCharacterPayload(character)
      }))
    );
  }

  if (state.syncProfile.enabled && allowedClasses.has("confirmed-memory-summaries")) {
    included.push(
      ...state.memories.filter(canSyncMemory).map((memory) => ({
        id: `memory:${memory.id}`,
        dataClass: "confirmed-memory-summaries",
        label: memory.layer,
        detail: memory.text,
        payload: syncMemoryPayload(memory)
      }))
    );
  }

  if (state.syncProfile.enabled && allowedClasses.has("non-sensitive-settings")) {
    included.push({
      id: "settings:sync-profile",
      dataClass: "non-sensitive-settings",
      label: "Sync profile",
      detail: `Conflict policy: ${state.syncProfile.conflictPolicy}; status: ${state.syncProfile.lastSyncStatus}.`,
      payload: {
        enabled: state.syncProfile.enabled,
        allowedDataClasses: state.syncProfile.allowedDataClasses,
        localOnlyClasses: state.syncProfile.localOnlyClasses,
        conflictPolicy: state.syncProfile.conflictPolicy,
        lastSyncStatus: state.syncProfile.lastSyncStatus
      }
    });

    included.push(
      ...state.executors
        .filter((executor) => executor.configuration.configuredAt)
        .map((executor) => ({
          id: `executor-config:${executor.id}`,
          dataClass: "non-sensitive-settings",
          label: executor.displayName,
          detail: `Configured metadata for ${executor.type}; endpoint and secret reference intentionally omitted.`,
          payload: syncExecutorMetadataPayload(executor)
        }))
    );
  }

  return {
    schemaVersion: 1,
    origin: "personadesk-local-sync-package",
    generatedAt: nowIso(),
    included,
    excluded: preview.excluded,
    disclosure: SYNC_PACKAGE_DISCLOSURE
  };
}

export function serializeLocalSyncPackage(syncPackage: LocalSyncPackage): string {
  return JSON.stringify(syncPackage, null, 2);
}

function isLocalSyncPackage(value: unknown): value is LocalSyncPackage {
  const candidate = value as Partial<LocalSyncPackage>;

  return (
    Boolean(candidate) &&
    candidate.schemaVersion === 1 &&
    candidate.origin === "personadesk-local-sync-package" &&
    Array.isArray(candidate.included) &&
    Array.isArray(candidate.excluded)
  );
}

function parseLocalSyncPackage(packageText: string):
  | { ok: true; syncPackage: LocalSyncPackage }
  | { ok: false; reason: "parse-error" | "unsupported" } {
  let parsed: unknown;

  try {
    parsed = JSON.parse(packageText);
  } catch {
    return { ok: false, reason: "parse-error" };
  }

  if (!isLocalSyncPackage(parsed)) {
    return { ok: false, reason: "unsupported" };
  }

  return { ok: true, syncPackage: parsed };
}

function importIssue(item: LocalSyncPackageItem, reason: string): SyncPackageImportIssue {
  return {
    id: item.id,
    dataClass: item.dataClass,
    label: item.label,
    reason
  };
}

function invalidImportPreview(reason: "parse-error" | "unsupported"): SyncPackageImportPreview {
  if (reason === "parse-error") {
    return {
      generatedAt: nowIso(),
      status: "invalid",
      accepted: [],
      conflicts: [],
      rejected: [
        {
          id: "package:parse-error",
          dataClass: "sync-package",
          label: "Local sync package",
          reason: "Package text is not valid JSON."
        }
      ],
      disclosure: "No import was applied. Package text must pass preflight before accepted items can be imported."
    };
  }

  return {
    generatedAt: nowIso(),
    status: "invalid",
    accepted: [],
    conflicts: [],
    rejected: [
      {
        id: "package:unsupported",
        dataClass: "sync-package",
        label: "Local sync package",
        reason: "Package schema or origin is not recognized."
      }
    ],
    disclosure: "No import was applied. Package text must pass preflight before accepted items can be imported."
  };
}

export function previewLocalSyncPackageImport(state: PersonaDeskState, packageText: string): SyncPackageImportPreview {
  const parsed = parseLocalSyncPackage(packageText);

  if (!parsed.ok) {
    return invalidImportPreview(parsed.reason);
  }

  const accepted: SyncPackageImportIssue[] = [];
  const conflicts: SyncPackageImportIssue[] = [];
  const rejected: SyncPackageImportIssue[] = [];
  const allowedClasses = new Set(state.syncProfile.allowedDataClasses);
  const existingCharacterIds = new Set(state.characters.map((character) => `character:${character.id}`));
  const existingMemoryIds = new Set(state.memories.map((memory) => `memory:${memory.id}`));
  const existingSettingsIds = new Set(["settings:sync-profile", ...state.executors.map((executor) => `executor-config:${executor.id}`)]);

  for (const item of parsed.syncPackage.included) {
    if (!allowedClasses.has(item.dataClass)) {
      rejected.push(importIssue(item, `Data class ${item.dataClass} is not enabled in this profile.`));
      continue;
    }

    if (item.dataClass === "confirmed-character-definitions" && existingCharacterIds.has(item.id)) {
      conflicts.push(importIssue(item, "A character with this id already exists and would require user review."));
      continue;
    }

    if (item.dataClass === "confirmed-memory-summaries" && existingMemoryIds.has(item.id)) {
      conflicts.push(importIssue(item, "A memory with this id already exists and would require user review."));
      continue;
    }

    if (item.dataClass === "non-sensitive-settings" && existingSettingsIds.has(item.id)) {
      conflicts.push(importIssue(item, "A setting with this id already exists and would require user review."));
      continue;
    }

    if (item.dataClass === "non-sensitive-settings") {
      rejected.push(
        importIssue(item, "Applying new non-sensitive settings from sync packages is not supported in Phase 1.")
      );
      continue;
    }

    accepted.push(importIssue(item, "Package item is recognized and can be reviewed for import."));
  }

  return {
    generatedAt: nowIso(),
    status: rejected.length > 0 ? "invalid" : "ready",
    accepted,
    conflicts,
    rejected,
    disclosure:
      "Import preflight validates package contents. PersonaDesk only imports accepted items after the user chooses Apply accepted imports; conflicts stay local-first for review."
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringArray(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
}

function nullableString(value: unknown): string | null | undefined {
  return typeof value === "string" || value === null ? value : undefined;
}

function isAppearanceProfile(value: unknown): value is AppearanceProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.backend === "static" ||
      value.backend === "state-pack" ||
      value.backend === "live2d-reserved" ||
      value.backend === "spine-reserved") &&
    typeof value.avatarLabel === "string" &&
    typeof value.accent === "string" &&
    Boolean(stringArray(value.supportedStates))
  );
}

function isVoiceProfile(value: unknown): value is VoiceProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    nullableString(value.providerId) !== undefined &&
    typeof value.voiceName === "string" &&
    typeof value.speed === "number" &&
    typeof value.emotionalIntensity === "number" &&
    (value.status === "available" ||
      value.status === "configured" ||
      value.status === "unconfigured" ||
      value.status === "missing" ||
      value.status === "disabled")
  );
}

function isProactiveBehaviorProfile(value: unknown): value is ProactiveBehaviorProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.frequency === "quiet" || value.frequency === "balanced" || value.frequency === "expressive") &&
    Boolean(stringArray(value.triggers)) &&
    typeof value.doNotDisturb === "boolean"
  );
}

const characterKinds: CharacterKind[] = ["emotional", "task"];
const memoryLayers: MemoryLayer[] = [
  "user-profile",
  "shared-world",
  "character-private",
  "task",
  "short-term",
  "import-summary"
];
const sensitivities: Sensitivity[] = ["low", "medium", "high"];

function characterFromImportPayload(
  state: PersonaDeskState,
  item: LocalSyncPackageItem
): Character | SyncPackageImportIssue {
  const payload = item.payload;

  if (!isRecord(payload)) {
    return importIssue(item, "Character payload is not an object.");
  }

  const memoryPermissionProfile = stringArray(payload.memoryPermissionProfile);
  const capabilityProfile = stringArray(payload.capabilityProfile);
  const defaultExecutorId = nullableString(payload.defaultExecutorId);

  if (
    typeof payload.id !== "string" ||
    typeof payload.name !== "string" ||
    !characterKinds.includes(payload.kind as CharacterKind) ||
    typeof payload.relationshipTemplate !== "string" ||
    typeof payload.customRelationship !== "string" ||
    typeof payload.personaSummary !== "string" ||
    typeof payload.speakingStyle !== "string" ||
    !capabilityProfile ||
    !isAppearanceProfile(payload.appearance) ||
    !isVoiceProfile(payload.voice) ||
    !isProactiveBehaviorProfile(payload.proactiveBehavior) ||
    !memoryPermissionProfile ||
    typeof payload.roleBoundaryId !== "string" ||
    defaultExecutorId === undefined
  ) {
    return importIssue(item, "Character payload is incomplete or uses unsupported fields.");
  }

  if (!state.roleBoundaries[payload.roleBoundaryId]) {
    return importIssue(item, "Character role boundary is not available on this device.");
  }

  return {
    id: payload.id,
    name: payload.name,
    kind: payload.kind as CharacterKind,
    relationshipTemplate: payload.relationshipTemplate,
    customRelationship: payload.customRelationship,
    personaSummary: payload.personaSummary,
    speakingStyle: payload.speakingStyle,
    capabilityProfile,
    appearance: payload.appearance,
    voice: payload.voice,
    proactiveBehavior: payload.proactiveBehavior,
    memoryPermissionProfile,
    roleBoundaryId: payload.roleBoundaryId,
    defaultExecutorId
  };
}

function memoryFromImportPayload(item: LocalSyncPackageItem): MemoryItem | SyncPackageImportIssue {
  const payload = item.payload;

  if (!isRecord(payload)) {
    return importIssue(item, "Memory payload is not an object.");
  }

  const ownerCharacterId = nullableString(payload.ownerCharacterId);

  if (
    typeof payload.id !== "string" ||
    !memoryLayers.includes(payload.layer as MemoryLayer) ||
    ownerCharacterId === undefined ||
    typeof payload.text !== "string" ||
    typeof payload.source !== "string" ||
    !sensitivities.includes(payload.sensitivity as Sensitivity) ||
    typeof payload.createdAt !== "string" ||
    typeof payload.updatedAt !== "string" ||
    (payload.syncPolicy !== "local-only" && payload.syncPolicy !== "sync-allowed")
  ) {
    return importIssue(item, "Memory payload is incomplete or uses unsupported fields.");
  }

  if (payload.sensitivity === "high" || payload.syncPolicy !== "sync-allowed") {
    return importIssue(item, "Only sync-allowed non-high-sensitivity memory summaries can be imported.");
  }

  return {
    id: payload.id,
    layer: payload.layer as MemoryLayer,
    ownerCharacterId,
    text: payload.text,
    source: payload.source,
    sensitivity: payload.sensitivity as Sensitivity,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
    syncPolicy: payload.syncPolicy
  };
}

export function applyLocalSyncPackageImport(
  state: PersonaDeskState,
  packageText: string
): { state: PersonaDeskState; result: SyncPackageImportApplyResult } {
  const preview = previewLocalSyncPackageImport(state, packageText);

  if (!state.syncProfile.enabled) {
    return {
      state,
      result: {
        appliedAt: nowIso(),
        status: "blocked",
        imported: [],
        conflicts: preview.conflicts,
        rejected: [
          ...preview.rejected,
          {
            id: "sync:disabled",
            dataClass: "sync-disabled",
            label: "Optional sync",
            reason: "Enable optional sync before applying accepted import items."
          }
        ],
        disclosure: "No import was applied because optional sync is disabled."
      }
    };
  }

  if (preview.status === "invalid") {
    return {
      state,
      result: {
        appliedAt: nowIso(),
        status: "invalid",
        imported: [],
        conflicts: preview.conflicts,
        rejected: preview.rejected,
        disclosure: "No import was applied because package preflight failed."
      }
    };
  }

  const parsed = parseLocalSyncPackage(packageText);

  if (!parsed.ok) {
    return {
      state,
      result: {
        appliedAt: nowIso(),
        status: "invalid",
        imported: [],
        conflicts: preview.conflicts,
        rejected: preview.rejected,
        disclosure: "No import was applied because package preflight failed."
      }
    };
  }

  const acceptedIds = new Set(preview.accepted.map((item) => item.id));
  const importedCharacters: Character[] = [];
  const importedMemories: MemoryItem[] = [];
  const imported: SyncPackageImportIssue[] = [];
  const rejected: SyncPackageImportIssue[] = [...preview.rejected];

  for (const item of parsed.syncPackage.included.filter((packageItem) => acceptedIds.has(packageItem.id))) {
    if (item.dataClass === "confirmed-character-definitions") {
      const character = characterFromImportPayload(state, item);

      if ("reason" in character) {
        rejected.push(character);
      } else {
        importedCharacters.push(character);
        imported.push(importIssue(item, "Imported confirmed character definition."));
      }
      continue;
    }

    if (item.dataClass === "confirmed-memory-summaries") {
      const memory = memoryFromImportPayload(item);

      if ("reason" in memory) {
        rejected.push(memory);
      } else {
        importedMemories.push(memory);
        imported.push(importIssue(item, "Imported confirmed memory summary."));
      }
      continue;
    }

    rejected.push(importIssue(item, "Applying this non-sensitive settings item is not supported yet."));
  }

  const nextState: PersonaDeskState =
    imported.length > 0
      ? {
          ...state,
          characters: [...state.characters, ...importedCharacters],
          memories: [...state.memories, ...importedMemories],
          syncProfile: {
            ...state.syncProfile,
            lastSyncStatus: preview.conflicts.length > 0 || rejected.length > 0 ? "conflict" : "synced"
          }
        }
      : state;

  return {
    state: nextState,
    result: {
      appliedAt: nowIso(),
      status: imported.length > 0 ? "applied" : "blocked",
      imported,
      conflicts: preview.conflicts,
      rejected,
      disclosure:
        imported.length > 0
          ? `Imported ${imported.length} accepted item${imported.length === 1 ? "" : "s"}. Conflicts and rejected items were not merged.`
          : "No accepted import items could be applied. Conflicts and rejected items remain unchanged."
    }
  };
}
