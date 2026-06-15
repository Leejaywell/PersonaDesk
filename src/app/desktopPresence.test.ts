import { describe, expect, it, vi } from "vitest";
import { fallbackDesktopPresencePlan, previewLocalDesktopNotification } from "./desktopPresence";

describe("desktop presence plan", () => {
  it("describes tray actions and notification triggers", () => {
    const plan = fallbackDesktopPresencePlan();

    expect(plan.trayMenuItems.map((item) => item.id)).toContain("toggle-companion");
    expect(plan.notificationTriggers.map((trigger) => trigger.id)).toContain("task-delivered");
    expect(plan.disclosures.join(" ")).toContain("No notification preview uploads");
  });

  it("records unavailable notification previews when the runtime lacks notification support", async () => {
    Object.defineProperty(window, "Notification", { value: undefined, configurable: true });

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
});
