import { executorDisclosure, routeExecutorForTask } from "./executors";
import type {
  ApprovalRequest,
  Artifact,
  Executor,
  ExecutorCall,
  ExecutorCallStatus,
  ExecutorDispatchKind,
  ObservationSummary,
  PersonaDeskState,
  SupervisionMode,
  TaskAcceptanceStatus,
  Task,
  TaskRun,
  TaskStep,
  ValidationResult
} from "./types";

export interface CreateTaskInput {
  goal: string;
  constraints: string;
  desiredOutput: string;
  priority?: Task["priority"];
  deadline?: string | null;
  supervisionMode: SupervisionMode;
  authorizationScope: string;
  allowedExecutorIds?: string[];
}

function normalizeAllowedExecutorIds(allowedExecutorIds: string[] | undefined): string[] {
  const ids = Array.from(new Set((allowedExecutorIds ?? []).map((id) => id.trim()).filter(Boolean)));

  return ids.length > 0 ? ids : ["local-planner"];
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function canUseObservationSummaries(task: Task): boolean {
  return task.authorizationScope.toLowerCase().split(/\s+/).includes("observation-summaries");
}

function normalizeTaskPriority(priority: CreateTaskInput["priority"]): Task["priority"] {
  return priority ?? "normal";
}

function normalizeTaskDeadline(deadline: CreateTaskInput["deadline"]): string | null {
  const normalized = deadline?.trim() ?? "";

  return normalized.length > 0 ? normalized : null;
}

function taskScheduleSummary(task: Task): string {
  return task.deadline
    ? `Priority ${task.priority}; target deadline ${task.deadline}.`
    : `Priority ${task.priority}; no deadline set.`;
}

function authorizedObservationSummaries(state: PersonaDeskState, task: Task): ObservationSummary[] {
  if (!canUseObservationSummaries(task)) {
    return [];
  }

  return state.observationSessions.flatMap((session) => session.localSummaryStream).slice(-3);
}

function observationDecision(task: Task, summaries: ObservationSummary[]): string {
  if (summaries.length > 0) {
    return `Used ${summaries.length} local observation summary item${summaries.length === 1 ? "" : "s"} because the task authorization scope includes observation-summaries.`;
  }

  if (canUseObservationSummaries(task)) {
    return "Observation-summary access was authorized, but no local observation summaries were available.";
  }

  return "Did not access observation summaries because the task authorization scope does not include observation-summaries.";
}

function observationLog(summaries: ObservationSummary[]): string {
  return summaries.length > 0
    ? "Task characters used allowlisted local observation summaries as text-only context; raw screen frames were not accessed."
    : "No observation summary text was added to this task run.";
}

function dispatchKindForExecutor(executor: Executor): ExecutorDispatchKind {
  if (executor.type === "deterministic") {
    return "local-deterministic";
  }

  if (executor.type === "model-api" || executor.type === "local-model" || executor.type === "local-agent") {
    return executor.type;
  }

  return "provider-slot";
}

function canProduceTaskArtifact(executor: Executor): boolean {
  return executor.type === "deterministic" && executor.status === "available";
}

interface TaskExecutorResolution {
  executor: Executor;
  fallbackCalls: ExecutorCall[];
  fallbackDecisions: string[];
  fallbackLogs: string[];
}

function blockedExecutorCallStatus(executor: Executor): ExecutorCallStatus {
  return executor.status === "available" ? "blocked" : "skipped";
}

function createExecutorCall(
  executor: Executor,
  purpose: string,
  status: ExecutorCallStatus,
  outputSummary: string
): ExecutorCall {
  const timestamp = nowIso();
  const completedAt =
    status === "succeeded" || status === "failed" || status === "skipped" || status === "blocked" ? timestamp : null;

  return {
    executorId: executor.id,
    executorType: executor.type,
    characterId: "orion",
    purpose,
    status,
    dispatchKind: dispatchKindForExecutor(executor),
    startedAt: timestamp,
    completedAt,
    outputSummary,
    disclosure: executorDisclosure(executor)
  };
}

function taskExecutorPurpose(kind: "plan" | "revision"): string {
  return kind === "plan"
    ? "Create a task plan and delivery artifact with an allowed executor."
    : "Revise the delivered artifact with an allowed executor.";
}

function allowedTaskExecutors(state: PersonaDeskState, task: Task): Executor[] {
  const allowedIds = new Set(task.allowedExecutorIds);

  return state.executors.filter((executor) => allowedIds.has(executor.id));
}

function blockedExecutorOutput(executor: Executor): string {
  if (executor.status !== "available") {
    return "No executor dispatch was sent because the selected provider is not available. No network request, model call, process launch, or secret read was attempted.";
  }

  if (executor.type === "local-agent") {
    return "PersonaDesk confirmed the local agent slot is available, but Phase 1 has not wired the guarded launch adapter for task execution. No local agent process was started.";
  }

  if (executor.type === "model-api" || executor.type === "local-model") {
    return "PersonaDesk found a callable-looking provider slot, but Phase 1 has not wired the task execution adapter for this executor type. No prompt or task data was sent.";
  }

  return "PersonaDesk did not dispatch this executor type for task execution in Phase 1.";
}

function blockedExecutorDecision(executor: Executor, task: Task, kind: "plan" | "revision"): string {
  if (executor.status !== "available") {
    return `Paused because the task allowed-executor list does not include an available ${kind === "plan" ? "planning" : "revision"} executor.`;
  }

  return `Paused because ${executor.displayName} is allowed but has no Phase 1 task execution adapter. Allowed executors: ${task.allowedExecutorIds.join(", ")}.`;
}

function blockedExecutorFinalSummary(executor: Executor): string {
  return executor.status === "available"
    ? "Task is blocked because the selected executor has no Phase 1 execution adapter."
    : "Task is blocked because no allowed executor is available.";
}

function resolveTaskExecutor(
  state: PersonaDeskState,
  task: Task,
  kind: "plan" | "revision"
): TaskExecutorResolution {
  const routed = routeExecutorForTask(state, {
    taskCharacterId: "orion",
    taskKind: kind === "plan" ? "planning" : "revision",
    requiresLocalAgent: false,
    allowedExecutorIds: task.allowedExecutorIds
  });
  const allowedExecutors = allowedTaskExecutors(state, task);
  const fallback = allowedExecutors.find(canProduceTaskArtifact);
  const nonProductiveAllowedExecutors = allowedExecutors.filter(
    (executor) => executor.id !== fallback?.id && !canProduceTaskArtifact(executor)
  );

  if (!fallback || nonProductiveAllowedExecutors.length === 0) {
    return {
      executor: routed,
      fallbackCalls: [],
      fallbackDecisions: [],
      fallbackLogs: []
    };
  }

  const purpose = taskExecutorPurpose(kind);
  const fallbackCalls = nonProductiveAllowedExecutors.map((executor) =>
    createExecutorCall(executor, purpose, blockedExecutorCallStatus(executor), blockedExecutorOutput(executor))
  );

  return {
    executor: fallback,
    fallbackCalls,
    fallbackDecisions: [
      `Preflighted ${fallbackCalls.length} allowed executor candidate${fallbackCalls.length === 1 ? "" : "s"} before fallback without sending task data to unavailable providers or launching local agents.`,
      `Fell back to ${fallback.displayName} because it is explicitly included in the task allowed-executor list. No executor outside the allowlist was used.`
    ],
    fallbackLogs: fallbackCalls.map((call) => call.outputSummary)
  };
}

export function createTask(state: PersonaDeskState, input: CreateTaskInput): PersonaDeskState {
  const goal = input.goal.trim();
  const task: Task = {
    id: createId("task"),
    title: goal.length > 64 ? `${goal.slice(0, 61)}...` : goal,
    goal,
    constraints: input.constraints.trim(),
    desiredOutput: input.desiredOutput.trim(),
    priority: normalizeTaskPriority(input.priority),
    deadline: normalizeTaskDeadline(input.deadline),
    supervisionMode: input.supervisionMode,
    authorizationScope: input.authorizationScope.trim(),
    allowedExecutorIds: normalizeAllowedExecutorIds(input.allowedExecutorIds),
    status: "draft",
    createdBy: "user",
    createdAt: nowIso()
  };

  return {
    ...state,
    tasks: [...state.tasks, task]
  };
}

export function requiresApproval(goal: string, constraints: string, authorizationScope: string): ApprovalRequest[] {
  const text = `${goal} ${constraints}`.toLowerCase();
  const scope = authorizationScope.toLowerCase();
  const requests: ApprovalRequest[] = [];

  const riskChecks = [
    {
      keywords: ["delete", "remove file", "wipe", "destructive"],
      requestedScope: "destructive-filesystem",
      reason: "The task appears to require destructive file operations."
    },
    {
      keywords: ["publish", "send externally", "post", "release"],
      requestedScope: "external-publishing",
      reason: "The task appears to publish or send content outside the app."
    },
    {
      keywords: ["pay", "purchase", "buy", "billing"],
      requestedScope: "payment",
      reason: "The task appears to involve payment or purchasing."
    },
    {
      keywords: ["sensitive file", "private key", "password", "secret"],
      requestedScope: "sensitive-data-access",
      reason: "The task appears to require sensitive data access."
    }
  ];

  for (const check of riskChecks) {
    if (check.keywords.some((keyword) => text.includes(keyword)) && !scope.includes(check.requestedScope)) {
      requests.push({
        id: createId("approval"),
        reason: check.reason,
        requestedScope: check.requestedScope,
        riskLevel: "high"
      });
    }
  }

  return requests;
}

export function runAutonomyCycle(state: PersonaDeskState, taskId: string): PersonaDeskState {
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task) {
    return state;
  }

  const approvals = requiresApproval(task.goal, task.constraints, task.authorizationScope);
  const assignedCharacters = ["orion", "vale", "nova"];
  const taskTree = buildTaskTree(assignedCharacters);

  if (approvals.length > 0) {
    const blockedRun: TaskRun = {
      id: createId("task-run"),
      taskId: task.id,
      revisionOfRunId: null,
      status: "blocked",
      assignedCharacters,
      taskTree: taskTree.map((step) => ({ ...step, status: "blocked" })),
      executorCalls: [],
      decisions: ["Paused before execution because the task exceeded the authorization scope."],
      logs: [taskScheduleSummary(task), "PersonaDesk did not run tools or publish/delete anything."],
      validationResults: [],
      artifacts: [],
      approvalRequests: approvals,
      acceptance: null,
      finalSummary: "Task is blocked until the user grants additional permission."
    };

    return appendRun(state, task.id, blockedRun, "blocked");
  }

  const resolution = resolveTaskExecutor(state, task, "plan");
  const executor = resolution.executor;
  const executorPurpose = taskExecutorPurpose("plan");

  if (!canProduceTaskArtifact(executor)) {
    const executorCall = createExecutorCall(
      executor,
      executorPurpose,
      blockedExecutorCallStatus(executor),
      blockedExecutorOutput(executor)
    );
    const blockedRun: TaskRun = {
      id: createId("task-run"),
      taskId: task.id,
      revisionOfRunId: null,
      status: "blocked",
      assignedCharacters,
      taskTree: taskTree.map((step) => ({ ...step, status: "blocked" })),
      executorCalls: [executorCall],
      decisions: [
        blockedExecutorDecision(executor, task, "plan"),
        `Scheduled task as ${taskScheduleSummary(task)}`,
        ...(executor.status !== "available" ? [`Allowed executors: ${task.allowedExecutorIds.join(", ")}.`] : [])
      ],
      logs: [executorCall.outputSummary],
      validationResults: [],
      artifacts: [],
      approvalRequests: [],
      acceptance: null,
      finalSummary: blockedExecutorFinalSummary(executor)
    };

    return appendRun(state, task.id, blockedRun, "blocked");
  }

  const observationSummaries = authorizedObservationSummaries(state, task);
  const artifact = buildDeterministicArtifact(task, "", observationSummaries);
  const validationResults = validateArtifact(task, artifact);
  const passed = validationResults.every((result) => result.passed);
  const deliveredRun: TaskRun = {
    id: createId("task-run"),
    taskId: task.id,
    revisionOfRunId: null,
    status: passed ? "delivered" : "blocked",
    assignedCharacters,
    taskTree: taskTree.map((step) => ({ ...step, status: passed ? "completed" : "blocked" })),
    executorCalls: [
      ...resolution.fallbackCalls,
      createExecutorCall(
        executor,
        "Create a deterministic task plan and delivery artifact.",
        "succeeded",
        "Produced one local deterministic planning artifact in the app runtime. No model provider, local model server, or local agent process was called."
      )
    ],
    decisions: [
      ...resolution.fallbackDecisions,
      `Scheduled task as ${taskScheduleSummary(task)}`,
      "Used the local deterministic planner because no configured model API is required for text planning.",
      observationDecision(task, observationSummaries),
      "Validated output against the user goal, desired output, and privacy constraint."
    ],
    logs: [
      ...resolution.fallbackLogs,
      "Plan created by Orion.",
      "Artifact drafted by local deterministic planner.",
      observationLog(observationSummaries),
      "Vale validated the artifact against acceptance checks."
    ],
    validationResults,
    artifacts: [artifact],
    approvalRequests: [],
    acceptance: passed
      ? {
          status: "pending",
          note: "Awaiting final user acceptance.",
          decidedAt: null
        }
      : null,
    finalSummary: passed
      ? "Delivered a validated local planning artifact."
      : "Artifact needs user review before delivery."
  };

  return {
    ...appendRun(state, task.id, deliveredRun, passed ? "delivered" : "blocked"),
    memoryCandidates: [
      ...state.memoryCandidates,
      {
        id: createId("memory-candidate"),
        proposedLayer: "task",
        proposedOwnerCharacterId: null,
        proposedText: `PersonaDesk completed task: ${task.title}`,
        sourceEvent: deliveredRun.id,
        sensitivity: "low",
        reason: "Completed task outcome can help shared-world continuity.",
        status: "pending"
      }
    ]
  };
}

