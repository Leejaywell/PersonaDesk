import type { FormEvent } from "react";
import type { CharacterSettingsUpdate } from "../domain/characters";
import type { SupervisionMode } from "../domain/types";

export interface TaskFormState {
  goal: string;
  constraints: string;
  desiredOutput: string;
  supervisionMode: SupervisionMode;
  authorizationScope: string;
}

export interface DraftFormState {
  text: string;
  image: File | null;
}

export interface ObservationFormState {
  allowedApps: string;
  summary: string;
  cloudVisionReason: string;
}

export interface AppActions {
  runTask: (event: FormEvent<HTMLFormElement>) => void;
  generateCharacterDraft: (event: FormEvent<HTMLFormElement>) => void;
  confirmCharacterDraft: (draftId: string) => void;
  rejectCharacterDraft: (draftId: string) => void;
  updateCharacterSettings: (characterId: string, update: CharacterSettingsUpdate) => void;
  confirmMemoryCandidate: (candidateId: string) => void;
  rejectMemoryCandidate: (candidateId: string) => void;
  startObservation: () => void;
  stopObservation: () => void;
  addObservationSummary: () => void;
  approveCloudVisionUpload: (sessionId: string, summaryId: string) => void;
  setSyncEnabled: (enabled: boolean) => void;
  scanLocalAgents: () => Promise<void>;
}
