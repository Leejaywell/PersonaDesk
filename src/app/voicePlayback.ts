import type { VoicePlaybackResult } from "../domain/voice";

const LOCAL_TTS_SUCCESS =
  "Local browser speech synthesis accepted this TTS preview. No cloud voice provider was called.";

export async function playLocalSpeechPreview(text: string): Promise<VoicePlaybackResult> {
  if (typeof window.speechSynthesis === "undefined" || typeof window.SpeechSynthesisUtterance === "undefined") {
    return {
      status: "unavailable",
      disclosure: "Local browser speech synthesis is not available in this runtime. No cloud voice provider was called."
    };
  }

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: VoicePlaybackResult) => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(result);
    };
    const utterance = new SpeechSynthesisUtterance(text);

    utterance.onstart = () => {
      settle({
        status: "played",
        disclosure: LOCAL_TTS_SUCCESS
      });
    };
    utterance.onend = () => {
      settle({
        status: "played",
        disclosure: LOCAL_TTS_SUCCESS
      });
    };
    utterance.onerror = (event) => {
      settle({
        status: "failed",
        disclosure: `Local browser speech synthesis failed${event.error ? `: ${event.error}` : ""}. No cloud voice provider was called.`
      });
    };

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
      window.setTimeout(() => {
        if (!settled && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
          settle({
            status: "played",
            disclosure: LOCAL_TTS_SUCCESS
          });
        }
      }, 500);
      window.setTimeout(() => {
        settle({
          status: "failed",
          disclosure: "Local browser speech synthesis did not start before the timeout. No cloud voice provider was called."
        });
      }, 2500);
    } catch (error) {
      settle({
        status: "failed",
        disclosure: `Local browser speech synthesis failed: ${error instanceof Error ? error.message : "unknown error"}. No cloud voice provider was called.`
      });
    }
  });
}
