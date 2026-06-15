import { executorDisclosure, routeExecutorForTask } from "./executors";
import type {
  ApprovalRequest,
  Artifact,
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

export function createTask(state: PersonaDeskState, input: CreateTaskInput): PersonaDeskState {
  const goal = input.goal.trim();
  const task: Task = {
    id: createId("task"),
    title: goal.length > 64 ? `${goal.slice(0, 61)}...` : goal,
    goal,
    constraints: input.constraints.trim(),
    desiredOutput: input.desiredOutput.trim(),
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
      logs: ["PersonaDesk did not run tools or publish/delete anything."],
      validationResults: [],
      artifacts: [],
      approvalRequests: approvals,
      acceptance: null,
      finalSummary: "Task is blocked until the user grants additional permission."
    };

    return appendRun(state, task.id, blockedRun, "blocked");
  }

  const executor = routeExecutorForTask(state, {
    taskCharacterId: "orion",
    taskKind: "planning",
    requiresLocalAgent: false,
    allowedExecutorIds: task.allowedExecutorIds
  });

  if (executor.status !== "available") {
    const blockedRun: TaskRun = {
      id: createId("task-run"),
      taskId: task.id,
      revisionOfRunId: null,
      status: "blocked",
      assignedCharacters,
      taskTree: taskTree.map((step) => ({ ...step, status: "blocked" })),
      executorCalls: [
        {
          executorId: executor.id,
          characterId: "orion",
          purpose: "Create a task plan and delivery artifact with an allowed executor.",
          status: "skipped",
          disclosure: executorDisclosure(executor)
        }
      ],
      decisions: [
        "Paused because the task allowed-executor list does not include an available planning executor.",
        `Allowed executors: ${task.allowedExecutorIds.join(", ")}.`
      ],
      logs: ["No task artifact was produced because no allowed executor was available."],
      validationResults: [],
      artifacts: [],
      approvalRequests: [],
      acceptance: null,
      finalSummary: "Task is blocked because no allowed executor is available."
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
      {
        executorId: executor.id,
        characterId: "orion",
        purpose: "Create a deterministic task plan and delivery artifact.",
        status: executor.status === "available" ? "succeeded" : "skipped",
        disclosure: executorDisclosure(executor)
      }
    ],
    decisions: [
      "Used the local deterministic planner because no configured model API is required for text planning.",
      observationDecision(task, observationSummaries),
      "Validated output against the user goal, desired output, and privacy constraint."
    ],
    logs: [
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

  const executor = routeExecutorForTask(state, {
    taskCharacterId: "orion",
    taskKind: "revision",
    requiresLocalAgent: false,
    allowedExecutorIds: task.allowedExecutorIds
  });

  if (executor.status !== "available") {
    const blockedRun: TaskRun = {
      id: createId("task-run"),
      taskId: task.id,
      revisionOfRunId: previousRun.id,
      status: "blocked",
      assignedCharacters,
      taskTree: taskTree.map((step) => ({ ...step, status: "blocked" })),
      executorCalls: [
        {
          executorId: executor.id,
          characterId: "orion",
          purpose: "Revise the delivered artifact with an allowed executor.",
          status: "skipped",
          disclosure: executorDisclosure(executor)
        }
      ],
      decisions: [
        "Paused because the task allowed-executor list does not include an available revision executor.",
        `Revision feedback preserved: ${revisionFeedback}`
      ],
      logs: ["No revised artifact was produced because no allowed executor was available."],
      validationResults: [],
      artifacts: [],
      approvalRequests: [],
      acceptance: null,
      finalSummary: "Task revision is blocked because no allowed executor is available."
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
      {
        executorId: executor.id,
        characterId: "orion",
        purpose: "Revise the deterministic task artifact from user feedback.",
        status: "succeeded",
        disclosure: executorDisclosure(executor)
      }
    ],
    decisions: [
      "Used the local deterministic planner to revise the delivered artifact.",
      `Applied user revision feedback: ${revisionFeedback}`,
      observationDecision(task, observationSummaries),
      "Validated revised output against the task goal, desired output, and privacy constraint."
    ],
    logs: [
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
