import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fallbackCompanionWindowControlState,
  loadCompanionWindowControlState,
  setCompanionWindowControlVisible
} from "./companionWindowControl";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: invokeMock
}));

describe("companion window control", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    invokeMock.mockReset();
  });

  it("discloses that browser previews cannot control the companion window", () => {
    expect(fallbackCompanionWindowControlState()).toMatchObject({
      available: false,
      visible: false,
      status: "unavailable"
    });
  });

  it("loads companion window status through the Tauri command", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    invokeMock.mockResolvedValue({
      available: true,
      visible: false,
      status: "hidden",
      disclosure: "Hidden."
    });

    await expect(loadCompanionWindowControlState()).resolves.toMatchObject({
      available: true,
      visible: false,
      status: "hidden"
    });
    expect(invokeMock).toHaveBeenCalledWith("companion_window_status");
  });

  it("shows and hides the companion window through the Tauri command", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    invokeMock.mockResolvedValue({
      available: true,
      visible: true,
      status: "visible",
      disclosure: "Visible."
    });

    await setCompanionWindowControlVisible(true);

    expect(invokeMock).toHaveBeenCalledWith("set_companion_window_visible", { visible: true });

    invokeMock.mockResolvedValue({
      available: true,
      visible: false,
      status: "hidden",
      disclosure: "Hidden."
    });

    await setCompanionWindowControlVisible(false);

    expect(invokeMock).toHaveBeenCalledWith("set_companion_window_visible", { visible: false });
  });
});
