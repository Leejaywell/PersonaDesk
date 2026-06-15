import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";

describe("createInitialState", () => {
  it("creates emotional and task characters with separate permissions", () => {
    const state = createInitialState();
    const emotional = state.characters.find((character) => character.kind === "emotional");
    const task = state.characters.find((character) => character.kind === "task");

    expect(emotional).toBeDefined();
    expect(task).toBeDefined();
    expect(state.roleBoundaries[emotional!.roleBoundaryId].canCallExecutors).toBe(false);
    expect(state.roleBoundaries[task!.roleBoundaryId].canCallExecutors).toBe(true);
  });

  it("marks cloud executors unavailable until configured", () => {
    const state = createInitialState();
    const cloudExecutors = state.executors.filter((executor) => executor.type === "model-api");

    expect(cloudExecutors.length).toBeGreaterThan(0);
    expect(cloudExecutors.every((executor) => executor.status === "unconfigured")).toBe(true);
  });
});
