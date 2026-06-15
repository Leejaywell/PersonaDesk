import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import {
  approveCloudVisionUpload,
  startObservationSession,
  stopObservationSession,
  summarizeObservationEvent
} from "./observation";

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

  it("records explicit cloud vision approvals without uploading raw frames", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User reviewed a design document"
    });

    const session = state.observationSessions[0];
    const summary = session.localSummaryStream[0];
    state = approveCloudVisionUpload(state, session.id, summary.id, "Need visual interpretation");

    const approval = state.observationSessions[0].cloudUploadApprovals[0];
    expect(approval.summaryId).toBe(summary.id);
    expect(approval.providerStatus).toBe("unconfigured");
    expect(approval.uploaded).toBe(false);
    expect(approval.disclosure).toContain("no raw screen frame was uploaded");
  });

  it("does not approve cloud vision for missing local summaries", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = approveCloudVisionUpload(state, state.observationSessions[0].id, "missing-summary", "Try upload");

    expect(state.observationSessions[0].cloudUploadApprovals).toHaveLength(0);
  });
});
