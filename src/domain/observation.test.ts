import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { startObservationSession, stopObservationSession, summarizeObservationEvent } from "./observation";

describe("observation privacy", () => {
  it("requires an allowlisted app before adding summaries", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Terminal",
      summary: "User ran a command"
    });

    expect(state.observationSessions[0].localSummaryStream).toHaveLength(0);
  });

  it("stores local summaries for allowlisted apps only", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User reviewed a design document"
    });
    state = stopObservationSession(state, state.observationSessions[0].id);

    expect(state.observationSessions[0].localSummaryStream).toHaveLength(1);
    expect(state.observationSessions[0].active).toBe(false);
  });
});
