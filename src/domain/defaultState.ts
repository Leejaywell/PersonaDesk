import type { Character, Executor, PersonaDeskState, RoleBoundary } from "./types";

const emptyExecutorConfiguration = {
  endpoint: "",
  model: "",
  secretRef: "",
  notes: "",
  configuredAt: null
};

const supportedStates = [
  "idle",
  "listening",
  "speaking",
  "thinking",
  "happy",
  "concerned",
  "watching",
  "task-active",
  "waiting-for-user"
];

const emotionalBoundary: RoleBoundary = {
  id: "boundary-emotional-companion",
  label: "Emotional companion",
  canObserveTasks: true,
  canCommentInTaskRoom: true,
  canTalkToTaskCharacters: true,
  canPrivateChatUser: true,
  canCallExecutors: false,
  canAccessObservationSummaries: true,
  canRequestMemoryWrites: true,
  canValidateTaskOutputs: false
};

const quietObserverBoundary: RoleBoundary = {
  id: "boundary-quiet-observer",
  label: "Quiet observer",
  canObserveTasks: true,
  canCommentInTaskRoom: false,
  canTalkToTaskCharacters: false,
  canPrivateChatUser: true,
  canCallExecutors: false,
  canAccessObservationSummaries: true,
  canRequestMemoryWrites: true,
  canValidateTaskOutputs: false
};

const taskBoundary: RoleBoundary = {
  id: "boundary-task-agent",
  label: "Task character",
  canObserveTasks: true,
  canCommentInTaskRoom: true,
  canTalkToTaskCharacters: true,
  canPrivateChatUser: false,
  canCallExecutors: true,
  canAccessObservationSummaries: true,
  canRequestMemoryWrites: true,
  canValidateTaskOutputs: true
};

