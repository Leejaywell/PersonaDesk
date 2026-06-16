import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "./desktopWindows";

export type CompanionWindowControlStatus = "visible" | "hidden" | "unavailable" | "failed" | "updating";

export interface CompanionWindowControlState {
  available: boolean;
  visible: boolean;
  status: CompanionWindowControlStatus;
  disclosure: string;
}

export function fallbackCompanionWindowControlState(): CompanionWindowControlState {
  return {
    available: false,
    visible: false,
    status: "unavailable",
    disclosure: "Companion window controls are available only in the Tauri desktop runtime."
  };
}

export async function loadCompanionWindowControlState(): Promise<CompanionWindowControlState> {
  if (!isTauriRuntime()) {
    return fallbackCompanionWindowControlState();
  }

  try {
    return await invoke<CompanionWindowControlState>("companion_window_status");
  } catch (error) {
    return {
      available: false,
      visible: false,
      status: "failed",
      disclosure:
        error instanceof Error
          ? `Companion window status could not be read locally: ${error.message}`
          : "Companion window status could not be read locally."
    };
  }
}

export async function setCompanionWindowControlVisible(
  visible: boolean
): Promise<CompanionWindowControlState> {
  if (!isTauriRuntime()) {
    return fallbackCompanionWindowControlState();
  }

  try {
    return await invoke<CompanionWindowControlState>("set_companion_window_visible", { visible });
  } catch (error) {
    return {
      available: true,
      visible: !visible,
      status: "failed",
      disclosure:
        error instanceof Error
          ? `Companion window visibility could not be changed locally: ${error.message}`
          : "Companion window visibility could not be changed locally."
    };
  }
}
