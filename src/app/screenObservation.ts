export type RuntimeScreenObservationStatus = "captured" | "unavailable" | "permission-denied" | "failed";

export interface RuntimeScreenObservationResult {
  status: RuntimeScreenObservationStatus;
  appName: string;
  summary: string;
  disclosure: string;
  frameWidth: number | null;
  frameHeight: number | null;
}

type DisplayMediaConstraints = {
  video: true;
  audio: false;
};

type MediaDevicesWithDisplayMedia = MediaDevices & {
  getDisplayMedia?: (constraints: DisplayMediaConstraints) => Promise<MediaStream>;
};

const RUNTIME_SCREEN_APP_NAME = "Screen Capture";

function runtimeMediaDevices(): MediaDevicesWithDisplayMedia | null {
  if (typeof navigator === "undefined") {
    return null;
  }

  const mediaDevices = navigator.mediaDevices as MediaDevicesWithDisplayMedia | undefined;

  return mediaDevices?.getDisplayMedia ? mediaDevices : null;
}

function stopStream(stream: MediaStream): void {
  stream.getTracks().forEach((track) => track.stop());
}

function isPermissionDenied(error: unknown): boolean {
  if (!(error instanceof DOMException)) {
    return false;
  }

  return error.name === "NotAllowedError" || error.name === "PermissionDeniedError";
}

function captureSummary(width: number | null, height: number | null): string {
  const dimensions = width && height ? `${width}x${height}` : "unknown size";

  return `Runtime screen capture observed a display surface (${dimensions}) locally. PersonaDesk stopped the media stream immediately and discarded raw frames before storage.`;
}

export async function captureRuntimeScreenObservation(): Promise<RuntimeScreenObservationResult> {
  const mediaDevices = runtimeMediaDevices();

  if (!mediaDevices) {
    return {
      status: "unavailable",
      appName: RUNTIME_SCREEN_APP_NAME,
      summary: "",
      disclosure:
        "Runtime screen capture is not available in this browser or WebView. No screen capture was attempted.",
      frameWidth: null,
      frameHeight: null
    };
  }

  let stream: MediaStream | null = null;

  try {
    stream = await mediaDevices.getDisplayMedia({ video: true, audio: false });

    if (!stream) {
      return {
        status: "failed",
        appName: RUNTIME_SCREEN_APP_NAME,
        summary: "",
        disclosure: "Runtime screen capture returned no media stream. PersonaDesk stored no raw screen frames.",
        frameWidth: null,
        frameHeight: null
      };
    }

    const videoTrack = stream.getVideoTracks()[0];
    const settings = videoTrack?.getSettings();
    const frameWidth = typeof settings?.width === "number" ? settings.width : null;
    const frameHeight = typeof settings?.height === "number" ? settings.height : null;

    return {
      status: "captured",
      appName: RUNTIME_SCREEN_APP_NAME,
      summary: captureSummary(frameWidth, frameHeight),
      disclosure:
        "User-initiated runtime screen capture completed locally. PersonaDesk stored only a text summary with capture metadata and discarded raw frames.",
      frameWidth,
      frameHeight
    };
  } catch (error) {
    if (isPermissionDenied(error)) {
      return {
        status: "permission-denied",
        appName: RUNTIME_SCREEN_APP_NAME,
        summary: "",
        disclosure: "Runtime screen capture permission was denied. PersonaDesk stored no raw screen frames.",
        frameWidth: null,
        frameHeight: null
      };
    }

    return {
      status: "failed",
      appName: RUNTIME_SCREEN_APP_NAME,
      summary: "",
      disclosure: `Runtime screen capture failed: ${error instanceof Error ? error.message : "unknown error"}. PersonaDesk stored no raw screen frames.`,
      frameWidth: null,
      frameHeight: null
    };
  } finally {
    if (stream) {
      stopStream(stream);
    }
  }
}
