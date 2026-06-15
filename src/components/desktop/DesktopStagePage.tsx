import { Sparkles } from "lucide-react";
import type { Character, RoleBoundary, TaskRun } from "../../domain/types";
import { CharacterCard } from "../characters/CharacterCard";
import { Panel } from "../ui/Panel";
import { StatusPill } from "../ui/StatusPill";

export function DesktopStagePage({
  emotionalCharacters,
  roleBoundaries,
  latestRun
}: {
  emotionalCharacters: Character[];
  roleBoundaries: Record<string, RoleBoundary>;
  latestRun: TaskRun | undefined;
}) {
  return (
    <div className="page-grid desktop-page">
      <Panel
        className="desktop-stage-panel"
        description="Emotional characters stay visible here; management controls live in the console sections."
        icon={<Sparkles aria-hidden="true" size={19} />}
        title="Desktop Stage"
      >
        <div className="stage-surface">
          {emotionalCharacters.map((character, index) => (
            <div
              className={`avatar-card ${index % 2 === 0 ? "warm" : "cool"}`}
              key={character.id}
              style={{ backgroundColor: character.appearance.accent }}
            >
              {character.appearance.avatarLabel}
            </div>
          ))}
          <div className="stage-caption">
            Emotional characters can accompany the user, watch approved observation sessions, and comment within
            configured boundaries.
          </div>
        </div>
      </Panel>

      <Panel
        description="Presence roles are separate from task execution roles."
        title="Emotional Presence"
      >
        <div className="card-list">
          {emotionalCharacters.map((character) => (
            <CharacterCard
              boundaryLabel={roleBoundaries[character.roleBoundaryId].label}
              character={character}
              key={character.id}
            />
          ))}
        </div>
        <div className="desktop-latest-task">
          <strong>Latest task</strong>
          {latestRun ? <StatusPill status={latestRun.status} /> : <span className="empty-state">No task run yet.</span>}
        </div>
      </Panel>
    </div>
  );
}
