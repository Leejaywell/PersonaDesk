import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { configureExecutor, mergeDetectedLocalAgents, routeExecutorForTask } from "./executors";

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
});
