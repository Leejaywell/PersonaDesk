import { invoke } from "@tauri-apps/api/core";
import type { DesktopPresenceAuditStatus } from "../domain/types";
import { isTauriRuntime } from "./desktopWindows";

export interface TrayMenuItemPlan {
  id: string;
  label: string;
  action: string;
  enabled: boolean;
}

export interface NotificationTriggerPlan {
  id: string;
  label: string;
  source: string;
  requiresUserPermission: boolean;
}

export interface DesktopPresencePlan {
  message: string;
  trayMenuItems: TrayMenuItemPlan[];
  notificationTriggers: NotificationTriggerPlan[];
  disclosures: string[];
}

export interface LocalNotificationPreviewInput {
  title: string;
  body: string;
}

export interface LocalNotificationPreviewResult {
  status: DesktopPresenceAuditStatus;
  disclosure: string;
}

export function fallbackDesktopPresencePlan(): DesktopPresencePlan {
  return {
    message: "Native desktop presence contracts are available in the Tauri runtime.",
    trayMenuItems: [
      {
        id: "show-console",
        label: "Show PersonaDesk",
        action: "focus-main-window",
        enabled: true
      },
      {
        id: "toggle-companion",
        label: "Show or hide companion",
        action: "toggle-companion-window",
        enabled: true
      },
      {
        id: "stop-observation",
        label: "Stop observation",
        action: "stop-active-observation",
        enabled: true
      },
      {
        id: "quit",
        label: "Quit PersonaDesk",
        action: "quit-app",
        enabled: true
      }
    ],
    notificationTriggers: [
      {
        id: "task-delivered",
        label: "Task delivered",
        source: "task-run",
        requiresUserPermission: true
      },
      {
        id: "task-blocked",
        label: "Task blocked for approval",
        source: "task-run",
        requiresUserPermission: true
      },
      {
        id: "observation-boundary",
        label: "Observation boundary blocked",
        source: "observation-session",
        requiresUserPermission: true
      }
    ],
    disclosures: [
      "Tray actions are wired to local Tauri window and app events.",
      "Notification previews use a local runtime notification API when permission already exists.",
      "No notification preview uploads task text, observation summaries, or companion chat."
    ]
  };
}

export async function loadDesktopPresencePlan(): Promise<DesktopPresencePlan> {
  if (!isTauriRuntime()) {
    return fallbackDesktopPresencePlan();
  }

  try {
    return await invoke<DesktopPresencePlan>("desktop_presence_plan");
  } catch (error) {
    return {
      ...fallbackDesktopPresencePlan(),
      message: error instanceof Error ? error.message : "Desktop presence plan failed to load."
    };
  }
}

export async function previewLocalDesktopNotification(
  input: LocalNotificationPreviewInput
): Promise<LocalNotificationPreviewResult> {
  const title = input.title.trim();
  const body = input.body.trim();

  if (!title || !body) {
    return {
      status: "failed",
      disclosure: "Notification preview requires a title and body."
    };
  }

  if (typeof window === "undefined" || typeof window.Notification === "undefined") {
    return {
      status: "unavailable",
      disclosure: "The local runtime does not expose Web Notification. No OS notification was requested."
    };
  }

  if (window.Notification.permission === "granted") {
    new window.Notification(title, { body });

    return {
      status: "sent",
      disclosure: "Local Web Notification displayed the preview. No cloud notification provider was called."
    };
  }

  if (window.Notification.permission === "denied") {
    return {
      status: "unavailable",
      disclosure: "Notification permission is denied in this runtime. No OS notification was displayed."
    };
  }

  return {
    status: "permission-required",
    disclosure:
      "Notification permission has not been granted. Phase 1 records the preview without opening a permission prompt."
  };
}
