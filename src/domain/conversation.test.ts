import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import {
  addObservationSummaryCompanionReactions,
  addTaskRunCompanionReactions,
  sendCompanionMessage
} from "./conversation";
import { startObservationSession, summarizeObservationEvent } from "./observation";
import { createTask, runAutonomyCycle } from "./tasks";

describe("companion conversation", () => {
  it("adds a local user message and deterministic emotional-character reply", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "mira",
      text: "Can you stay with me while I review this?"
    });

    expect(state.conversationMessages).toHaveLength(2);
    expect(state.conversationMessages[0].speaker).toBe("user");
    expect(state.conversationMessages[1].speaker).toBe("character");
    expect(state.conversationMessages[1].text).toContain("No model provider was called");
  });

  it("does not let task characters act as desktop companions", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "orion",
      text: "Hello from the desktop"
    });

    expect(state.conversationMessages).toHaveLength(0);
  });

  it("ignores empty messages", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "mira",
      text: "   "
    });

    expect(state.conversationMessages).toHaveLength(0);
  });

  it("proposes companion memory candidates without writing long-term memory", () => {
    const state = sendCompanionMessage(createInitialState(), {
      characterId: "mira",
      text: "Please remember that I prefer quiet summaries."
    });

    expect(state.conversationMessages).toHaveLength(2);
    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memories).toHaveLength(0);
    expect(state.memoryCandidates[0]).toMatchObject({
      proposedLayer: "character-private",
      proposedOwnerCharacterId: "mira",
      proposedText: "Please remember that I prefer quiet summaries.",
      sensitivity: "low",
      status: "pending"
    });
    expect(state.memoryCandidates[0].sourceEvent).toBe(state.conversationMessages[0].id);
  });

  it("adds deterministic task reactions from emotional characters with task-comment permission", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Create a local planning checklist",
      constraints: "Keep it private",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    state = addTaskRunCompanionReactions(state, state.taskRuns[0].id);

    expect(state.conversationMessages).toHaveLength(1);
    expect(state.conversationMessages[0].characterId).toBe("mira");
    expect(state.conversationMessages[0].source).toBe("task-reaction");
    expect(state.conversationMessages[0].sourceEventId).toBe(state.taskRuns[0].id);
    expect(state.conversationMessages[0].text).toContain("No model provider was called");
  });

  it("does not duplicate task reactions for the same run", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Create a local planning checklist",
      constraints: "Keep it private",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    state = addTaskRunCompanionReactions(state, state.taskRuns[0].id);
    state = addTaskRunCompanionReactions(state, state.taskRuns[0].id);

    expect(state.conversationMessages).toHaveLength(1);
  });

  it("adds local companion reactions for allowlisted observation summaries", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User reviewed a design document"
    });
    state = addObservationSummaryCompanionReactions(state, state.observationSessions[0].id);

    const summary = state.observationSessions[0].localSummaryStream[0];
    expect(state.conversationMessages).toHaveLength(1);
    expect(state.conversationMessages[0]).toMatchObject({
      characterId: "mira",
      speaker: "character",
      source: "observation-reaction",
      sourceEventId: summary.id
    });
    expect(state.conversationMessages[0].text).toContain("User reviewed a design document");
    expect(state.conversationMessages[0].text).toContain("no raw screen frames");
  });

  it("proposes memory candidates from memory-shaped allowlisted observation summaries", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User prefers reading design docs in Safari"
    });
    state = addObservationSummaryCompanionReactions(state, state.observationSessions[0].id);

    const summary = state.observationSessions[0].localSummaryStream[0];
    expect(state.conversationMessages).toHaveLength(1);
    expect(state.memoryCandidates).toHaveLength(1);
    expect(state.memoryCandidates[0]).toMatchObject({
      proposedLayer: "character-private",
      proposedOwnerCharacterId: "mira",
      proposedText: "User prefers reading design docs in Safari",
      sourceEvent: summary.id,
      status: "pending"
    });
    expect(state.memories).toHaveLength(0);
  });

  it("does not add companion reactions for blocked observation sources", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Terminal",
      summary: "User ran a command"
    });
    state = addObservationSummaryCompanionReactions(state, state.observationSessions[0].id);

    expect(state.observationSessions[0].localSummaryStream).toHaveLength(0);
    expect(state.conversationMessages).toHaveLength(0);
  });
});
