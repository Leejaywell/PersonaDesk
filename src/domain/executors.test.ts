import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { configureExecutor, mergeDetectedLocalAgents, recordExecutorHealthCheck, routeExecutorForTask } from "./executors";

describe("executor routing", () => {
  it("uses a task character default executor when available", () => {
    const state = createInitialState();
    const executor = routeExecutorForTask(state, {
      taskCharacterId: "orion",
      taskKind: "planning",
      requiresLocalAgent: false
    });

    expect(executor.id).toBe("local-planner");
    expect(executor.status).toBe("available");
  });

  it("does not pretend missing local agents are available", () => {
    const state = createInitialState();
    const next = mergeDetectedLocalAgents(state, [
      { id: "codex-cli", displayName: "Codex CLI", available: false, version: null }
    ]);

    expect(next.executors.find((executor) => executor.id === "codex-cli")?.status).toBe("missing");
  });

  it("stores executor configuration metadata without marking providers callable", () => {
    let state = createInitialState();
    state = configureExecutor(state, "openai-compatible", {
      endpoint: "https://api.example.test/v1",
      model: "gpt-compatible",
      secretRef: "OPENAI_COMPATIBLE_API_KEY",
      notes: "Use external secret storage."
    });

    const configured = state.executors.find((executor) => executor.id === "openai-compatible");
    const routed = routeExecutorForTask(state, {
      taskCharacterId: "orion",
      taskKind: "planning",
      requiresLocalAgent: false
    });

    expect(configured?.status).toBe("configured");
    expect(configured?.configuration.endpoint).toBe("https://api.example.test/v1");
    expect(configured?.statusReason).toContain("not store raw secrets");
    expect(routed.id).toBe("local-planner");
  });

  it("respects task-level allowed executor constraints", () => {
    const state = createInitialState();
    const routed = routeExecutorForTask(state, {
      taskCharacterId: "orion",
      taskKind: "planning",
      requiresLocalAgent: false,
      allowedExecutorIds: ["openai-compatible"]
    });

    expect(routed.id).toBe("openai-compatible");
    expect(routed.status).toBe("unconfigured");
  });

  it("returns provider slots to unconfigured when metadata is cleared", () => {
    let state = createInitialState();
    state = configureExecutor(state, "vision-provider", {
      endpoint: "https://vision.example.test",
      model: "vision-small",
      secretRef: "VISION_API_KEY",
      notes: ""
    });
    state = configureExecutor(state, "vision-provider", {
      endpoint: "",
      model: "",
      secretRef: "",
      notes: ""
    });

    const executor = state.executors.find((item) => item.id === "vision-provider");

    expect(executor?.status).toBe("unconfigured");
    expect(executor?.configuration.configuredAt).toBeNull();
  });

  it("records configured provider health checks without marking providers available or leaking metadata", () => {
    let state = createInitialState();
    state = configureExecutor(state, "openai-compatible", {
      endpoint: "https://api.example.test/v1",
      model: "gpt-compatible",
      secretRef: "OPENAI_COMPATIBLE_API_KEY",
      notes: "Use external secret storage."
    });
    state = recordExecutorHealthCheck(state, "openai-compatible");

    const executor = state.executors.find((item) => item.id === "openai-compatible");
    const check = state.executorHealthChecks[0];

    expect(executor?.status).toBe("configured");
    expect(check.status).toBe("configured-not-verified");
    expect(check.disclosure).toContain("do not contact external services");
    expect(JSON.stringify(check)).not.toContain("https://api.example.test/v1");
    expect(JSON.stringify(check)).not.toContain("OPENAI_COMPATIBLE_API_KEY");
  });

  it("skips provider health checks when required metadata is missing", () => {
    let state = createInitialState();
    state = configureExecutor(state, "openai-compatible", {
      endpoint: "https://api.example.test/v1",
      model: "",
      secretRef: "",
      notes: ""
    });
    state = recordExecutorHealthCheck(state, "openai-compatible");

    expect(state.executorHealthChecks[0].status).toBe("skipped");
    expect(state.executorHealthChecks[0].disclosure).toContain("missing model, secret reference");
  });

  it("records built-in deterministic executor health as ready without external calls", () => {
    let state = createInitialState();
    state = recordExecutorHealthCheck(state, "local-planner");

    expect(state.executorHealthChecks[0].status).toBe("ready");
    expect(state.executorHealthChecks[0].disclosure).toContain("No network call");
  });
});
