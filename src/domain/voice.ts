import { sendCompanionMessage } from "./conversation";
import type {
  Executor,
  PersonaDeskState,
  VoiceInputSource,
  VoicePlaybackStatus,
  VoiceRequest,
  VoiceRequestKind,
  VoiceRequestStatus,
  VoiceRouteTarget
} from "./types";

export interface VoiceRequestInput {
  kind: VoiceRequestKind;
  executorId: string;
  characterId?: string | null;
  routeTarget?: VoiceRouteTarget;
  inputSource?: VoiceInputSource;
  captureDisclosure?: string;
  text: string;
}

export interface VoicePlaybackResult {
  status: Exclude<VoicePlaybackStatus, "not-requested">;
  disclosure: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function expectedExecutorType(kind: VoiceRequestKind): Executor["type"] {
  return kind === "asr-transcript" ? "asr" : "tts";
}

function voiceStatus(executor: Executor): VoiceRequestStatus {
  if (executor.status === "available") {
    return "ready";
  }

  if (executor.status === "configured") {
    return "configured-not-verified";
  }

  return "skipped";
}

function normalizeRouteTarget(kind: VoiceRequestKind, routeTarget: VoiceRouteTarget | undefined): VoiceRouteTarget {
  if (kind !== "asr-transcript") {
    return "audit-only";
  }

  return routeTarget ?? "audit-only";
}

function routeDisclosure(routeTarget: VoiceRouteTarget, characterName: string | undefined): string {
  if (routeTarget === "companion") {
    return characterName
      ? ` Transcript text was routed to ${characterName}'s local companion chat.`
      : " Companion routing was requested, but no eligible emotional character was selected.";
  }

  if (routeTarget === "task-goal") {
    return " Transcript text is available to copy into the task goal draft locally.";
  }

  return " Transcript text was kept as a local audit record only.";
}

function voiceDisclosure(
  kind: VoiceRequestKind,
  executor: Executor,
  status: VoiceRequestStatus,
  routeTarget: VoiceRouteTarget,
  characterName: string | undefined,
  inputSource: VoiceInputSource,
  captureDisclosure: string
): string {
  const routeDetail = kind === "asr-transcript" ? routeDisclosure(routeTarget, characterName) : "";

  if (kind === "asr-transcript" && inputSource === "runtime-speech-recognition") {
    return `${captureDisclosure}${routeDetail}`;
  }

  if (status === "ready") {
    const base = kind === "asr-transcript"
      ? "Provider is available, but Phase 1 records this transcript request only; no microphone audio was captured automatically."
      : "Provider is available, but Phase 1 records this speech request only; no audio was played automatically.";

    return `${base}${routeDetail}`;
  }

  if (status === "configured-not-verified") {
    const base = kind === "asr-transcript"
      ? "Provider metadata exists, but no verified ASR adapter has run. No microphone audio was captured or uploaded."
      : "Provider metadata exists, but no verified TTS adapter has run. No audio was generated or played.";

    return `${base}${routeDetail}`;
  }

  return `${executor.displayName} is ${executor.status}; no audio was captured, uploaded, generated, or played.${routeDetail}`;
}

function initialPlaybackDisclosure(kind: VoiceRequestKind): string {
  return kind === "tts-preview"
    ? "Speech playback has not been requested yet."
    : "Playback does not apply to ASR transcript requests.";
}

function defaultCaptureDisclosure(kind: VoiceRequestKind, inputSource: VoiceInputSource): string {
  if (kind !== "asr-transcript") {
    return "Capture disclosure does not apply to TTS preview requests.";
  }

  if (inputSource === "runtime-speech-recognition") {
    return "Runtime speech recognition supplied this transcript after a user-initiated capture. PersonaDesk stores transcript text only and does not store raw audio.";
  }

  return "Transcript text was entered manually. No microphone audio was captured.";
}

export function createVoiceRequest(state: PersonaDeskState, input: VoiceRequestInput): PersonaDeskState {
  const text = input.text.trim();
  const executor = state.executors.find((item) => item.id === input.executorId);

  if (!text || !executor || executor.type !== expectedExecutorType(input.kind)) {
    return state;
  }

  const status = voiceStatus(executor);
  const routeTarget = normalizeRouteTarget(input.kind, input.routeTarget);
  const inputSource = input.inputSource ?? "manual-text";
  const captureDisclosure = input.captureDisclosure?.trim() || defaultCaptureDisclosure(input.kind, inputSource);
  const routeCharacter =
    routeTarget === "companion"
      ? state.characters.find((character) => character.id === input.characterId && character.kind === "emotional")
      : undefined;
  const request: VoiceRequest = {
    id: createId("voice-request"),
    kind: input.kind,
    executorId: executor.id,
    characterId: input.characterId ?? null,
    routeTarget,
    inputSource,
    text,
    status,
    playbackStatus: "not-requested",
    playbackDisclosure: initialPlaybackDisclosure(input.kind),
    playedAt: null,
    captureDisclosure,
    disclosure: voiceDisclosure(input.kind, executor, status, routeTarget, routeCharacter?.name, inputSource, captureDisclosure),
    createdAt: nowIso()
  };
  const nextState = {
    ...state,
    voiceRequests: [...state.voiceRequests, request]
  };

  if (routeTarget !== "companion" || !routeCharacter) {
    return nextState;
  }

  return sendCompanionMessage(nextState, {
    characterId: routeCharacter.id,
    text,
    source: "voice-transcript",
    sourceEventId: request.id
  });
}

export function recordVoicePlaybackResult(
  state: PersonaDeskState,
  requestId: string,
  result: VoicePlaybackResult
): PersonaDeskState {
  let updated = false;
  const voiceRequests = state.voiceRequests.map((request) => {
    if (request.id !== requestId || request.kind !== "tts-preview") {
      return request;
    }

    updated = true;

    return {
      ...request,
      playbackStatus: result.status,
      playbackDisclosure: result.disclosure,
      playedAt: result.status === "played" ? nowIso() : request.playedAt
    };
  });

  return updated ? { ...state, voiceRequests } : state;
}
