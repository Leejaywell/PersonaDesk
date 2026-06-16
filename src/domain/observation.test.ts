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
    expect(state.observationSessions[0].boundaryViolations).toHaveLength(1);
    expect(state.observationSessions[0].boundaryViolations[0].appName).toBe("Terminal");
    expect(state.observationSessions[0].boundaryViolations[0].reason).toContain("outside the active allowlist");
    expect(state.observationSessions[0].boundaryViolations[0].discardedSummaryCharacters).toBe("User ran a command".length);
    expect(JSON.stringify(state.observationSessions[0].boundaryViolations[0])).not.toContain("User ran a command");
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
    expect(state.observationSessions[0].boundaryViolations).toHaveLength(0);
    expect(state.observationSessions[0].localSummaryStream[0].source).toBe("manual-summary");
    expect(state.observationSessions[0].localSummaryStream[0].captureDisclosure).toContain("entered manually");
    expect(state.observationSessions[0].localSummaryStream[0].frameWidth).toBeNull();
    expect(state.observationSessions[0].localSummaryStream[0].frameHeight).toBeNull();
    expect(state.observationSessions[0].active).toBe(false);
  });

  it("stores runtime screen capture summaries as local text metadata only", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Screen Capture"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Screen Capture",
      source: "runtime-screen-capture",
      summary: "Runtime screen capture observed a display surface (1440x900) locally.",
      captureDisclosure: "User-initiated runtime screen capture completed locally. Raw frames were discarded.",
      frameWidth: 1440,
      frameHeight: 900
    });

    expect(state.observationSessions[0].localSummaryStream).toHaveLength(1);
    expect(state.observationSessions[0].localSummaryStream[0]).toMatchObject({
      appName: "Screen Capture",
      source: "runtime-screen-capture",
      frameWidth: 1440,
      frameHeight: 900
    });
    expect(state.observationSessions[0].localSummaryStream[0].captureDisclosure).toContain("Raw frames were discarded");
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
