import type { Executor, PersonaDeskState, VoiceRequest, VoiceRequestKind, VoiceRequestStatus } from "./types";

export interface VoiceRequestInput {
  kind: VoiceRequestKind;
  executorId: string;
  characterId?: string | null;
  text: string;
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

function voiceDisclosure(kind: VoiceRequestKind, executor: Executor, status: VoiceRequestStatus): string {
  if (status === "ready") {
    return kind === "asr-transcript"
      ? "Provider is available, but Phase 1 records this transcript request only; no microphone audio was captured automatically."
      : "Provider is available, but Phase 1 records this speech request only; no audio was played automatically.";
  }

  if (status === "configured-not-verified") {
    return kind === "asr-transcript"
      ? "Provider metadata exists, but no verified ASR adapter has run. No microphone audio was captured or uploaded."
      : "Provider metadata exists, but no verified TTS adapter has run. No audio was generated or played.";
  }

  return `${executor.displayName} is ${executor.status}; no audio was captured, uploaded, generated, or played.`;
}

export function createVoiceRequest(state: PersonaDeskState, input: VoiceRequestInput): PersonaDeskState {
  const text = input.text.trim();
  const executor = state.executors.find((item) => item.id === input.executorId);

  if (!text || !executor || executor.type !== expectedExecutorType(input.kind)) {
    return state;
  }

  const status = voiceStatus(executor);
  const request: VoiceRequest = {
    id: createId("voice-request"),
    kind: input.kind,
    executorId: executor.id,
    characterId: input.characterId ?? null,
    text,
    status,
    disclosure: voiceDisclosure(input.kind, executor, status),
    createdAt: nowIso()
  };

  return {
    ...state,
    voiceRequests: [...state.voiceRequests, request]
  };
}
