import { beforeEach, describe, expect, it, vi } from "vitest";
import { fallbackDesktopPresencePlan, previewLocalDesktopNotification } from "./desktopPresence";

const isPermissionGrantedMock = vi.hoisted(() => vi.fn());
const sendNotificationMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: isPermissionGrantedMock,
  sendNotification: sendNotificationMock
}));

describe("desktop presence plan", () => {
  beforeEach(() => {
    Reflect.deleteProperty(window, "__TAURI_INTERNALS__");
    Object.defineProperty(window, "Notification", { value: undefined, configurable: true });
    isPermissionGrantedMock.mockReset();
    sendNotificationMock.mockReset();
  });

  it("describes tray actions and notification triggers", () => {
    const plan = fallbackDesktopPresencePlan();

    expect(plan.trayMenuItems.map((item) => item.id)).toContain("toggle-companion");
    expect(plan.notificationTriggers.map((trigger) => trigger.id)).toContain("task-delivered");
    expect(plan.disclosures.join(" ")).toContain("native Tauri notification plugin");
    expect(plan.disclosures.join(" ")).toContain("No notification preview uploads");
  });

  it("records unavailable notification previews when the runtime lacks notification support", async () => {
    await expect(
      previewLocalDesktopNotification({
        title: "PersonaDesk",
        body: "Task delivered"
      })
    ).resolves.toMatchObject({
      status: "unavailable"
    });
  });

  it("uses local Web Notification when permission is already granted", async () => {
    const notification = vi.fn();
    Object.defineProperty(notification, "permission", { value: "granted" });
    Object.defineProperty(window, "Notification", { value: notification, configurable: true });

    const result = await previewLocalDesktopNotification({
      title: "PersonaDesk",
      body: "Task delivered"
    });

    expect(result.status).toBe("sent");
    expect(notification).toHaveBeenCalledWith("PersonaDesk", { body: "Task delivered" });
  });

  it("uses the native Tauri notification plugin when permission is already granted", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    isPermissionGrantedMock.mockResolvedValue(true);

    const result = await previewLocalDesktopNotification({
      title: "PersonaDesk",
      body: "Task delivered"
    });

    expect(result).toMatchObject({
      status: "sent",
      disclosure: "Native Tauri notification plugin displayed the preview. No cloud notification provider was called."
    });
    expect(isPermissionGrantedMock).toHaveBeenCalledOnce();
    expect(sendNotificationMock).toHaveBeenCalledWith({ title: "PersonaDesk", body: "Task delivered" });
  });

  it("does not request native notification permission during Phase 1 previews", async () => {
    Object.defineProperty(window, "__TAURI_INTERNALS__", { value: {}, configurable: true });
    isPermissionGrantedMock.mockResolvedValue(false);

    const result = await previewLocalDesktopNotification({
      title: "PersonaDesk",
      body: "Task delivered"
    });

    expect(result.status).toBe("permission-required");
    expect(result.disclosure).toContain("without opening a permission prompt");
    expect(sendNotificationMock).not.toHaveBeenCalled();
  });
});
