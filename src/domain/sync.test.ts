import { describe, expect, it } from "vitest";
import { sendCompanionMessage } from "./conversation";
import { createInitialState } from "./defaultState";
import { recordDesktopNotificationAudit } from "./desktopPresence";
import { configureExecutor, recordExecutorHealthCheck } from "./executors";
import { confirmMemoryCandidate, proposeMemoryCandidate } from "./memory";
import {
  applyLocalSyncPackageImport,
  buildLocalSyncPackage,
  buildSyncPreview,
  previewLocalSyncPackageImport,
  serializeLocalSyncPackage,
  type LocalSyncPackage
} from "./sync";
import { createVoiceRequest } from "./voice";

describe("sync preview", () => {
  it("includes eligible character definitions and memories when sync is enabled", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = proposeMemoryCandidate(state, {
      layer: "shared-world",
      ownerCharacterId: null,
      text: "The user likes concise task summaries.",
      source: "conversation",
      sensitivity: "low",
      reason: "Stable preference"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      syncPolicy: "sync-allowed"
    });

    const preview = buildSyncPreview(state);

    expect(preview.included.some((item) => item.dataClass === "confirmed-character-definitions")).toBe(true);
    expect(preview.included.some((item) => item.detail.includes("concise task summaries"))).toBe(true);
    expect(preview.disclosure).toContain("local preview only");
  });

  it("excludes high-sensitivity memories and local-only execution data", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "Sensitive private preference.",
      source: "conversation",
      sensitivity: "high",
      reason: "Private preference"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);

    const preview = buildSyncPreview(state);

    expect(preview.included.some((item) => item.detail.includes("Sensitive private preference"))).toBe(false);
    expect(preview.excluded.some((item) => item.reason.includes("High-sensitivity memory"))).toBe(true);
  });

  it("omits raw secret references from executor configuration previews", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = configureExecutor(state, "openai-compatible", {
      endpoint: "https://api.example.test/v1",
      model: "gpt-compatible",
      secretRef: "OPENAI_COMPATIBLE_API_KEY",
      notes: "Use external secret storage."
    });

    const preview = buildSyncPreview(state);

    expect(JSON.stringify(preview)).not.toContain("OPENAI_COMPATIBLE_API_KEY");
    expect(preview.included.some((item) => item.id === "executor-config:openai-compatible")).toBe(true);
  });

  it("does not include upload items when sync is disabled", () => {
    const preview = buildSyncPreview(createInitialState());

    expect(preview.included).toHaveLength(0);
    expect(preview.excluded.some((item) => item.id === "sync:disabled")).toBe(true);
  });

  it("excludes raw companion conversations from sync previews", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = sendCompanionMessage(state, {
      characterId: "mira",
      text: "Private desk-side thought"
    });

    const preview = buildSyncPreview(state);

    expect(preview.included.some((item) => item.detail.includes("Private desk-side thought"))).toBe(false);
    expect(preview.excluded.some((item) => item.dataClass === "raw-companion-conversations")).toBe(true);
  });

  it("excludes voice request audit records from sync previews", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = createVoiceRequest(state, {
      kind: "tts-preview",
      executorId: "tts-provider",
      text: "Read this private note."
    });

    const preview = buildSyncPreview(state);

    expect(preview.included.some((item) => item.detail.includes("Read this private note"))).toBe(false);
    expect(preview.excluded.some((item) => item.dataClass === "raw-audio")).toBe(true);
  });

  it("excludes executor health check audits from sync previews", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = configureExecutor(state, "openai-compatible", {
      endpoint: "https://api.example.test/v1",
      model: "gpt-compatible",
      secretRef: "OPENAI_COMPATIBLE_API_KEY",
      notes: "Use external secret storage."
    });
    state = recordExecutorHealthCheck(state, "openai-compatible");

    const preview = buildSyncPreview(state);

    expect(preview.excluded.some((item) => item.dataClass === "executor-health-checks")).toBe(true);
    expect(JSON.stringify(preview)).not.toContain("https://api.example.test/v1");
    expect(JSON.stringify(preview)).not.toContain("OPENAI_COMPATIBLE_API_KEY");
  });

  it("excludes desktop presence notification audits from sync previews", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = recordDesktopNotificationAudit(state, {
      title: "Private task delivered",
      body: "Open the companion window to review.",
      status: "sent",
      disclosure: "Local notification preview only."
    });

    const preview = buildSyncPreview(state);

    expect(preview.included.some((item) => item.detail.includes("Open the companion window"))).toBe(false);
    expect(preview.excluded.some((item) => item.dataClass === "desktop-presence-audits")).toBe(true);
  });

  it("exports a local sync package without raw data, endpoints, or secret references", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = configureExecutor(state, "openai-compatible", {
      endpoint: "https://api.example.test/v1",
      model: "gpt-compatible",
      secretRef: "OPENAI_COMPATIBLE_API_KEY",
      notes: "Use external secret storage."
    });
    state = proposeMemoryCandidate(state, {
      layer: "shared-world",
      ownerCharacterId: null,
      text: "The user likes concise task summaries.",
      source: "conversation",
      sensitivity: "low",
      reason: "Stable preference"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      syncPolicy: "sync-allowed"
    });
    state = proposeMemoryCandidate(state, {
      layer: "character-private",
      ownerCharacterId: "mira",
      text: "Sensitive private preference.",
      source: "conversation",
      sensitivity: "high",
      reason: "Private preference"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id);
    state = sendCompanionMessage(state, {
      characterId: "mira",
      text: "Private raw companion transcript"
    });

    const syncPackage = buildLocalSyncPackage(state);
    const serialized = serializeLocalSyncPackage(syncPackage);

    expect(syncPackage.origin).toBe("personadesk-local-sync-package");
    expect(syncPackage.included.some((item) => item.dataClass === "confirmed-character-definitions")).toBe(true);
    expect(serialized).toContain("The user likes concise task summaries.");
    expect(serialized).not.toContain("Sensitive private preference.");
    expect(serialized).not.toContain("Private raw companion transcript");
    expect(serialized).not.toContain("https://api.example.test/v1");
    expect(serialized).not.toContain("OPENAI_COMPATIBLE_API_KEY");
    expect(syncPackage.disclosure).toContain("Local sync packages include confirmed role settings");
  });

  it("preflights local sync package imports without merging until the user applies accepted items", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    state = proposeMemoryCandidate(state, {
      layer: "shared-world",
      ownerCharacterId: null,
      text: "The user likes concise task summaries.",
      source: "conversation",
      sensitivity: "low",
      reason: "Stable preference"
    });
    state = confirmMemoryCandidate(state, state.memoryCandidates[0].id, {
      syncPolicy: "sync-allowed"
    });

    const packageText = serializeLocalSyncPackage(buildLocalSyncPackage(state));
    const preview = previewLocalSyncPackageImport(state, packageText);

    expect(preview.status).toBe("ready");
    expect(preview.conflicts.some((item) => item.reason.includes("would require user review"))).toBe(true);
    expect(preview.rejected).toHaveLength(0);
    expect(state.memories).toHaveLength(1);
    expect(preview.disclosure).toContain("Apply accepted imports");
  });

  it("applies accepted imported character and memory items while leaving conflicts untouched", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    const remoteCharacter = {
      ...state.characters[0],
      id: "remote-companion",
      name: "Remote Companion"
    };
    const syncPackage: LocalSyncPackage = {
      schemaVersion: 1,
      origin: "personadesk-local-sync-package",
      generatedAt: "2026-06-16T00:00:00.000Z",
      included: [
        {
          id: "character:remote-companion",
          dataClass: "confirmed-character-definitions",
          label: "Remote Companion",
          detail: "emotional character using partner relationship template.",
          payload: remoteCharacter
        },
        {
          id: "memory:remote-memory",
          dataClass: "confirmed-memory-summaries",
          label: "shared-world",
          detail: "Remote memory summary",
          payload: {
            id: "remote-memory",
            layer: "shared-world",
            ownerCharacterId: null,
            text: "Remote memory summary",
            source: "remote-package",
            sensitivity: "low",
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
            syncPolicy: "sync-allowed"
          }
        },
        {
          id: "character:mira",
          dataClass: "confirmed-character-definitions",
          label: "Mira",
          detail: "Existing character conflict.",
          payload: state.characters[0]
        }
      ],
      excluded: [],
      disclosure: "Test package."
    };

    const applied = applyLocalSyncPackageImport(state, serializeLocalSyncPackage(syncPackage));

    expect(applied.result.status).toBe("applied");
    expect(applied.result.imported.map((item) => item.id)).toEqual([
      "character:remote-companion",
      "memory:remote-memory"
    ]);
    expect(applied.result.conflicts.map((item) => item.id)).toEqual(["character:mira"]);
    expect(applied.state.characters.some((character) => character.id === "remote-companion")).toBe(true);
    expect(applied.state.memories.some((memory) => memory.id === "remote-memory")).toBe(true);
    expect(applied.state.characters.filter((character) => character.id === "mira")).toHaveLength(1);
    expect(applied.state.syncProfile.lastSyncStatus).toBe("conflict");
  });

  it("rejects new non-sensitive settings items because Phase 1 does not apply settings imports", () => {
    let state = createInitialState();
    state = {
      ...state,
      syncProfile: {
        ...state.syncProfile,
        enabled: true
      }
    };
    const syncPackage: LocalSyncPackage = {
      schemaVersion: 1,
      origin: "personadesk-local-sync-package",
      generatedAt: "2026-06-16T00:00:00.000Z",
      included: [
        {
          id: "executor-config:remote-provider",
          dataClass: "non-sensitive-settings",
          label: "Remote Provider",
          detail: "Configured metadata from another device.",
          payload: {
            id: "remote-provider"
          }
        }
      ],
      excluded: [],
      disclosure: "Test package."
    };

    const preview = previewLocalSyncPackageImport(state, serializeLocalSyncPackage(syncPackage));

    expect(preview.status).toBe("invalid");
    expect(preview.rejected[0]).toMatchObject({
      id: "executor-config:remote-provider",
      reason: "Applying new non-sensitive settings from sync packages is not supported in Phase 1."
    });
  });

  it("does not apply accepted imports while optional sync is disabled", () => {
    const state = createInitialState();
    const syncPackage: LocalSyncPackage = {
      schemaVersion: 1,
      origin: "personadesk-local-sync-package",
      generatedAt: "2026-06-16T00:00:00.000Z",
      included: [
        {
          id: "memory:remote-memory",
          dataClass: "confirmed-memory-summaries",
          label: "shared-world",
          detail: "Remote memory summary",
          payload: {
            id: "remote-memory",
            layer: "shared-world",
            ownerCharacterId: null,
            text: "Remote memory summary",
            source: "remote-package",
            sensitivity: "low",
            createdAt: "2026-06-16T00:00:00.000Z",
            updatedAt: "2026-06-16T00:00:00.000Z",
            syncPolicy: "sync-allowed"
          }
        }
      ],
      excluded: [],
      disclosure: "Test package."
    };

    const applied = applyLocalSyncPackageImport(state, serializeLocalSyncPackage(syncPackage));

    expect(applied.result.status).toBe("blocked");
    expect(applied.result.rejected[0].id).toBe("sync:disabled");
    expect(applied.state.memories).toHaveLength(0);
  });

  it("rejects invalid local sync package text during import preflight", () => {
    const preview = previewLocalSyncPackageImport(createInitialState(), "not json");

    expect(preview.status).toBe("invalid");
    expect(preview.rejected[0].reason).toBe("Package text is not valid JSON.");
  });
});
