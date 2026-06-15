import type {
  Executor,
  ExecutorConfiguration,
  ExecutorHealthCheck,
  ExecutorStatus,
  ExecutorType,
  PersonaDeskState
} from "./types";

export interface ExecutorRouteRequest {
  taskCharacterId: string;
  taskKind: string;
  requiresLocalAgent: boolean;
  allowedExecutorIds?: string[];
}

export interface DetectedLocalAgent {
  id: string;
  displayName: string;
  available: boolean;
  version: string | null;
}

export interface ExecutorConfigurationInput {
  endpoint: string;
  model: string;
  secretRef: string;
  notes: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptyConfiguration(): ExecutorConfiguration {
  return {
    endpoint: "",
    model: "",
    secretRef: "",
    notes: "",
    configuredAt: null
  };
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeConfiguration(input: ExecutorConfigurationInput): ExecutorConfiguration {
  return {
    endpoint: input.endpoint.trim(),
    model: input.model.trim(),
    secretRef: input.secretRef.trim(),
    notes: input.notes.trim(),
    configuredAt: nowIso()
  };
}

function hasConfiguration(configuration: ExecutorConfiguration): boolean {
  return Boolean(configuration.endpoint || configuration.model || configuration.secretRef || configuration.notes);
}

function requiredConfigurationLabels(executorType: ExecutorType): Array<keyof ExecutorConfiguration> {
  if (executorType === "model-api") {
    return ["endpoint", "model", "secretRef"];
  }

  if (executorType === "local-model" || executorType === "asr" || executorType === "tts" || executorType === "vision") {
    return ["endpoint", "model"];
  }

  return [];
}

function missingConfigurationLabels(executor: Executor): string[] {
  return requiredConfigurationLabels(executor.type).filter((key) => !executor.configuration[key]).map((key) => {
    if (key === "secretRef") {
      return "secret reference";
    }

    return key;
  });
}

function healthCheckResult(executor: Executor): Pick<ExecutorHealthCheck, "status" | "disclosure"> {
  if (executor.type === "deterministic") {
    return {
      status: "ready",
      disclosure: "Built-in deterministic executor is available locally. No network call or external tool launch was needed."
    };
  }

  if (executor.type === "local-agent") {
    return executor.status === "available"
      ? {
          status: "ready",
          disclosure: "Safe local detection found this agent. Real task use still requires task authorization."
        }
      : {
          status: "missing",
          disclosure: "Safe local detection has not found this agent. No process was launched by this health check."
        };
  }

  if (!hasConfiguration(executor.configuration)) {
    return {
      status: "skipped",
      disclosure: "No provider metadata is saved, so no health check was attempted."
    };
  }

  const missingLabels = missingConfigurationLabels(executor);

  if (missingLabels.length > 0) {
    return {
      status: "skipped",
      disclosure: `Provider metadata is incomplete; missing ${missingLabels.join(", ")}. No network call was attempted.`
    };
  }

  return {
    status: "configured-not-verified",
    disclosure:
      "Provider metadata is present, but Phase 1 health checks do not contact external services or read raw secrets."
  };
}

export function routeExecutorForTask(
  state: PersonaDeskState,
  request: ExecutorRouteRequest
): Executor {
  const character = state.characters.find((item) => item.id === request.taskCharacterId);
  const allowedIds = new Set(request.allowedExecutorIds?.filter(Boolean) ?? []);
  const candidateExecutors =
    allowedIds.size > 0 ? state.executors.filter((executor) => allowedIds.has(executor.id)) : state.executors;
  const defaultExecutor = candidateExecutors.find((item) => item.id === character?.defaultExecutorId);

  if (request.requiresLocalAgent) {
    const localAgent = candidateExecutors.find(
      (item) => item.type === "local-agent" && item.status === "available"
    );

    if (localAgent) {
      return localAgent;
    }
  }

  if (defaultExecutor?.status === "available") {
    return defaultExecutor;
  }

  const localPlanner = candidateExecutors.find(
    (item) => item.id === "local-planner" && item.status === "available"
  );

  return localPlanner ?? defaultExecutor ?? candidateExecutors[0] ?? state.executors[0];
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
      detectionSource: "safe-detection",
      configuration: emptyConfiguration()
    }));

  return {
    ...state,
    executors: [...mergedExecutors, ...newExecutors]
  };
}

export function configureExecutor(
  state: PersonaDeskState,
  executorId: string,
  input: ExecutorConfigurationInput
): PersonaDeskState {
  return {
    ...state,
    executors: state.executors.map((executor) => {
      if (executor.id !== executorId || executor.type === "deterministic" || executor.type === "local-agent") {
        return executor;
      }

      const configuration = normalizeConfiguration(input);
      const configured = hasConfiguration(configuration);
      const nextConfiguration = configured ? configuration : { ...configuration, configuredAt: null };

      return {
        ...executor,
        configuration: nextConfiguration,
        status: configured ? "configured" : "unconfigured",
        statusReason: configured
          ? "Configuration metadata saved. PersonaDesk does not store raw secrets and this provider is not verified as callable yet."
          : "No provider configuration saved.",
        detectionSource: "user-config"
      };
    })
  };
}

export function recordExecutorHealthCheck(state: PersonaDeskState, executorId: string): PersonaDeskState {
  const executor = state.executors.find((item) => item.id === executorId);

  if (!executor) {
    return state;
  }

  const result = healthCheckResult(executor);
  const healthCheck: ExecutorHealthCheck = {
    id: createId("executor-health"),
    executorId: executor.id,
    displayName: executor.displayName,
    executorType: executor.type,
    status: result.status,
    disclosure: result.disclosure,
    checkedAt: nowIso()
  };

  return {
    ...state,
    executorHealthChecks: [...state.executorHealthChecks, healthCheck]
  };
}

export function executorDisclosure(executor: Executor): string {
  if (executor.status === "available") {
    return `${executor.displayName} is available. ${executor.statusReason} Permission risk: ${executor.permissionRiskLevel}.`;
  }

  return `${executor.displayName} is ${executor.status}: ${executor.statusReason}`;
}
