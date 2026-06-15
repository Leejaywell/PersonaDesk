import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { createTask, grantApprovalScopesAndResumeTask, runAutonomyCycle } from "./tasks";

describe("task autonomy", () => {
  it("plans, executes, validates, and delivers with a real deterministic executor", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft a launch checklist for PersonaDesk",
      constraints: "Keep it local-first and privacy aware",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("delivered");
    expect(run.taskTree.length).toBeGreaterThan(0);
    expect(run.validationResults.every((result) => result.passed)).toBe(true);
    expect(run.artifacts[0].content).toContain("PersonaDesk");
  });

  it("pauses when a task asks for access outside authorization scope", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Delete old files and publish the release",
      constraints: "Needs filesystem and external publishing",
      desiredOutput: "Published release",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    expect(state.taskRuns[0].status).toBe("blocked");
    expect(state.taskRuns[0].approvalRequests.length).toBeGreaterThan(0);
  });

  it("continues when risky operations are explicitly inside authorization scope", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Delete old files and publish the release",
      constraints: "Needs filesystem and external publishing",
      desiredOutput: "Release checklist",
      supervisionMode: "supervised",
      authorizationScope: "text-planning-only destructive-filesystem external-publishing"
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    expect(state.tasks[0].supervisionMode).toBe("supervised");
    expect(state.taskRuns[0].status).toBe("delivered");
    expect(state.taskRuns[0].approvalRequests).toEqual([]);
  });

  it("grants requested approval scopes and resumes the same blocked task", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Delete old files and publish the release",
      constraints: "Needs filesystem and external publishing",
      desiredOutput: "Release checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only"
    });
    state = runAutonomyCycle(state, state.tasks[0].id);

    const blockedRun = state.taskRuns[0];
    state = grantApprovalScopesAndResumeTask(state, state.tasks[0].id, blockedRun.id);

    expect(state.tasks[0].authorizationScope).toContain("destructive-filesystem");
    expect(state.tasks[0].authorizationScope).toContain("external-publishing");
    expect(state.taskRuns).toHaveLength(2);
    expect(state.taskRuns[0].status).toBe("blocked");
    expect(state.taskRuns[1].status).toBe("delivered");
    expect(state.taskRuns[1].approvalRequests).toEqual([]);
  });
});
