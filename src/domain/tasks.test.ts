import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { mergeDetectedLocalAgents } from "./executors";
import { startObservationSession, summarizeObservationEvent } from "./observation";
import {
  createTask,
  grantApprovalScopesAndResumeTask,
  recordTaskAcceptance,
  runAutonomyCycle,
  runTaskRevision
} from "./tasks";

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
    expect(run.executorCalls[0]).toMatchObject({
      executorId: "local-planner",
      executorType: "deterministic",
      status: "succeeded",
      dispatchKind: "local-deterministic"
    });
    expect(run.executorCalls[0].outputSummary).toContain("No model provider");
    expect(run.executorCalls[0].startedAt).toBeTruthy();
    expect(run.executorCalls[0].completedAt).toBeTruthy();
    expect(state.tasks[0].allowedExecutorIds).toEqual(["local-planner"]);
    expect(run.acceptance).toMatchObject({
      status: "pending",
      note: "Awaiting final user acceptance.",
      decidedAt: null
    });
  });

  it("records priority and deadline in scheduling decisions and local artifacts", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft an investor update checklist",
      constraints: "Keep it concise",
      desiredOutput: "Checklist",
      priority: "high",
      deadline: "2026-07-01",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });

    expect(state.tasks[0]).toMatchObject({
      priority: "high",
      deadline: "2026-07-01"
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    expect(state.taskRuns[0].decisions).toContain("Scheduled task as Priority high; target deadline 2026-07-01.");
    expect(state.taskRuns[0].artifacts[0].content).toContain("- Priority: high");
    expect(state.taskRuns[0].artifacts[0].content).toContain("- Deadline: 2026-07-01");
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

  it("creates a revised delivery run from revision feedback", () => {
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
    const originalRunId = state.taskRuns[0].id;
    state = recordTaskAcceptance(
      state,
      state.tasks[0].id,
      originalRunId,
      "revision-requested",
      "Needs a clearer testing section."
    );
    state = runTaskRevision(state, state.tasks[0].id, originalRunId);

    expect(state.tasks[0].status).toBe("delivered");
    expect(state.taskRuns).toHaveLength(2);
    expect(state.taskRuns[1].revisionOfRunId).toBe(originalRunId);
    expect(state.taskRuns[1].status).toBe("delivered");
    expect(state.taskRuns[1].acceptance?.status).toBe("pending");
    expect(state.taskRuns[1].artifacts[0].content).toContain("Revision feedback addressed: Needs a clearer testing section.");
    expect(state.taskRuns[1].decisions.some((decision) => decision.includes("Applied user revision feedback"))).toBe(true);
  });

  it("records allowed executor fallback during revised delivery", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft a launch checklist for PersonaDesk",
      constraints: "Use external model only if it is available",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["openai-compatible", "local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);
    const originalRunId = state.taskRuns[0].id;
    state = recordTaskAcceptance(state, state.tasks[0].id, originalRunId, "revision-requested", "Needs fallback trace.");
    state = runTaskRevision(state, state.tasks[0].id, originalRunId);

    const revisedRun = state.taskRuns[1];
    expect(revisedRun.status).toBe("delivered");
    expect(revisedRun.executorCalls.map((call) => call.executorId)).toEqual(["openai-compatible", "local-planner"]);
    expect(revisedRun.executorCalls[0].status).toBe("skipped");
    expect(revisedRun.executorCalls[1].status).toBe("succeeded");
    expect(revisedRun.decisions.some((decision) => decision.includes("Fell back to Local deterministic planner"))).toBe(true);
    expect(revisedRun.artifacts[0].content).toContain("Revision feedback addressed: Needs fallback trace.");
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
      executorType: "model-api",
      status: "skipped",
      dispatchKind: "model-api"
    });
    expect(run.executorCalls[0].outputSummary).toContain("No executor dispatch was sent");
    expect(run.finalSummary).toContain("no allowed executor is available");
  });

  it("falls back to an allowed deterministic executor after skipping an unavailable provider", () => {
    let state = createInitialState();
    state = createTask(state, {
      goal: "Draft an API integration checklist",
      constraints: "Prefer the external model if it is actually callable",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["openai-compatible", "local-planner"]
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("delivered");
    expect(run.executorCalls).toHaveLength(2);
    expect(run.executorCalls[0]).toMatchObject({
      executorId: "openai-compatible",
      executorType: "model-api",
      status: "skipped",
      dispatchKind: "model-api"
    });
    expect(run.executorCalls[0].outputSummary).toContain("No executor dispatch was sent");
    expect(run.executorCalls[1]).toMatchObject({
      executorId: "local-planner",
      executorType: "deterministic",
      status: "succeeded",
      dispatchKind: "local-deterministic"
    });
    expect(run.decisions.some((decision) => decision.includes("Fell back to Local deterministic planner"))).toBe(true);
    expect(run.decisions.some((decision) => decision.includes("No executor outside the allowlist was used"))).toBe(true);
  });

  it("does not pretend a detected local agent executed without a guarded adapter", () => {
    let state = createInitialState();
    state = mergeDetectedLocalAgents(state, [
      { id: "codex-cli", displayName: "Codex CLI", available: true, version: "codex 1.2.3" }
    ]);
    state = createTask(state, {
      goal: "Implement a small code change",
      constraints: "Use only Codex if available",
      desiredOutput: "Patch summary",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["codex-cli"]
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("blocked");
    expect(run.artifacts).toEqual([]);
    expect(run.executorCalls[0]).toMatchObject({
      executorId: "codex-cli",
      executorType: "local-agent",
      status: "blocked",
      dispatchKind: "local-agent"
    });
    expect(run.executorCalls[0].outputSummary).toContain("No local agent process was started");
    expect(run.finalSummary).toContain("no Phase 1 execution adapter");
  });

  it("can fall back from an allowed detected local agent without launching the agent", () => {
    let state = createInitialState();
    state = mergeDetectedLocalAgents(state, [
      { id: "codex-cli", displayName: "Codex CLI", available: true, version: "codex 1.2.3" }
    ]);
    state = createTask(state, {
      goal: "Implement a small code change",
      constraints: "Use Codex if a guarded adapter exists, otherwise stay local",
      desiredOutput: "Patch summary",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["codex-cli", "local-planner"]
    });

    state = runAutonomyCycle(state, state.tasks[0].id);

    const run = state.taskRuns[0];
    expect(run.status).toBe("delivered");
    expect(run.executorCalls).toHaveLength(2);
    expect(run.executorCalls[0]).toMatchObject({
      executorId: "codex-cli",
      executorType: "local-agent",
      status: "blocked",
      dispatchKind: "local-agent"
    });
    expect(run.executorCalls[0].outputSummary).toContain("No local agent process was started");
    expect(run.executorCalls[1].executorId).toBe("local-planner");
    expect(run.logs.some((log) => log.includes("No local agent process was started"))).toBe(true);
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

  it("does not include observation summaries without task authorization", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User compared launch checklist examples"
    });
    state = createTask(state, {
      goal: "Draft a launch checklist",
      constraints: "Use only task input",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);

    expect(state.taskRuns[0].artifacts[0].content).not.toContain("User compared launch checklist examples");
    expect(state.taskRuns[0].decisions).toContain(
      "Did not access observation summaries because the task authorization scope does not include observation-summaries."
    );
  });

  it("uses local observation summaries when task authorization allows it", () => {
    let state = createInitialState();
    state = startObservationSession(state, ["Safari"]);
    state = summarizeObservationEvent(state, state.observationSessions[0].id, {
      appName: "Safari",
      summary: "User compared launch checklist examples"
    });
    state = createTask(state, {
      goal: "Draft a launch checklist",
      constraints: "Use current observation summaries",
      desiredOutput: "Checklist",
      supervisionMode: "unsupervised",
      authorizationScope: "text-planning-only observation-summaries",
      allowedExecutorIds: ["local-planner"]
    });
    state = runAutonomyCycle(state, state.tasks[0].id);

    expect(state.taskRuns[0].artifacts[0].content).toContain("Authorized observation summaries:");
    expect(state.taskRuns[0].artifacts[0].content).toContain("Safari: User compared launch checklist examples");
    expect(state.taskRuns[0].decisions).toContain(
      "Used 1 local observation summary item because the task authorization scope includes observation-summaries."
    );
    expect(state.taskRuns[0].logs).toContain(
      "Task characters used allowlisted local observation summaries as text-only context; raw screen frames were not accessed."
    );
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
