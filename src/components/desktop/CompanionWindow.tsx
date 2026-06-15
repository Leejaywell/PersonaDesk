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

  return (
    <main className="companion-window-shell" aria-label="PersonaDesk companion window">
      <div className="companion-window-avatar" style={{ backgroundColor: primary?.appearance.accent ?? "#334e68" }}>
        {primary?.appearance.avatarLabel ?? "P"}
      </div>
      <div className="companion-window-copy">
        <h1>{primary?.name ?? "Companion"}</h1>
        <p>{primary?.customRelationship ?? "Standing by on the desktop."}</p>
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
