import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { deserializeState, serializeState } from "./storage";
import { createTask, runAutonomyCycle } from "./tasks";

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
    expect(restored.observationSessions[0].boundaryViolations).toEqual([]);
  });

  it("migrates old observation sessions without boundary audit records", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      observationSessions: [
        {
          id: "observation-legacy",
          allowedApps: ["Safari"],
          active: true,
          localSummaryStream: [],
          cloudUploadApprovals: [],
          retentionPolicy: "summaries-only",
          startedAt: "2026-06-15T00:00:00.000Z",
          endedAt: null
        }
      ]
    };

    const restored = deserializeState(JSON.stringify({ version: 2, state: legacyState }));

    expect(restored.observationSessions[0].boundaryViolations).toEqual([]);
  });

  it("defaults older observation summaries to manual text-only capture metadata", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      observationSessions: [
        {
          id: "observation-legacy",
          allowedApps: ["Safari"],
          active: false,
          localSummaryStream: [
            {
              id: "observation-summary-legacy",
              appName: "Safari",
              summary: "Legacy local summary",
              createdAt: "2026-06-15T00:00:00.000Z"
            }
          ],
          boundaryViolations: [],
          cloudUploadApprovals: [],
          retentionPolicy: "summaries-only",
          startedAt: "2026-06-15T00:00:00.000Z",
          endedAt: "2026-06-15T00:01:00.000Z"
        }
      ]
    };

    const restored = deserializeState(JSON.stringify({ version: 2, state: legacyState }));

    expect(restored.observationSessions[0].localSummaryStream[0]).toMatchObject({
      id: "observation-summary-legacy",
      appName: "Safari",
      source: "manual-summary",
      summary: "Legacy local summary",
      frameWidth: null,
      frameHeight: null
    });
    expect(restored.observationSessions[0].localSummaryStream[0].captureDisclosure).toContain("older local state");
  });

  it("drops legacy forbidden observation preview text during migration", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      observationSessions: [
        {
          id: "observation-legacy",
          allowedApps: ["Safari"],
          active: false,
          localSummaryStream: [],
          boundaryViolations: [
            {
              id: "observation-boundary-legacy",
              appName: "Terminal",
              reason: "Outside allowlist",
              ignoredSummaryPreview: "Sensitive terminal text",
              createdAt: "2026-06-15T00:00:00.000Z"
            }
          ],
          cloudUploadApprovals: [],
          retentionPolicy: "summaries-only",
          startedAt: "2026-06-15T00:00:00.000Z",
          endedAt: "2026-06-15T00:01:00.000Z"
        }
      ]
    };

    const restored = deserializeState(JSON.stringify({ version: 2, state: legacyState }));

    expect(restored.observationSessions[0].boundaryViolations[0]).toMatchObject({
      id: "observation-boundary-legacy",
      appName: "Terminal",
      discardedSummaryCharacters: "Sensitive terminal text".length
    });
    expect(JSON.stringify(restored.observationSessions[0].boundaryViolations[0])).not.toContain("Sensitive terminal text");
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

  it("defaults older voice request audits to audit-only routing", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      voiceRequests: [
        {
          id: "voice-request-legacy",
          kind: "asr-transcript",
          executorId: "asr-provider",
          characterId: null,
          text: "Legacy transcript",
          status: "skipped",
          disclosure: "Legacy voice request.",
          createdAt: "2026-06-15T00:00:00.000Z"
        }
      ]
    };

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.voiceRequests[0].routeTarget).toBe("audit-only");
    expect(restored.voiceRequests[0].inputSource).toBe("manual-text");
    expect(restored.voiceRequests[0].captureDisclosure).toBe("Transcript text was entered manually. No microphone audio was captured.");
    expect(restored.voiceRequests[0].playbackStatus).toBe("not-requested");
    expect(restored.voiceRequests[0].playbackDisclosure).toBe("Playback does not apply to ASR transcript requests.");
    expect(restored.voiceRequests[0].playedAt).toBeNull();
  });

  it("defaults older TTS request audits to unplayed local playback state", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      voiceRequests: [
        {
          id: "voice-request-tts-legacy",
          kind: "tts-preview",
          executorId: "browser-tts",
          characterId: null,
          routeTarget: "audit-only",
          text: "Legacy speech preview",
          status: "ready",
          disclosure: "Legacy TTS preview.",
          createdAt: "2026-06-15T00:00:00.000Z"
        }
      ]
    };

    const restored = deserializeState(JSON.stringify({ version: 2, state: legacyState }));

    expect(restored.voiceRequests[0].playbackStatus).toBe("not-requested");
    expect(restored.voiceRequests[0].playbackDisclosure).toBe("Speech playback has not been requested yet.");
    expect(restored.voiceRequests[0].playedAt).toBeNull();
    expect(restored.voiceRequests[0].captureDisclosure).toBe("Capture disclosure does not apply to TTS preview requests.");
  });

  it("adds missing executor health check state for older persisted states", () => {
    const state = createInitialState();
    const legacyState = { ...state } as Partial<typeof state>;
    delete legacyState.executorHealthChecks;

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.executorHealthChecks).toEqual([]);
  });

  it("adds missing desktop presence audit state for older persisted states", () => {
    const state = createInitialState();
    const legacyState = { ...state } as Partial<typeof state>;
    delete legacyState.desktopPresenceAudits;

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.desktopPresenceAudits).toEqual([]);
  });

  it("adds default allowed executors to older persisted tasks", () => {
    const state = createInitialState();
    const legacyState = {
      ...state,
      tasks: [
        {
          id: "task-legacy",
          title: "Legacy task",
          goal: "Create checklist",
          constraints: "",
          desiredOutput: "Checklist",
          supervisionMode: "unsupervised",
          authorizationScope: "text-planning-only",
          status: "draft",
          createdBy: "user",
          createdAt: "2026-06-15T00:00:00.000Z"
        }
      ]
    };

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.tasks[0].allowedExecutorIds).toEqual(["local-planner"]);
  });

  it("adds pending acceptance state to older delivered task runs", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Create checklist",
      constraints: "",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    const legacyState = {
      ...state,
      taskRuns: state.taskRuns.map((run) => {
        const legacyRun = { ...run } as Partial<typeof run>;
        delete legacyRun.acceptance;
        delete legacyRun.revisionOfRunId;

        return legacyRun;
      })
    };

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.taskRuns[0].acceptance).toMatchObject({
      status: "pending",
      note: "Awaiting final user acceptance.",
      decidedAt: null
    });
    expect(restored.taskRuns[0].revisionOfRunId).toBeNull();
  });

  it("normalizes legacy task executor call records", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Create checklist",
      constraints: "",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    const legacyState = {
      ...state,
      taskRuns: state.taskRuns.map((run) => ({
        ...run,
        executorCalls: run.executorCalls.map((call) => ({
          executorId: call.executorId,
          characterId: call.characterId,
          purpose: call.purpose,
          status: call.status,
          disclosure: call.disclosure
        }))
      }))
    };

    const restored = deserializeState(JSON.stringify({ version: 1, state: legacyState }));

    expect(restored.taskRuns[0].executorCalls[0]).toMatchObject({
      executorId: "local-planner",
      executorType: "deterministic",
      dispatchKind: "provider-slot",
      outputSummary: "Legacy executor call restored without a structured output summary."
    });
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
    expect(restored.syncProfile.localOnlyClasses).toContain("executor-health-checks");
    expect(restored.syncProfile.localOnlyClasses).toContain("desktop-presence-audits");
    expect(restored.syncProfile.localOnlyClasses).toContain("custom-local-secret");
  });
});
