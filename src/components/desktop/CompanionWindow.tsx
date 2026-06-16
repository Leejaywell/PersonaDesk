import { useEffect } from "react";
import type { Character, ObservationSession, TaskRun } from "../../domain/types";
import { StatusPill } from "../ui/StatusPill";

export function CompanionWindow({
  emotionalCharacters,
  activeObservation,
  latestRun
}: {
  emotionalCharacters: Character[];
  activeObservation: ObservationSession | undefined;
  latestRun: TaskRun | undefined;
}) {
  const primary = emotionalCharacters[0];

  useEffect(() => {
    document.documentElement.classList.add("companion-window-document");
    document.body.classList.add("companion-window-document");

    return () => {
      document.documentElement.classList.remove("companion-window-document");
      document.body.classList.remove("companion-window-document");
    };
  }, []);

  return (
    <main className="companion-window-shell" aria-label="PersonaDesk companion window" data-tauri-drag-region>
      <div
        className="companion-window-avatar"
        data-tauri-drag-region
        style={{ backgroundColor: primary?.appearance.accent ?? "#334e68" }}
      >
        {primary?.appearance.avatarLabel ?? "P"}
      </div>
      <div className="companion-window-copy" data-tauri-drag-region>
        <h1 data-tauri-drag-region>{primary?.name ?? "Companion"}</h1>
        <p data-tauri-drag-region>{primary?.customRelationship ?? "Standing by on the desktop."}</p>
      </div>
      <section className="companion-window-status" aria-label="Companion window status">
        <StatusPill status={activeObservation ? "active" : "inactive"}>
          Observation {activeObservation ? "active" : "idle"}
        </StatusPill>
        <StatusPill status={latestRun ? latestRun.status : "inactive"}>
          Task {latestRun ? latestRun.status : "idle"}
        </StatusPill>
      </section>
    </main>
  );
}
