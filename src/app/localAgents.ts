import { invoke } from "@tauri-apps/api/core";
import type { DetectedLocalAgent } from "../domain/executors";

export interface LocalAgentScanResult {
  agents: DetectedLocalAgent[];
  message: string;
}

function hasTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function scanLocalAgents(): Promise<LocalAgentScanResult> {
  if (!hasTauriRuntime()) {
    return {
      agents: [],
      message: "Local agent scan is available in the Tauri desktop runtime."
    };
  }

  try {
    const agents = await invoke<DetectedLocalAgent[]>("detect_local_agents");

    return {
      agents,
      message: `Scanned ${agents.length} known local agent slots.`
    };
  } catch (error) {
    return {
      agents: [],
      message: error instanceof Error ? error.message : "Local agent scan failed."
    };
  }
}