function appendRun(
  state: PersonaDeskState,
  taskId: string,
  run: TaskRun,
  status: Task["status"]
): PersonaDeskState {
  return {
    ...state,
    tasks: state.tasks.map((task) => (task.id === taskId ? { ...task, status } : task)),
    taskRuns: [...state.taskRuns, run]
  };
}

function buildTaskTree(assignedCharacters: string[]): TaskStep[] {
  return [
    {
      id: createId("step"),
      title: "Clarify goal and acceptance criteria",
      ownerCharacterId: assignedCharacters[0],
      status: "planned"
    },
    {
      id: createId("step"),
      title: "Draft the requested artifact",
      ownerCharacterId: assignedCharacters[2],
      status: "planned"
    },
    {
      id: createId("step"),
      title: "Validate against constraints and privacy boundaries",
      ownerCharacterId: assignedCharacters[1],
      status: "planned"
    }
  ];
}

function mergeAuthorizationScope(currentScope: string, requestedScopes: string[]): string {
  const parts = new Set(
    currentScope
      .split(/\s+/)
      .map((part) => part.trim())
      .filter(Boolean)
  );

  for (const scope of requestedScopes) {
    parts.add(scope);
  }

  return Array.from(parts).join(" ");
}

export function grantApprovalScopesAndResumeTask(
  state: PersonaDeskState,
  taskId: string,
  runId: string
): PersonaDeskState {
  const run = state.taskRuns.find((item) => item.id === runId && item.taskId === taskId);

  if (!run || run.status !== "blocked" || run.approvalRequests.length === 0) {
    return state;
  }

  const requestedScopes = run.approvalRequests.map((request) => request.requestedScope);
  const stateWithExpandedScope: PersonaDeskState = {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? {
            ...task,
            authorizationScope: mergeAuthorizationScope(task.authorizationScope, requestedScopes),
            status: "running"
          }
        : task
    )
  };

  return runAutonomyCycle(stateWithExpandedScope, taskId);
}