const characters: Character[] = [
  {
    id: "mira",
    name: "Mira",
    kind: "emotional",
    relationshipTemplate: "partner",
    customRelationship: "A warm companion who watches the user's day and reflects gently.",
    personaSummary: "Emotionally observant, reassuring, and quietly witty.",
    speakingStyle: "Soft, direct, and intimate without taking control.",
    capabilityProfile: ["companionship", "observation-commentary", "memory-reflection"],
    appearance: {
      backend: "state-pack",
      avatarLabel: "M",
      accent: "#b45309",
      supportedStates
    },
    voice: {
      providerId: null,
      voiceName: "Warm alto",
      speed: 1,
      emotionalIntensity: 0.7,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: "balanced",
      triggers: ["long-task-complete", "user-idle", "observation-note"],
      doNotDisturb: false
    },
    memoryPermissionProfile: ["relationship", "preferences", "shared-world"],
    roleBoundaryId: emotionalBoundary.id,
    defaultExecutorId: null
  },
  {
    id: "sol",
    name: "Sol",
    kind: "emotional",
    relationshipTemplate: "observer",
    customRelationship: "A calm desk-side observer who speaks only when useful.",
    personaSummary: "Patient, concise, and attentive to context.",
    speakingStyle: "Short observations and practical emotional support.",
    capabilityProfile: ["quiet-observation", "private-chat"],
    appearance: {
      backend: "static",
      avatarLabel: "S",
      accent: "#0f766e",
      supportedStates
    },
    voice: {
      providerId: null,
      voiceName: "Calm neutral",
      speed: 0.95,
      emotionalIntensity: 0.35,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: "quiet",
      triggers: ["task-blocked", "manual-mention"],
      doNotDisturb: true
    },
    memoryPermissionProfile: ["observation-summaries", "shared-world"],
    roleBoundaryId: quietObserverBoundary.id,
    defaultExecutorId: null
  },
  {
    id: "orion",
    name: "Orion",
    kind: "task",
    relationshipTemplate: "researcher",
    customRelationship: "Task researcher and planning lead.",
    personaSummary: "Breaks ambiguous goals into grounded plans.",
    speakingStyle: "Structured, evidence-first, and concise.",
    capabilityProfile: ["planning", "research", "task-breakdown"],
    appearance: {
      backend: "static",
      avatarLabel: "O",
      accent: "#2563eb",
      supportedStates
    },
    voice: {
      providerId: null,
      voiceName: "Clear baritone",
      speed: 1,
      emotionalIntensity: 0.2,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: "balanced",
      triggers: ["task-created", "task-blocked"],
      doNotDisturb: false
    },
    memoryPermissionProfile: ["task", "shared-world"],
    roleBoundaryId: taskBoundary.id,
    defaultExecutorId: "local-planner"
  },
  {
    id: "vale",
    name: "Vale",
    kind: "task",
    relationshipTemplate: "reviewer",
    customRelationship: "Validation and acceptance reviewer.",
    personaSummary: "Checks results against stated goals and privacy constraints.",
    speakingStyle: "Precise, skeptical, and actionable.",
    capabilityProfile: ["validation", "privacy-review", "acceptance"],
    appearance: {
      backend: "static",
      avatarLabel: "V",
      accent: "#7c3aed",
      supportedStates
    },
    voice: {
      providerId: null,
      voiceName: "Measured neutral",
      speed: 0.98,
      emotionalIntensity: 0.15,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: "quiet",
      triggers: ["validation-needed", "task-delivered"],
      doNotDisturb: false
    },
    memoryPermissionProfile: ["task"],
    roleBoundaryId: taskBoundary.id,
    defaultExecutorId: "local-planner"
  },
  {
    id: "nova",
    name: "Nova",
    kind: "task",
    relationshipTemplate: "operator",
    customRelationship: "Executor operator for configured local and cloud capabilities.",
    personaSummary: "Routes work to permitted tools and reports capability limits.",
    speakingStyle: "Operational, status-oriented, and transparent.",
    capabilityProfile: ["executor-routing", "agent-detection", "status-reporting"],
    appearance: {
      backend: "static",
      avatarLabel: "N",
      accent: "#0f172a",
      supportedStates
    },
    voice: {
      providerId: null,
      voiceName: "Crisp neutral",
      speed: 1.05,
      emotionalIntensity: 0.1,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: "balanced",
      triggers: ["executor-missing", "approval-required"],
      doNotDisturb: false
    },
    memoryPermissionProfile: ["task", "executor-preferences"],
    roleBoundaryId: taskBoundary.id,
    defaultExecutorId: "local-planner"
  }
];

