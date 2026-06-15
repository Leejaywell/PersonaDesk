import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { addTaskRunCompanionReactions, sendCompanionMessage } from "./conversation";
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
});