export function recordTaskAcceptance(
  state: PersonaDeskState,
  taskId: string,
  runId: string,
  decision: Exclude<TaskAcceptanceStatus, "pending">,
  note = ""
): PersonaDeskState {
  const run = state.taskRuns.find((item) => item.id === runId && item.taskId === taskId);
  const task = state.tasks.find((item) => item.id === taskId);

  if (!task || !run || run.status !== "delivered" || (run.acceptance?.status ?? "pending") !== "pending") {
    return state;
  }

  const acceptanceNote =
    note.trim() ||
    (decision === "accepted"
      ? "User accepted this deliverable."
      : "User requested revision before accepting this deliverable.");

  return {
    ...state,
    tasks: state.tasks.map((item) => (item.id === taskId ? { ...item, status: decision } : item)),
    taskRuns: state.taskRuns.map((item) =>
      item.id === runId
        ? {
            ...item,
            acceptance: {
              status: decision,
              note: acceptanceNote,
              decidedAt: nowIso()
            },
            logs: [...item.logs, `User acceptance decision: ${decision}. ${acceptanceNote}`]
          }
        : item
    )
  };
}

export function runTaskRevision(state: PersonaDeskState, taskId: string, previousRunId: string): PersonaDeskState {
  const task = state.tasks.find((item) => item.id === taskId);
  const previousRun = state.taskRuns.find((item) => item.id === previousRunId && item.taskId === taskId);

  if (!task || !previousRun || task.status !== "revision-requested" || previousRun.acceptance?.status !== "revision-requested") {
    return state;
  }

  const approvals = requiresApproval(task.goal, task.constraints, task.authorizationScope);
  const assignedCharacters = ["orion", "vale", "nova"];
  const taskTree = buildTaskTree(assignedCharacters);
  const revisionFeedback = previousRun.acceptance.note;

  if (approvals.length > 0) {
    const blockedRun: TaskRun = {
      id: createId("task-run"),
      taskId: task.id,
      revisionOfRunId: previousRun.id,
      status: "blocked",
      assignedCharacters,
      taskTree: taskTree.map((step) => ({ ...step, status: "blocked" })),
      executorCalls: [],
      decisions: [
        "Paused before revision because the task exceeded the authorization scope.",
        `Scheduled revision as ${taskScheduleSummary(task)}`,
        `Revision feedback preserved: ${revisionFeedback}`
      ],
      logs: ["PersonaDesk did not revise, publish, or delete anything."],
      validationResults: [],
      artifacts: [],
      approvalRequests: approvals,
      acceptance: null,
      finalSummary: "Task revision is blocked until the user grants additional permission."
    };

    return appendRun(state, task.id, blockedRun, "blocked");
  }

  const resolution = resolveTaskExecutor(state, task, "revision");
  const executor = resolution.executor;
  const executorPurpose = taskExecutorPurpose("revision");

  if (!canProduceTaskArtifact(executor)) {
    const executorCall = createExecutorCall(
      executor,
      executorPurpose,
      blockedExecutorCallStatus(executor),
      blockedExecutorOutput(executor)
    );
    const blockedRun: TaskRun = {
      id: createId("task-run"),
      taskId: task.id,
      revisionOfRunId: previousRun.id,
      status: "blocked",
      assignedCharacters,
      taskTree: taskTree.map((step) => ({ ...step, status: "blocked" })),
      executorCalls: [executorCall],
      decisions: [
        blockedExecutorDecision(executor, task, "revision"),
        `Scheduled revision as ${taskScheduleSummary(task)}`,
        ...(executor.status !== "available" ? [`Allowed executors: ${task.allowedExecutorIds.join(", ")}.`] : []),
        `Revision feedback preserved: ${revisionFeedback}`
      ],
      logs: [executorCall.outputSummary],
      validationResults: [],
      artifacts: [],
      approvalRequests: [],
      acceptance: null,
      finalSummary: blockedExecutorFinalSummary(executor)
    };

    return appendRun(state, task.id, blockedRun, "blocked");
  }

  const observationSummaries = authorizedObservationSummaries(state, task);
  const artifact = buildDeterministicArtifact(task, revisionFeedback, observationSummaries);
  const validationResults = validateArtifact(task, artifact);
  const passed = validationResults.every((result) => result.passed);
  const revisedRun: TaskRun = {
    id: createId("task-run"),
    taskId: task.id,
    revisionOfRunId: previousRun.id,
    status: passed ? "delivered" : "blocked",
    assignedCharacters,
    taskTree: taskTree.map((step) => ({ ...step, status: passed ? "completed" : "blocked" })),
    executorCalls: [
      ...resolution.fallbackCalls,
      createExecutorCall(
        executor,
        "Revise the deterministic task artifact from user feedback.",
        "succeeded",
        "Produced one revised local deterministic planning artifact in the app runtime. No model provider, local model server, or local agent process was called."
      )
    ],
    decisions: [
      ...resolution.fallbackDecisions,
      `Scheduled revision as ${taskScheduleSummary(task)}`,
      "Used the local deterministic planner to revise the delivered artifact.",
      `Applied user revision feedback: ${revisionFeedback}`,
      observationDecision(task, observationSummaries),
      "Validated revised output against the task goal, desired output, and privacy constraint."
    ],
    logs: [
      ...resolution.fallbackLogs,
      "Revision feedback reviewed by Orion.",
      "Revised artifact drafted by local deterministic planner.",
      observationLog(observationSummaries),
      "Vale validated the revised artifact against acceptance checks."
    ],
    validationResults,
    artifacts: [artifact],
    approvalRequests: [],
    acceptance: passed
      ? {
          status: "pending",
          note: "Awaiting final user acceptance for the revised delivery.",
          decidedAt: null
        }
      : null,
    finalSummary: passed
      ? "Delivered a revised local planning artifact."
      : "Revised artifact needs user review before delivery."
  };

  return {
    ...appendRun(state, task.id, revisedRun, passed ? "delivered" : "blocked"),
    memoryCandidates: [
      ...state.memoryCandidates,
      {
        id: createId("memory-candidate"),
        proposedLayer: "task",
        proposedOwnerCharacterId: null,
        proposedText: `PersonaDesk revised task: ${task.title}`,
        sourceEvent: revisedRun.id,
        sensitivity: "low",
        reason: "Revision outcome can help future task delivery.",
        status: "pending"
      }
    ]
  };
}

