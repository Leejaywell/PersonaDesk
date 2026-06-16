import { invoke } from "@tauri-apps/api/core";

export interface DesktopWindowPlan {
  label: string;
  surface: string;
  title: string;
  width: number;
  height: number;
  alwaysOnTop: boolean;
  decorations: boolean;
  transparent: boolean;
  shadow: boolean;
  skipTaskbar: boolean;
  focus: boolean;
  visible: boolean;
  dragRegion: boolean;
}

export interface DesktopWindowPlanResult {
  message: string;
  windows: DesktopWindowPlan[];
}

export function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function fallbackDesktopWindowPlan(): DesktopWindowPlanResult {
  return {
    message: "Native companion window plan is available in the Tauri desktop runtime.",
    windows: [
      {
        label: "main",
        surface: "control-console",
        title: "PersonaDesk",
        width: 1280,
        height: 820,
        alwaysOnTop: false,
        decorations: true,
        transparent: false,
        shadow: true,
        skipTaskbar: false,
        focus: true,
        visible: true,
        dragRegion: false
      },
      {
        label: "companion",
        surface: "floating-companion",
        title: "PersonaDesk Companion",
        width: 280,
        height: 360,
        alwaysOnTop: true,
        decorations: false,
        transparent: true,
        shadow: false,
        skipTaskbar: true,
        focus: false,
        visible: false,
        dragRegion: true
      }
    ]
  };
}

export async function loadDesktopWindowPlan(): Promise<DesktopWindowPlanResult> {
  if (!isTauriRuntime()) {
    return fallbackDesktopWindowPlan();
  }

  try {
    const windows = await invoke<DesktopWindowPlan[]>("desktop_window_plan");

    return {
      message: "Native desktop window plan loaded from the Tauri runtime.",
      windows
    };
  } catch (error) {
    return {
      ...fallbackDesktopWindowPlan(),
      message: error instanceof Error ? error.message : "Desktop window plan failed to load."
    };
  }
}
