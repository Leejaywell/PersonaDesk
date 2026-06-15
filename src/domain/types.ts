export type CharacterKind = "emotional" | "task";
export type ExecutorType =
  | "model-api"
  | "local-model"
  | "local-agent"
  | "asr"
  | "tts"
  | "vision"
  | "deterministic";
export type ExecutorStatus = "available" | "unconfigured" | "missing" | "disabled";
export type MemoryLayer =
  | "user-profile"
  | "shared-world"
  | "character-private"
  | "task"
  | "short-term"
  | "import-summary";
export type Sensitivity = "low" | "medium" | "high";
export type TaskStatus = "draft" | "running" | "delivered" | "blocked" | "failed";
export type TaskRunStatus = "planning" | "running" | "validating" | "delivered" | "blocked" | "failed";
export type SupervisionMode = "supervised" | "unsupervised";
export type RiskLevel = "low" | "medium" | "high";

export interface RoleBoundary {
  id: string;
  label: string;
  canObserveTasks: boolean;
  canCommentInTaskRoom: boolean;
  canTalkToTaskCharacters: boolean;
  canPrivateChatUser: boolean;
  canCallExecutors: boolean;
  canAccessObservationSummaries: boolean;
  canRequestMemoryWrites: boolean;
  canValidateTaskOutputs: boolean;
}

export interface AppearanceProfile {
  backend: "static" | "state-pack" | "live2d-reserved" | "spine-reserved";
  avatarLabel: string;
  accent: string;
  supportedStates: string[];
}

export interface VoiceProfile {
  providerId: string | null;
  voiceName: string;
  speed: number;
  emotionalIntensity: number;
  status: ExecutorStatus;
}

export interface ProactiveBehaviorProfile {
  frequency: "quiet" | "balanced" | "expressive";
  triggers: string[];
  doNotDisturb: boolean;
}

export interface Character {
  id: string;
  name: string;
  kind: CharacterKind;
  relationshipTemplate: string;
  customRelationship: string;
  personaSummary: string;
  speakingStyle: string;
  capabilityProfile: string[];
  appearance: AppearanceProfile;
  voice: VoiceProfile;
  proactiveBehavior: ProactiveBehaviorProfile;
  memoryPermissionProfile: string[];
  roleBoundaryId: string;
  defaultExecutorId: string | null;
}

export interface CharacterDraft {
  id: string;
  nameSuggestion: string;
  kind: CharacterKind;
  relationshipTemplate: string;
  personaSummary: string;
  speakingStyle: string;
  memoryPermissionProfile: string[];
  appearanceAccent: string;
  sourceText: string;
  imageFileName: string | null;
  imageMimeType: string | null;
  imageSizeBytes: number | null;
  disclosures: string[];
  createdAt: string;
}

export interface Executor {
  id: string;
  displayName: string;
  type: ExecutorType;
  capabilities: string[];
  modalities: string[];
  contextLimit: number | null;
  costProfile: string;
  latencyProfile: string;
  permissionRiskLevel: RiskLevel;
  requiredSecret: string | null;
  status: ExecutorStatus;
  statusReason: string;
  detectionSource: string;
}

export interface Task {
  id: string;
  title: string;
  goal: string;
  constraints: string;
  desiredOutput: string;
  supervisionMode: SupervisionMode;
  authorizationScope: string;
  status: TaskStatus;
  createdBy: "user";
  createdAt: string;
}

export interface TaskStep {
  id: string;
  title: string;
  ownerCharacterId: string;
  status: "planned" | "completed" | "blocked";
}

export interface ExecutorCall {
  executorId: string;
  characterId: string;
  purpose: string;
  status: "succeeded" | "failed" | "skipped";
  disclosure: string;
}

export interface Artifact {
  id: string;
  title: string;
  content: string;
}

export interface ValidationResult {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ApprovalRequest {
  id: string;
  reason: string;
  requestedScope: string;
  riskLevel: RiskLevel;
}

export interface TaskRun {
  id: string;
  taskId: string;
  status: TaskRunStatus;
  assignedCharacters: string[];
  taskTree: TaskStep[];
  executorCalls: ExecutorCall[];
  decisions: string[];
  logs: string[];
  validationResults: ValidationResult[];
  artifacts: Artifact[];
  approvalRequests: ApprovalRequest[];
  finalSummary: string;
}

export interface MemoryItem {
  id: string;
  layer: MemoryLayer;
  ownerCharacterId: string | null;
  text: string;
  source: string;
  sensitivity: Sensitivity;
  createdAt: string;
  updatedAt: string;
  syncPolicy: "local-only" | "sync-allowed";
}

export interface MemoryCandidate {
  id: string;
  proposedLayer: MemoryLayer;
  proposedOwnerCharacterId: string | null;
  proposedText: string;
  sourceEvent: string;
  sensitivity: Sensitivity;
  reason: string;
  status: "pending" | "confirmed" | "rejected";
}

export interface ObservationSummary {
  id: string;
  appName: string;
  summary: string;
  createdAt: string;
}

export interface ObservationSession {
  id: string;
  allowedApps: string[];
  active: boolean;
  localSummaryStream: ObservationSummary[];
  cloudUploadApprovals: string[];
  retentionPolicy: "summaries-only" | "discard-on-stop";
  startedAt: string;
  endedAt: string | null;
}

export interface SyncProfile {
  enabled: boolean;
  accountId: string | null;
  allowedDataClasses: string[];
  localOnlyClasses: string[];
  conflictPolicy: "local-first-review";
  lastSyncStatus: "never" | "synced" | "conflict" | "failed";
}

export interface PersonaDeskState {
  characters: Character[];
  characterDrafts: CharacterDraft[];
  roleBoundaries: Record<string, RoleBoundary>;
  executors: Executor[];
  tasks: Task[];
  taskRuns: TaskRun[];
  memories: MemoryItem[];
  memoryCandidates: MemoryCandidate[];
  observationSessions: ObservationSession[];
  syncProfile: SyncProfile;
}