export function buildDeterministicArtifact(
  task: Task,
  revisionFeedback = "",
  observationSummaries: ObservationSummary[] = []
): Artifact {
  const checklist = [
    `Goal: ${task.goal}`,
    `Desired output: ${task.desiredOutput}`,
    `Priority: ${task.priority}`,
    `Deadline: ${task.deadline ?? "No deadline set."}`,
    `Constraint check: ${task.constraints || "No extra constraints provided."}`,
    "Keep raw imports, raw screen frames, and detailed local agent logs local by default.",
    "Confirm memory candidates before writing long-term memory.",
    "Show unconfigured providers as unavailable instead of pretending execution succeeded.",
    "Ask for user approval before destructive, publishing, payment, sensitive-data, or cloud-upload actions."
  ];
  const feedback = revisionFeedback.trim();

  if (feedback) {
    checklist.push(`Revision feedback addressed: ${feedback}`);
  }

  if (observationSummaries.length > 0) {
    checklist.push("Authorized observation summaries:");
    checklist.push(...observationSummaries.map((summary) => `${summary.appName}: ${summary.summary}`));
  }

  return {
    id: createId("artifact"),
    title: `${task.desiredOutput || "Task"} for ${task.title}`,
    content: checklist.map((item) => `- ${item}`).join("\n")
  };
}

export function validateArtifact(task: Task, artifact: Artifact): ValidationResult[] {
  const content = artifact.content.toLowerCase();
  const goalKeywords = task.goal
    .split(/\s+/)
    .map((word) => word.toLowerCase().replace(/[^a-z0-9-]/g, ""))
    .filter((word) => word.length > 4);

  const goalCovered =
    goalKeywords.length === 0 || goalKeywords.some((keyword) => content.includes(keyword));

  return [
    {
      id: createId("validation"),
      label: "Goal referenced",
      passed: goalCovered,
      detail: goalCovered ? "Artifact references the task goal." : "Artifact does not reference the task goal."
    },
    {
      id: createId("validation"),
      label: "Desired output referenced",
      passed: content.includes(task.desiredOutput.toLowerCase()),
      detail: "Artifact includes the requested output type."
    },
    {
      id: createId("validation"),
      label: "Privacy boundary present",
      passed: content.includes("raw screen frames") && content.includes("approval"),
      detail: "Artifact repeats local-first and approval boundaries."
    }
  ];
}
