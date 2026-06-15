import type { FormEvent } from "react";
import type { CharacterSettingsUpdate } from "../domain/characters";
import type { ExecutorConfigurationInput } from "../domain/executors";
import type { MemoryCandidateReview } from "../domain/memory";
import type { SupervisionMode, TaskAcceptanceStatus } from "../domain/types";
import type { VoiceRequestInput } from "../domain/voice";

export interface TaskFormState {
  goal: string;
  constraints: string;
  desiredOutput: string;
  supervisionMode: SupervisionMode;
  authorizationScope: string;
  allowedExecutorIds: string[];
}

export interface DraftFormState {
  text: string;
  image: File | null;
}

export interface ObservationFormState {
  allowedApps: string;
  sourceApp: string;
  summary: string;
  cloudVisionReason: string;
}

export interface AppActions {
  runTask: (event: FormEvent<HTMLFormElement>) => void;
  grantTaskApproval: (taskId: string, runId: string) => void;
  sendCompanionMessage: (characterId: string, text: string) => void;
  generateCharacterDraft: (event: FormEvent<HTMLFormElement>) => void;
  confirmCharacterDraft: (draftId: string) => void;
  rejectCharacterDraft: (draftId: string) => void;
  updateCharacterSettings: (characterId: string, update: CharacterSettingsUpdate) => void;
  confirmMemoryCandidate: (candidateId: string, review?: MemoryCandidateReview) => void;
  rejectMemoryCandidate: (candidateId: string) => void;
  startObservation: () => void;
  stopObservation: () => void;
  addObservationSummary: () => void;
  approveCloudVisionUpload: (sessionId: string, summaryId: string) => void;
  setSyncEnabled: (enabled: boolean) => void;
  prepareSyncPreview: () => void;
  scanLocalAgents: () => Promise<void>;
  configureExecutor: (executorId: string, configuration: ExecutorConfigurationInput) => void;
  createVoiceRequest: (input: VoiceRequestInput) => void;
  recordTaskAcceptance: (
    taskId: string,
    runId: string,
    decision: Exclude<TaskAcceptanceStatus, "pending">,
    note?: string
  ) => void;
  runTaskRevision: (taskId: string, runId: string) => void;
}
