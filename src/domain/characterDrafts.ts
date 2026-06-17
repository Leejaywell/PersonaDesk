import type { Character, CharacterDraft, PersonaDeskState } from "./types";

export interface CharacterDraftInput {
  textImport: string;
  imageFileName: string | null;
  imageMimeType: string | null;
  imageSizeBytes: number | null;
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function inferName(text: string): string {
  const explicit = text.match(/\b(?:name|called|named)\s+([A-Z][a-zA-Z]{2,20})/);

  if (explicit?.[1]) {
    return explicit[1];
  }

  if (text.toLowerCase().includes("review")) {
    return "Vera";
  }

  if (text.toLowerCase().includes("quiet")) {
    return "Luma";
  }

  return "Ari";
}

function inferRelationship(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes("reviewer") || lower.includes("checks")) {
    return "reviewer";
  }

  if (lower.includes("companion") || lower.includes("gentle")) {
    return "partner";
  }

  if (lower.includes("observer") || lower.includes("quiet")) {
    return "observer";
  }

  return "custom";
}

function inferKind(relationshipTemplate: string): "emotional" | "task" {
  return relationshipTemplate === "reviewer" ? "task" : "emotional";
}

function summarizePersona(text: string): string {
  const trimmed = text.trim();

  if (!trimmed) {
    return "A new PersonaDesk character draft awaiting user refinement.";
  }

  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}...` : trimmed;
}

function inferSpeakingStyle(text: string): string {
  const lower = text.toLowerCase();

  if (lower.includes("soft") || lower.includes("gentle")) {
    return "Soft, reassuring, and concise.";
  }

  if (lower.includes("focused") || lower.includes("review")) {
    return "Focused, structured, and evidence-oriented.";
  }

  return "Natural, direct, and configurable.";
}

export function createCharacterDraft(
  state: PersonaDeskState,
  input: CharacterDraftInput
): PersonaDeskState {
  const sourceText = input.textImport.trim();
  const relationshipTemplate = inferRelationship(sourceText);
  const kind = inferKind(relationshipTemplate);
  const hasConfiguredVision = state.executors.some(
    (executor) => executor.type === "vision" && executor.status === "available"
  );
  const disclosures = [
    "Text handling used deterministic local parsing; no cloud model was called."
  ];

  if (input.imageFileName && !hasConfiguredVision) {
    disclosures.push("Image handling used file metadata only; no vision model is configured.");
  }

  const draft: CharacterDraft = {
    id: createId("character-draft"),
    nameSuggestion: inferName(sourceText),
    kind,
    relationshipTemplate,
    personaSummary: summarizePersona(sourceText),
    speakingStyle: inferSpeakingStyle(sourceText),
    memoryPermissionProfile: kind === "task" ? ["task"] : ["relationship", "preferences", "shared-world"],
    appearanceAccent: kind === "task" ? "#2563eb" : "#b45309",
    sourceText,
    imageFileName: input.imageFileName,
    imageMimeType: input.imageMimeType,
    imageSizeBytes: input.imageSizeBytes,
    disclosures,
    createdAt: nowIso()
  };

  return {
    ...state,
    characterDrafts: [...state.characterDrafts, draft]
  };
}

export function confirmCharacterDraft(state: PersonaDeskState, draftId: string): PersonaDeskState {
  const draft = state.characterDrafts.find((item) => item.id === draftId);

  if (!draft) {
    return state;
  }

  const boundary = draft.kind === "task" ? "boundary-task-agent" : "boundary-emotional-companion";
  const character: Character = {
    id: draft.id,
    name: draft.nameSuggestion,
    kind: draft.kind,
    relationshipTemplate: draft.relationshipTemplate,
    customRelationship: draft.personaSummary,
    personaSummary: draft.personaSummary,
    speakingStyle: draft.speakingStyle,
    capabilityProfile: draft.kind === "task" ? ["review", "validation"] : ["companionship", "memory-reflection"],
    appearance: {
      backend: "static",
      avatarLabel: draft.nameSuggestion.slice(0, 1).toUpperCase(),
      accent: draft.appearanceAccent,
      supportedStates: ["idle", "listening", "speaking", "thinking", "watching", "waiting-for-user"]
    },
    voice: {
      providerId: null,
      voiceName: "Unconfigured voice",
      speed: 1,
      emotionalIntensity: draft.kind === "task" ? 0.2 : 0.6,
      status: "unconfigured"
    },
    proactiveBehavior: {
      frequency: draft.kind === "task" ? "quiet" : "balanced",
      triggers: draft.kind === "task" ? ["task-created"] : ["manual-mention", "observation-note"],
      doNotDisturb: false
    },
    memoryPermissionProfile: draft.memoryPermissionProfile,
    roleBoundaryId: boundary,
    defaultExecutorId: draft.kind === "task" ? "local-planner" : null
  };

  return {
    ...state,
    characters: [...state.characters, character],
    characterDrafts: state.characterDrafts.filter((item) => item.id !== draftId)
  };
}

export function rejectCharacterDraft(state: PersonaDeskState, draftId: string): PersonaDeskState {
  return {
    ...state,
    characterDrafts: state.characterDrafts.filter((item) => item.id !== draftId)
  };
}

export function createCustomCharacterDraft(
  state: PersonaDeskState,
  draft: Omit<CharacterDraft, "id" | "createdAt">
): PersonaDeskState {
  return {
    ...state,
    characterDrafts: [
      ...state.characterDrafts,
      {
        ...draft,
        id: createId("character-draft"),
        createdAt: nowIso()
      }
    ]
  };
}

