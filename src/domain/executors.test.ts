import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { mergeDetectedLocalAgents, routeExecutorForTask } from "./executors";

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
});
