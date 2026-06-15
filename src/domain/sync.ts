import type { MemoryItem, PersonaDeskState } from "./types";

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

function nowIso(): string {
  return new Date().toISOString();
}

function canSyncMemory(memory: MemoryItem): boolean {
  return memory.syncPolicy === "sync-allowed" && memory.sensitivity !== "high";
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
