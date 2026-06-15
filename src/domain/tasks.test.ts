import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { createTask, grantApprovalScopesAndResumeTask, recordTaskAcceptance, runAutonomyCycle } from "./tasks";

describe("task autonomy", () => {
  it("plans, executes, validates, and delivers with a real deterministic executor", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft a launch checklist for PersonaDesk",
      constraints: "Keep it local-first and privacy aware",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("delivered");
    expect(run.taskTree.length).toBeGreaterThan(0);
    expect(run.validationResults.every((result) => result.passed)).toBe(true);
    expect(run.artifacts[0].content).toContain("PersonaDesk");
    expect(state.tasks[0].allowedExecutorIds).toEqual(["local-planner"]);
    expect(run.acceptance).toMatchObject({
      status: "pending",
      note: "Awaiting final user acceptance.",
      decidedAt: null
    });
  });

  it("records final user acceptance on delivered task runs", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft a launch checklist for PersonaDesk",
      constraints: "Keep it local-first and privacy aware",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    state = recordTaskAcceptance(state, state.tasks[0].id, state.taskRuns[0].id, "accepted");

    expect(state.tasks[0].status).toBe("accepted");
    expect(state.taskRuns[0].acceptance?.status).toBe("accepted");
    expect(state.taskRuns[0].acceptance?.note).toBe("User accepted this deliverable.");
    expect(state.taskRuns[0].acceptance?.decidedAt).toBeTruthy();
    expect(state.taskRuns[0].logs.some((log) => log.includes("User acceptance decision: accepted"))).toBe(true);
  });

  it("records requested revision without accepting the delivered task", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft a launch checklist for PersonaDesk",
      constraints: "Keep it local-first and privacy aware",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    state = recordTaskAcceptance(
      state,
      state.tasks[0].id,
      state.taskRuns[0].id,
      "revision-requested",
      "Needs a clearer testing section."
    );

    expect(state.tasks[0].status).toBe("revision-requested");
    expect(state.taskRuns[0].acceptance?.status).toBe("revision-requested");
    expect(state.taskRuns[0].acceptance?.note).toBe("Needs a clearer testing section.");
  });

  it("blocks instead of falling back when only unconfigured executors are allowed", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft an API integration checklist",
      constraints: "Use only the configured external model if available",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["openai-compatible"]
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("blocked");
    expect(run.artifacts).toEqual([]);
    expect(run.executorCalls).toHaveLength(1);
    expect(run.executorCalls[0]).toMatchObject({
      executorId: "openai-compatible",
      status: "skipped"
    });
    expect(run.finalSummary).toContain("no allowed executor is available");
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
