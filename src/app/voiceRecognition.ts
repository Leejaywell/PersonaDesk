export type RuntimeSpeechRecognitionStatus = "captured" | "unavailable" | "permission-denied" | "failed";

export interface RuntimeSpeechRecognitionResult {
  status: RuntimeSpeechRecognitionStatus;
  transcript: string;
  disclosure: string;
}

type SpeechRecognitionErrorEventLike = {
  error?: string;
  message?: string;
};

type SpeechRecognitionResultLike = {
  transcript?: string;
};

type SpeechRecognitionEventLike = {
  results?: ArrayLike<ArrayLike<SpeechRecognitionResultLike>>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop?: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type SpeechRecognitionWindow = Window &
  typeof globalThis & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

const CAPTURE_DISCLOSURE =
  "Runtime speech recognition returned a transcript after a user-initiated capture. PersonaDesk stores transcript text only and does not store raw audio. The runtime may use browser or operating-system speech services.";

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") {
    return null;
  }

  const speechWindow = window as SpeechRecognitionWindow;

  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function transcriptFromEvent(event: SpeechRecognitionEventLike): string {
  const results = event.results;

  if (!results || results.length === 0) {
    return "";
  }

  return Array.from(results)
    .flatMap((result) => Array.from(result))
    .map((alternative) => alternative.transcript?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
}

function errorDisclosure(error: string | undefined, message: string | undefined): RuntimeSpeechRecognitionResult {
  if (error === "not-allowed" || error === "permission-denied" || error === "service-not-allowed") {
    return {
      status: "permission-denied",
      transcript: "",
      disclosure: "Runtime speech recognition permission was denied. No transcript was recorded and PersonaDesk stored no raw audio."
    };
  }

  return {
    status: "failed",
    transcript: "",
    disclosure: `Runtime speech recognition failed${error ? `: ${error}` : ""}${message ? ` (${message})` : ""}. PersonaDesk stored no raw audio.`
  };
}

export async function captureRuntimeSpeechTranscript(): Promise<RuntimeSpeechRecognitionResult> {
  const Recognition = recognitionConstructor();

  if (!Recognition) {
    return {
      status: "unavailable",
      transcript: "",
      disclosure: "Runtime speech recognition is not available in this browser or WebView. No microphone capture was attempted."
    };
  }

  return new Promise((resolve) => {
    const recognition = new Recognition();
    let settled = false;
    let timeoutId: number | null = null;

    const settle = (result: RuntimeSpeechRecognitionResult) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      try {
        recognition.stop?.();
      } catch {
        // Some runtimes throw when stop is called after an error or early end.
      }

      resolve(result);
    };

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = window.navigator.language || "en-US";
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = transcriptFromEvent(event);

      settle(
        transcript
          ? {
              status: "captured",
              transcript,
              disclosure: CAPTURE_DISCLOSURE
            }
          : {
              status: "failed",
              transcript: "",
              disclosure: "Runtime speech recognition ended without a transcript. PersonaDesk stored no raw audio."
            }
      );
    };
    recognition.onerror = (event) => {
      settle(errorDisclosure(event.error, event.message));
    };
    recognition.onend = () => {
      settle({
        status: "failed",
        transcript: "",
        disclosure: "Runtime speech recognition ended before returning a transcript. PersonaDesk stored no raw audio."
      });
    };

    try {
      timeoutId = window.setTimeout(() => {
        settle({
          status: "failed",
          transcript: "",
          disclosure: "Runtime speech recognition did not return a transcript before the timeout. PersonaDesk stored no raw audio."
        });
      }, 10000);
      recognition.start();
    } catch (error) {
      settle({
        status: "failed",
        transcript: "",
        disclosure: `Runtime speech recognition failed to start: ${error instanceof Error ? error.message : "unknown error"}. PersonaDesk stored no raw audio.`
      });
    }
  });
}
