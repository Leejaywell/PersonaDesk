import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fallbackStartupBehaviorState,
  loadStartupBehaviorState,
  setStartupBehaviorEnabled
} from "./startupBehavior";

const disableMock = vi.hoisted(() => vi.fn());
const enableMock = vi.hoisted(() => vi.fn());
const isEnabledMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/plugin-autostart", () => ({
  disable: disableMock,
  enable: enableMock,
  isEnabled: isEnabledMock
}));

describe("startup behavior", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    disableMock.mockReset();
    enableMock.mockReset();
    isEnabledMock.mockReset();
  });

  it("discloses that browser previews do not register startup items", () => {
    expect(fallbackStartupBehaviorState()).toMatchObject({
      available: false,
      enabled: false,
      status: "unavailable"
    });
  });

  it("loads native startup status in the Tauri runtime", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    isEnabledMock.mockResolvedValue(true);

    await expect(loadStartupBehaviorState()).resolves.toMatchObject({
      available: true,
      enabled: true,
      status: "enabled"
    });
    expect(isEnabledMock).toHaveBeenCalledOnce();
  });

  it("enables startup behavior through the native plugin", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    enableMock.mockResolvedValue(undefined);

    await expect(setStartupBehaviorEnabled(true)).resolves.toMatchObject({
      available: true,
      enabled: true,
      status: "enabled"
    });
    expect(enableMock).toHaveBeenCalledOnce();
    expect(disableMock).not.toHaveBeenCalled();
  });

  it("disables startup behavior through the native plugin", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    disableMock.mockResolvedValue(undefined);

    await expect(setStartupBehaviorEnabled(false)).resolves.toMatchObject({
      available: true,
      enabled: false,
      status: "disabled"
    });
    expect(disableMock).toHaveBeenCalledOnce();
    expect(enableMock).not.toHaveBeenCalled();
  });
});