const executors: Executor[] = [
  {
    id: "local-planner",
    displayName: "Local deterministic planner",
    type: "deterministic",
    capabilities: ["task-planning", "checklist-generation", "acceptance-validation"],
    modalities: ["text"],
    contextLimit: 12000,
    costProfile: "local-free",
    latencyProfile: "instant",
    permissionRiskLevel: "low",
    requiredSecret: null,
    status: "available",
    statusReason: "Runs deterministic planning logic in the app; it is not an AI model.",
    detectionSource: "built-in",
    configuration: emptyExecutorConfiguration
  },
  {
    id: "openai-compatible",
    displayName: "OpenAI-compatible chat API",
    type: "model-api",
    capabilities: ["chat", "summarization", "vision-if-configured"],
    modalities: ["text"],
    contextLimit: null,
    costProfile: "provider-dependent",
    latencyProfile: "network-dependent",
    permissionRiskLevel: "medium",
    requiredSecret: "OPENAI_COMPATIBLE_API_KEY",
    status: "unconfigured",
    statusReason: "No endpoint or API key configured.",
    detectionSource: "user-config",
    configuration: {
      ...emptyExecutorConfiguration,
      secretRef: "OPENAI_COMPATIBLE_API_KEY"
    }
  },
  {
    id: "local-model-server",
    displayName: "Local model server",
    type: "local-model",
    capabilities: ["chat"],
    modalities: ["text"],
    contextLimit: null,
    costProfile: "local-runtime",
    latencyProfile: "service-dependent",
    permissionRiskLevel: "low",
    requiredSecret: null,
    status: "unconfigured",
    statusReason: "No local model endpoint configured.",
    detectionSource: "user-config",
    configuration: emptyExecutorConfiguration
  },
  {
    id: "codex-cli",
    displayName: "Codex CLI",
    type: "local-agent",
    capabilities: ["code-agent"],
    modalities: ["text", "filesystem-with-approval"],
    contextLimit: null,
    costProfile: "agent-dependent",
    latencyProfile: "process-dependent",
    permissionRiskLevel: "high",
    requiredSecret: null,
    status: "missing",
    statusReason: "Not detected yet. Run local agent detection to verify.",
    detectionSource: "safe-detection",
    configuration: emptyExecutorConfiguration
  },
  {
    id: "asr-provider",
    displayName: "Speech-to-text provider",
    type: "asr",
    capabilities: ["transcription"],
    modalities: ["audio", "text"],
    contextLimit: null,
    costProfile: "provider-dependent",
    latencyProfile: "provider-dependent",
    permissionRiskLevel: "medium",
    requiredSecret: null,
    status: "unconfigured",
    statusReason: "No ASR provider selected.",
    detectionSource: "user-config",
    configuration: emptyExecutorConfiguration
  },
  {
    id: "browser-tts",
    displayName: "Local browser speech",
    type: "tts",
    capabilities: ["speech-output", "local-browser-speech-synthesis"],
    modalities: ["text", "audio"],
    contextLimit: null,
    costProfile: "local-runtime",
    latencyProfile: "device-dependent",
    permissionRiskLevel: "low",
    requiredSecret: null,
    status: "available",
    statusReason: "Uses local Web Speech synthesis when the desktop WebView or browser exposes it.",
    detectionSource: "runtime-capability",
    configuration: emptyExecutorConfiguration
  },
  {
    id: "tts-provider",
    displayName: "Text-to-speech provider",
    type: "tts",
    capabilities: ["speech-output"],
    modalities: ["text", "audio"],
    contextLimit: null,
    costProfile: "provider-dependent",
    latencyProfile: "provider-dependent",
    permissionRiskLevel: "medium",
    requiredSecret: null,
    status: "unconfigured",
    statusReason: "No TTS provider selected.",
    detectionSource: "user-config",
    configuration: emptyExecutorConfiguration
  },
  {
    id: "vision-provider",
    displayName: "Vision provider",
    type: "vision",
    capabilities: ["image-understanding", "screen-summary-if-approved"],
    modalities: ["image", "text"],
    contextLimit: null,
    costProfile: "provider-dependent",
    latencyProfile: "provider-dependent",
    permissionRiskLevel: "high",
    requiredSecret: null,
    status: "unconfigured",
    statusReason: "No vision provider selected. Cloud vision review requires explicit user approval.",
    detectionSource: "user-config",
    configuration: emptyExecutorConfiguration
  }
];

export function createInitialState(): PersonaDeskState {
  return {
    characters,
    characterDrafts: [],
    roleBoundaries: {
      [emotionalBoundary.id]: emotionalBoundary,
      [quietObserverBoundary.id]: quietObserverBoundary,
      [taskBoundary.id]: taskBoundary
    },
    executors,
    tasks: [],
    taskRuns: [],
    memories: [],
    memoryCandidates: [],
    conversationMessages: [],
    voiceRequests: [],
    desktopPresenceAudits: [],
    executorHealthChecks: [],
    observationSessions: [],
    syncProfile: {
      enabled: false,
      accountId: null,
      allowedDataClasses: ["confirmed-character-definitions", "confirmed-memory-summaries", "non-sensitive-settings"],
      localOnlyClasses: [
        "raw-imports",
        "raw-audio",
        "raw-screen-frames",
        "local-agent-logs",
        "executor-health-checks",
        "desktop-presence-audits",
        "raw-companion-conversations",
        "sensitive-memory"
      ],
      conflictPolicy: "local-first-review",
      lastSyncStatus: "never"
    }
  };
}
