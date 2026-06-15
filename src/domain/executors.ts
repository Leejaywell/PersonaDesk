import type { Executor, ExecutorStatus, PersonaDeskState } from "./types";

export interface ExecutorRouteRequest {
  taskCharacterId: string;
  taskKind: string;
  requiresLocalAgent: boolean;
}

export interface DetectedLocalAgent {
  id: string;
  displayName: string;
  available: boolean;
  version: string | null;
}

export function routeExecutorForTask(
  state: PersonaDeskState,
  request: ExecutorRouteRequest
): Executor {
  const character = state.characters.find((item) => item.id === request.taskCharacterId);
  const defaultExecutor = state.executors.find((item) => item.id === character?.defaultExecutorId);

  if (request.requiresLocalAgent) {
    const localAgent = state.executors.find(
      (item) => item.type === "local-agent" && item.status === "available"
    );

    if (localAgent) {
      return localAgent;
    }
  }

  if (defaultExecutor?.status === "available") {
    return defaultExecutor;
  }

  const localPlanner = state.executors.find(
    (item) => item.id === "local-planner" && item.status === "available"
  );

  return localPlanner ?? defaultExecutor ?? state.executors[0];
}

export function mergeDetectedLocalAgents(
  state: PersonaDeskState,
  detectedAgents: DetectedLocalAgent[]
): PersonaDeskState {
  const detectedById = new Map(detectedAgents.map((agent) => [agent.id, agent]));
  const mergedExecutors = state.executors.map((executor) => {
    const detected = detectedById.get(executor.id);

    if (!detected || executor.type !== "local-agent") {
      return executor;
    }

    const status: ExecutorStatus = detected.available ? "available" : "missing";

    return {
      ...executor,
      displayName: detected.displayName,
      status,
      statusReason: detected.available
        ? `Detected locally${detected.version ? ` (${detected.version})` : ""}. Use still requires task authorization.`
        : "Executable was not found during safe local detection.",
      detectionSource: "safe-detection"
    };
  });

  const existingIds = new Set(mergedExecutors.map((executor) => executor.id));
  const newExecutors: Executor[] = detectedAgents
    .filter((agent) => !existingIds.has(agent.id))
    .map((agent) => ({
      id: agent.id,
      displayName: agent.displayName,
      type: "local-agent",
      capabilities: ["local-agent"],
      modalities: ["text"],
      contextLimit: null,
      costProfile: "agent-dependent",
      latencyProfile: "process-dependent",
      permissionRiskLevel: "high",
      requiredSecret: null,
      status: agent.available ? "available" : "missing",
      statusReason: agent.available
        ? `Detected locally${agent.version ? ` (${agent.version})` : ""}. Use still requires task authorization.`
        : "Executable was not found during safe local detection.",
      detectionSource: "safe-detection"
    }));

  return {
    ...state,
    executors: [...mergedExecutors, ...newExecutors]
  };
}

export function executorDisclosure(executor: Executor): string {
  if (executor.status === "available") {
    return `${executor.displayName} is available. ${executor.statusReason} Permission risk: ${executor.permissionRiskLevel}.`;
  }

  return `${executor.displayName} is ${executor.status}: ${executor.statusReason}`;
}
