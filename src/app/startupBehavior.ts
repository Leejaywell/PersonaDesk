import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { isTauriRuntime } from "./desktopWindows";

export type StartupBehaviorStatus = "enabled" | "disabled" | "unavailable" | "failed" | "updating";

export interface StartupBehaviorState {
  available: boolean;
  enabled: boolean;
  status: StartupBehaviorStatus;
  disclosure: string;
}

export function fallbackStartupBehaviorState(): StartupBehaviorState {
  return {
    available: false,
    enabled: false,
    status: "unavailable",
    disclosure:
      "Startup behavior is available only in the Tauri desktop runtime. Browser previews do not register OS login items."
  };
}

export async function loadStartupBehaviorState(): Promise<StartupBehaviorState> {
  if (!isTauriRuntime()) {
    return fallbackStartupBehaviorState();
  }

  try {
    const enabled = await isEnabled();

    return {
      available: true,
      enabled,
      status: enabled ? "enabled" : "disabled",
      disclosure: enabled
        ? "PersonaDesk is registered to start with the operating system."
        : "PersonaDesk is not registered to start with the operating system."
    };
  } catch (error) {
    return {
      available: false,
      enabled: false,
      status: "failed",
      disclosure:
        error instanceof Error
          ? `Startup behavior status could not be read locally: ${error.message}`
          : "Startup behavior status could not be read locally."
    };
  }
}

export async function setStartupBehaviorEnabled(nextEnabled: boolean): Promise<StartupBehaviorState> {
  if (!isTauriRuntime()) {
    return fallbackStartupBehaviorState();
  }

  try {
    if (nextEnabled) {
      await enable();
    } else {
      await disable();
    }

    return {
      available: true,
      enabled: nextEnabled,
      status: nextEnabled ? "enabled" : "disabled",
      disclosure: nextEnabled
        ? "PersonaDesk will start with the operating system after login."
        : "PersonaDesk startup registration was disabled locally."
    };
  } catch (error) {
    return {
      available: true,
      enabled: !nextEnabled,
      status: "failed",
      disclosure:
        error instanceof Error
          ? `Startup behavior could not be changed locally: ${error.message}`
          : "Startup behavior could not be changed locally."
    };
  }
}
