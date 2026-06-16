import { afterEach, describe, expect, it, vi } from "vitest";
import { captureRuntimeScreenObservation } from "./screenObservation";

function setDisplayMedia(getDisplayMedia: () => Promise<MediaStream>) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getDisplayMedia },
    configurable: true
  });
}

describe("runtime screen observation", () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, "mediaDevices");
  });

  it("reports unavailable when the runtime has no display capture API", async () => {
    const result = await captureRuntimeScreenObservation();

    expect(result.status).toBe("unavailable");
    expect(result.summary).toBe("");
    expect(result.disclosure).toContain("No screen capture was attempted");
  });

  it("captures screen metadata locally and stops the media stream", async () => {
    const stop = vi.fn();
    const track = {
      stop,
      getSettings: () => ({ width: 1440, height: 900 })
    };
    const stream = {
      getTracks: () => [track],
      getVideoTracks: () => [track]
    } as unknown as MediaStream;

    setDisplayMedia(() => Promise.resolve(stream));

    const result = await captureRuntimeScreenObservation();

    expect(result.status).toBe("captured");
    expect(result.appName).toBe("Screen Capture");
    expect(result.frameWidth).toBe(1440);
    expect(result.frameHeight).toBe(900);
    expect(result.summary).toContain("1440x900");
    expect(result.disclosure).toContain("discarded raw frames");
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it("reports denied permission without storing screen metadata", async () => {
    setDisplayMedia(() => Promise.reject(new DOMException("denied", "NotAllowedError")));

    const result = await captureRuntimeScreenObservation();

    expect(result.status).toBe("permission-denied");
    expect(result.summary).toBe("");
    expect(result.frameWidth).toBeNull();
    expect(result.frameHeight).toBeNull();
    expect(result.disclosure).toContain("permission was denied");
  });
});
