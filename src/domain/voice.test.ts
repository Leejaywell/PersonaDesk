import { describe, expect, it } from "vitest";
import { createInitialState } from "./defaultState";
import { configureExecutor } from "./executors";
import { createVoiceRequest } from "./voice";

describe("voice requests", () => {
  it("records skipped ASR requests when the provider is unconfigured", () => {
    const state = createVoiceRequest(createInitialState(), {
      kind: "asr-transcript",
      executorId: "asr-provider",
      characterId: "mira",
      text: "Please transcribe this local note."
    });

    expect(state.voiceRequests).toHaveLength(1);
    expect(state.voiceRequests[0]).toMatchObject({
      kind: "asr-transcript",
      executorId: "asr-provider",
      characterId: "mira",
      routeTarget: "audit-only",
      status: "skipped",
      text: "Please transcribe this local note."
    });
    expect(state.voiceRequests[0].disclosure).toContain("no audio was captured");
  });

  it("routes ASR transcript text to an emotional companion chat", () => {
    const state = createVoiceRequest(createInitialState(), {
      kind: "asr-transcript",
      executorId: "asr-provider",
      characterId: "mira",
      routeTarget: "companion",
      text: "Can you stay with me while I sort this out?"
    });

    expect(state.voiceRequests).toHaveLength(1);
    expect(state.voiceRequests[0].routeTarget).toBe("companion");
    expect(state.voiceRequests[0].disclosure).toContain("routed to Mira");
    expect(state.conversationMessages).toHaveLength(2);
    expect(state.conversationMessages[0]).toMatchObject({
      characterId: "mira",
      speaker: "user",
      source: "voice-transcript",
      sourceEventId: state.voiceRequests[0].id,
      text: "Can you stay with me while I sort this out?"
    });
    expect(state.conversationMessages[1].text).toContain("local transcript text");
  });

  it("marks configured TTS requests as configured but not verified", () => {
    const configured = configureExecutor(createInitialState(), "tts-provider", {
      endpoint: "https://voice.example.test",
      model: "warm-voice",
      secretRef: "VOICE_API_KEY",
      notes: "Test metadata only"
    });
    const state = createVoiceRequest(configured, {
      kind: "tts-preview",
      executorId: "tts-provider",
      characterId: null,
      text: "Read this back later."
    });

    expect(state.voiceRequests[0].status).toBe("configured-not-verified");
    expect(state.voiceRequests[0].disclosure).toContain("no verified TTS adapter has run");
    expect(state.voiceRequests[0].disclosure).toContain("No audio was generated or played");
  });

  it("ignores mismatched executor types and empty requests", () => {
    const initial = createInitialState();
    const mismatched = createVoiceRequest(initial, {
      kind: "tts-preview",
      executorId: "asr-provider",
      text: "Wrong executor type"
    });
    const empty = createVoiceRequest(initial, {
      kind: "asr-transcript",
      executorId: "asr-provider",
      text: "   "
    });

    expect(mismatched).toBe(initial);
    expect(empty).toBe(initial);
  });
});
