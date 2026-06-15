import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { deserializeState, serializeState } from "./storage";

describe("state storage", () => {
  it("round-trips the current state version", () => {
    const state = createInitialState();
    const serialized = serializeState(state);
    const restored = deserializeState(serialized);

    expect(restored.characters.map((character) => character.id)).toEqual(
      state.characters.map((character) => character.id)
    );
    expect(restored.syncProfile.enabled).toBe(false);
  });

  it("falls back to a safe initial state for unknown versions", () => {
    const restored = deserializeState(JSON.stringify({ version: 999, state: { characters: [] } }));

    expect(restored.characters.length).toBeGreaterThan(0);
    expect(restored.syncProfile.enabled).toBe(false);
  });

  it("migrates old cloud upload approval arrays to structured audit records", () => {
    const state = createInitialState();
    const legacy = {
      version: 1,
      state: {
        ...state,
        observationSessions: [
          {
            id: "observation-legacy",
            allowedApps: ["Safari"],
            active: false,
            localSummaryStream: [],
            cloudUploadApprovals: ["old-string-approval"],
            retentionPolicy: "summaries-only",
            startedAt: "2026-06-15T00:00:00.000Z",
            endedAt: "2026-06-15T00:01:00.000Z"
          }
        ]
      }
    };

    const restored = deserializeState(JSON.stringify(legacy));

    expect(restored.observationSessions[0].cloudUploadApprovals).toEqual([]);
  });

  it("adds new default executors to older persisted states without overwriting user state", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      executors: state.executors
        .filter((executor) => executor.id !== "vision-provider")
        .map((executor) =>
          executor.id === "codex-cli"
            ? {
                ...executor,
                status: "available",
                statusReason: "Detected locally (codex 1.2.3). Use still requires task authorization."
              }
            : executor
        )
    };

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.executors.find((executor) => executor.id === "vision-provider")?.status).toBe("unconfigured");
    expect(restored.executors.find((executor) => executor.id === "codex-cli")?.status).toBe("available");
    expect(restored.executors.find((executor) => executor.id === "codex-cli")?.statusReason).toContain("codex 1.2.3");
    expect(restored.executors.find((executor) => executor.id === "codex-cli")?.configuration.endpoint).toBe("");
  });

  it("adds missing conversation state for older persisted states", () => {
    const state = createInitialState();
    const legacyState = { ...state } as Partial<typeof state>;
    delete legacyState.conversationMessages;

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.conversationMessages).toEqual([]);
  });

  it("adds missing voice request state for older persisted states", () => {
    const state = createInitialState();
    const legacyState = { ...state } as Partial<typeof state>;
    delete legacyState.voiceRequests;

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.voiceRequests).toEqual([]);
  });

  it("normalizes old conversation messages with missing source event ids", () => {
    const state = createInitialState();
    const restored = deserializeState(
      JSON.stringify({
        version: 2,
        state: {
          ...state,
          conversationMessages: [
            {
              id: "conversation-old",
              characterId: "mira",
              speaker: "character",
              text: "Old local reply",
              source: "desktop-companion",
              createdAt: "2026-06-15T00:00:00.000Z"
            }
          ]
        }
      })
    );

    expect(restored.conversationMessages[0].sourceEventId).toBeNull();
  });

  it("merges default sync classes while preserving persisted sync settings", () => {
    const state = createInitialState();
    const restored = deserializeState(
      JSON.stringify({
        version: 1,
        state: {
          ...state,
          syncProfile: {
            ...state.syncProfile,
            enabled: true,
            allowedDataClasses: ["custom-safe-summary"],
            localOnlyClasses: ["custom-local-secret"],
            lastSyncStatus: "synced"
          }
        }
      })
    );

    expect(restored.syncProfile.enabled).toBe(true);
    expect(restored.syncProfile.lastSyncStatus).toBe("synced");
    expect(restored.syncProfile.allowedDataClasses).toContain("confirmed-memory-summaries");
    expect(restored.syncProfile.allowedDataClasses).toContain("custom-safe-summary");
    expect(restored.syncProfile.localOnlyClasses).toContain("raw-screen-frames");
    expect(restored.syncProfile.localOnlyClasses).toContain("custom-local-secret");
  });
});
