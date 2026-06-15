import type { ReactNode } from "react";
import type { SectionId } from "../../app/navigation";
import type { Character, ObservationSession, TaskRun } from "../../domain/types";
import { StatusPill, statusLabel } from "../ui/StatusPill";
import { SectionNav } from "./SectionNav";

export function AppShell({
  activeSection,
  onSectionChange,
  emotionalCharacters,
  latestRun,
  activeObservation,
  syncEnabled,
  children
}: {
  activeSection: SectionId;
  onSectionChange: (sectionId: SectionId) => void;
  emotionalCharacters: Character[];
  latestRun: TaskRun | undefined;
  activeObservation: ObservationSession | undefined;
  syncEnabled: boolean;
  children: ReactNode;
}) {
  return (
    <main className="app-shell">
      <section className="topbar" aria-label="PersonaDesk overview">
        <div>
          <h1>PersonaDesk</h1>
          <p>Multi-character desktop companion platform</p>
        </div>
        <div className="topbar-actions">
          <StatusPill status="active">Local-first</StatusPill>
          <StatusPill>Phase 1 thin slice</StatusPill>
        </div>
      </section>

      <SectionNav activeSection={activeSection} onSectionChange={onSectionChange} />

      <section className="presence-strip" aria-label="Live PersonaDesk presence">
        <div className="presence-avatars">
          {emotionalCharacters.map((character) => (
            <span className="mini-avatar" key={character.id} style={{ backgroundColor: character.appearance.accent }}>
              {character.appearance.avatarLabel}
            </span>
          ))}
        </div>
        <div>
          <strong>Companion layer</strong>
          <p>{emotionalCharacters.length} emotional characters are available for presence and observation.</p>
        </div>
        <div className="presence-status">
          <StatusPill status={activeObservation ? "active" : "inactive"}>
            Observation {activeObservation ? "active" : "idle"}
          </StatusPill>
          <StatusPill status={syncEnabled ? "active" : "inactive"}>Sync {syncEnabled ? "enabled" : "off"}</StatusPill>
        </div>
      </section>

      <section className="section-workspace">{children}</section>

      {latestRun && <div className="toast">Latest task: {statusLabel(latestRun.status)}</div>}
    </main>
  );
}
