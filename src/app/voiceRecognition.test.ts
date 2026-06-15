import { afterEach, describe, expect, it } from "vitest";
import { captureRuntimeSpeechTranscript } from "./voiceRecognition";

class FakeSpeechRecognition {
  static result = "Captured runtime transcript";
  static error: string | null = null;
  continuous = false;
  interimResults = false;
  lang = "";
  maxAlternatives = 0;
  onresult: ((event: { results: Array<Array<{ transcript: string }>> }) => void) | null = null;
  onerror: ((event: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    if (FakeSpeechRecognition.error) {
      this.onerror?.({ error: FakeSpeechRecognition.error });
      return;
    }

    this.onresult?.({ results: [[{ transcript: FakeSpeechRecognition.result }]] });
  }

  stop() {}
}

describe("runtime speech recognition", () => {
  afterEach(() => {
    Reflect.deleteProperty(window, "SpeechRecognition");
    Reflect.deleteProperty(window, "webkitSpeechRecognition");
    FakeSpeechRecognition.result = "Captured runtime transcript";
    FakeSpeechRecognition.error = null;
  });

  it("reports unavailable when the runtime has no speech recognizer", async () => {
    const result = await captureRuntimeSpeechTranscript();

    expect(result.status).toBe("unavailable");
    expect(result.transcript).toBe("");
    expect(result.disclosure).toContain("No microphone capture was attempted");
  });

  it("captures a transcript from the browser speech recognition runtime", async () => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: FakeSpeechRecognition,
      configurable: true
    });

    const result = await captureRuntimeSpeechTranscript();

    expect(result.status).toBe("captured");
    expect(result.transcript).toBe("Captured runtime transcript");
    expect(result.disclosure).toContain("user-initiated capture");
    expect(result.disclosure).toContain("does not store raw audio");
  });

  it("reports denied microphone permission without keeping transcript text", async () => {
    FakeSpeechRecognition.error = "not-allowed";
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: FakeSpeechRecognition,
      configurable: true
    });

    const result = await captureRuntimeSpeechTranscript();

    expect(result.status).toBe("permission-denied");
    expect(result.transcript).toBe("");
    expect(result.disclosure).toContain("permission was denied");
  });
});
